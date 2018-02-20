import { FAudioEncoder, FVideoEncoder } from './encoder';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer } from 'electron';
import { getConfigFilePath } from '../config';
import * as obs from '../obs-api';
import Vue from 'vue';

import PouchDB from 'pouchdb-core';
import PouchDBWebSQL from 'pouchdb-adapter-node-websql';
PouchDB.plugin(PouchDBWebSQL);

export interface IEncoderServiceState {
  audioEncoders: Dictionary<FAudioEncoder>;
  videoEncoders: Dictionary<FVideoEncoder>;
}

export class EncoderService extends StatefulService<IEncoderServiceState> {
  private initialized = false;
  private audioDb = new PouchDB('AudioEncoders.sqlite3', { adapter: 'websql' });
  private videoDb = new PouchDB('VideoEncoders.sqlite3', { adapter: 'websql' });

  private syncVideoConfig(result: any): void {
    for (let i = 0; i < result.total_rows; ++i) {
      const entry = result.rows[i].doc;

      console.log(entry);

      const encoder: FVideoEncoder = {
        revision: entry._rev,
        type: entry.type,
        settings: entry.settings
      };

      this.ADD_VIDEO_ENCODER(entry._id, encoder);
      FVideoEncoder.init(encoder.type, entry._id, encoder.settings);
    }
  }

  private syncAudioConfig(result: any): void {
    for (let i = 0; i < result.total_rows; ++i) {
      const entry = result.rows[i].doc;

      console.log(entry);

      const encoder: FAudioEncoder = {
        revision: entry._rev,
        type: entry.type,
        settings: entry.settings
      };

      this.ADD_AUDIO_ENCODER(entry._id, encoder);
      FAudioEncoder.init(encoder.type, entry._id, encoder.settings);
    }
  }

  static initialState: IEncoderServiceState = {
    audioEncoders: {},
    videoEncoders: {}
  };

  static getUniqueId(): string {
    return 'encoder_' + ipcRenderer.sendSync('getUniqueId');
  }

  async initialize() {
    if (this.initialized) return;

    await this.audioDb.allDocs({
      include_docs: true
    }).then((result: any) => { this.syncAudioConfig(result); });

    await this.videoDb.allDocs({
      include_docs: true
    }).then((result: any) => { this.syncVideoConfig(result); });

    this.initialized = true;
  }

  @mutation()
  ADD_AUDIO_ENCODER(uniqueId: string, encoder: FAudioEncoder) {
    Vue.set(this.state.audioEncoders, uniqueId, encoder);
  }

  @mutation()
  ADD_VIDEO_ENCODER(uniqueId: string, encoder: FVideoEncoder) {
    Vue.set(this.state.videoEncoders, uniqueId, encoder);
  }

  @mutation()
  REMOVE_AUDIO_ENCODER(uniqueId: string) {
    Vue.delete(this.state.audioEncoders, uniqueId);
  }

  @mutation()
  REMOVE_VIDEO_ENCODER(uniqueId: string) {
    Vue.delete(this.state.videoEncoders, uniqueId);
  }

  addAudioEncoder(uniqueId: string, encoder: FAudioEncoder) {
    this.ADD_AUDIO_ENCODER(uniqueId, encoder);

    /* No need for revision here since this is creation */
    this.audioDb.put({
      _id:      uniqueId,
      type:     encoder.type,
      settings: encoder.settings
    });
  }

  addVideoEncoder(uniqueId: string, encoder: FVideoEncoder) {
    this.ADD_VIDEO_ENCODER(uniqueId, encoder);

    /* No need for revision here since this is creation */
    this.videoDb.put({
      _id:      uniqueId,
      type:     encoder.type,
      settings: encoder.settings
    });
  }

  removeAudioEncoder(uniqueId: string) {
    const encoder = obs.AudioEncoderFactory.fromName(uniqueId);
    encoder.release();

    this.REMOVE_AUDIO_ENCODER(uniqueId);
    // FIXME this.audioConfig.delete(uniqueId);
  }

  removeVideoEncoder(uniqueId: string) {
    const encoder = obs.AudioEncoderFactory.fromName(uniqueId);
    encoder.release();

    this.REMOVE_VIDEO_ENCODER(uniqueId);
    // FIXME this.videoConfig.delete(uniqueId);
  }

  isAudioEncoder(uniqueId: string) {
    const obsEncoder: obs.IAudioEncoder = obs.AudioEncoderFactory.fromName(
      uniqueId
    );

    if (obsEncoder) return true;

    return false;
  }

  isVideoEncoder(uniqueId: string) {
    const obsEncoder: obs.IVideoEncoder = obs.VideoEncoderFactory.fromName(
      uniqueId
    );

    if (obsEncoder) return true;

    return false;
  }
}
