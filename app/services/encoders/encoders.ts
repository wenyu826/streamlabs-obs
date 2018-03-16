import { FAudioEncoder, FVideoEncoder, FEncoder } from './encoder';
import { StatefulService, mutation } from 'services/stateful-service';
import { ipcRenderer } from 'electron';
import { TFormData, INumberInputValue } from 'components/shared/forms/Input';
import { PropertiesManager } from 'services/sources/properties-managers/properties-manager';
import { DefaultManager } from 'services/sources/properties-managers/default-manager';
import Vue from 'vue';
import PouchDB from 'pouchdb-core';
import PouchDBWebSQL from 'pouchdb-adapter-node-websql';
import { 
  AudioEncoderFactory, 
  VideoEncoderFactory,
  VideoFactory,
  AudioFactory,
  ServiceFactory,
  EPropertyType,
  EListFormat
} from 'services/obs-api';

PouchDB.plugin(PouchDBWebSQL);

type TEncoderServiceState = Dictionary<FEncoder>;

export class EncoderService extends StatefulService<TEncoderServiceState> {
  private initialized = false;
  private propManagers: Dictionary<PropertiesManager> = {};
  private db = new PouchDB('Encoders.sqlite3', { adapter: 'websql' });
  private putQueues: Dictionary<any[]> = {};

/* handleChange and queueChange might be abstracted away
   * at some point but I'm unsure of a good way to to do it
   * in Javascript. */
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
    this.propManagers[response.id].destroy();
    delete this.propManagers[response.id];
  }

  private queueChange(uniqueId: string) {
    const queue = this.putQueues[uniqueId];
    const provider = this.state[uniqueId];

    const change = {
      _id:      uniqueId,
      type:     provider.type,
      settings: provider.settings,
      isAudio:  provider.isAudio
    };

    if (queue.push(change) !== 1) {
      return;
    }

    this.db.put({
      ... change,
      _rev: this.state[uniqueId].revision
    }).then((response) => { this.handleChange(response); });
  }

  private async queueDeletion(uniqueId: string) {
    const queue = this.putQueues[uniqueId];
    const encoder = this.state[uniqueId];

    /* The array is dead, just empty it */
    queue.length = 0;

    this.db.remove({ _id: uniqueId, _rev: encoder.revision })
      .then((response) => { this.handleDeletion(response); });
  }

  private syncConfig(result: any): void {
    for (let i = 0; i < result.total_rows; ++i) {
      const entry = result.rows[i].doc;

      const encoder: FVideoEncoder = {
        revision: entry._rev,
        type: entry.type,
        settings: entry.settings,
        isAudio: entry.isAudio
      };

      this.ADD_ENCODER(entry._id, encoder);

      let obsEncoder = null;

      if (encoder.isAudio) {
        FAudioEncoder.init(encoder.type, entry._id, encoder.settings);
        obsEncoder = AudioEncoderFactory.fromName(entry._id);
      } else {
        FVideoEncoder.init(encoder.type, entry._id, encoder.settings);
        obsEncoder = VideoEncoderFactory.fromName(entry._id);
      }

      this.propManagers[entry._id] = 
        new DefaultManager(obsEncoder, {});

      this.putQueues[entry._id] = [];
    }
  }

  static initialState: TEncoderServiceState = {};

  static getUniqueId(): string {
    return 'encoder_' + ipcRenderer.sendSync('getUniqueId');
  }

  async initialize() {
    if (this.initialized) return;

    await this.db.allDocs({
      include_docs: true
    }).then((result: any) => { this.syncConfig(result); });

    this.initialized = true;
  }

  @mutation()
  UPDATE_REVISION(uniqueId: string, revision: string) {
    this.state[uniqueId].revision = revision;
  }

  @mutation()
  ADD_ENCODER(uniqueId: string, encoder: FVideoEncoder) {
    Vue.set(this.state, uniqueId, encoder);
  }

  @mutation()
  REMOVE_ENCODER(uniqueId: string) {
    Vue.delete(this.state, uniqueId);
  }

  @mutation()
  private UPDATE_SETTINGS(uniqueId: string, settings: any) {
    this.state[uniqueId].settings = settings;
  }

  addAudioEncoder(uniqueId: string, encoder: FAudioEncoder) {
    this.ADD_ENCODER(uniqueId, encoder);

    this.putQueues[uniqueId] = [];
    this.queueChange(uniqueId);
    this.propManagers[uniqueId] =
      new DefaultManager(AudioEncoderFactory.fromName(uniqueId), {});
  }

  addVideoEncoder(uniqueId: string, encoder: FVideoEncoder) {
    this.ADD_ENCODER(uniqueId, encoder);

    this.putQueues[uniqueId] = [];
    this.queueChange(uniqueId);
    this.propManagers[uniqueId] =
      new DefaultManager(VideoEncoderFactory.fromName(uniqueId), {});
  }

  removeAudioEncoder(uniqueId: string) {
    const encoder = AudioEncoderFactory.fromName(uniqueId);
    encoder.release();

    this.queueDeletion(uniqueId);
    this.REMOVE_ENCODER(uniqueId);
  }

  removeVideoEncoder(uniqueId: string) {
    const encoder = VideoEncoderFactory.fromName(uniqueId);
    encoder.release();

    this.queueDeletion(uniqueId);
    this.REMOVE_ENCODER(uniqueId);
  }

  isAudioEncoder(uniqueId: string) {
    const obsEncoder = AudioEncoderFactory.fromName(uniqueId);

    if (obsEncoder) return true;

    return false;
  }

  isVideoEncoder(uniqueId: string) {
    const obsEncoder = VideoEncoderFactory.fromName(uniqueId);

    if (obsEncoder) return true;

    return false;
  }

  /* The simple form data is different in that it only contains
   * the common settings of bitrate, and encoder type. It's also
   * not controlled by properties at all, this service does instead. */
  getAvailableVideoEncoders(): string[] {
    
    /* Media foundation video encoders suck */
    const blacklist = [
      'mf_h264_nvenc', 
      'mf_h264_vce',
      'mf_h264_qsv'
    ];

    return VideoEncoderFactory.types()
      .filter(type => !blacklist.includes(type));
  }

  getAvailableAudioEncoders(): string[] {
    return AudioEncoderFactory.types();
  }

  setBitrate(uniqueId: string, bitrate: number) {
    const encoder = this.state[uniqueId];

    let obsEncoder = null;

    if (encoder.isAudio)
      obsEncoder = AudioEncoderFactory.fromName(uniqueId);
    else 
    obsEncoder = VideoEncoderFactory.fromName(uniqueId);

    const settings = obsEncoder.settings;
    settings['bitrate'] = bitrate;

    this.UPDATE_SETTINGS(uniqueId, settings);
    obsEncoder.update(settings);
    this.queueChange(uniqueId);
  }

  getPropertyFormData(uniqueId: string) {
    return this.propManagers[uniqueId].getPropertiesFormData();
  }

  setPropertyFormData(uniqueId: string, formData: TFormData) {
    const encoder = this.state[uniqueId];
    this.propManagers[uniqueId].setPropertiesFormData(formData);

    let settings = null;

    if (encoder.isAudio)
      settings = AudioEncoderFactory.fromName(uniqueId).settings;
    else 
      settings = VideoEncoderFactory.fromName(uniqueId).settings;

    this.UPDATE_SETTINGS(uniqueId, settings);
    this.queueChange(uniqueId);
  }
}
