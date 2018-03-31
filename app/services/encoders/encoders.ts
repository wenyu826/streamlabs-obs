import { StatefulService, mutation } from 'services/stateful-service';
import { ipcRenderer, remote } from 'electron';
import {
  TFormData,
  INumberInputValue,
  setupConfigurableDefaults
} from 'components/shared/forms/Input';
import { PropertiesManager } from 'services/sources/properties-managers/properties-manager';
import { DefaultManager } from 'services/sources/properties-managers/default-manager';
import { DBQueueManager } from 'services/common-config';
import Vue from 'vue';
import PouchDB from 'pouchdb';
import {
  IAudioEncoder,
  IVideoEncoder,
  AudioEncoderFactory,
  VideoEncoderFactory,
  VideoFactory,
  AudioFactory,
  ServiceFactory,
  EPropertyType,
  EListFormat,
  ISettings
} from 'services/obs-api';
import path from 'path';

type TEncoderServiceState = Dictionary<IFEncoder>;

interface IEncoderContent {
  type: string;
  settings: ISettings;
  isAudio: boolean;
}

interface IFEncoder extends IEncoderContent {
  isPersistent: boolean;
}

export class EncoderService extends StatefulService<TEncoderServiceState> {
  private initialized = false;
  private propManagers: Dictionary<PropertiesManager> = {};
  private db = new DBQueueManager<IEncoderContent>(
    path.join(remote.app.getPath('userData'), 'Encoders')
  );

  private aacBitrateMap: string[] = [];

  private populateAACBitrateMap() {
    const types = AudioEncoderFactory.types();

    for (let i = 0; i < types.length; ++i) {

    }

    const encoders = ['ffmpeg_aac', 'mf_aac', 'libfdk_aac', 'CoreAudio_AAC'];

    for (let i = 0; i < encoders.length; ++i) {
        
    }
  }

  private queueChange(uniqueId: string) {
    const encoder = this.state[uniqueId];

    if (!encoder.isPersistent) return;

    const change = {
      type: encoder.type,
      settings: encoder.settings,
      isAudio: encoder.isAudio
    };

    this.db.queueChange(uniqueId, change);
  }

  private async queueDeletion(uniqueId: string) {
    this.propManagers[uniqueId].destroy();
    delete this.propManagers[uniqueId];

    if (this.state.isPersistent) this.db.queueDeletion(uniqueId);

    this.REMOVE_ENCODER(uniqueId);
  }

  private syncConfig(result: any): void {
    for (let i = 0; i < result.total_rows; ++i) {
      const entry = result.rows[i].doc;

      const encoder: IFEncoder = {
        type: entry.type,
        settings: entry.settings,
        isAudio: entry.isAudio,
        isPersistent: true
      };

      this.ADD_ENCODER(entry._id, encoder);

      let obsEncoder = null;

      if (encoder.isAudio) {
        if (entry.settings)
          obsEncoder = AudioEncoderFactory.create(
            entry.type,
            entry._id,
            entry.settings
          );
        else obsEncoder = AudioEncoderFactory.create(entry.type, entry._id);
      } else {
        if (entry.settings)
          obsEncoder = VideoEncoderFactory.create(
            entry.type,
            entry._id,
            entry.settings
          );
        else obsEncoder = VideoEncoderFactory.create(entry.type, entry._id);
      }

      this.propManagers[entry._id] = new DefaultManager(obsEncoder, {});
    }
  }

  static initialState: TEncoderServiceState = {};

  static getUniqueId(): string {
    return 'encoder_' + ipcRenderer.sendSync('getUniqueId');
  }

  async initialize() {
    if (this.initialized) return;

    await this.db.initialize(response => this.syncConfig(response));

    this.initialized = true;
  }

  destroy() {
    const keys = Object.keys(this.state);

    for (let i = 0; i < keys.length; ++i) {
      let obsObject = null;

      if (this.state[keys[i]].isAudio)
        obsObject = AudioEncoderFactory.fromName(keys[i]);
      else obsObject = VideoEncoderFactory.fromName(keys[i]);

      if (obsObject) obsObject.release();
    }
  }

  @mutation()
  ADD_ENCODER(uniqueId: string, encoder: IFEncoder) {
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

  addAudioEncoder(
    type: string,
    uniqueId: string,
    isPersistent?: boolean,
    settings?: ISettings
  ) {
    let obsEncoder: IAudioEncoder = null;

    if (isPersistent === undefined) isPersistent = true;
    if (settings)
      obsEncoder = AudioEncoderFactory.create(type, uniqueId, settings);
    else obsEncoder = AudioEncoderFactory.create(type, uniqueId);

    const encoder: IFEncoder = {
      settings,
      type,
      isAudio: true,
      isPersistent
    };

    this.ADD_ENCODER(uniqueId, encoder);

    setupConfigurableDefaults(obsEncoder);
    this.UPDATE_SETTINGS(uniqueId, obsEncoder.settings);

    this.db.addQueue(uniqueId);
    this.queueChange(uniqueId);
    this.propManagers[uniqueId] = new DefaultManager(
      AudioEncoderFactory.fromName(uniqueId),
      {}
    );
  }

  addVideoEncoder(
    type: string,
    uniqueId: string,
    isPersistent?: boolean,
    settings?: ISettings
  ) {
    let obsEncoder: IVideoEncoder = null;

    if (isPersistent === undefined) isPersistent = true;
    if (settings)
      obsEncoder = VideoEncoderFactory.create(type, uniqueId, settings);
    else obsEncoder = VideoEncoderFactory.create(type, uniqueId);

    const encoder: IFEncoder = {
      settings,
      type,
      isAudio: false,
      isPersistent
    };

    this.ADD_ENCODER(uniqueId, encoder);

    setupConfigurableDefaults(obsEncoder);
    this.UPDATE_SETTINGS(uniqueId, obsEncoder.settings);

    this.db.addQueue(uniqueId);
    this.queueChange(uniqueId);
    this.propManagers[uniqueId] = new DefaultManager(
      VideoEncoderFactory.fromName(uniqueId),
      {}
    );
  }

  removeAudioEncoder(uniqueId: string) {
    const encoder = AudioEncoderFactory.fromName(uniqueId);
    encoder.release();

    this.queueDeletion(uniqueId);
  }

  removeVideoEncoder(uniqueId: string) {
    const encoder = VideoEncoderFactory.fromName(uniqueId);
    encoder.release();

    this.queueDeletion(uniqueId);
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

  getAvailableVideoEncoders(): string[] {
    /* Media foundation video encoders suck */
    const blacklist = ['mf_h264_nvenc', 'mf_h264_vce', 'mf_h264_qsv'];

    return VideoEncoderFactory.types().filter(
      type => !blacklist.includes(type)
    );
  }

  getAvailableAudioEncoders(): string[] {
    return AudioEncoderFactory.types();
  }

  setBitrate(uniqueId: string, bitrate: number) {
    const encoder = this.state[uniqueId];

    let obsEncoder = null;

    if (encoder.isAudio) obsEncoder = AudioEncoderFactory.fromName(uniqueId);
    else obsEncoder = VideoEncoderFactory.fromName(uniqueId);

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
    else settings = VideoEncoderFactory.fromName(uniqueId).settings;

    this.UPDATE_SETTINGS(uniqueId, settings);
    this.queueChange(uniqueId);
  }

  getBestAudioEncoderId() {}
}
