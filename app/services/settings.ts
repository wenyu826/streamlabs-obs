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
import { ISettings } from './obs-api';

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

  Video: {
    BaseResolution: string;
    OutputResolution: string;
    DownscaleFilter: number;
    FPSType: number;
    FPSCommon: number;
    FPSInt: number;
    FPSNum: number;
    FPSDen: number;
  };

  Delay: {
    Enabled: boolean;
    Seconds: number;
  };
}

interface ISettingsStorageState {
  _id: string;
  _rev?: string;

  Settings: ISettingsState;
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
      Video: {
        BaseResolution: '1920x1080',
        OutputResolution: '1280x720',
        DownscaleFilter: 0, /* Bilinear */
        FPSType: 0, /* Common FPS Values */
        FPSCommon: 4, /* 30 FPS */
        FPSInt: 30,
        FPSNum: 30,
        FPSDen: 1
      },
      Delay: {
        Enabled: false,
        Seconds: 10
      }
    }
  };

  private handleChange(response: PouchDB.Core.Response) {
    this.putQueue.shift();

    this.UPDATE_REVISION(response.rev);
    console.log(response);

    if (this.putQueue.length > 0) {
      this.db.put({
        ... this.putQueue[0],
        _id: response.id,
        _rev: response.rev
      }).then((response) => { this.handleChange(response); });
    }
  }

  private queueChange(patch: Partial<ISettingsState>) {
    const change = { 
      ...this.state,
      ...patch,
    };

    console.log(change);

    /* TODO FIXME We should create a new object
     * for each change, we should queue partial changes. */

    if (this.putQueue.push(change) !== 1) {
      return;
    }

    this.db.put(change)
      .then((response) => { this.handleChange(response); });
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

    await this.db.get(settingsDocName)
      .then((response) => { this.syncConfig(response); })
      .catch((error) => { this.handleDbError(error); });

    this.initialized = true;
  }

  async destroy() {}
}
