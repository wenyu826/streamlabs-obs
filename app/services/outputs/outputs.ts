import Vue from 'vue';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer, remote } from 'electron';
import { EncoderService } from '../encoders';
import { ProviderService } from '../providers';
import { Inject } from '../../util/injector';
import { PropertiesManager } from '../sources/properties-managers/properties-manager';
import { DefaultManager } from '../sources/properties-managers/default-manager';
import { DBQueueManager } from 'services/common-config';
import {
  TFormData,
  setupConfigurableDefaults
} from 'components/shared/forms/Input';
import path from 'path';
import PouchDB from 'pouchdb';
import {
  ISettings,
  IService,
  IOutput,
  OutputFactory,
  VideoEncoderFactory,
  AudioEncoderFactory,
  ServiceFactory,
  VideoFactory,
  AudioFactory
} from 'services/obs-api';

type TOutputServiceState = Dictionary<IFOutput>;

interface IOutputContent {
  type: string;
  settings: ISettings;

  audioEncoder: string;
  videoEncoder: string;
  provider: string;

  delay: number;
  delayFlags: number;
}

interface IFOutput extends IOutputContent {
  isPersistent: boolean;
}

export class OutputService extends StatefulService<TOutputServiceState> {
  private initialized = false;
  private db = new DBQueueManager<IOutputContent>(
    path.join(remote.app.getPath('userData'), 'Outputs')
  );

  private propManagers: Dictionary<PropertiesManager> = {};

  @Inject() providerService: ProviderService;
  @Inject() encoderService: EncoderService;

  static initialState: TOutputServiceState = {};

  static getUniqueId(): string {
    return 'output_' + ipcRenderer.sendSync('getUniqueId');
  }

  private queueChange(uniqueId: string) {
    const output = this.state[uniqueId];

    if (!output.isPersistent) return;

    const change = {
      type: output.type,
      settings: output.settings,
      audioEncoder: output.audioEncoder,
      videoEncoder: output.videoEncoder,
      provider: output.provider,
      delay: output.delay,
      delayFlags: output.delayFlags
    };

    this.db.queueChange(uniqueId, change);
  }

  private syncConfig(
    result: PouchDB.Core.AllDocsResponse<IOutputContent>
  ): void {
    for (let i = 0; i < result.total_rows; ++i) {
      const entry = result.rows[i].doc;

      const output: IFOutput = {
        type: entry.type,
        settings: entry.settings,
        audioEncoder: entry.audioEncoder,
        videoEncoder: entry.videoEncoder,
        provider: entry.provider,
        delay: entry.delay,
        delayFlags: entry.delayFlags,
        isPersistent: true
      };

      this.ADD_OUTPUT(entry._id, output);

      let obsOutput = null;

      if (entry.settings)
        obsOutput = OutputFactory.create(entry.type, entry._id, entry.settings);
      else obsOutput = OutputFactory.create(entry.type, entry._id);

      if (entry.audioEncoder) {
        const obsAudioEncoder = AudioEncoderFactory.fromName(
          entry.audioEncoder
        );
        /* FIXME TODO We need to take into account track here */
        obsOutput.setAudioEncoder(obsAudioEncoder, 0);
      }

      if (entry.videoEncoder) {
        const obsVideoEncoder = VideoEncoderFactory.fromName(
          entry.videoEncoder
        );
        obsOutput.setVideoEncoder(obsVideoEncoder);
      }

      if (entry.provider) {
        const obsProvider = ServiceFactory.fromName(entry.provider);
        obsOutput.service = obsProvider;
      }

      obsOutput.setDelay(entry.delay, entry.delayFlags);

      this.propManagers[entry._id] = new DefaultManager(
        OutputFactory.fromName(entry._id),
        {}
      );
    }
  }

  async initialize() {
    if (this.initialized) return;
    await this.encoderService.initialize();
    await this.providerService.initialize();
    await this.db.initialize(response => this.syncConfig(response));

    this.initialized = true;
  }

  destroy() {
    const keys = Object.keys(this.state);

    for (let i = 0; i < keys.length; ++i) {
      const obsObject = OutputFactory.fromName(keys[i]);

      if (obsObject) obsObject.release();
    }
  }

  @mutation()
  private ADD_OUTPUT(uniqueId: string, fOutput: IFOutput) {
    Vue.set(this.state, uniqueId, fOutput);
  }

  @mutation()
  private REMOVE_OUTPUT(uniqueId: string) {
    Vue.delete(this.state, uniqueId);
  }

  @mutation()
  private UPDATE_SETTINGS(uniqueId: string, settings: object) {
    Vue.set(this.state[uniqueId], 'settings', settings);
  }

  @mutation()
  private UPDATE_ENCODERS(
    uniqueId: string,
    audioEncoderId: string,
    videoEncoderId: string
  ) {
    const fOutput = this.state[uniqueId];

    fOutput.audioEncoder = audioEncoderId;
    fOutput.videoEncoder = videoEncoderId;
  }

  @mutation()
  private UPDATE_AUDIO_ENCODER(uniqueId: string, encoderId: string) {
    this.state[uniqueId].audioEncoder = encoderId;
  }

  @mutation()
  private UPDATE_VIDEO_ENCODER(uniqueId: string, encoderId: string) {
    this.state[uniqueId].videoEncoder = encoderId;
  }

  @mutation()
  private UPDATE_PROVIDER(uniqueId: string, providerId: string) {
    this.state[uniqueId].provider = providerId;
  }

  @mutation()
  private UPDATE_DELAY(uniqueId: string, delay: number) {
    this.state[uniqueId].delay = delay;
  }

  @mutation()
  private UPDATE_DELAY_FLAG(uniqueId: string, flags: number) {
    this.state[uniqueId].delayFlags = flags;
  }

  addOutput(
    type: string,
    uniqueId: string,
    isPersistent?: boolean,
    settings?: ISettings
  ) {
    let obsOutput = null;

    if (isPersistent === undefined) isPersistent = true;
    if (settings) obsOutput = OutputFactory.create(type, uniqueId, settings);
    else obsOutput = OutputFactory.create(type, uniqueId);

    const output: IFOutput = {
      type,
      settings,
      audioEncoder: '',
      videoEncoder: '',
      provider: '',
      delay: 0,
      delayFlags: 0,
      isPersistent
    };

    this.ADD_OUTPUT(uniqueId, output);

    setupConfigurableDefaults(obsOutput);
    this.UPDATE_SETTINGS(uniqueId, obsOutput.settings);

    this.db.addQueue(uniqueId);
    this.queueChange(uniqueId);
    this.propManagers[uniqueId] = new DefaultManager(obsOutput, {});
  }

  removeOutput(uniqueId: string) {
    const output = OutputFactory.fromName(uniqueId);
    output.release();

    this.propManagers[uniqueId].destroy();
    delete this.propManagers[uniqueId];

    if (this.state.isPersistent) this.db.queueDeletion(uniqueId);

    this.REMOVE_OUTPUT(uniqueId);
  }

  startOutput(uniqueId: string) {
    const output = OutputFactory.fromName(uniqueId);
    const videoEncoder = output.getVideoEncoder();
    const audioEncoder = output.getAudioEncoder(0);

    /* If we previously reset video, the global context
     * will be invalid. As a result, just assign the encoders
     * the current global before we start streaming. */
    videoEncoder.setVideo(VideoFactory.getGlobal());
    audioEncoder.setAudio(AudioFactory.getGlobal());

    return output.start();
  }

  stopOutput(uniqueId: string) {
    const output = OutputFactory.fromName(uniqueId);

    output.stop();
  }

  setOutputVideoEncoder(uniqueId: string, encoderId: string) {
    const videoEncoder = VideoEncoderFactory.fromName(encoderId);
    const output = OutputFactory.fromName(uniqueId);

    output.setVideoEncoder(videoEncoder);

    this.UPDATE_VIDEO_ENCODER(uniqueId, encoderId);
    this.queueChange(uniqueId);
  }

  setOutputAudioEncoder(uniqueId: string, encoderId: string, track: number) {
    const audioEncoder = AudioEncoderFactory.fromName(encoderId);
    const output = OutputFactory.fromName(uniqueId);

    output.setAudioEncoder(audioEncoder, track);

    this.UPDATE_AUDIO_ENCODER(uniqueId, encoderId);
    this.queueChange(uniqueId);
  }

  setOutputProvider(uniqueId: string, serviceId: string) {
    const service = ServiceFactory.fromName(serviceId);
    const output = OutputFactory.fromName(uniqueId);

    output.service = service;

    this.UPDATE_PROVIDER(uniqueId, serviceId);
    this.queueChange(uniqueId);
  }

  getVideoEncoder(uniqueId: string): string {
    return this.state[uniqueId].videoEncoder;
  }

  getAudioEncoder(uniqueId: string): string {
    return this.state[uniqueId].audioEncoder;
  }

  getOutputProvider(uniqueId: string): string {
    return this.state[uniqueId].provider;
  }

  isOutput(uniqueId: string) {
    const obsOutput: IOutput = OutputFactory.fromName(uniqueId);

    if (obsOutput) return true;

    return false;
  }

  update(uniqueId: string, patch: object) {
    const obsOutput = OutputFactory.fromName(uniqueId);

    const settings = obsOutput.settings;
    const changes = Object.keys(patch);

    for (let i = 0; i < changes.length; ++i) {
      const changed = changes[i];
      settings[changed] = patch[changed];
    }

    obsOutput.update(settings);
    this.UPDATE_SETTINGS(uniqueId, settings);

    this.queueChange(uniqueId);
  }

  /* We somewhat wrap over delay since we
   * can't fetch flags from obs state. We
   * hold it instead and handle it as if
   * it were persistent state */
  setDelay(uniqueId: string, delay: number) {
    const obsOutput = OutputFactory.fromName(uniqueId);
    const flags = this.state[uniqueId].delayFlags;

    obsOutput.setDelay(delay, flags);
    this.UPDATE_DELAY(uniqueId, delay);
    this.queueChange(uniqueId);
  }

  getDelay(uniqueId: string): number {
    return this.state[uniqueId].delay;
  }

  setDelayFlag(uniqueId: string, flags: number) {
    const obsOutput = OutputFactory.fromName(uniqueId);
    const delay = this.state[uniqueId].delay;

    obsOutput.setDelay(delay, flags);
    this.UPDATE_DELAY_FLAG(uniqueId, flags);
    this.queueChange(uniqueId);
  }

  getDelayFlag(uniqueId: string): number {
    return this.state[uniqueId].delayFlags;
  }

  getPropertiesFormData(uniqueId: string) {
    return this.propManagers[uniqueId].getPropertiesFormData();
  }

  setPropertiesFormData(uniqueId: string, formData: TFormData) {
    this.propManagers[uniqueId].setPropertiesFormData(formData);

    const settings = OutputFactory.fromName(uniqueId).settings;
    this.UPDATE_SETTINGS(uniqueId, settings);

    this.queueChange(uniqueId);
  }

  onStart(uniqueId: string, callback: (output: string) => void) {
    const obsOutput = OutputFactory.fromName(uniqueId);

    obsOutput.on('start', callback);
  }

  onStop(uniqueId: string, callback: (output: string, code: number) => void) {
    const obsOutput = OutputFactory.fromName(uniqueId);

    obsOutput.on('stop', callback);
  }

  onReconnect(uniqueId: string, callback: (output: string) => void) {
    const obsOutput = OutputFactory.fromName(uniqueId);

    obsOutput.on('reconnect', callback);
  }

  onReconnectSuccess(uniqueId: string, callback: (output: string) => void) {
    const obsOutput = OutputFactory.fromName(uniqueId);

    obsOutput.on('reconnect_success', callback);
  }

  getLastError(uniqueId: string): string {
    const obsOutput = OutputFactory.fromName(uniqueId);

    return obsOutput.getLastError();
  }
}
