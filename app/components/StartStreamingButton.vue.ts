import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import { RtmpOutputService } from '../services/rtmp-output';
import { Inject } from '../util/injector';
import { NavigationService } from '../services/navigation';
import { UserService } from '../services/user';
import { CustomizationService } from '../services/customization';

@Component({})
export default class StartStreamingButton extends Vue {
  @Inject() rtmpOutputService: RtmpOutputService;
  @Inject() userService: UserService;
  @Inject() customizationService: CustomizationService;
  @Inject() navigationService: NavigationService;

  @Prop() disabled: boolean;

  toggleStreaming() {
      if (this.rtmpOutputService.isActive()) {
        this.rtmpOutputService.stop();
        return;
      }

      this.rtmpOutputService.start();
  }

  get streamButtonLabel() {
    if (this.rtmpOutputService.isActive()) {
      return 'End Stream';
    }

    return 'Go Live';
  }
}
