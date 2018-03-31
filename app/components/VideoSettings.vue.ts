import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { Inject } from '../util/injector';
import SettingsListInput from './shared/forms/SettingsListInput.vue';
import SettingsIntInput from './shared/forms/SettingsIntInput.vue';
import ResolutionInput from './shared/forms/ResolutionInput.vue';
import {
  IListInput,
  IListOption,
  INumberInputValue
} from './shared/forms/Input';
import { EScaleType, VideoFactory } from 'services/obs-api';
import { SettingsStorageService, EFPSType } from 'services/settings';
import { StreamingService } from 'services/streaming';

@Component({
  components: { SettingsListInput, SettingsIntInput, ResolutionInput }
})
export default class VideoSettings extends Vue {
  @Inject() settingsStorageService: SettingsStorageService;
  @Inject() streamingService: StreamingService;

  get isActive() {
    return this.streamingService.state.isActive;
  }

  get baseResolutionValue() {
    return this.settingsStorageService.state.Video.BaseResolution;
  }

  get baseResolutionOptions(): IListOption<string>[] {
    return [
      {
        description: '1920x1080',
        value: '1920x1080'
      },
      {
        description: '1280x720',
        value: '1280x720'
      }
    ];
  }

  get outputResolutionOptions(): IListOption<string>[] {
    const resString = this.settingsStorageService.state.Video.BaseResolution;
    const baseRes = this.settingsStorageService.parseResolutionString(
      resString
    );
    let options: IListOption<string>[] = [];

    const outputResolutionRatios = [
      1.0,
      1.25,
      1.0 / 0.75,
      1.5,
      1.0 / 0.6,
      1.75,
      2.0,
      2.25,
      2.5,
      2.75,
      3.0
    ];

    for (let i = 0; i < outputResolutionRatios.length; ++i) {
      const width = (baseRes.width / outputResolutionRatios[i]) | 0;
      const height = (baseRes.height / outputResolutionRatios[i]) | 0;
      const outputString = `${width}x${height}`;

      options.push({ value: outputString, description: outputString });
    }

    return options;
  }

  get outputResolutionValue() {
    return this.settingsStorageService.state.Video.OutputResolution;
  }

  /* Downscale Filters Form Data */
  get downscaleFilterValue() {
    return this.settingsStorageService.state.Video.DownscaleFilter;
  }

  downscaleFilterOptions = [
    {
      description: 'Bilinear (Fastest, but blurry if scalling)',
      value: EScaleType.Bilinear
    },
    {
      description: 'Bicubic (Sharpened scaling, 16 samples)',
      value: EScaleType.Bicubic
    },
    {
      description: 'Lanczos (Sharpened scaling, 32 samples)',
      value: EScaleType.Lanczos
    }
  ];

  /* FPS Setting Form Data */
  fpsTypeOptions = [
    {
      description: 'Common FPS Values',
      value: EFPSType.Common
    },
    {
      description: 'Integer FPS Value',
      value: EFPSType.Integer
    },
    {
      description: 'Fractional FPS Value',
      value: EFPSType.Fraction
    }
  ];

  fpsCommonOptions: IListOption<number>[] = [
    { description: '10', value: 0 },
    { description: '20', value: 1 },
    { description: '24 NTSC', value: 2 },
    { description: '29.97', value: 3 },
    { description: '30', value: 4 },
    { description: '48', value: 5 },
    { description: '59.97', value: 6 },
    { description: '60', value: 7 }
  ];

  get fpsTypeValue() {
    return this.settingsStorageService.state.Video.FPSType;
  }

  get fpsCommonValuesValue() {
    return this.settingsStorageService.state.Video.FPSCommon;
  }

  get fpsIntegerValue() {
    return this.settingsStorageService.state.Video.FPSInt;
  }

  get fpsFractionNumValue() {
    return this.settingsStorageService.state.Video.FPSNum;
  }

  get fpsFractionDenValue() {
    return this.settingsStorageService.state.Video.FPSDen;
  }

  inputBaseResolution(formData: IListInput<string>) {
    this.settingsStorageService.setVideoSettings({
      BaseResolution: formData.value
    });

    this.settingsStorageService.resetVideo();
  }

  inputOutputResolution(formData: IListInput<string>) {
    this.settingsStorageService.setVideoSettings({
      OutputResolution: formData.value
    });

    this.settingsStorageService.resetVideo();
  }

  inputDownscaleFilter(formData: IListInput<EScaleType>) {
    this.settingsStorageService.setVideoSettings({
      DownscaleFilter: formData.value
    });

    this.settingsStorageService.resetVideo();
  }

  inputFpsType(formData: IListInput<number>) {
    this.settingsStorageService.setVideoSettings({
      FPSType: formData.value
    });

    this.settingsStorageService.resetVideo();
  }

  inputFpsCommon(formData: IListInput<number>) {
    this.settingsStorageService.setVideoSettings({
      FPSCommon: formData.value
    });

    this.settingsStorageService.resetVideo();
  }

  inputFpsInteger(value: number) {
    this.settingsStorageService.setVideoSettings({
      FPSInt: value
    });

    this.settingsStorageService.resetVideo();
  }

  inputFpsFractionNum(value: number) {
    this.settingsStorageService.setVideoSettings({
      FPSNum: value
    });

    this.settingsStorageService.resetVideo();
  }

  inputFpsFractionDen(value: number) {
    this.settingsStorageService.setVideoSettings({
      FPSDen: value
    });

    this.settingsStorageService.resetVideo();
  }
}
