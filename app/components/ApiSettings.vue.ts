import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import { TFormData } from './shared/forms/Input';
import GenericFormGroups from './shared/forms/GenericFormGroups.vue';
import { ITcpServerServiceAPI, ITcpServersSettings } from '../services/tcp-server';

@Component({
  components: { GenericFormGroups }
})
export default class ApiSettings extends Vue {

  @Inject()
  tcpServerService: ITcpServerServiceAPI;

  settingsFormData: TFormData = this.tcpServerService.getApiSettingsFormData();

  created() {
    // Stop listening for security reasons
    this.tcpServerService.stopListening();
  }


  destroyed() {
    this.tcpServerService.listen();
  }


  restoreDefaults() {
    this.tcpServerService.setSettings(this.tcpServerService.getDefaultSettings());
  }


  save(formData: TFormData) {
    console.log(formData);
    this.settingsFormData = this.tcpServerService.getApiSettingsFormData();
  }
}
