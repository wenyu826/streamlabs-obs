import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import ListInput from './shared/forms/ListInput.vue';
import BoolInput from './shared/forms/BoolInput.vue';
import IntInput from './shared/forms/IntInput.vue';
import GenericForm from './shared/forms/GenericForm.vue';
import { SettingsStorageService } from 'services/settings';
import { OutputService } from 'services/outputs';
import { RtmpOutputService } from 'services/rtmp-output';

import {
  IFormInput,
  IListInput,
  IListOption,
  TFormData,
  INumberInputValue
} from '../components/shared/forms/Input';

import {
  EPropertyType,
  EVideoFormat,
  EColorSpace,
  ERangeType,
  ENumberType,
  Global
} from 'services/obs-api';

@Component({
  components: {
    ListInput,
    BoolInput,
    IntInput,
    GenericForm
  }
})
export default class AdvancedSettings extends Vue {
  @Inject() settingsStorageService: SettingsStorageService;
  @Inject() outputService: OutputService;
  @Inject() rtmpOutputService: RtmpOutputService;

  videoCollapsed = false;
  audioCollapsed = false;
  streamDelayCollapsed = false;
  networkCollapsed = false;

  videoFormatForm: IListInput<EVideoFormat> = {
    value: this.settingsStorageService.state.Settings.Video.ColorFormat,
    name: 'video_format',
    description: 'Color Format',
    options: [
      { value: EVideoFormat.NV12, description: 'NV12' },
      { value: EVideoFormat.I420, description: 'I420' },
      { value: EVideoFormat.I444, description: 'I444' },
      { value: EVideoFormat.RGBA, description: 'RGBA' }
    ]
  };

  videoColorSpaceForm: IListInput<EColorSpace> = {
    value: this.settingsStorageService.state.Settings.Video.ColorSpace,
    name: 'color_space',
    description: 'Color Space',
    options: [
      { value: EColorSpace.CS601, description: '601' },
      { value: EColorSpace.CS709, description: '709' }
    ]
  };

  videoColorRangeForm: IListInput<ERangeType> = {
    value: this.settingsStorageService.state.Settings.Video.ColorRange,
    name: 'color_range',
    description: 'Color Range',
    options: [
      { value: ERangeType.Default, description: 'Default' },
      { value: ERangeType.Full, description: 'Full' },
      { value: ERangeType.Partial, description: 'Partial' }
    ]
  };

  private buildMonitoringDeviceOptions(): IListOption<string>[] {
    const monitoringDevices = Global.getAudioMonitoringDevices();

    let options: IListOption<string>[] = [
      { description: 'Default', value: 'default' }
    ];

    for (let i = 0; i < monitoringDevices.length; ++i) {
      options.push({
        value: monitoringDevices[i].id,
        description: monitoringDevices[i].name
      });
    }

    return options;
  }

  monitoringDevicesForm: IListInput<string> = {
    value: this.settingsStorageService.state.Settings.Audio.MonitoringDeviceId,
    name: 'monitoring_device',
    description: 'Audio Monitoring Device',
    options: this.buildMonitoringDeviceOptions()
  }

  networkForm: TFormData = this.outputService.getPropertiesFormData(
    this.rtmpOutputService.getOutputId()
  );

  get streamDelayEnabled(): IFormInput<boolean> {
    return {
      value: this.settingsStorageService.state.Settings.Delay.Enabled,
      name: 'delay_enabled',
      description: 'Enabled'
    };
  }

  set streamDelayEnabled(formData: IFormInput<boolean>) {
    const outputId = this.rtmpOutputService.getOutputId();

    this.outputService.setDelay(outputId, 0);

    this.settingsStorageService.setSettings({
      Delay: {
        ...this.settingsStorageService.state.Settings.Delay,
        Enabled: formData.value
      }
    });
  }

  streamDelayTime = {
    value: this.outputService.getDelay(this.rtmpOutputService.getOutputId()),
    name: 'delay_time',
    description: 'Duration (seconds)',
    type: EPropertyType.Int,
    subType: ENumberType.Scroller,
    minVal: 0,
    maxVal: 1000000,
    stepVal: 1
  };

  get streamPreserve(): IFormInput<boolean> {
    return {
        value: this.outputService.getDelayFlag(this.rtmpOutputService.getOutputId()) ? true : false,
        name: 'delay_reconnect_preserve',
        description: 'Preserve cutoff point when reconnecting'
    }
  }

  set streamPreserve(formData: IFormInput<boolean>) {
    const outputId = this.rtmpOutputService.getOutputId();
    this.outputService.setDelayFlag(outputId, formData.value ? 1 : 0);
  }

  inputVideoFormat(formData: IListInput<EVideoFormat>) {
    this.settingsStorageService.setSettings({
      Video: {
        ...this.settingsStorageService.state.Settings.Video,
        ColorFormat: formData.value
      }
    });

    this.settingsStorageService.resetVideo();
  }

  inputVideoColorSpace(formData: IListInput<EColorSpace>) {
    this.settingsStorageService.setSettings({
      Video: {
        ...this.settingsStorageService.state.Settings.Video,
        ColorSpace: formData.value
      }
    });

    this.settingsStorageService.resetVideo();
  }

  inputVideoColorRange(formData: IListInput<EColorSpace>) {
    this.settingsStorageService.setSettings({
      Video: {
        ...this.settingsStorageService.state.Settings.Video,
        ColorRange: formData.value
      }
    });

    this.settingsStorageService.resetVideo();
  }

  inputNetwork(formData: TFormData) {
    const outputId = this.rtmpOutputService.getOutputId();

    this.outputService.setPropertiesFormData(outputId, formData);
    this.networkForm = this.outputService.getPropertiesFormData(outputId);
  }

  inputStreamDelayTime(formData: INumberInputValue) {
    const outputId = this.rtmpOutputService.getOutputId();
    this.outputService.setDelay(outputId, formData.value);
  }

  inputMonitoringDevices(formData: IListInput<string>) {
    /* Names can be duplicate but the id cannot be.
     * That said, obs expects the id *and* name. 
     * So we search the current options for the id
     * and get the associated description which
     * is the name we want. */
    const options = formData.options;
    let name;

    for (let i = 0; i < options.length; ++i) {
      if (options[i].value === formData.value) {
        name = options[i].description;
        break;
      }
    }

    this.settingsStorageService.setSettings({
      Audio: {
        ...this.settingsStorageService.state.Settings.Audio,
        MonitoringDeviceId: formData.value,
        MonitoringDeviceName: name
      }
    });

    this.settingsStorageService.resetMonitoringDevice();
  }
}
