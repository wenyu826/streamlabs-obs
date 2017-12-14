import * as obs from '../obs-api';

export class FProvider {
  uniqueId: string;
  type: string;
  key: string = ''; /* Stream Key */
  url: string = ''; /* Actual URL to provider */
  username: string = ''; /* username for login if applicable */
  password: string = ''; /* password for login if applicable */
  provider: string = ''; /* Name of the provider, e.g. 'Twitch' */

  constructor(type: string, uniqueId: string, settings?: obs.ISettings) {
    let obsService: obs.IService = null;

    if (settings)
      obsService = obs.ServiceFactory.create(type, uniqueId, settings);
    else obsService = obs.ServiceFactory.create(type, uniqueId);

    if (!obsService) throw 'failed to create service';

    this.uniqueId = uniqueId;
    this.type = type;
  }
}
