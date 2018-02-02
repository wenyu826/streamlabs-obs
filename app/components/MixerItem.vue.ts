import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import { EditMenu } from '../util/menus/EditMenu';
import { AudioSource } from '../services/audio';
import { CustomizationService } from 'services/customization';
import Slider from './shared/Slider.vue';
import MixerVolmeter from './MixerVolmeter.vue';
import MixerVolmeterGL from './MixerVolmeterGL.vue';
import { Inject } from '../util/injector';

@Component({
  components: { Slider, MixerVolmeter, MixerVolmeterGL }
})
export default class MixerItem extends Vue {
  @Prop() audioSource: AudioSource;
  @Prop() useGLVolmeter: boolean;

  @Inject() private customizationService: CustomizationService;

  get previewEnabled() {
    return !this.customizationService.state.performanceMode;
  }

  setMuted(muted: boolean) {
    this.audioSource.setMuted(muted);
  }

  onSliderChangeHandler(newVal: number) {
    this.audioSource.setDeflection(newVal);
  }

  showSourceMenu(sourceId: string) {
    const menu = new EditMenu({ selectedSourceId: sourceId });
    menu.popup();
    menu.destroy();
  }
}
