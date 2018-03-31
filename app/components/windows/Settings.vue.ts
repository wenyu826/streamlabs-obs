import Vue from 'vue';
import { Component, Watch } from 'vue-property-decorator';
import { Inject } from '../../util/injector';
import ModalLayout from '../ModalLayout.vue';
import NavMenu from '../shared/NavMenu.vue';
import NavItem from '../shared/NavItem.vue';
import GenericForm from '../shared/forms/GenericForm.vue';
import { WindowsService } from '../../services/windows';
import windowMixin from '../mixins/window';
import GeneralSettings from '../GeneralSettings.vue';
import ApiSettings from '../ApiSettings.vue';
import Hotkeys from '../Hotkeys.vue';
import OverlaySettings from 'components/OverlaySettings.vue';
import NotificationsSettings from 'components/NotificationsSettings.vue';
import AppearanceSettings from 'components/AppearanceSettings.vue';
import ExperimentalSettings from 'components/ExperimentalSettings.vue';
import OutputsSettings from 'components/OutputsSettings.vue';
import StreamSettings from 'components/StreamSettings.vue';
import AudioSettings from 'components/AudioSettings.vue';
import VideoSettings from 'components/VideoSettings.vue';
import AdvancedSettings from 'components/AdvancedSettings.vue';

@Component({
  components: {
    ModalLayout,
    GenericForm,
    NavMenu,
    NavItem,
    GeneralSettings,
    Hotkeys,
    ApiSettings,
    OverlaySettings,
    NotificationsSettings,
    AppearanceSettings,
    ExperimentalSettings,
    OutputsSettings,
    StreamSettings,
    AudioSettings,
    VideoSettings,
    AdvancedSettings
  },
  mixins: [windowMixin]
})
export default class Settings extends Vue {

  categoryName = "General";

  icons: Dictionary<string> = {
    General: 'th-large',
    Stream: 'globe',
    Output: 'microchip',
    Video: 'film',
    Audio: 'volume-up',
    Hotkeys: 'keyboard-o',
    Advanced: 'cogs',
    API: 'file-code-o',
    Overlays: 'picture-o',
    Notifications: 'warning',
    Appearance: 'television',
    Experimental: 'flask'
  };

  @Inject()
  windowsService: WindowsService;

  get categoryNames() {
    return [
      'General',
      'Stream',
      'Output',
      'Video',
      'Audio',
      'Hotkeys',
      'Advanced',
      'API',
      'Overlays',
      'Notifications',
      'Appearance',
      'Experimental'
    ];
  }

  done() {
    this.windowsService.closeChildWindow();
  }

  
}
