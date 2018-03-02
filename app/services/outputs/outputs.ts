import Vue from 'vue';
import { FOutput } from './output';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer } from 'electron';
import { EncoderService } from '../encoders';
import { ProviderService } from '../providers';
import { Inject } from '../../util/injector';
import { PropertiesManager } from '../sources/properties-managers/properties-manager';
import { DefaultManager } from '../sources/properties-managers/default-manager';
import * as obs from '../obs-api';

import PouchDB from 'pouchdb-core';
import PouchDBWebSQL from 'pouchdb-adapter-node-websql';
PouchDB.plugin(PouchDBWebSQL);

type TOutputServiceState = Dictionary<FOutput>;

export class OutputService extends StatefulService<TOutputServiceState> {
  private initialized = false;
  private db = new PouchDB('Outputs.sqlite3', { adapter: 'websql' });
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
      provider: output.provider
    };
  }

  private queueChange(uniqueId: string) {
    const queue = this.putQueues[uniqueId];
    const output = this.state[uniqueId];

    const change = this.buildChange(uniqueId, output);

    console.log(change);

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

      console.log(entry);

      const output: FOutput = {
        revision: entry._rev,
        type: entry.type,
        settings: entry.settings,
        audioEncoder: entry.audioEncoder,
        videoEncoder: entry.videoEncoder,
        provider: entry.provider,
        flags: 0,
        starting: false,
        stopping: false,
        reconnecting: false,
        active: false
      };

      this.ADD_OUTPUT(entry._id, output);
      FOutput.init(output.type, entry._id, output.settings);

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
  }

  startOutput(uniqueId: string) {
    const output = obs.OutputFactory.fromName(uniqueId);

    output.start();
    this.START_OUTPUT(uniqueId);
  }

  stopOutput(uniqueId: string) {
    const output = obs.OutputFactory.fromName(uniqueId);

    output.stop();
    this.STOP_OUTPUT(uniqueId);
  }

  setOutputEncoders(
    uniqueId: string,
    audioEncoderId: string,
    videoEncoderId: string
  ) {
    const audioEncoder = obs.AudioEncoderFactory.fromName(audioEncoderId);
    const videoEncoder = obs.VideoEncoderFactory.fromName(videoEncoderId);
    const output = obs.OutputFactory.fromName(uniqueId);

    output.setAudioEncoder(audioEncoder, 0);
    output.setVideoEncoder(videoEncoder);

    this.UPDATE_ENCODERS(uniqueId, audioEncoderId, videoEncoderId);

    this.queueChange(uniqueId);
  }

  setOutputProvider(uniqueId: string, serviceId: string) {
    const service = obs.ServiceFactory.fromName(serviceId);
    const output = obs.OutputFactory.fromName(uniqueId);

    output.service = service;

    this.UPDATE_PROVIDER(uniqueId, serviceId);

    this.queueChange(uniqueId);
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

  /* Output properties are garbage. We don't have 
   * form data for it since the properties are
   * pretty much unusable */
}
