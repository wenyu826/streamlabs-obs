import { FOutput, OutputService } from './outputs';
import { FProvider, ProviderService } from './providers';
import { FAudioEncoder, FVideoEncoder, EncoderService } from './encoders';
import { StatefulService, mutation } from './stateful-service';
import { Inject } from 'util/injector';

import PouchDB from 'pouchdb';

export enum EProviderMode {
  Common,
  Custom
}

export enum EEncoderMode {
  Simple,
  Advanced
}

const docId = 'rtmp-output-settings';

/* A wrapper class that handles the global rtmp output 
 * and it's associated objects and state. */

interface RtmpOutputServiceState {
  revision?: string;
  rtmpOutputId: string;

  /* Here we make two encoders. They have two
   * separate and different sets of settings.
   * When the user changes from one to the other,
   * it will keep the settings of the one he switched
   * from, including the type of encoder. We simply,
   * won't use it until it's asked of us. */
  rtmpSimpleEncoderId: string;
  rtmpAdvEncoderId: string;
  rtmpEncoderMode: EEncoderMode;

  /* Similar for providers (services) */
  rtmpCommonProviderId: string;
  rtmpCustomProviderId: string;
}

type ExistingDatabaseDocument = PouchDB.Core.ExistingDocument<RtmpOutputServiceState>;

export class RtmpOutputService extends StatefulService<RtmpOutputServiceState> {
  private initialized = false;
  private db: PouchDB.Database<RtmpOutputServiceState> = new PouchDB('RtmpOutputService.leveldb');
  private putQueue: any[] = [];

  static initialState: RtmpOutputServiceState = {
    rtmpEncoderMode: EEncoderMode.Simple,
    rtmpOutputId: '',
    rtmpSimpleEncoderId: '',
    rtmpAdvEncoderId: '',
    rtmpCommonProviderId: '',
    rtmpCustomProviderId: ''
  };

  @Inject() outputService: OutputService;
  @Inject() providerService: ProviderService;
  @Inject() encoderService: EncoderService;

  @mutation()
  UPDATE_REVISION(revision: string) {
    this.state.revision = revision;
  }

  @mutation()
  UPDATE_ENCODER_MODE(mode: EEncoderMode) {
    this.state.rtmpEncoderMode = mode;
  }

  @mutation()
  UPDATE_OUTPUT(uniqueId: string) {
    this.state.rtmpOutputId = uniqueId;
  }

  @mutation()
  UPDATE_SIMPLE_ENC(uniqueId: string) {
    this.state.rtmpSimpleEncoderId = uniqueId;
  }

  @mutation()
  UPDATE_ADV_ENC(uniqueId: string) {
    this.state.rtmpAdvEncoderId = uniqueId;
  }

  @mutation()
  UPDATE_COMMON_PROVIDER(uniqueId: string) {
    this.state.rtmpCommonProviderId = uniqueId;
  }

  @mutation()
  UPDATE_CUSTOM_PROVIDER(uniqueId: string) {
    this.state.rtmpCustomProviderId = uniqueId;
  }

  /* This occurs when the database doesn't exist */
  private handleDbError(error: PouchDB.Core.Error): void {
    /* A 404 is normal on a cold start */
    if (error.status !== 404) {
      /* Unsure how to proceed from here. */
      throw Error(
        `Problem with rtmp-output configuration document: ${error.message}`);
    }

    const outputId = OutputService.getUniqueId();
    const fOutput = new FOutput('rtmp_output', outputId);

    const providerId = ProviderService.getUniqueId();
    const provider = new FProvider('rtmp_common', providerId);

    this.UPDATE_CUSTOM_PROVIDER(ProviderService.getUniqueId());
    const customProvider = new FProvider('rtmp_custom', this.state.rtmpCustomProviderId);

    const audioEncoderId = EncoderService.getUniqueId();
    /* FIXME Some logic on the best encoder to choose goes here */
    const audioEncoder = new FAudioEncoder('mf_aac', audioEncoderId);

    const videoEncoderId = EncoderService.getUniqueId();
    /* FIXME Some logic on the best encoder to choose goes here */
    const videoEncoder = new FVideoEncoder('obs_x264', videoEncoderId);

    this.UPDATE_ADV_ENC(EncoderService.getUniqueId());
    const advVideoEncoder = new FVideoEncoder('obs_x264', this.state.rtmpAdvEncoderId);

    this.providerService.addProvider(providerId, provider);
    this.providerService.addProvider(this.state.rtmpCustomProviderId, customProvider);
    this.encoderService.addAudioEncoder(audioEncoderId, audioEncoder);
    this.encoderService.addVideoEncoder(this.state.rtmpAdvEncoderId, advVideoEncoder);
    this.encoderService.addVideoEncoder(videoEncoderId, videoEncoder);
    this.outputService.addOutput(outputId, fOutput);

    this.outputService.setOutputProvider(outputId, providerId);
    this.outputService.setOutputVideoEncoder(outputId, videoEncoderId);
    this.outputService.setOutputAudioEncoder(outputId, audioEncoderId, 0);

    /* It's vital this put succeeds or else we'll end up with
     * multiple outputs being created. If the rtmp output doesn't
     * know what encoder/output is associated with it, then it will
     * just create a new one */

    this.UPDATE_SIMPLE_ENC(videoEncoderId);
    this.UPDATE_COMMON_PROVIDER(providerId);
    this.UPDATE_OUTPUT(outputId);

    this.queueChange();
  }

  private syncConfig(result: ExistingDatabaseDocument): void {
    this.UPDATE_REVISION(result._rev);
    this.UPDATE_ENCODER_MODE(result.rtmpEncoderMode);
    this.UPDATE_ADV_ENC(result.rtmpAdvEncoderId);
    this.UPDATE_SIMPLE_ENC(result.rtmpSimpleEncoderId);
    this.UPDATE_COMMON_PROVIDER(result.rtmpCommonProviderId);
    this.UPDATE_CUSTOM_PROVIDER(result.rtmpCustomProviderId);
    this.UPDATE_OUTPUT(result.rtmpOutputId);
  }

  async initialize() {
    if (this.initialized) return;
    await this.outputService.initialize();

    await this.db.get(docId)
      .then((result: ExistingDatabaseDocument) => { this.syncConfig(result); })
      .catch((error: PouchDB.Core.Error) => { this.handleDbError(error); });

    this.initialized = true;
  }

  private async handleChange(response: PouchDB.Core.Response) {
    this.UPDATE_REVISION(response.rev);
    
    this.putQueue.shift();

    if (this.putQueue.length > 0) {
      this.db.put({
        ... this.putQueue[0],
        _id: docId,
        _rev: response.rev
      }).then((response) => { this.handleChange(response); });
    }
  }

  private queueChange() {
    if (this.putQueue.push({ ...this.state }) !== 1) {
      return;
    }

    this.db.put({
      ...this.state,
      _id: docId,
      _rev: this.state.revision
    }).then((response) => { this.handleChange(response); });
  }

  start() {
    return this.outputService.startOutput(this.state.rtmpOutputId);
  }

  stop() {
    this.outputService.stopOutput(this.state.rtmpOutputId);
  }

  isActive(): boolean {
    return this.outputService.isOutputActive(this.state.rtmpOutputId);
  }

  getAudioEncoderId(): string {
    return this.outputService.getAudioEncoder(this.state.rtmpOutputId);
  }

  getVideoEncoderId(): string {
    return this.outputService.getVideoEncoder(this.state.rtmpOutputId);
  }

  getProviderId(): string {
    return this.outputService.getOutputProvider(this.state.rtmpOutputId);
  }

  getOutputId() {
    return this.state.rtmpOutputId;
  }

  getCurrentMode(): EEncoderMode {
    return this.state.rtmpEncoderMode;
  }

  setEncoderMode(mode: EEncoderMode) {
    const outputId = this.state.rtmpOutputId;

    switch (mode) {
      case EEncoderMode.Advanced: {
        const encoderId = this.state.rtmpAdvEncoderId;
        this.outputService.setOutputVideoEncoder(outputId, encoderId);
        this.UPDATE_ENCODER_MODE(EEncoderMode.Advanced);
        break;
      }
      case EEncoderMode.Simple:
        const encoderId = this.state.rtmpSimpleEncoderId;
        this.outputService.setOutputVideoEncoder(outputId, encoderId);
        this.UPDATE_ENCODER_MODE(EEncoderMode.Simple);
        break;
      default:
        console.warn('Unsupported mode given to setEncoderType');
    }
  }

  setVideoEncoderType(mode: EEncoderMode, type: string) {
    let encoderId = null;
    const newEncoderId = EncoderService.getUniqueId();
    const newEncoder = new FVideoEncoder(type, newEncoderId);

    switch (mode) {
      case EEncoderMode.Advanced:
        encoderId = this.state.rtmpAdvEncoderId;
        this.UPDATE_ADV_ENC(newEncoderId);
        break;
      case EEncoderMode.Simple:
        encoderId = this.state.rtmpSimpleEncoderId;
        this.UPDATE_SIMPLE_ENC(newEncoderId);
        break;
    }

    this.encoderService.removeVideoEncoder(encoderId);
    this.encoderService.addVideoEncoder(newEncoderId, newEncoder);
    this.outputService.setOutputVideoEncoder(this.state.rtmpOutputId, newEncoderId);

    this.queueChange();
  }

  setProviderMode(mode: EProviderMode) {
    const outputId = this.state.rtmpOutputId;

    switch (mode) {
      case EProviderMode.Custom: {
        const providerId = this.state.rtmpCustomProviderId;
        this.outputService.setOutputProvider(outputId, providerId);
        break;
      }
      case EProviderMode.Common: {
        const providerId = this.state.rtmpCommonProviderId;
        this.outputService.setOutputProvider(outputId, providerId);
        break;
      }
      default:
        console.warn('Unsupported type given to setProviderType');
    }
  }
}
