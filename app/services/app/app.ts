import { StatefulService, mutation } from '../stateful-service';
import { OnboardingService } from '../onboarding';
import { HotkeysService } from '../hotkeys';
import { UserService } from '../user';
import { ShortcutsService } from '../shortcuts';
import { Inject } from '../../util/injector';
import electron from 'electron';
import { ScenesTransitionsService } from '../scenes-transitions';
import { SourcesService } from '../sources';
import { ScenesService } from '../scenes';
import { VideoService } from '../video';
import { StreamInfoService } from '../stream-info';
import { track } from '../usage-statistics';
import { IpcServerService } from '../ipc-server';
import { TcpServerService } from '../tcp-server';
import { StreamlabelsService } from '../streamlabels';
import { PerformanceMonitorService } from '../performance-monitor';
import { SceneCollectionsService } from 'services/scene-collections';
import { FileManagerService } from 'services/file-manager';
import { RecOutputService } from 'services/recording-output';
import { RtmpOutputService } from 'services/rtmp-output';
import { SettingsStorageService } from 'services/settings';
import { Global, AudioFactory, VideoFactory } from 'services/obs-api';
import { StreamingService } from '../streaming';
import { PerformanceService } from '../performance';
import { OutputService } from '../outputs';
import { EncoderService } from '../encoders';
import { ProviderService } from '../providers';

interface IAppState {
  loading: boolean;
  argv: string[];
}

/**
 * Performs operations that happen once at startup and shutdown. This service
 * mainly calls into other services to do the heavy lifting.
 */
export class AppService extends StatefulService<IAppState> {
  @Inject() onboardingService: OnboardingService;
  @Inject() sceneCollectionsService: SceneCollectionsService;
  @Inject() hotkeysService: HotkeysService;
  @Inject() userService: UserService;
  @Inject() shortcutsService: ShortcutsService;
  @Inject() streamInfoService: StreamInfoService;
  @Inject() settingsStorageService: SettingsStorageService;
  @Inject() scenesTransitionsService: ScenesTransitionsService;
  @Inject() recOutputService: RecOutputService;
  @Inject() rtmpOutputService: RtmpOutputService;
  @Inject() sourcesService: SourcesService;
  @Inject() scenesService: ScenesService;
  @Inject() videoService: VideoService;
  @Inject() streamlabelsService: StreamlabelsService;
  @Inject() streamingService: StreamingService;
  @Inject() outputService: OutputService;
  @Inject() encoderService: EncoderService;
  @Inject() providerService: ProviderService;
  @Inject() private ipcServerService: IpcServerService;
  @Inject() private tcpServerService: TcpServerService;
  @Inject() private performanceMonitorService: PerformanceMonitorService;
  @Inject() private performanceService: PerformanceService;
  @Inject() private fileManagerService: FileManagerService;

  static initialState: IAppState = {
    loading: true,
    argv: []
  };

  private autosaveInterval: number;

  @track('app_start')
  load() {
    this.START_LOADING();

    // We want to start this as early as possible so that any
    // exceptions raised while loading the configuration are
    // associated with the user in sentry.
    this.userService;

    const handleSceneConfig = () => {
      this.onboardingService.startOnboardingIfRequired();

      electron.ipcRenderer.on('shutdown', () => {
        electron.ipcRenderer.send('acknowledgeShutdown');
        this.shutdownHandler();
      });

      this.shortcutsService;
      this.streamlabelsService;

      // Pre-fetch stream info
      this.streamInfoService;

      this.performanceMonitorService.start();

      this.ipcServerService.listen();
      this.tcpServerService.listen();
      this.FINISH_LOADING();
    };

    /* We don't wait on this but as long as we make sure 
     * the scene collections is loaded last, we should
     * be fine */
    const asyncInit = async () => {
      await this.settingsStorageService.initialize();
      this.settingsStorageService.resetVideo();
      this.settingsStorageService.resetAudio();
      this.settingsStorageService.resetMonitoringDevice();
      await this.recOutputService.initialize();
      await this.rtmpOutputService.initialize();
      await this.streamingService.initialize();
      await this.sceneCollectionsService.initialize();
      await this.performanceService.initialize();
      handleSceneConfig();
    };

    asyncInit();
  }

  /**
   * the main process sends argv string here
   */
  setArgv(argv: string[]) {
    this.SET_ARGV(argv);
  }

  @track('app_close')
  private shutdownHandler() {
    this.START_LOADING();

    this.ipcServerService.stopListening();
    this.tcpServerService.stopListening();

    window.setTimeout(async () => {
      await this.sceneCollectionsService.deinitialize();
      this.performanceMonitorService.stop();
      this.videoService.destroyAllDisplays();
      this.scenesTransitionsService.reset();
      await this.fileManagerService.flushAll();
      this.outputService.destroy();
      this.encoderService.destroy();
      this.providerService.destroy();
      electron.ipcRenderer.send('shutdownComplete');
    }, 300);
  }

  startLoading() {
    this.START_LOADING();
  }

  finishLoading() {
    this.FINISH_LOADING();
  }

  @mutation()
  private START_LOADING() {
    this.state.loading = true;
  }

  @mutation()
  private FINISH_LOADING() {
    this.state.loading = false;
  }

  @mutation()
  private SET_ARGV(argv: string[]) {
    this.state.argv = argv;
  }
}
