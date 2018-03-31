import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import SettingsIntInput from './shared/forms/SettingsIntInput.vue';
import SettingsPathInput from './shared/forms/SettingsPathInput.vue';
import SettingsListInput from './shared/forms/SettingsListInput.vue';
import GenericForm from './shared/forms/GenericForm.vue';
import IntInput from './shared/forms/IntInput.vue';
import ListInput from './shared/forms/ListInput.vue';
import PathInput from './shared/forms/PathInput.vue';

import { 
  RtmpOutputService,
  EEncoderMode,
  EProviderMode
} from 'services/rtmp-output';

import { RecOutputService } from 'services/recording-output';
import { EncoderService } from 'services/encoders';
import { 
  TFormData, 
  INumberInputValue,
  IListInput,
  IListOption,
  IPathInputValue
} from './shared/forms/Input';

import {
  IConfigurable,
  VideoEncoderFactory,
  AudioEncoderFactory,
  INumberProperty,
  EPropertyType,
  EPathType
} from 'services/obs-api';
import { StreamingService } from 'services/streaming';

@Component({
  components: {
    SettingsIntInput,
    SettingsPathInput,
    SettingsListInput,
    GenericForm,
    IntInput,
    ListInput,
    PathInput
  }
})

export default class OutputsSettings extends Vue {
  @Inject() recOutputService: RecOutputService;
  @Inject() rtmpOutputService: RtmpOutputService;
  @Inject() encoderService: EncoderService;
  @Inject() streamingService: StreamingService;

  $refs: {
    simpleVideoBitrate: SettingsIntInput;
  }

  private getEncoderDescription(type: string): string {
    const names = {
      'obs_x264': '(Software) x264',
      'ffmpeg_nvenc': '(Hardware) NVENC via FFMpeg '
    };

    let description = names[type];

    if (!description) 
      description = type;

    return description;
  }

  get isStreaming() {
    return this.streamingService.isStreaming;
  }

  get isRecording() {
    return this.streamingService.isRecording;
  }

  get isActive() {
    return this.streamingService.state.isActive;
  }

  get outputSettingsModeValue() {
      return this.rtmpOutputService.state.rtmpEncoderMode;
  }

  outputSettingsModeOptions = [
    { description: 'Simple', value: EEncoderMode.Simple },
    { description: 'Advanced', value: EEncoderMode.Advanced }
  ];
  
  get advRtmpVideoEncoderTypeValue() {
    const encoderId = this.rtmpOutputService.state.rtmpAdvEncoderId;
    return this.encoderService.state[encoderId].type;
  }

  get simpleRtmpVideoEncoderTypeValue() {
    const encoderId = this.rtmpOutputService.state.rtmpSimpleEncoderId;
    return this.encoderService.state[encoderId].type;
  }

  get recordingFolderPathValue() {
    return this.recOutputService.state.recDirectory;
  }

  get recordingFormatValue() {
    return this.recOutputService.state.recFormat;
  }

  get videoEncoderOptions() {
    const options: IListOption<string>[] = [];
    const types = this.encoderService.getAvailableVideoEncoders();

    for (let i = 0; i < types.length; ++i) {
      options.push({
        description: this.getEncoderDescription(types[i]),
        value: types[i]
      });
    }

    return options;
  }

  get recordingFormatOptions() {
    const formats = this.recOutputService.getRecordingFormats();
    let options: IListOption<string>[] = [];

    for (let i = 0; i < formats.length; ++i) {
      options.push({ value: formats[i], description: formats[i] });
    }

    return options;
  }

  private getBitrateProps(configurable: IConfigurable) {
    const settings = configurable.settings;
    const props = configurable.properties;
    const bitrateProp = props.get('bitrate') as INumberProperty;

    /* We circumvent the properties manager to bring a subset
     * of the actual properties for a more simplistic UI */

    return {
      value: settings['bitrate'],
      min: bitrateProp.details.min,
      max: bitrateProp.details.max,
      step: bitrateProp.details.step,
      disabled: !bitrateProp.enabled,
    };
  }

  get rtmpVideoBitrateProps() {
    const uniqueId = this.rtmpOutputService.getVideoEncoderId();
    const encoder = VideoEncoderFactory.fromName(uniqueId);
    
    return this.getBitrateProps(encoder);
  }

  get rtmpAudioBitrateProps() {
    const uniqueId = this.rtmpOutputService.getAudioEncoderId();
    const encoder = AudioEncoderFactory.fromName(uniqueId);
    
    return this.getBitrateProps(encoder);
  }

  simpleRtmpStreamCollapsed = false;
  advRtmpStreamCollapsed = false;
  recordingCollapsed = false;

  advRtmpVideoEncoderForm = 
    this.encoderService.getPropertyFormData(this.rtmpOutputService.getVideoEncoderId());

  advRtmpAudioEncoderForm = 
    this.encoderService.getPropertyFormData(this.rtmpOutputService.getAudioEncoderId());

  inputOutputSettingsMode(option: IListOption<EEncoderMode>) {
    this.rtmpOutputService.setEncoderMode(option.value);
  }

  inputAdvRtmpVideoEncoder(formData: INumberInputValue[]) {
    const videoEncoderId = this.rtmpOutputService.getVideoEncoderId();

    this.encoderService.setPropertyFormData(videoEncoderId, formData);
    this.advRtmpVideoEncoderForm = this.encoderService.getPropertyFormData(videoEncoderId);
  }

  inputAdvRtmpAudioEncoder(formData: INumberInputValue[]) {
    const audioEncoderId = this.rtmpOutputService.getAudioEncoderId();

    this.encoderService.setPropertyFormData(audioEncoderId, formData);
    this.advRtmpAudioEncoderForm = this.encoderService.getPropertyFormData(audioEncoderId);
  }

  inputSimpleRtmpVideoBitrate(value: number) {
    const videoEncoderId = this.rtmpOutputService.getVideoEncoderId();

    this.encoderService.setBitrate(videoEncoderId, value);
  }

  inputSimpleRtmpAudioBitrate(value: number) {
    const audioEncoderId = this.rtmpOutputService.getAudioEncoderId();

    this.encoderService.setBitrate(audioEncoderId, value);
  }

  inputSimpleRtmpVideoEncoderType(option: IListOption<string>) {
    this.rtmpOutputService.setVideoEncoderType(EEncoderMode.Simple, option.value);
    const videoEncoderId = this.rtmpOutputService.getVideoEncoderId();
    this.encoderService.setBitrate(videoEncoderId, this.$refs.simpleVideoBitrate.value);
  }

  inputAdvRtmpVideoEncoderType(formData: IListInput<string>) {
    /* Rebuild the entire properties menu 
     * since the IConfigurable changed */
    this.rtmpOutputService.setVideoEncoderType(EEncoderMode.Advanced, formData.value);
    const videoEncoderId = this.rtmpOutputService.getVideoEncoderId();
    this.advRtmpVideoEncoderForm = this.encoderService.getPropertyFormData(videoEncoderId);
  }

  inputRecordingFolderPath(path: string) {
    this.recOutputService.setFileDirectory(path);
  }

  inputRecordingFormat(option: IListOption<string>) {
    this.recOutputService.setRecordingFormat(option.value);
  }
}
