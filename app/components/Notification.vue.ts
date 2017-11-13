import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import { SettingsService } from '../services/settings';

@Component({})
export default class Notification extends Vue {

  @Inject() settingsService: SettingsService;

  showSettingsWindow() {
    this.settingsService.showSettings();
  }

  // showNotificationInfo() {
  // }

  notificationShown: boolean = true;

  closeNotification() {
    this.notificationShown = false;
  }
}