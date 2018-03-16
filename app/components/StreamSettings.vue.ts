import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import GenericFormGroups from './shared/forms/GenericFormGroups.vue';
import { RtmpOutputService, EProviderMode } from 'services/rtmp-output';
import { ProviderService } from 'services/providers';
import { TFormData, getPropertiesFormData } from './shared/forms/Input';
import { ServiceFactory } from 'services/obs-api';
import { Multiselect } from 'vue-multiselect';

interface StreamTypeSelection {
  label: string,
  value: EProviderMode
}

@Component({
  components: { GenericFormGroups, Multiselect }
})

export default class StreamSettings extends Vue {

  @Inject() rtmpOutputService: RtmpOutputService;
  @Inject() providerService: ProviderService;

  settingsFormData = this.providerService.getPropertyFormData(this.rtmpOutputService.getProviderId());
  serviceType: StreamTypeSelection[] = [
    { 
      label: 'Streaming Service',
      value: EProviderMode.Common
    },
    {
      label: 'Custom',
      value: EProviderMode.Custom
    }
  ];

  setServiceType(selection: StreamTypeSelection) {
    this.rtmpOutputService.setProviderMode(selection.value);
    
    const providerId = this.rtmpOutputService.getProviderId();
    this.settingsFormData = this.providerService.getPropertyFormData(providerId);
  }

  save(formData: TFormData) {
    const providerId = this.rtmpOutputService.getProviderId();

    this.providerService.setPropertyFormData(providerId, formData);
    this.settingsFormData = this.providerService.getPropertyFormData(providerId);
  }
}
