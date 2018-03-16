import * as obs from '../obs-api';

export class FEncoder {
  revision: string;
  type: string;
  settings: obs.ISettings;
  isAudio: boolean;

  constructor() {
    this.revision = null;
    this.type = null;
    this.settings = null;
  }
}

export class FAudioEncoder extends FEncoder {
  constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
    super();
    FAudioEncoder.init(type, uniqueId, settings);

    if (settings) this.settings = settings;
    this.type = type;
    this.isAudio = true;
  }

  static init(type: string, uniqueId: string, settings?: obs.ISettings) {
    let obsEncoder: obs.IAudioEncoder = null;

    if (settings)
      obsEncoder = obs.AudioEncoderFactory.create(type, uniqueId, settings);
    else 
      obsEncoder = obs.AudioEncoderFactory.create(type, uniqueId);
    
    if (!obsEncoder) throw 'failed to create audio encoder';

    const audio = obs.AudioFactory.getGlobal();
  }
}

export class FVideoEncoder extends FEncoder {
  constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
    super();
    FVideoEncoder.init(type, uniqueId, settings);

    if (settings) this.settings = settings;
    this.type = type;
    this.isAudio = false;
  }

  static init(type: string, uniqueId: string, settings?: obs.ISettings) {
    let obsEncoder: obs.IVideoEncoder = null;

    if (settings)
      obsEncoder = obs.VideoEncoderFactory.create(type, uniqueId, settings);
    else 
      obsEncoder = obs.VideoEncoderFactory.create(type, uniqueId);

    if (!obsEncoder) throw 'failed to create video encoder';

    const video = obs.VideoFactory.getGlobal();
  }
}
