import Vue from 'vue';
import { FOutput } from './output';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer } from 'electron';
import { EncoderService } from '../encoders';
import { ProviderService } from '../providers';
import { Inject } from '../../util/injector';
import * as obs from '../obs-api';

import PouchDB from 'pouchdb-core';
import PouchDBWebSQL from 'pouchdb-adapter-node-websql';
PouchDB.plugin(PouchDBWebSQL);

interface IOutputServiceState {
  outputs: Dictionary<FOutput>;
}

export class OutputService extends StatefulService<IOutputServiceState> {
  private initialized = false;
  private db = new PouchDB('Outputs.sqlite3', { adapter: 'websql' });

  @Inject() providerService: ProviderService;
  @Inject() encoderService: EncoderService;
  
  static initialState: IOutputServiceState = {
    outputs: {}
  };

  static getUniqueId(): string {
    return 'output_' + ipcRenderer.sendSync('getUniqueId');
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

    if (!fOutput) {
      console.log('State is bad!');
      console.log(`${uniqueId}`);
      console.log(`${this.state.outputs}`);
    }

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
    this.ADD_OUTPUT(uniqueId, output);

    /* No need for revision here since this is creation */
    this.db.put({
      _id:      uniqueId,
      type:     output.type,
      settings: output.settings,
      audioEncoder: output.audioEncoder,
      videoEncoder: output.videoEncoder,
      provider: output.provider
    });
  }

  removeOutput(uniqueId: string) {
    /* Release directly to avoid a third map lookup. */
    const output = obs.OutputFactory.fromName(uniqueId);
    output.release();

    this.REMOVE_OUTPUT(uniqueId);

    // FIXME this.config.delete(uniqueId);
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
    // FIXME this.config.set(`${uniqueId}.audioEncoder`, audioEncoderId);
    // FIXME this.config.set(`${uniqueId}.videoEncoder`, videoEncoderId);
  }

  setOutputService(uniqueId: string, serviceId: string) {
    const service = obs.ServiceFactory.fromName(serviceId);
    const output = obs.OutputFactory.fromName(uniqueId);

    output.service = service;

    this.UPDATE_PROVIDER(uniqueId, serviceId);
    // FIXME this.config.set(`${uniqueId}.provider`, serviceId);
  }

  isOutputActive(uniqueId: string): boolean {
    return this.state[uniqueId].active;
  }

  isOutput(uniqueId: string) {
    const obsOutput: obs.IOutput = obs.OutputFactory.fromName(uniqueId);

    if (obsOutput) return true;

    return false;
  }
}
