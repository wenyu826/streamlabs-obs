import * as obs from '../../../obs-api';
import { FAudioEncoder, FVideoEncoder } from '../encoders';
import { FProvider } from '../providers';

export class FOutput {
  revision: string;
  type: string;
  settings: obs.ISettings;

  /* Some outputs don't actually require
     * encoders or a service. These may be 
     * optional. That said, if it does require
     * those things, it will crash if you don't
     * provide them. Be careful! */
  audioEncoder: string = null;
  videoEncoder: string = null;
  provider: string = null;

  /* FIXME: libobs doesn't allow you to fetch
     * output capabilities yet */
  flags: number = 0;

  starting: boolean = false;
  stopping: boolean = false;
  reconnecting: boolean = false;
  active: boolean = false;

  constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
    FOutput.init(type, uniqueId, settings);

    if (settings) this.settings = settings;
    this.type = type;
  }

  static init(type: string, uniqueId: string, settings?: obs.ISettings) {
    let obsOutput: obs.IOutput = null;

    if (settings)
      obsOutput = obs.OutputFactory.create(type, uniqueId, settings);
    else obsOutput = obs.OutputFactory.create(type, uniqueId);

    if (!obsOutput) throw 'failed to create output';
  }
}
