import { FAudioEncoder, FVideoEncoder } from './encoder';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer } from 'electron';
import Vue from 'vue';

export interface IEncoderServiceState {
  audioEncoders: Dictionary<FAudioEncoder>;
  videoEncoders: Dictionary<FVideoEncoder>;
}

export class EncoderService extends StatefulService<IEncoderServiceState> {
  static initialState: IEncoderServiceState = {
    audioEncoders: {},
    videoEncoders: {}
  };

  static getUniqueId(): string {
    return 'encoder_' + ipcRenderer.sendSync('getUniqueId');
  }

  protected init() {}

  @mutation()
  ADD_AUDIO_ENCODER(encoder: FAudioEncoder) {
    Vue.set(this.state.audioEncoders, encoder.uniqueId, encoder);
  }

  @mutation()
  ADD_VIDEO_ENCODER(encoder: FVideoEncoder) {
    Vue.set(this.state.videoEncoders, encoder.uniqueId, encoder);
  }

  addAudioEncoder(encoder: FAudioEncoder) {
    this.ADD_AUDIO_ENCODER(encoder);
  }

  addVideoEncoder(encoder: FVideoEncoder) {
    this.ADD_VIDEO_ENCODER(encoder);
  }
}
