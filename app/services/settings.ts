/* This service is meant to help consolidate
 * all the general configuration operations
 * into a single location and database. 
 * This file should change anytime our general
 * settings change. This is because the layout
 * of the settings is saved as a typescript type
 * meaning we can access settings in a typesafe way
 * to avoid typos and prevent not setting defaults. */

import PouchDB from 'pouchdb';
import { DBQueueManager } from 'services/common-config';
import { StatefulService, mutation } from 'services/stateful-service';
import * as ObjectPath from 'object-path';
import { remote } from 'electron';
import path from 'path';
import {
  ISettings,
  EVideoFormat,
  EColorSpace,
  ERangeType,
  EScaleType,
  VideoFactory,
  AudioFactory,
  ESpeakerLayout,
  Global
} from './obs-api';

export enum ESettingsType {
  General = 'General',
  TCP = 'TCP',
  NamedPipe = 'NamedPipe',
  WebSockets = 'WebSockets',
  Audio = 'Audio',
  Video = 'Video',
  Delay = 'Delay'
}

interface IGeneralSettings {
  KeepRecordingWhenStreamStops: boolean;
  RecordWhenStreaming: boolean;
  WarnBeforeStartingStream: boolean;
  WarnBeforeStoppingStream: boolean;
  SnappingEnabled: boolean;
  SnapDistance: number;
  ScreenSnapping: boolean;
  SourceSnapping: boolean;
  CenterSnapping: boolean;
}

interface ITCPSettings {
  Enabled: boolean;
  AllowRemote: boolean;
  Port: number;
}

interface INamedPipeSettings {
  Enabled: boolean;
  PipeName: string;
}

interface IWebSocketsSettings {
  Enabled: boolean;
  AllowRemote: boolean;
  Port: number;
}

interface IAudioSettings {
  SampleRate: number;
  SpeakerLayout: number;
  MonitoringDeviceName: string;
  MonitoringDeviceId: string;
}

interface IVideoSettings {
  BaseResolution: string;
  OutputResolution: string;
  DownscaleFilter: number;
  ColorFormat: number;
  ColorSpace: number;
  ColorRange: number;
  FPSType: number;
  FPSCommon: number;
  FPSInt: number;
  FPSNum: number;
  FPSDen: number;
}

interface IDelaySettings {
  Enabled: boolean;
  ReconnectPreserve: boolean;
  Seconds: number;
}

interface ISettingsStorageContent {
  General: IGeneralSettings;
  TCP: ITCPSettings;
  NamedPipe: INamedPipeSettings;
  WebSockets: IWebSocketsSettings;
  Audio: IAudioSettings;
  Video: IVideoSettings;
  Delay: IDelaySettings;
}

interface ISettingsStorageState extends ISettingsStorageContent {}

export interface IResolution {
  width: number;
  height: number;
}

export enum EFPSType {
  Common,
  Integer,
  Fraction
}

export class SettingsStorageService extends StatefulService<
  ISettingsStorageState
> {
  private initialized = false;
  private putQueue: ISettingsStorageState[] = [];
  private db = new DBQueueManager(
    path.join(remote.app.getPath('userData'), 'Settings')
  );

  protected static initialState: ISettingsStorageState = {
    General: {
      KeepRecordingWhenStreamStops: false,
      RecordWhenStreaming: false,
      WarnBeforeStartingStream: true,
      WarnBeforeStoppingStream: false,
      SnappingEnabled: true,
      SnapDistance: 10,
      ScreenSnapping: true,
      SourceSnapping: true,
      CenterSnapping: false
    },
    TCP: {
      Enabled: false,
      AllowRemote: false,
      Port: 59651
    },
    NamedPipe: {
      Enabled: true,
      PipeName: 'slobs'
    },
    WebSockets: {
      Enabled: false,
      AllowRemote: false,
      Port: 59650
    },
    Audio: {
      SampleRate: 44100,
      SpeakerLayout: ESpeakerLayout.Stereo,
      MonitoringDeviceName: 'Default',
      MonitoringDeviceId: 'default'
    },
    Video: {
      BaseResolution: '1920x1080',
      OutputResolution: '1280x720',
      ColorFormat: EVideoFormat.NV12,
      ColorSpace: EColorSpace.CS601,
      ColorRange: ERangeType.Partial,
      DownscaleFilter: EScaleType.Bilinear,
      FPSType: 0 /* Common FPS Values */,
      FPSCommon: 4 /* 30 FPS */,
      FPSInt: 30,
      FPSNum: 30,
      FPSDen: 1
    },
    Delay: {
      Enabled: false,
      ReconnectPreserve: false,
      Seconds: 10
    }
  };

  /* A bit unsafe but not user facing */
  private queueChange(type: ESettingsType, patch: any) {
    const change = Object.assign({}, this.state[type], patch);

    this.db.queueChange(type, change);
  }

  setGeneralSettings(patch: Partial<IGeneralSettings>) {
    this.UPDATE_SETTINGS(ESettingsType.General, patch);
    this.queueChange(ESettingsType.General, patch);
  }

  setTcpSettings(patch: Partial<ITCPSettings>) {
    this.UPDATE_SETTINGS(ESettingsType.TCP, patch);
    this.queueChange(ESettingsType.TCP, patch);
  }

  setNamedPipeSettings(patch: Partial<INamedPipeSettings>) {
    this.UPDATE_SETTINGS(ESettingsType.NamedPipe, patch);
    this.queueChange(ESettingsType.NamedPipe, patch);
  }

  setWebSocketsSettings(patch: Partial<IWebSocketsSettings>) {
    this.UPDATE_SETTINGS(ESettingsType.WebSockets, patch);
    this.queueChange(ESettingsType.WebSockets, patch);
  }

  setAudioSettings(patch: Partial<IAudioSettings>) {
    this.UPDATE_SETTINGS(ESettingsType.Audio, patch);
    this.queueChange(ESettingsType.Audio, patch);
  }

  setVideoSettings(patch: Partial<IVideoSettings>) {
    this.UPDATE_SETTINGS(ESettingsType.Video, patch);
    this.queueChange(ESettingsType.Video, patch);
  }

  setDelaySettings(patch: Partial<IDelaySettings>) {
    this.UPDATE_SETTINGS(ESettingsType.Delay, patch);
    this.queueChange(ESettingsType.Delay, patch);
  }

  @mutation()
  UPDATE_SETTINGS(type: ESettingsType, patch: any) {
    this.state[type] = { ...this.state[type], ...patch };
  }

  private createConfig() {
    for (const key in ESettingsType) {
      const type: ESettingsType = ESettingsType[key] as ESettingsType;
      this.queueChange(type, SettingsStorageService.initialState[type]);
    }
  }

  private syncConfig(response: PouchDB.Core.AllDocsResponse<{}>) {
    const initialized = {};

    for (const key in ESettingsType) {
      initialized[key] = false;
    }

    for (let i = 0; i < response.total_rows; ++i) {
      const entry = Object.assign({}, response.rows[i].doc);
      const type = response.rows[i].doc._id as ESettingsType;

      /* Remove these to prevent them from being put into state */
      delete entry._id;
      delete entry._rev;

      /* If we add new fields, we want to make sure
         they get added to the already created database */
      const initialKeys = Object.keys(
        SettingsStorageService.initialState[type]
      );

      let changed = false;

      for (let k = 0; k < initialKeys.length; ++k) {
        const key = initialKeys[k];
        if (entry[key] !== undefined) continue;

        console.warn(`${key} in settings not found!`);

        changed = true;
        entry[key] = SettingsStorageService.initialState[type][key];
      }

      this.UPDATE_SETTINGS(type, entry);
      if (changed) this.queueChange(type, entry);

      initialized[type] = true;
    }

    /* If our key doesn't exist at all, create it */
    for (const key in initialized) {
      const type = key as ESettingsType;
      const change = SettingsStorageService.initialState[key];

      if (initialized[key] === false) {
        this.UPDATE_SETTINGS(type, change);
        this.db.addQueue(type);
        this.queueChange(type, change);
      }
    }
  }

  async initialize() {
    if (this.initialized) return;

    await this.db.initialize(response => this.syncConfig(response));

    this.initialized = true;
  }

  /* This isn't quite as failsafe as what's in the resolution
   * input component itself as it's already been parsed once.
   * It's practical to assume it's always going to have the format
   * of `1234x1234`. */
  public parseResolutionString(res: string): IResolution {
    const [widthStr, heightStr] = res.split('x');
    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);

    return {
      width,
      height
    };
  }

  /* Utility */
  private fpsCommonOptionValues = [
    { num: 10, den: 1 },
    { num: 20, den: 1 },
    { num: 24000, den: 1001 },
    { num: 30000, den: 1001 },
    { num: 30, den: 1 },
    { num: 48, den: 1 },
    { num: 60000, den: 1001 },
    { num: 60, den: 1 }
  ];

  resetVideo() {
    const VideoSettings = this.state.Video;
    const baseRes = this.parseResolutionString(VideoSettings.BaseResolution);
    const outputRes = this.parseResolutionString(
      VideoSettings.OutputResolution
    );
    const fpsType = VideoSettings.FPSType;
    let fpsNum = 30;
    let fpsDen = 1;

    switch (fpsType) {
      case EFPSType.Common:
        const idx = VideoSettings.FPSCommon;
        const values = this.fpsCommonOptionValues[idx];
        fpsNum = values.num;
        fpsDen = values.den;
        break;
      case EFPSType.Integer:
        fpsNum = VideoSettings.FPSInt;
        break;
      case EFPSType.Fraction:
        fpsNum = VideoSettings.FPSNum;
        fpsDen = VideoSettings.FPSDen;
        break;
    }

    VideoFactory.reset({
      graphicsModule: 'libobs-d3d11',
      fpsNum,
      fpsDen,
      baseWidth: baseRes.width,
      baseHeight: baseRes.height,
      outputWidth: outputRes.width,
      outputHeight: outputRes.height,
      outputFormat: VideoSettings.ColorFormat,
      adapter: 0,
      gpuConversion: true,
      colorspace: VideoSettings.ColorSpace,
      range: VideoSettings.ColorRange,
      scaleType: VideoSettings.DownscaleFilter
    });
  }

  resetAudio() {
    const AudioSettings = this.state.Audio;

    AudioFactory.reset({
      samplesPerSec: AudioSettings.SampleRate,
      speakerLayout: AudioSettings.SpeakerLayout
    });
  }

  resetMonitoringDevice() {
    const AudioSettings = this.state.Audio;

    Global.setAudioMonitoringDevice(
      AudioSettings.MonitoringDeviceName,
      AudioSettings.MonitoringDeviceId
    );
  }

  async destroy() {}
}
