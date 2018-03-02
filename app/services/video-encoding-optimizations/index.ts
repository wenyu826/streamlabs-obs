import { Service } from 'services/service';
import { StreamingService } from 'services/streaming';
import { Inject } from '../../util/injector';
import { IProfile, IEncoderPreset, Presets } from './definitions';
import { cloneDeep } from 'lodash';

export * from './definitions';

enum OutputMode {
  simple = 'Simple',
  advanced = 'Advanced'
}

export interface IOutputSettings {
  outputMode: OutputMode;
  encoderField: string;
  presetField: string;
  encoderSettingsField: string;
}

export class VideoEncodingOptimizationService extends Service {
  private previousSettings: any;
  private isUsingEncodingOptimizations = false;

  private simpleOutputSettings: IOutputSettings = {
    outputMode: OutputMode.simple,
    encoderField: 'StreamEncoder',
    presetField: 'Preset',
    encoderSettingsField: 'x264Settings'
  };

  private advancedOutputSettings: IOutputSettings = {
    outputMode: OutputMode.advanced,
    encoderField: 'Encoder',
    presetField: 'preset',
    encoderSettingsField: 'x264opts'
  };

  private currentOutputSettings: IOutputSettings;

  @Inject() streamingService: StreamingService;

  init() {
    this.streamingService.streamingStateChange.subscribe(status => {
      if (!status.isStreaming && this.isUsingEncodingOptimizations) {
        this.isUsingEncodingOptimizations = false;
        this.restorePreviousValues();
      }
    });
  }

  getGameProfiles(game: string): IEncoderPreset[] {
    /* FIXME TODO */
    return [];
  }

  applyProfile(encoderPreset: IEncoderPreset) {
    /* FIXME TODO */
  }

  restorePreviousValues() {
    /* FIXME TODO */
  }

  getIsUsingEncodingOptimizations() {
    return this.isUsingEncodingOptimizations;
  }

  getCurrentOutputSettings(): IOutputSettings {
    return this.currentOutputSettings;
  }
}
