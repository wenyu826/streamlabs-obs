import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import { CustomizationService } from 'services/customization';
import { NavigationService } from 'services/navigation';
import { UserService } from 'services/user';
import { WindowsService } from 'services/windows';
import electron from 'electron';
import Login from './Login.vue';
import Utils from '../services/utils';


@Component({
  components: { Login }
})
export default class TopNav extends Vue {

  @Inject() windowsService: WindowsService;
  @Inject() customizationService: CustomizationService;
  @Inject() navigationService: NavigationService;
  @Inject() userService: UserService;

  slideOpen = false;

  @Prop() locked: boolean;

  navigateStudio() {
    this.navigationService.navigate('Studio');
  }

  navigateDashboard() {
    this.navigationService.navigate('Dashboard');
  }

  navigateOverlays() {
    this.navigationService.navigate('BrowseOverlays');
  }

  navigateLive() {
    this.navigationService.navigate('Live');
  }

  navigateOnboarding() {
    this.navigationService.navigate('Onboarding');
  }

  openSettingsWindow() {
    this.windowsService.showWindow({
      componentName: 'Settings',
      queryParams: { undefined },
      size: {
        width: 800,
        height: 800
      }
    });
  }

  toggleNightTheme() {
    this.customizationService.nightMode = !this.customizationService.nightMode;
  }

  bugReport() {
    electron.remote.shell.openExternal('https://tracker.streamlabs.com');
  }

  openDiscord() {
    electron.remote.shell.openExternal('https://discordapp.com/invite/stream');
  }

  get isDevMode() {
    return Utils.isDevMode();
  }

  openDevTools() {
    electron.ipcRenderer.send('openDevTools');
  }

  get page() {
    return this.navigationService.state.currentPage;
  }

  get isUserLoggedIn() {
    return this.userService.isLoggedIn();
  }

}
