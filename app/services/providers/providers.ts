import { FProvider } from './provider';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer, remote } from 'electron';
import { getConfigFilePath } from '../config';
import { DefaultManager } from '../sources/properties-managers/default-manager';
import { TFormData } from 'components/shared/forms/Input';
import * as obs from '../obs-api';
import path from 'path';
import Vue from 'vue';
import PouchDB from 'pouchdb';

type TProviderServiceState = Dictionary<FProvider>;

export class ProviderService extends StatefulService<TProviderServiceState> {
  private initialized = false;
  private db = new PouchDB(path.join(remote.app.getPath('userData'), 'Providers'));
  private propManagers: Dictionary<DefaultManager> = {};
  private putQueues: Dictionary<any[]> = {};

  static initialState: TProviderServiceState = {};

  static getUniqueId(): string {
    return 'provider_' + ipcRenderer.sendSync('getUniqueId');
  }
  
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
    this.REMOVE_PROVIDER(response.id);

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
      key:      provider.key,
      url:      provider.url,
      username: provider.username,
      password: provider.password,
      provider: provider.provider
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
    const output = this.state[uniqueId];

    /* The array is dead, just empty it */
    queue.length = 0;

    this.db.remove({ _id: uniqueId, _rev: output.revision })
      .then((response) => { this.handleDeletion(response); });
  }

  private syncConfig(result: any): void {
    for (let i = 0; i < result.total_rows; ++i) {
      const entry = result.rows[i].doc;

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

      this.propManagers[entry._id] = 
        new DefaultManager(obs.ServiceFactory.fromName(entry._id), {});

      this.putQueues[entry._id] = [];
    }
  }

  async initialize() {
    if (this.initialized) return;

    await this.db.allDocs({
      include_docs: true
    }).then((result: any) => { this.syncConfig(result); });

    this.initialized = true;
  }
  
  destroy() {
    const keys = Object.keys(this.state);

    for (let i = 0; i < keys.length; ++i) {
      const obsObject = obs.ServiceFactory.fromName(keys[i]);

      if (obsObject)
        obsObject.release();
    }
  }

  @mutation()
  private UPDATE_SETTINGS(uniqueId: string, settings: any) {
    this.state[uniqueId].settings = settings;
  }

  @mutation() 
  private UPDATE_REVISION(uniqueId: string, revision: string) {
    this.state[uniqueId].revision = revision;
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
    const obsService = obs.ServiceFactory.fromName(uniqueId);
    this.ADD_PROVIDER(uniqueId, provider);

    this.putQueues[uniqueId] = [];
    this.queueChange(uniqueId);

    this.propManagers[uniqueId] = new DefaultManager(obsService, {});
  }

  removeProvider(uniqueId: string) {
    const service = obs.ServiceFactory.fromName(uniqueId);
    service.release();

    this.queueDeletion(uniqueId);
  }

  isProvider(uniqueId: string) {
    const obsService: obs.IService = obs.ServiceFactory.fromName(uniqueId);

    if (obsService) return true;

    return false;
  }

  /* We use the property form data 1:1 for Services. */
  getPropertyFormData(uniqueId: string) {
    return this.propManagers[uniqueId].getPropertiesFormData();
  }

  setPropertyFormData(uniqueId: string, formData: TFormData) {
    this.propManagers[uniqueId].setPropertiesFormData(formData);

    const settings = obs.ServiceFactory.fromName(uniqueId).settings;
    this.UPDATE_SETTINGS(uniqueId, settings);

    this.queueChange(uniqueId);
  }
}
