import { FOutput, OutputService } from './outputs';
import { FProvider, ProviderService } from './providers';
import { FAudioEncoder, FVideoEncoder, EncoderService } from './encoders';
import { StatefulService, mutation } from './stateful-service';
import { Inject } from 'util/injector';

/* A wrapper class that handles the global rtmp output 
 * and it's associated objects and state. */

class RtmpOutputServiceState {
  rtmpOutputId: string;
  rtmpProviderId: string;
  rtmpAudioEncoderId: string;
  rtmpVideoEncoderId: string;
}

export class RtmpOutputService extends StatefulService<RtmpOutputServiceState> {
  static initialState: RtmpOutputServiceState = {
    rtmpOutputId: '',
    rtmpProviderId: '',
    rtmpAudioEncoderId: '',
    rtmpVideoEncoderId: ''
  };

  @Inject() outputService: OutputService;
  @Inject() providerService: ProviderService;
  @Inject() encoderService: EncoderService;

  @mutation()
  UPDATE_PROVIDER(uniqueId: string) {
    this.state.rtmpProviderId = uniqueId;
  }

  @mutation()
  UPDATE_OUTPUT(uniqueId: string) {
    this.state.rtmpOutputId = uniqueId;
  }

  @mutation()
  UPDATE_AUDIO_ENCODER(uniqueId: string) {
    this.state.rtmpAudioEncoderId = uniqueId;
  }

  @mutation()
  UPDATE_VIDEO_ENCODER(uniqueId: string) {
    this.state.rtmpVideoEncoderId = uniqueId;
  }

  @mutation()
  UPDATE_STATE(state: RtmpOutputServiceState) {
    Object.assign(this.state, state);
  }

  protected init() {
    const outputId = OutputService.getUniqueId();
    /* FIXME Load persistent output settings here */
    const fOutput = new FOutput('rtmp_output', outputId);

    /* REMOVE ME These are hardcoded settings for my stream */
    const test_service_settings = {
      key: 'live_149172892_63LDVjr9p1kv3wLP9soqH1yHqctfmq',
      server: 'rtmp://live.twitch.tv/app',
      service: 'Twitch'
    };

    const providerId = ProviderService.getUniqueId();
    /* FIXME Load persistent service settings here */
    const provider = new FProvider(
      'rtmp_common',
      providerId,
      test_service_settings
    );

    const audioEncoderId = EncoderService.getUniqueId();
    /* FIXME Some logic on the best encoder to choose goes here */
    /* FIXME Load persistent settings here */
    const audioEncoder = new FAudioEncoder('mf_aac', audioEncoderId);

    const videoEncoderId = EncoderService.getUniqueId();
    /* FIXME Some logic on the best encoder to choose goes here */
    /* FIXME Load persistent settings here */
    const videoEncoder = new FVideoEncoder('obs_x264', videoEncoderId);

    this.outputService.addOutput(fOutput);
    this.providerService.addProvider(provider);
    this.encoderService.addAudioEncoder(audioEncoder);
    this.encoderService.addVideoEncoder(videoEncoder);

    FOutput.setService(fOutput, providerId);
    FOutput.setEncoders(fOutput, audioEncoderId, videoEncoderId);

    this.UPDATE_STATE({
      rtmpOutputId: outputId,
      rtmpProviderId: providerId,
      rtmpAudioEncoderId: audioEncoderId,
      rtmpVideoEncoderId: videoEncoderId
    });
  }

  start() {
    this.outputService.startOutput(this.state.rtmpOutputId);
  }

  stop() {
    this.outputService.stopOutput(this.state.rtmpOutputId);
  }

  isActive(): boolean {
    return this.outputService.isOutputActive(this.state.rtmpOutputId);
  }
}
