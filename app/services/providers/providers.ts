import { FProvider } from './provider';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer } from 'electron';
import Vue from 'vue';

export interface IProviderServiceState {
  providers: Dictionary<FProvider>;
}

export class ProviderService extends StatefulService<IProviderServiceState> {
  static initialState: IProviderServiceState = {
    providers: {}
  };

  static getUniqueId(): string {
    return 'provider_' + ipcRenderer.sendSync('getUniqueId');
  }

  protected init() {}

  @mutation()
  ADD_PROVIDER(provider: FProvider) {
    Vue.set(this.state.providers, provider.uniqueId, provider);
  }

  addProvider(provider: FProvider) {
    this.ADD_PROVIDER(provider);
  }
}
