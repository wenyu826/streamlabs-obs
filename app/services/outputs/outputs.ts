import Vue from 'vue';
import { FOutput } from './output';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer, remote } from 'electron';
import { EncoderService } from '../encoders';
import { ProviderService } from '../providers';
import { Inject } from '../../util/injector';
import { PropertiesManager } from '../sources/properties-managers/properties-manager';
import { DefaultManager } from '../sources/properties-managers/default-manager';
import { TFormData } from 'components/shared/forms/Input';
import * as obs from '../obs-api';
import path from 'path';
import PouchDB from 'pouchdb';

type TOutputServiceState = Dictionary<FOutput>;

export class OutputService extends StatefulService<TOutputServiceState> {
  private initialized = false;
  private db = new PouchDB(path.join(remote.app.getPath('userData'), 'Outputs'));
  private propManagers: Dictionary<PropertiesManager> = {};
  private putQueues: Dictionary<any[]> = {};

  @Inject() providerService: ProviderService;
  @Inject() encoderService: EncoderService;
  
  static initialState: TOutputServiceState = {};

  static getUniqueId(): string {
    return 'output_' + ipcRenderer.sendSync('getUniqueId');
  }

  private async handleChange(response: PouchDB.Core.Response) {
    const queue = this.putQueues[response.id];

    this.UPDATE_REVISION(response.id, response.rev);
    
    queue.shift();

    if (queue.length > 0) {
      this.db.put({
        ... queue[0],
        _id: response.id,
        _rev: response.rev
      }).then((response) => { this.handleChange(response); });
    }
  }

  private async handleDeletion(response: PouchDB.Core.Response) {
    this.REMOVE_OUTPUT(response.id);

    this.propManagers[response.id].destroy();
    delete this.propManagers[response.id];
  }

  private buildChange(uniqueId: string, output: FOutput) {
    return {
      _id:      uniqueId,
      _rev:     output.revision,
      type:     output.type,
      settings: output.settings,
      audioEncoder: output.audioEncoder,
      videoEncoder: output.videoEncoder,
      provider: output.provider,
      delay:    output.delay,
      delayFlags: output.delayFlags
    };
  }

  private queueChange(uniqueId: string) {
    const queue = this.putQueues[uniqueId];
    const output = this.state[uniqueId];

    const change = this.buildChange(uniqueId, output);

    if (queue.push(change) !== 1) {
      return;
    }

    this.db.put(change)
      .then((response) => { this.handleChange(response); });
  }

  private async queueDeletion(uniqueId: string) {
    const queue = this.putQueues[uniqueId];
    const output = this.state[uniqueId];

    /* The array is dead, just empty it */
    queue.length = 0;

    this.db.remove({ _id: uniqueId, _rev: output.revision })
      .then((response) => { this.handleDeletion(response); });
  }

  private syncConfig(result: any): void {
    for (let i = 0; i < result.total_rows; ++i) {
      const entry = result.rows[i].doc;

      const output: FOutput = {
        revision: entry._rev,
        type: entry.type,
        settings: entry.settings,
        audioEncoder: entry.audioEncoder,
        videoEncoder: entry.videoEncoder,
        provider: entry.provider,
        delay: entry.delay,
        delayFlags: entry.delayFlags,
        flags: 0,
        starting: false,
        stopping: false,
        reconnecting: false,
        active: false
      };

      this.ADD_OUTPUT(entry._id, output);
      FOutput.init(output.type, entry._id, output.settings);

      /* To prevent database changes, set encoders/providers directly */
      /* Note that some outputs don't require encoders or providers,
       * we need to make sure that we stored one before attempting to
       * assign null, as that will cause a TypeError exception */

      const obsOutput = obs.OutputFactory.fromName(entry._id);

      if (entry.audioEncoder) {
        const obsAudioEncoder = obs.AudioEncoderFactory.fromName(entry.audioEncoder);
        /* FIXME TODO We need to take into account track here */
        obsOutput.setAudioEncoder(obsAudioEncoder, 0);
      }

      if (entry.videoEncoder) {
        const obsVideoEncoder = obs.VideoEncoderFactory.fromName(entry.videoEncoder);
        obsOutput.setVideoEncoder(obsVideoEncoder);
      }

      if (entry.provider) {
        const obsProvider = obs.ServiceFactory.fromName(entry.provider);
        obsOutput.service = obsProvider;
      }

      obsOutput.setDelay(entry.delay, entry.delayFlags);

      this.propManagers[entry._id] =
        new DefaultManager(obs.OutputFactory.fromName(entry._id), {});

      this.putQueues[entry._id] = [];
    }
  }

  async initialize() {
    if (this.initialized) return;
    await this.encoderService.initialize();
    await this.providerService.initialize();

    await this.db.allDocs({
      include_docs: true
    }).then((result: any) => { this.syncConfig(result); });

    this.initialized = true;
  }

  destroy() {
    const keys = Object.keys(this.state);

    for (let i = 0; i < keys.length; ++i) {
      const obsObject = obs.OutputFactory.fromName(keys[i]);

      if (obsObject)
        obsObject.release();
    }
  }

  @mutation()
  private UPDATE_REVISION(uniqueId: string, revision: string) {
    this.state[uniqueId].revision = revision;
  }

  @mutation()
  private ADD_OUTPUT(uniqueId: string, fOutput: FOutput) {
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
    const fOutput = this.state[uniqueId];
    fOutput.provider = providerId;
  }

  @mutation()
  private START_OUTPUT(uniqueId: string) {
    const fOutput = this.state[uniqueId];
    fOutput.active = true;
  }

  @mutation()
  private STOP_OUTPUT(uniqueId: string) {
    const fOutput = this.state[uniqueId];
    fOutput.active = false;
  }

  @mutation()
  private UPDATE_DELAY(uniqueId: string, delay: number) {
    this.state[uniqueId].delay = delay;
  }

  @mutation()
  private UPDATE_DELAY_FLAG(uniqueId: string, flags: number) {
    this.state[uniqueId].delayFlags = flags;
  }

  addOutput(uniqueId: string, output: FOutput) {
    const obsOutput = obs.OutputFactory.fromName(uniqueId);
    this.ADD_OUTPUT(uniqueId, output);

    /* No need for revision here since this is creation */

    this.putQueues[uniqueId] = [];
    this.queueChange(uniqueId);
    this.propManagers[uniqueId] = new DefaultManager(obsOutput, {});
  }

  removeOutput(uniqueId: string) {
    /* Release directly to avoid a third map lookup. */
    const output = obs.OutputFactory.fromName(uniqueId);
    output.release();

    this.queueDeletion(uniqueId);
    this.REMOVE_OUTPUT(uniqueId);
  }

  startOutput(uniqueId: string) {
    const output = obs.OutputFactory.fromName(uniqueId);
    const videoEncoder = output.getVideoEncoder();
    const audioEncoder = output.getAudioEncoder(0);

    /* If we previously reset video, the global context
     * will be invalid. As a result, just assign the encoders
     * the current global before we start streaming. */
    videoEncoder.setVideo(obs.VideoFactory.getGlobal());
    audioEncoder.setAudio(obs.AudioFactory.getGlobal());

    this.START_OUTPUT(uniqueId);
    return output.start();
  }

  stopOutput(uniqueId: string) {
    const output = obs.OutputFactory.fromName(uniqueId);

    output.stop();
    this.STOP_OUTPUT(uniqueId);
  }

  setOutputVideoEncoder(uniqueId: string, encoderId: string) {
    const videoEncoder = obs.VideoEncoderFactory.fromName(encoderId);
    const output = obs.OutputFactory.fromName(uniqueId);

    output.setVideoEncoder(videoEncoder);

    this.UPDATE_VIDEO_ENCODER(uniqueId, encoderId);
    this.queueChange(uniqueId);
  }

  setOutputAudioEncoder(uniqueId: string, encoderId: string, track: number) {
    const audioEncoder = obs.AudioEncoderFactory.fromName(encoderId);
    const output = obs.OutputFactory.fromName(uniqueId);

    output.setAudioEncoder(audioEncoder, track);
    
    this.UPDATE_AUDIO_ENCODER(uniqueId, encoderId);
    this.queueChange(uniqueId);
  }

  setOutputProvider(uniqueId: string, serviceId: string) {
    const service = obs.ServiceFactory.fromName(serviceId);
    const output = obs.OutputFactory.fromName(uniqueId);

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

  isOutputActive(uniqueId: string): boolean {
    return this.state[uniqueId].active;
  }

  isOutput(uniqueId: string) {
    const obsOutput: obs.IOutput = obs.OutputFactory.fromName(uniqueId);

    if (obsOutput) return true;

    return false;
  }

  update(uniqueId: string, patch: object) {
    const obsOutput = obs.OutputFactory.fromName(uniqueId);

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
    const obsOutput = obs.OutputFactory.fromName(uniqueId);
    const flags = this.state[uniqueId].delayFlags;

    obsOutput.setDelay(delay, flags);
    this.UPDATE_DELAY(uniqueId, delay);
    this.queueChange(uniqueId);
  }

  getDelay(uniqueId: string): number {
    return this.state[uniqueId].delay;
  }

  setDelayFlag(uniqueId: string, flags: number) {
    const obsOutput = obs.OutputFactory.fromName(uniqueId);
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

    const settings = obs.OutputFactory.fromName(uniqueId).settings;
    this.UPDATE_SETTINGS(uniqueId, settings);

    this.queueChange(uniqueId);
  }

  onStart(uniqueId: string, callback: (output: string) => void) {
    const obsOutput = obs.OutputFactory.fromName(uniqueId);

    obsOutput.on('start', callback);
  }

  onStop(uniqueId: string, callback: (output: string, code: number) => void) {
    const obsOutput = obs.OutputFactory.fromName(uniqueId);

    obsOutput.on('stop', callback);
  }

  onReconnect(uniqueId: string, callback: (output: string) => void) {
    const obsOutput = obs.OutputFactory.fromName(uniqueId);

    obsOutput.on('reconnect', callback);
  }

  onReconnectSuccess(uniqueId: string, callback: (output: string) => void) {
    const obsOutput = obs.OutputFactory.fromName(uniqueId);
    
    obsOutput.on('reconnect_success', callback);
  }

  getLastError(uniqueId: string): string {
    const obsOutput = obs.OutputFactory.fromName(uniqueId);

    return obsOutput.getLastError();
  }
}
