import * as obs from '../obs-api';

class FEncoder {
  uniqueId: string;
  type: string;
}

export class FAudioEncoder extends FEncoder {
  constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
    super();

    let obsEncoder: obs.IAudioEncoder = null;

    if (settings)
      obsEncoder = obs.AudioEncoderFactory.create(type, uniqueId, settings);
    else obsEncoder = obs.AudioEncoderFactory.create(type, uniqueId);

    if (!obsEncoder) throw 'failed to create audio encoder';

    const audio = obs.AudioFactory.getGlobal();
    obsEncoder.setAudio(audio);

    this.uniqueId = uniqueId;
    this.type = type;
  }
}

export class FVideoEncoder extends FEncoder {
  constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
    super();

    let obsEncoder: obs.IVideoEncoder = null;

    if (settings)
      obsEncoder = obs.VideoEncoderFactory.create(type, uniqueId, settings);
    else obsEncoder = obs.VideoEncoderFactory.create(type, uniqueId);

    if (!obsEncoder) throw 'failed to create video encoder';

    const video = obs.VideoFactory.getGlobal();
    obsEncoder.setVideo(video);

    this.uniqueId = uniqueId;
    this.type = type;
  }
}
