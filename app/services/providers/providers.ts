import { FProvider } from './provider';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer } from 'electron';
import { getConfigFilePath } from '../config';
import * as obs from '../obs-api';
import Vue from 'vue';

import PouchDB from 'pouchdb-core';
import PouchDBWebSQL from 'pouchdb-adapter-node-websql';
PouchDB.plugin(PouchDBWebSQL);

interface IProviderServiceState {
  providers: Dictionary<FProvider>;
}

export class ProviderService extends StatefulService<IProviderServiceState> {
  private initialized = false;
  private db = new PouchDB('Providers.sqlite3', { adapter: 'websql' });

  static initialState: IProviderServiceState = {
    providers: {}
  };

  static getUniqueId(): string {
    return 'provider_' + ipcRenderer.sendSync('getUniqueId');
  }

  private syncConfig(result: any): void {
    for (let i = 0; i < result.total_rows; ++i) {
      const entry = result.rows[i].doc;

      console.log(entry);

      const provider: FProvider = {
        revision: entry._rev,
        type: entry.type,
        settings: entry.settings,
        key: entry.key,
        url: entry.url,
        username: entry.username,
        password: entry.password,
        provider: entry.provider
      };

      this.ADD_PROVIDER(entry._id, provider);
      FProvider.init(provider.type, entry._id, provider.settings);
    }
  }

  async initialize() {
    if (this.initialized) return;

    await this.db.allDocs({
      include_docs: true
    }).then((result: any) => { this.syncConfig(result); });

    this.initialized = true;
  }

  @mutation()
  private ADD_PROVIDER(uniqueId: string, fProvider: FProvider) {
    Vue.set(this.state, uniqueId, fProvider);
  }

  @mutation()
  private REMOVE_PROVIDER(uniqueId: string) {
    Vue.delete(this.state, uniqueId);
  }

  addProvider(uniqueId: string, provider: FProvider) {
    this.ADD_PROVIDER(uniqueId, provider);

    /* No need for revision here since this is creation */
    this.db.put({
      _id:      uniqueId,
      type:     provider.type,
      settings: provider.settings,
      key:      provider.key,
      url:      provider.url,
      username: provider.username,
      password: provider.password,
      provider: provider.provider
    });
  }

  removeProvider(uniqueId: string) {
    const service = obs.ServiceFactory.fromName(uniqueId);
    service.release();

    /* FIXME We need to synchronize this */
    this.db.remove(uniqueId, this.state[uniqueId].revision);
    this.REMOVE_PROVIDER(uniqueId);
  }

  isProvider(uniqueId: string) {
    const obsService: obs.IService = obs.ServiceFactory.fromName(uniqueId);

    if (obsService) return true;

    return false;
  }
}
