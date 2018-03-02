import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import GenericFormGroups from './shared/forms/GenericFormGroups.vue';
import { RtmpOutputService } from 'services/rtmp-output';
import { TFormData } from './shared/forms/Input';

@Component({
  components: { GenericFormGroups }
})
export default class RtmpOutputSettings extends Vue {

  @Inject()
  rtmpOutputService: RtmpOutputService;

  settingsFormData: TFormData = null;

  save(formData: TFormData) {
    console.log(formData);
  }
}
