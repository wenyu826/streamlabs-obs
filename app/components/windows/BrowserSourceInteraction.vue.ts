import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import ModalLayout from 'components/ModalLayout.vue';
import Display from 'components/shared/Display.vue';
import { Inject } from 'util/injector';
import { WindowsService } from 'services/windows';
import { ISourcesServiceApi } from 'services/sources';
import Util from 'services/utils';
import { $t } from 'services/i18n';
import windowMixin from '../mixins/window';

@Component({
  components: {
    ModalLayout,
    Display
  },
  mixins: [windowMixin]
})
export default class BrowserSourceInteraction extends Vue {
  @Inject() windowsService: WindowsService;
  @Inject() sourcesService: ISourcesServiceApi;

  $refs: {
    display: HTMLDivElement;
  };

  get sourceId() {
    const windowId = Util.getCurrentUrlParams().windowId;
    return this.windowsService.getWindowOptions(windowId).sourceId;
  }

  get source() {
    return this.sourcesService.getSource(this.sourceId);
  }

  handleClick(e: MouseEvent) {
    console.log('got click', e);

    this.source.mouseClick(this.eventLocationInSourceSpace(e));
  }

  handleMouseMove(e: MouseEvent) {
    console.log('got move', e);

    this.source.mouseMove(this.eventLocationInSourceSpace(e));
  }

  eventLocationInSourceSpace(e: MouseEvent): IVec2 {
    const rect = this.$refs.display.getBoundingClientRect();

    return {
      x: e.offsetX / rect.width * this.source.width,
      y: e.offsetY / rect.height * this.source.height
    };
  }

}
