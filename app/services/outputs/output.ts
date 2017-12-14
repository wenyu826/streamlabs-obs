import * as obs from '../../../obs-api';

export class FOutput {
  uniqueId: string;
  type: string;

  /* Some outputs don't actually require
     * encoders or a service. These may be 
     * optional. That said, if it does require
     * those things, it will crash if you don't
     * provide them. Be careful! */
  audioEncoderId: string = null;
  videoEncoderId: string = null;
  serviceId: string = null;

  /* FIXME: libobs doesn't allow you to fetch
     * output capabilities yet */
  flags: number = 0;

  starting: boolean = false;
  stopping: boolean = false;
  reconnecting: boolean = false;
  active: boolean = false;

  constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
    let obsOutput: obs.IOutput = null;

    if (settings)
      obsOutput = obs.OutputFactory.create(type, uniqueId, settings);
    else obsOutput = obs.OutputFactory.create(type, uniqueId);

    if (!obsOutput) throw 'failed to create output';

    this.uniqueId = uniqueId;
    this.type = type;
  }

  /* Since this class is designed to be 
     * serializable, functions take a context rather than
     * working directly on the context to avoid the functions
     * being serialized. */

  static setEncoders(
    fOutput: FOutput,
    audioEncoderId: string,
    videoEncoderId: string
  ) {
    const audioEncoder = obs.AudioEncoderFactory.fromName(audioEncoderId);
    const videoEncoder = obs.VideoEncoderFactory.fromName(videoEncoderId);
    const output = obs.OutputFactory.fromName(fOutput.uniqueId);

    output.setAudioEncoder(audioEncoder, 0);
    output.setVideoEncoder(videoEncoder);

    fOutput.audioEncoderId = audioEncoderId;
    fOutput.videoEncoderId = videoEncoderId;
  }

  static setService(fOutput: FOutput, serviceId: string) {
    const service = obs.ServiceFactory.fromName(serviceId);
    const output = obs.OutputFactory.fromName(fOutput.uniqueId);

    output.service = service;
  }

  static start(fOutput: FOutput) {
    if (fOutput.stopping) return;

    const output = obs.OutputFactory.fromName(fOutput.uniqueId);

    output.start();
    // this.starting = true;

    /* FIXME: We are not actually active whenever
         * we're in the starting state. We need to
         * catch the started signal in order to do 
         * this correctly */
    fOutput.active = true;

    /* FIXME: Need to catch started signal */
  }

  static stop(fOutput: FOutput) {
    if (fOutput.starting) return;

    const output = obs.OutputFactory.fromName(fOutput.uniqueId);

    output.stop();
    // this.stopping = true;

    /* FIXME: We are not actually inactive whenever
         * we're in the stopping state. We need to
         * catch the started signal in order to do 
         * this correctly */
    fOutput.active = false;

    /* FIXME: Need to catch started signal */
  }

  static release(fOutput: FOutput) {
    const output = obs.OutputFactory.fromName(fOutput.uniqueId);

    output.release();
  }

  static isActive(fOutput: FOutput) {
    return fOutput.active;
  }
}
