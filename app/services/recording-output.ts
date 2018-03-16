import { FOutput, OutputService } from './outputs';
import { FProvider, ProviderService } from './providers';
import { FAudioEncoder, FVideoEncoder, EncoderService } from './encoders';
import { StatefulService, mutation } from './stateful-service';
import { EProviderMode, EEncoderMode } from './rtmp-output';
import { Inject } from 'util/injector';
import PouchDB from 'pouchdb-core';
import PouchDBWebSQL from 'pouchdb-adapter-node-websql';
import { remote } from 'electron';
import { OutputFactory } from 'services/obs-api';

const app = remote.app;

PouchDB.plugin(PouchDBWebSQL);

/* A wrapper class that handles the global rtmp output 
 * and it's associated objects and state. */

interface RecOutputServiceState {
  revision?: string;
  _id: string;
  recOutputId: string;

  /* Here we make two encoders. They have two
   * separate and different sets of settings.
   * When the user changes from one to the other,
   * it will keep the settings of the one he switched
   * from, including the type of encoder. We simply,
   * won't use it until it's asked of us. */
  recSimpleEncoderId: string;
  recAdvEncoderId: string;
  recEncoderMode: EEncoderMode;
  recDirectory: string;
  recFormat: string;
}

type RecOutputDatabase = PouchDB.Database<RecOutputServiceState>;
type ExistingDatabaseDocument = PouchDB.Core.ExistingDocument<RecOutputServiceState>;

export class RecOutputService extends StatefulService<RecOutputServiceState> {
  private initialized = false;
  private db: RecOutputDatabase = new PouchDB('RecOutputService.sqlite3', { adapter: 'websql' });
  private putQueue: any[] = [];

  static initialState: RecOutputServiceState = {
    _id: 'rec-output-settings',
    recEncoderMode: EEncoderMode.Simple,
    recOutputId: '',
    recSimpleEncoderId: '',
    recAdvEncoderId: '',
    recDirectory: '',
    recFormat: 'avi'
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
    this.state.recEncoderMode = mode;
  }

  @mutation()
  UPDATE_OUTPUT(uniqueId: string) {
    this.state.recOutputId = uniqueId;
  }

  @mutation()
  UPDATE_SIMPLE_ENC(uniqueId: string) {
    this.state.recSimpleEncoderId = uniqueId;
  }

  @mutation()
  UPDATE_ADV_ENC(uniqueId: string) {
    this.state.recAdvEncoderId = uniqueId;
  }

  @mutation()
  UPDATE_REC_DIR(directory: string) {
    this.state.recDirectory = directory;
  }

  @mutation()
  UPDATE_REC_FORMAT(format: string) {
    this.state.recFormat = format;
  }

  private handleDbError(error: PouchDB.Core.Error): void {

    /* A 404 is normal on a cold start */
    if (error.status !== 404) {
      throw Error(
        `Problem with rtmp-output configuration document: ${error.message}`);
    }

    const outputId = OutputService.getUniqueId();
    const fOutput = new FOutput('ffmpeg_muxer', outputId);
    const audioEncoderId = EncoderService.getUniqueId();
    const audioEncoder = new FAudioEncoder('mf_aac', audioEncoderId);
    const videoEncoderId = EncoderService.getUniqueId();
    const videoEncoder = new FVideoEncoder('obs_x264', videoEncoderId);
    const advVideoEncoder = new FVideoEncoder('obs_x264', this.state.recAdvEncoderId);

    this.encoderService.addAudioEncoder(audioEncoderId, audioEncoder);
    this.encoderService.addVideoEncoder(this.state.recAdvEncoderId, advVideoEncoder);
    this.encoderService.addVideoEncoder(videoEncoderId, videoEncoder);
    this.outputService.addOutput(outputId, fOutput);

    this.outputService.setOutputVideoEncoder(outputId, videoEncoderId);
    this.outputService.setOutputAudioEncoder(outputId, audioEncoderId, 0);

    this.UPDATE_ADV_ENC(EncoderService.getUniqueId());
    this.UPDATE_SIMPLE_ENC(videoEncoderId);
    this.UPDATE_OUTPUT(outputId);
    this.UPDATE_REC_DIR(app.getPath('videos'));

    this.queueChange();
  }

  private syncConfig(result: ExistingDatabaseDocument) {
    this.UPDATE_REVISION(result._rev);
    this.UPDATE_ENCODER_MODE(result.recEncoderMode);
    this.UPDATE_ADV_ENC(result.recAdvEncoderId);
    this.UPDATE_SIMPLE_ENC(result.recSimpleEncoderId);
    this.UPDATE_OUTPUT(result.recOutputId);
    this.UPDATE_REC_DIR(result.recDirectory);
    this.UPDATE_REC_FORMAT(result.recFormat);
  }

  async initialize() {
    if (this.initialized) return;
    await this.outputService.initialize();

    await this.db.get(RecOutputService.initialState._id)
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
      _rev: this.state.revision
    }).then((response) => { this.handleChange(response); });
  }

  private generateFilename(): string {
    const now = new Date;
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_` +
      `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}-${now.getMilliseconds()}`;
  }

  start() {
    /* Right before we start, update the path with a valid filename */
    const path = `${this.state.recDirectory}\\${this.generateFilename()}.${this.state.recFormat}`;
    this.outputService.update(this.state.recOutputId, { path });

    console.log(`Starting recording with path ${path}`);

    this.outputService.startOutput(this.state.recOutputId);
  }

  stop() {
    this.outputService.stopOutput(this.state.recOutputId);
  }

  isActive(): boolean {
    return this.outputService.isOutputActive(this.state.recOutputId);
  }

  getAudioEncoderId(): string {
    return this.outputService.getAudioEncoder(this.state.recOutputId);
  }

  getVideoEncoderId(): string {
    return this.outputService.getVideoEncoder(this.state.recOutputId);
  }

  getProviderId(): string {
    return this.outputService.getOutputProvider(this.state.recOutputId);
  }

  getOutputId() {
    return this.state.recOutputId;
  }

  getCurrentMode(): EEncoderMode {
    return this.state.recEncoderMode;
  }

  setEncoderMode(mode: EEncoderMode) {
    const outputId = this.state.recOutputId;

    switch (mode) {
      case EEncoderMode.Advanced: {
        const encoderId = this.state.recAdvEncoderId;
        this.outputService.setOutputVideoEncoder(outputId, encoderId);
        this.UPDATE_ENCODER_MODE(EEncoderMode.Advanced);
        break;
      }
      case EEncoderMode.Simple:
        const encoderId = this.state.recSimpleEncoderId;
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
        encoderId = this.state.recAdvEncoderId;
        this.UPDATE_ADV_ENC(newEncoderId);
        break;
      case EEncoderMode.Simple:
        encoderId = this.state.recSimpleEncoderId;
        this.UPDATE_SIMPLE_ENC(newEncoderId);
        break;
    }

    this.encoderService.removeVideoEncoder(encoderId);
    this.encoderService.addVideoEncoder(newEncoderId, newEncoder);
    this.outputService.setOutputVideoEncoder(this.state.recOutputId, newEncoderId);

    this.queueChange();
  }

  /* We have no properties to work with.
   * So we wrap around the settings to make 
   * this a little bit more convenient. */
  updateFFmpegOutput(patch: object) {
    this.outputService.update(this.state.recOutputId, patch);
  }

  getFileDirectory(): string {
    /* We know this setting exists since we create the output with a default */
    return this.state.recDirectory;
  }

  setFileDirectory(directory: string) {
    this.UPDATE_REC_DIR(directory);
    this.queueChange();
  }

  getRecordingFormats(): string[] {
    return [
      'flv',
      'mp4',
      'mov',
      'mkv',
      'ts',
      'm3u8'
    ];
  }

  getRecordingFormat(): string {
    return this.state.recFormat;
  }

  setRecordingFormat(format: string) {
    this.UPDATE_REC_FORMAT(format);
    this.queueChange();
  }
}
