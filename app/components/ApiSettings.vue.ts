import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import { TFormData } from './shared/forms/Input';
import BoolInput from './shared/forms/BoolInput.vue';
import IntInput from './shared/forms/IntInput.vue';
import TextInput from './shared/forms/TextInput.vue';
import { ITcpServerServiceAPI } from '../services/tcp-server';
import { SettingsStorageService } from 'services/settings';

import {
  IFormInput,
  INumberInputValue,
  ITextInputValue
} from './shared/forms/Input';

import { EPropertyType, ENumberType, ETextType } from 'services/obs-api';

@Component({
  components: { BoolInput, IntInput, TextInput }
})
export default class ApiSettings extends Vue {
  @Inject() tcpServerService: ITcpServerServiceAPI;
  @Inject() settingsStorageService: SettingsStorageService;

  created() {
    // Stop listening for security reasons
    this.tcpServerService.stopListening();
    console.log('Not listening');
  }

  destroyed() {
    this.tcpServerService.listen();
    console.log('Listening');
  }

  tcpCollapsed = false;

  tcpEnabled: IFormInput<boolean> = {
    value: this.settingsStorageService.state.TCP.Enabled,
    name: 'tcp_enabled',
    description: 'Enabled',
    type: EPropertyType.Boolean,
    visible: true,
    enabled: true
  };

  tcpAllowRemote: IFormInput<boolean> = {
    value: this.settingsStorageService.state.TCP.AllowRemote,
    name: 'tcp_allow_remote',
    description: 'Allow Remote Connections',
    type: EPropertyType.Boolean,
    visible: true
  };

  tcpPort: INumberInputValue = {
    value: this.settingsStorageService.state.TCP.Port,
    name: 'tcp_port',
    description: 'Port',
    type: EPropertyType.Int,
    subType: ENumberType.Scroller,
    minVal: 0,
    maxVal: 65535,
    stepVal: 1
  };

  namedPipeCollapsed = false;

  namedPipeEnabled: IFormInput<boolean> = {
    value: this.settingsStorageService.state.NamedPipe.Enabled,
    name: 'namedpipe_enabled',
    description: 'Enabled',
    type: EPropertyType.Boolean,
    visible: true,
    enabled: true
  };

  namedPipePipeName: ITextInputValue = {
    value: this.settingsStorageService.state.NamedPipe.PipeName,
    name: 'namedpipe_name',
    description: 'Pipe Name',
    type: EPropertyType.Text,
    subType: ETextType.Default,
    visible: true,
    multiline: false
  };

  webSocketsCollapsed = false;

  webSocketsEnabled: IFormInput<boolean> = {
    value: this.settingsStorageService.state.WebSockets.Enabled,
    name: 'websockets_enabled',
    description: 'Enabled',
    type: EPropertyType.Boolean,
    enabled: true
  };

  webSocketsAllowRemote: IFormInput<boolean> = {
    value: this.settingsStorageService.state.WebSockets.AllowRemote,
    name: 'websockets_allow_remote',
    description: 'Allow Remote Connections',
    type: EPropertyType.Boolean
  };

  webSocketsPort: INumberInputValue = {
    value: this.settingsStorageService.state.WebSockets.Port,
    name: 'websockets_port',
    description: 'Port',
    type: EPropertyType.Int,
    subType: ENumberType.Scroller,
    minVal: 0,
    maxVal: 65535,
    stepVal: 1
  };

  inputTcpEnabled(formData: IFormInput<boolean>) {
    this.settingsStorageService.setTcpSettings({
      Enabled: formData.value
    });
  }

  inputTcpPort(formData: IFormInput<number>) {
    this.settingsStorageService.setTcpSettings({
      Port: formData.value
    });
  }

  inputTcpAllowRemote(formData: IFormInput<boolean>) {
    this.settingsStorageService.setTcpSettings({
      AllowRemote: formData.value
    });
  }

  inputNamedPipeEnabled(formData: IFormInput<boolean>) {
    this.settingsStorageService.setNamedPipeSettings({
      Enabled: formData.value
    });
  }

  inputNamedPipePipeName(formData: ITextInputValue) {
    this.settingsStorageService.setNamedPipeSettings({
      PipeName: formData.value
    });
  }

  inputWebSocketsEnabled(formData: IFormInput<boolean>) {
    this.settingsStorageService.setWebSocketsSettings({
      Enabled: formData.value
    });
  }

  inputWebSocketsAllowRemote(formData: IFormInput<boolean>) {
    this.settingsStorageService.setWebSocketsSettings({
      AllowRemote: formData.value
    });
  }

  inputWebSocketsPort(formData: INumberInputValue) {
    this.settingsStorageService.setWebSocketsSettings({
      Port: formData.value
    });
  }
}
