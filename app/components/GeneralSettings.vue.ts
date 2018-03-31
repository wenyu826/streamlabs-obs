import Vue from 'vue';
import electron from 'electron';
import { Component } from 'vue-property-decorator';
import { CacheUploaderService } from 'services/cache-uploader';
import { Inject } from 'util/injector';
import BoolInput from 'components/shared/forms/BoolInput.vue';
import IntInput from 'components/shared/forms/IntInput.vue';
import { CustomizationService } from 'services/customization';
import { IFormInput } from 'components/shared/forms/Input';
import { StreamlabelsService } from 'services/streamlabels';
import { OnboardingService } from 'services/onboarding';
import { WindowsService } from 'services/windows';
import { UserService } from 'services/user';
import { StreamingService } from 'services/streaming';
import { SettingsStorageService } from 'services/settings';

@Component({
  components: { BoolInput, IntInput }
})
export default class GeneralSettings extends Vue {
  @Inject() cacheUploaderService: CacheUploaderService;
  @Inject() customizationService: CustomizationService;
  @Inject() streamlabelsService: StreamlabelsService;
  @Inject() onboardingService: OnboardingService;
  @Inject() windowsService: WindowsService;
  @Inject() userService: UserService;
  @Inject() streamingService: StreamingService;
  @Inject() settingsStorageService: SettingsStorageService;

  cacheUploading = false;

  get streamInfoUpdateModel(): IFormInput<boolean> {
    return {
      name: 'stream_info_udpate',
      description: 'Confirm stream title and game before going live',
      value: this.customizationService.state.updateStreamInfoOnLive
    };
  }

  setStreamInfoUpdate(model: IFormInput<boolean>) {
    this.customizationService.setUpdateStreamInfoOnLive(model.value);
  }

  showCacheDir() {
    electron.remote.shell.showItemInFolder(
      electron.remote.app.getPath('userData')
    );
  }

  deleteCacheDir() {
    if (
      confirm(
        'WARNING! You will lose all scenes, sources, and settings. This cannot be undone!'
      )
    ) {
      electron.remote.app.relaunch({ args: ['--clearCacheDir'] });
      electron.remote.app.quit();
    }
  }

  uploadCacheDir() {
    this.cacheUploading = true;
    this.cacheUploaderService.uploadCache().then(file => {
      electron.remote.clipboard.writeText(file);
      alert(
        `Your cache directory has been successfully uploaded.  The file name ${file} has been copied to your clipboard.  Please paste it into discord and tag a developer.`
      );
      this.cacheUploading = false;
    });
  }

  restartStreamlabelsSession() {
    this.streamlabelsService.restartSession().then(result => {
      if (result) alert('Streamlabels session has been succesfully restarted!');
    });
  }

  runAutoOptimizer() {
    this.onboardingService.start({ isOptimize: true });
    this.windowsService.closeChildWindow();
  }

  get isTwitch() {
    return (
      this.userService.isLoggedIn() &&
      this.userService.platform.type === 'twitch'
    );
  }

  get isRecordingOrStreaming() {
    return (
      this.streamingService.isStreaming || this.streamingService.isRecording
    );
  }

  snappingCollapsed = false;

  get snappingEnabled(): IFormInput<boolean> {
    return {
      value: this.settingsStorageService.state.General.SnappingEnabled,
      name: 'snapping_enabled',
      description: 'Enabled'
    };
  }

  set snappingEnabled(formData: IFormInput<boolean>) {
    this.settingsStorageService.setGeneralSettings({
      SnappingEnabled: formData.value
    });
  }

  get snappingSensitivity(): IFormInput<number> {
    return {
      value: this.settingsStorageService.state.General.SnapDistance,
      name: 'snapping_distance',
      description: 'Snapping Sensitivity'
    };
  }

  set snappingSensitivity(formData: IFormInput<number>) {
    this.settingsStorageService.setGeneralSettings({
        SnapDistance: formData.value
    });
  }

  get snappingEdges(): IFormInput<boolean> {
    return {
      value: this.settingsStorageService.state.General.ScreenSnapping,
      name: 'snapping_edge',
      description: 'Snap sources to edge of screen'
    };
  }

  set snappingEdges(formData: IFormInput<boolean>) {
    this.settingsStorageService.setGeneralSettings({
      ScreenSnapping: formData.value
    });
  }

  get snappingSources(): IFormInput<boolean> {
    return {
      value: this.settingsStorageService.state.General.SourceSnapping,
      name: 'snapping_sources',
      description: 'Snap sources to other sources'
    };
  }

  set snappingSources(formData: IFormInput<boolean>) {
    this.settingsStorageService.setGeneralSettings({
      SourceSnapping: formData.value
    });
  }

  outputPrefCollapsed = false;

  get outputPrefWarnStartStream(): IFormInput<boolean> {
    return {
      value: this.settingsStorageService.state.General.WarnBeforeStartingStream,
      name: 'warn_start_stream',
      description: 'Show confirmation dialog when starting streams'
    };
  }

  set outputPrefWarnStartStream(formData: IFormInput<boolean>) {
    this.settingsStorageService.setGeneralSettings({
      WarnBeforeStartingStream: formData.value
    });
  }

  get outputPrefWarnStopStream(): IFormInput<boolean> {
    return {
      value: this.settingsStorageService.state.General.WarnBeforeStoppingStream,
      name: 'warn_stop_stream',
      description: 'Show confirmation dialog when stopping streams'
    };
  }

  set outputPrefWarnStopStream(formData: IFormInput<boolean>) {
    this.settingsStorageService.setGeneralSettings({
      WarnBeforeStoppingStream: formData.value
    });
  }

  get outputPrefAutoRecord(): IFormInput<boolean> {
    return {
      value: this.settingsStorageService.state.General.RecordWhenStreaming,
      name: 'auto_record',
      description: 'Automatically record when streaming'
    };
  }

  set outputPrefAutoRecord(formData: IFormInput<boolean>) {
    this.settingsStorageService.setGeneralSettings({
      RecordWhenStreaming: formData.value
    });
  }

  get outputPrefRecordAfterStream(): IFormInput<boolean> {
    return {
      value: this.settingsStorageService.state.General.KeepRecordingWhenStreamStops,
      name: 'auto_record',
      description: 'Keep recording when stream stops'
    };
  }

  set outputPrefRecordAfterStream(formData: IFormInput<boolean>) {
    this.settingsStorageService.setGeneralSettings({
      KeepRecordingWhenStreamStops: formData.value
    });
  }
}
