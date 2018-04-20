import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import WindowMixin from 'components/mixins/window';
import { Inject } from 'util/injector';
import { ScenesService } from 'services/scenes';
import Utils from 'services/utils';
import ModalLayout from 'components/ModalLayout.vue';
import { WindowsService } from 'services/windows';

@Component({
  mixins: [WindowMixin],
  components: { ModalLayout }
})
export default class EditTransform extends Vue {
  @Inject() scenesService: ScenesService;
  @Inject() windowsService: WindowsService;

  get title() {
    return `Edit Transform: ${this.sceneItem.name}`;
  }

  get sceneItem() {
    // TODO: Need to find a better way to handle this common pattern
    const windowId = Utils.getCurrentUrlParams().windowId;
    const sceneItemId = this.windowsService.state[windowId].queryParams.sceneItemId;
    return this.scenesService.getSceneItem(sceneItemId);
  }

}
