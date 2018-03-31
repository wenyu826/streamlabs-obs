import { OutputService } from './outputs';
import { ProviderService } from './providers';
import { EncoderService } from './encoders';
import { StatefulService, mutation } from './stateful-service';
import { EProviderMode, EEncoderMode } from './rtmp-output';
import { Inject } from 'util/injector';
import PouchDB from 'pouchdb';
import { DBQueueManager } from 'services/common-config';
import { remote } from 'electron';
import path from 'path';
import { OutputFactory } from 'services/obs-api';

const app = remote.app;

const docId = 'rec-output-settings';

/* A wrapper class that handles the global rtmp output 
 * and it's associated objects and state. */

interface RecOutputContent {
  recOutputId: string;

  /* Here we make two encoders. They have two
   * separate and different sets of settings.
   * When the user changes from one to the other,
   * it will keep the settings of the one they switched
   * from, including the type of encoder. We simply,
   * won't use it until it's asked of us. */
  recSimpleEncoderId: string;
  recAdvEncoderId: string;
  recEncoderMode: EEncoderMode;
  recDirectory: string;
  recFormat: string;
}

interface RecOutputServiceState extends RecOutputContent {}

type ExistingDatabaseDocument = PouchDB.Core.ExistingDocument<
  RecOutputServiceState
>;

export class RecOutputService extends StatefulService<RecOutputServiceState> {
  private initialized = false;
  private db = new DBQueueManager<RecOutputContent>(
    path.join(remote.app.getPath('userData'), 'RecOutputService')
  );

  static initialState: RecOutputServiceState = {
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

  private createConfig(): void {
    const outputId = OutputService.getUniqueId();
    this.outputService.addOutput('ffmpeg_muxer', outputId);

    const audioEncoderId = EncoderService.getUniqueId();
    this.encoderService.addAudioEncoder('mf_aac', audioEncoderId);

    const videoEncoderId = EncoderService.getUniqueId();
    this.encoderService.addVideoEncoder('obs_x264', videoEncoderId);

    const advVideoEncoderId = EncoderService.getUniqueId();
    this.encoderService.addVideoEncoder('obs_x264', advVideoEncoderId);

    this.outputService.setOutputVideoEncoder(outputId, videoEncoderId);
    this.outputService.setOutputAudioEncoder(outputId, audioEncoderId, 0);

    this.UPDATE_ADV_ENC(advVideoEncoderId);
    this.UPDATE_SIMPLE_ENC(videoEncoderId);
    this.UPDATE_OUTPUT(outputId);
    this.UPDATE_REC_DIR(app.getPath('videos'));

    this.db.addQueue(docId);
    this.queueChange();
  }

  private syncConfig(response: PouchDB.Core.AllDocsResponse<RecOutputContent>) {
    for (let i = 0; i < response.total_rows; ++i) {
      const result = response.rows[i].doc;

      if (result._id !== docId) {
        console.warn('Unknown document found in recording output database!');
        continue;
      }

      this.UPDATE_ENCODER_MODE(result.recEncoderMode);
      this.UPDATE_ADV_ENC(result.recAdvEncoderId);
      this.UPDATE_SIMPLE_ENC(result.recSimpleEncoderId);
      this.UPDATE_OUTPUT(result.recOutputId);
      this.UPDATE_REC_DIR(result.recDirectory);
      this.UPDATE_REC_FORMAT(result.recFormat);

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

  private generateFilename(): string {
    const now = new Date();
    return (
      `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_` +
      `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}-${now.getMilliseconds()}`
    );
  }

  start() {
    /* Right before we start, update the path with a valid filename */
    const path = `${this.state.recDirectory}\\${this.generateFilename()}.${
      this.state.recFormat
    }`;
    this.outputService.update(this.state.recOutputId, { path });
    this.outputService.startOutput(this.state.recOutputId);
  }

  stop() {
    this.outputService.stopOutput(this.state.recOutputId);
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
    this.encoderService.addVideoEncoder(type, newEncoderId);
    this.outputService.setOutputVideoEncoder(
      this.state.recOutputId,
      newEncoderId
    );

    this.queueChange();
  }

  /* We have no properties to work with.
   * So we wrap around the settings to make 
   * this a little bit more convenient. */
  updateFFmpegOutput(patch: object) {
    this.outputService.update(this.state.recOutputId, patch);
  }

  getFileDirectory() {
    /* We know this setting exists since we create the output with a default */
    return this.state.recDirectory;
  }

  setFileDirectory(directory: string) {
    this.UPDATE_REC_DIR(directory);
    this.queueChange();
  }

  getRecordingFormats(): string[] {
    return ['flv', 'mp4', 'mov', 'mkv', 'ts', 'm3u8'];
  }

  getRecordingFormat(): string {
    return this.state.recFormat;
  }

  setRecordingFormat(format: string) {
    this.UPDATE_REC_FORMAT(format);
    this.queueChange();
  }
}
