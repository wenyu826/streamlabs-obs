import { OutputService } from './outputs';
import { ProviderService } from './providers';
import { EncoderService } from './encoders';
import { StatefulService, mutation } from './stateful-service';
import { Inject } from 'util/injector';
import PouchDB from 'pouchdb';
import { DBQueueManager } from 'services/common-config';
import { remote } from 'electron';
import path from 'path';

export enum EProviderMode {
  Common,
  Custom
}

export enum EEncoderMode {
  Simple,
  Advanced
}

export enum EAudioEncoders {
  FFMpeg = 'ffmpeg_aac',
  MediaFoundation = 'mf_aac',
  LibFDK = 'libfdk_aac',
  CoreAudio = 'CoreAudio_aac'
}

const docId = 'rtmp-output-settings';

declare type ExistingDatabaseDocument = PouchDB.Core.ExistingDocument<
  RtmpOutputContent
>;

interface RtmpOutputContent {
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
  rtmpProviderMode: EProviderMode;
}

interface RtmpOutputServiceState extends RtmpOutputContent {}

export class RtmpOutputService extends StatefulService<RtmpOutputServiceState> {
  private initialized = false;

  private db = new DBQueueManager<RtmpOutputContent>(
    path.join(remote.app.getPath('userData'), 'RtmpOutputService')
  );

  static initialState: RtmpOutputServiceState = {
    rtmpEncoderMode: EEncoderMode.Simple,
    rtmpOutputId: '',
    rtmpSimpleEncoderId: '',
    rtmpAdvEncoderId: '',
    rtmpCommonProviderId: '',
    rtmpCustomProviderId: '',
    rtmpProviderMode: EProviderMode.Common
  };

  @Inject() outputService: OutputService;
  @Inject() providerService: ProviderService;
  @Inject() encoderService: EncoderService;

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

  @mutation()
  UPDATE_PROVIDER_MODE(mode: EProviderMode) {
    this.state.rtmpProviderMode = mode;
  }

  private createConfig(): void {
    console.log('CREATE CONFIG');
    const outputId = OutputService.getUniqueId();
    this.outputService.addOutput('rtmp_output', outputId);

    const providerId = ProviderService.getUniqueId();
    this.providerService.addProvider('rtmp_common', providerId);

    const customProviderId = ProviderService.getUniqueId();
    this.providerService.addProvider('rtmp_custom', customProviderId);

    /* FIXME Some logic on the best encoder to choose goes here */
    const audioEncoderId = EncoderService.getUniqueId();
    this.encoderService.addAudioEncoder('ffmpeg_aac', audioEncoderId);

    const videoEncoderId = EncoderService.getUniqueId();
    this.encoderService.addVideoEncoder('obs_x264', videoEncoderId);

    const advVideoEncoderId = EncoderService.getUniqueId();
    this.encoderService.addVideoEncoder('obs_x264', advVideoEncoderId);

    this.outputService.setOutputProvider(outputId, providerId);
    this.outputService.setOutputVideoEncoder(outputId, videoEncoderId);
    this.outputService.setOutputAudioEncoder(outputId, audioEncoderId, 0);

    this.UPDATE_ADV_ENC(advVideoEncoderId);
    this.UPDATE_SIMPLE_ENC(videoEncoderId);
    this.UPDATE_COMMON_PROVIDER(providerId);
    this.UPDATE_CUSTOM_PROVIDER(customProviderId);
    this.UPDATE_OUTPUT(outputId);

    this.db.addQueue(docId);
    this.queueChange();
  }

  private syncConfig(
    response: PouchDB.Core.AllDocsResponse<RtmpOutputContent>
  ): void {
    for (let i = 0; i < response.total_rows; ++i) {
      const result = response.rows[i].doc;

      if (result._id !== docId) {
        console.warn('Unknown document found in rtmp output database!');
        continue;
      }

      this.UPDATE_ENCODER_MODE(result.rtmpEncoderMode);
      this.UPDATE_PROVIDER_MODE(result.rtmpProviderMode);
      this.UPDATE_ADV_ENC(result.rtmpAdvEncoderId);
      this.UPDATE_SIMPLE_ENC(result.rtmpSimpleEncoderId);
      this.UPDATE_COMMON_PROVIDER(result.rtmpCommonProviderId);
      this.UPDATE_CUSTOM_PROVIDER(result.rtmpCustomProviderId);
      this.UPDATE_OUTPUT(result.rtmpOutputId);

      this.initialized = true;
    }

    if (!this.initialized) {
      this.createConfig();
      this.initialized = true;
    }
  }

  async initialize() {
    if (this.initialized) return;
    await this.outputService.initialize();
    await this.db.initialize(response => this.syncConfig(response));
  }

  private queueChange() {
    const change = {
      ...this.state
    };

    this.db.queueChange(docId, change);
  }

  start() {
    return this.outputService.startOutput(this.state.rtmpOutputId);
  }

  stop() {
    this.outputService.stopOutput(this.state.rtmpOutputId);
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

    this.queueChange();
  }

  setVideoEncoderType(mode: EEncoderMode, type: string) {
    let encoderId = null;
    const newEncoderId = EncoderService.getUniqueId();

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
    this.encoderService.addVideoEncoder(type, newEncoderId);

    this.outputService.setOutputVideoEncoder(
      this.state.rtmpOutputId,
      newEncoderId
    );

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

    this.UPDATE_PROVIDER_MODE(mode);
    this.queueChange();
  }
}
