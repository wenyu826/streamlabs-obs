/* This service is meant to help consolidate
 * all the general configuration operations
 * into a single location and database. 
 * This file should change anytime our general
 * settings change. This is because the layout
 * of the settings is saved as a typescript type
 * meaning we can access settings in a typesafe way
 * to avoid typos and prevent not setting defaults. */

import PouchDB from 'pouchdb-core';
import PouchDBWebSQL from 'pouchdb-adapter-node-websql';
import { StatefulService, mutation } from 'services/stateful-service';
import * as ObjectPath from 'object-path';

import {
  ISettings,
  EVideoFormat,
  EColorSpace,
  ERangeType,
  EScaleType,
  VideoFactory,
  AudioFactory,
  ESpeakerLayout
} from './obs-api';

PouchDB.plugin(PouchDBWebSQL);

/* Convenience constants */
type SettingsDatabase = PouchDB.Database<ISettingsStorageState>;
type ExistingSettingsDocument = PouchDB.Core.ExistingDocument<
  ISettingsStorageState
>;

const settingsDocName = 'Settings';

interface ISettingsState {
  General: {
    KeepRecordingWhenStreamStops: boolean;
    RecordWhenStreaming: boolean;
    WarnBeforeStartingStream: boolean;
    WarnBeforeStoppingStream: boolean;
    SnappingEnabled: boolean;
    SnapDistance: number;
    ScreenSnapping: boolean;
    SourceSnapping: boolean;
    CenterSnapping: boolean;
  };

  TCP: {
    Enabled: boolean;
    AllowRemote: boolean;
    Port: number;
  };

  NamedPipe: {
    Enabled: boolean;
    PipeName: string;
  };

  WebSockets: {
    Enabled: boolean;
    AllowRemote: boolean;
    Port: number;
  };

  Audio: {
    SampleRate: number,
    SpeakerLayout: number
  };

  Video: {
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
  };

  Delay: {
    Enabled: boolean;
    ReconnectPreserve: boolean;
    Seconds: number;
  };
}

interface ISettingsStorageState {
  _id: string;
  _rev?: string;

  Settings: ISettingsState;
}

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
  private db: SettingsDatabase = new PouchDB('Settings.sqlite3', {
    adapter: 'websql'
  });

  protected static initialState: ISettingsStorageState = {
    _id: settingsDocName,
    Settings: {
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
        SpeakerLayout: ESpeakerLayout.Stereo
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
    }
  };

  private handleChange(response: PouchDB.Core.Response) {
    this.putQueue.shift();

    this.UPDATE_REVISION(response.rev);
    console.log(response);

    if (this.putQueue.length > 0) {
      this.db
        .put({
          ...this.putQueue[0],
          _id: response.id,
          _rev: response.rev
        })
        .then(response => {
          this.handleChange(response);
        });
    }
  }

  private queueChange(patch: Partial<ISettingsState>) {
    const change = {
      ...this.state,
      ...patch
    };

    console.log(change);
    
    if (this.putQueue.push(change) !== 1) {
      return;
    }

    this.db.put(change).then(response => {
      this.handleChange(response);
    });
  }

  setSettings(patch: Partial<ISettingsState>) {
    this.UPDATE_SETTINGS(patch);
  }

  @mutation()
  UPDATE_REVISION(revision: string) {
    this.state._rev = revision;
  }

  @mutation()
  UPDATE_SETTINGS(patch: Partial<ISettingsState>) {
    this.state.Settings = { ...this.state.Settings, ...patch };
  }

  init() {
    this.store.watch(
      () => {
        return this.state.Settings;
      },
      changed => {
        this.queueChange(changed);
      }
    );
  }

  private handleDbError(error: PouchDB.Core.Error) {
    if (error.status !== 404) {
      console.log(error);
      throw Error(`Error occured with settings document: ${error.message}`);
    }

    this.queueChange(this.state.Settings);
  }

  private syncConfig(response: ExistingSettingsDocument) {
    this.UPDATE_SETTINGS(response.Settings);
    this.UPDATE_REVISION(response._rev);
  }

  async initialize() {
    if (this.initialized) return;

    await this.db
      .get(settingsDocName)
      .then(response => {
        this.syncConfig(response);
      })
      .catch(error => {
        this.handleDbError(error);
      });

    this.initialized = true;
  }

  /* This isn't quite as failsafe as what's in the resolution
     * input component itself as it's already been parsed once
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
    const VideoSettings = this.state.Settings.Video;
    const baseRes = this.parseResolutionString(VideoSettings.BaseResolution);
    const outputRes = this.parseResolutionString(VideoSettings.OutputResolution);
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
    const AudioSettings = this.state.Settings.Audio;

    AudioFactory.reset({
      samplesPerSec: AudioSettings.SampleRate,
      speakerLayout: AudioSettings.SpeakerLayout
    });
  }

  async destroy() {}
}
