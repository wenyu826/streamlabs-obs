import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
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
  VideoEncoderFactory,
  AudioEncoderFactory,
  INumberProperty,
  EPropertyType,
  EPathType
} from 'services/obs-api';

@Component({
  components: { 
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

  /**********************
   * Output Settings Mode
   **********************/

  outputSettingsModeForm: IListInput<EEncoderMode> = {
    value: this.rtmpOutputService.getCurrentMode(),
    name: 'output_mode',
    description: 'Output Mode',
    options: [
      { description: 'Simple', value: EEncoderMode.Simple },
      { description: 'Advanced', value: EEncoderMode.Advanced }
    ]
  }

  /******************************************
   * RTMP Settings, both simple and advanced.
   * Advanced settings are prefixed with adv 
   * or have Adv in the name. Simple settings 
   * are prefixed with simple or have Simple 
   * in the name.
   *********************************************************/
  private buildAdvRtmpEncoderTypeForm = (): IListInput<string> => {
    const encoderId = this.rtmpOutputService.state.rtmpAdvEncoderId;
    const type = this.encoderService.state[encoderId].type;

    return this.buildRtmpEncoderTypeForm(type);
  }

  private buildSimpleRtmpEncoderTypeForm = (): IListInput<string> => {
    const encoderId = this.rtmpOutputService.state.rtmpSimpleEncoderId;
    const type = this.encoderService.state[encoderId].type;

    return this.buildRtmpEncoderTypeForm(type);
  }

  private buildRtmpEncoderTypeForm = (type: string): IListInput<string> => {
    const options: IListOption<string>[] = [];
    const types = this.encoderService.getAvailableVideoEncoders();

    for (let i = 0; i < types.length; ++i) {
      options.push({ 
        description: this.getEncoderDescription(types[i]), 
        value: types[i] 
      });
    }

    return {
      value: type,
      name: 'Video Encoder',
      description: 'Video Encoder',
      options
    }
  }

  private buildRtmpVideoBitrateForm = () => {
    const videoEncId = this.rtmpOutputService.getVideoEncoderId();
    const obsVideoEnc = VideoEncoderFactory.fromName(videoEncId);
    const videoSettings = obsVideoEnc.settings;
    const videoProps = obsVideoEnc.properties;
    const videoBitrateProp = videoProps.get('bitrate') as INumberProperty;

    /* We circumvent the properties manager to bring a subset
     * of the actual properties for a more simplistic UI */

    return {
      value: videoSettings['bitrate'],
      description: 'Video Bitrate',
      name: 'Video Bitrate',
      type: videoBitrateProp.type,
      subType: videoBitrateProp.details.type,
      minVal: videoBitrateProp.details.min,
      maxVal: videoBitrateProp.details.max,
      stepVal: videoBitrateProp.details.step,
      visible: videoBitrateProp.visible,
      enabled: videoBitrateProp.enabled,
    };
  }

  private buildRtmpAudioBitrateForm = () => {
    const audioEncId = this.rtmpOutputService.getAudioEncoderId();
    const obsAudioEnc = AudioEncoderFactory.fromName(audioEncId);
    const audioSettings = obsAudioEnc.settings;
    const audioProps = obsAudioEnc.properties;
    const audioBitrateProp = audioProps.get('bitrate') as INumberProperty;

    /* We circumvent the properties manager to bring a subset
     * of the actual properties for a more simplistic UI */

    return {
      value: audioSettings['bitrate'],
      description: 'Audio Bitrate',
      name: 'Audio Bitrate',
      type: audioBitrateProp.type,
      subType: audioBitrateProp.details.type,
      minVal: audioBitrateProp.details.min,
      maxVal: audioBitrateProp.details.max,
      stepVal: audioBitrateProp.details.step,
      visible: audioBitrateProp.visible,
      enabled: audioBitrateProp.enabled,
    };
  }

  simpleRtmpStreamCollapsed = false;
  simpleRtmpVideoBitrateForm = this.buildRtmpVideoBitrateForm();
  simpleRtmpVideoEncoderTypeForm = this.buildSimpleRtmpEncoderTypeForm();
  simpleRtmpAudioBitrateForm = this.buildRtmpAudioBitrateForm();

  advRtmpStreamCollapsed = false;
  advRtmpVideoEncoderTypeForm = this.buildAdvRtmpEncoderTypeForm();
  advRtmpVideoEncoderForm = 
    this.encoderService.getPropertyFormData(this.rtmpOutputService.getVideoEncoderId());

  advRtmpAudioEncoderForm = 
    this.encoderService.getPropertyFormData(this.rtmpOutputService.getAudioEncoderId());

  inputOutputSettingsMode(formData: IListInput<EEncoderMode>) {
    this.rtmpOutputService.setEncoderMode(formData.value);
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

  inputSimpleRtmpVideoBitrate(formData: INumberInputValue) {
    const videoEncoderId = this.rtmpOutputService.getVideoEncoderId();

    this.encoderService.setBitrate(videoEncoderId, formData.value);
  }

  inputSimpleRtmpAudioBitrate(formData: INumberInputValue) {
    const audioEncoderId = this.rtmpOutputService.getAudioEncoderId();

    this.encoderService.setBitrate(audioEncoderId, formData.value);
  }

  inputSimpleRtmpVideoEncoderType(formData: IListInput<string>) {
    this.rtmpOutputService.setVideoEncoderType(EEncoderMode.Simple, formData.value);
  }

  inputAdvRtmpVideoEncoderType(formData: IListInput<string>) {
    /* Rebuild the entire properties menu 
     * since the IConfigurable changed */
    this.rtmpOutputService.setVideoEncoderType(EEncoderMode.Advanced, formData.value);
    const videoEncoderId = this.rtmpOutputService.getVideoEncoderId();
    this.advRtmpVideoEncoderForm = this.encoderService.getPropertyFormData(videoEncoderId);
  }

  /**********************************************
   * Recording settings, both simple and advanced.
   * Similar to stream for naming scheme with the
   * exception of the use of "rec" and "Rec" 
   * instead.
   **********************************************/
  presetLossless = {
    format_name: "avi",
    audio_encoder: "pcm_s16le",
    video_encoder: "utvideo"
  }

  recordingCollapsed = false;

  recordingFolderPath: IPathInputValue = {
    value: this.recOutputService.getFileDirectory(),
    name: 'directory',
    description: 'Recording Path',
    type: EPropertyType.Path,
    subType: EPathType.Directory,
    filters: []
  }

  private buildFormatOptions = () => {
    const formats = this.recOutputService.getRecordingFormats();
    let options: IListOption<string>[] = [];

    for (let i = 0; i < formats.length; ++i) {
      options.push({ value: formats[i], description: formats[i] });
    }

    return options;
  }

  recordingFormat: IListInput<string> = {
    value: this.recOutputService.getRecordingFormat(),
    name: 'format',
    description: 'Recording Format',
    type: EPropertyType.List,
    options: this.buildFormatOptions()
  }

  inputRecordingFolderPath(formData: IPathInputValue) {
    this.recOutputService.setFileDirectory(formData.value);
  }

  inputRecordingFormat(formData: IListInput<string>) {
    this.recOutputService.setRecordingFormat(formData.value);
  }
}
