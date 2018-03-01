import { Service } from '../service';
import { IPlatformService, IPlatformAuth, IChannelInfo, IGame } from '.';
import { HostsService } from '../hosts';
import { SettingsService } from '../settings';
import { Inject } from '../../util/injector';
import { handleErrors } from '../../util/requests';
import { UserService } from '../user';

export class MixerService extends Service implements IPlatformService {

  @Inject() hostsService: HostsService;
  @Inject() settingsService: SettingsService;
  @Inject() userService: UserService;

  authWindowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 600,
    height: 800,
    webPreferences: {
      devTools: true,
    }
  };

  apiBase = 'https://mixer.com/api/v1/';

//   // Streamlabs Production Twitch OAuth Client ID
//   clientId = '8bmp6j83z5w4mepq0dn0q1a7g186azi';

  get authUrl() {
    const host = this.hostsService.streamlabs;
    const query = `_=${Date.now()}&skip_splash=true&external=electron&mixer&force_verify&origin=slobs`;
    return `https://${host}/slobs/login?${query}`;
  }

  get oauthToken() {
    return this.userService.platform.token;
  }

  get mixerUsername() {
    return this.userService.platform.username;
  }

  get mixerId() {
    return this.userService.platform.id;
  }

  get channelId() {
    return this.userService.channelId;
  }


  getHeaders(authorized = false): Headers {
    const headers = new Headers();


    headers.append('Content-Type', 'application/json');

    if (authorized) headers.append('Authorization', `Bearer ${this.oauthToken}`);

    return headers;
  }


  // TODO: Some of this code could probably eventually be
  // shared with the Youtube platform.
  setupStreamSettings(auth: IPlatformAuth) {
    this.fetchStreamKey().then(key => {
      const settings = this.settingsService.getSettingsFormData('Stream');
      console.log(key);

      settings.forEach(subCategory => {
        subCategory.parameters.forEach(parameter => {
          if (parameter.name === 'service') {
            parameter.value = 'Mixer.com - FTL';
          }

          if (parameter.name === 'key') {
            parameter.value = key;
          }
        });
      });

      this.settingsService.setSettings('Stream', settings);
    });
  }


  fetchRawChannelInfo() {
    console.log('fetching RAW');
    const headers = this.getHeaders(true);
    const request = new Request(`${this.apiBase}channels/${this.mixerUsername}/details`, { headers });

    return fetch(request)
      .then(handleErrors)
      .then(response => response.json())
      .then(json => {
        this.userService.updatePlatformChannelId(json.id);
        return json;
      });
  }

  async getChannelId() {
    this.fetchRawChannelInfo().then(() => null);
  }


  fetchStreamKey(): Promise<string> {
    return this.fetchRawChannelInfo().then(json => `${json.id}-${json.streamKey}`);
  }


  fetchChannelInfo(): Promise<IChannelInfo> {
    return this.fetchRawChannelInfo().then(json => {
      console.log(json);
      return {
        title: json.name,
        game: json.name
      };
    });
  }


  fetchViewerCount(): Promise<number> {
    const headers = this.getHeaders();
    const request = new Request(`${this.apiBase}channels/${this.mixerUsername}`, { headers });

    return fetch(request)
      .then(handleErrors)
      .then(response => response.json())
      .then(json => {
        console.log(json);
        return json.viewersCurrent;
      });
  }


  putChannelInfo(streamTitle: string, streamGame: string): Promise<boolean> {
    const headers = this.getHeaders(true);
    const data = { channel: { status : streamTitle, game : streamGame } };
    const request = new Request(`https://api.twitch.tv/kraken/channels/`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });

    return fetch(request)
      .then(handleErrors)
      .then(() => true);
  }

  searchGames(searchString: string): Promise<IGame[]> {
    const headers = this.getHeaders();
    const request = new Request(`${this.apiBase}types?limit=10&noCount=1&scope=all&query=${searchString}`, { headers });

    return fetch(request)
      .then(handleErrors)
      .then(response => response.json())
      .then(json => {
        console.log(json);
        return json.slice(0,5);
      });
  }

  getChatUrl(mode: string): Promise<string> {
    return new Promise((resolve) => {
      this.fetchRawChannelInfo()
        .then(json => {
          console.log('providing chat url', `https://mixer.com/embed/chat/${json.id}`);
          resolve(`https://mixer.com/embed/chat/${json.id}`);
        });
    });
  }

  searchCommunities(searchString: string) {
    const headers = this.getHeaders();

    const data = {
      requests:[
        { indexName: 'community',
          params: `query=${searchString}&page=0&hitsPerPage=50&numericFilters=&facets=*&facetFilters=`
        }
      ]};

    const communitySearchUrl = 'https://xluo134hor-dsn.algolia.net/1/indexes/*/queries' +
      '?x-algolia-application-id=XLUO134HOR&x-algolia-api-key=d157112f6fc2cab93ce4b01227c80a6d';

    const request = new Request(communitySearchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    return fetch(request)
      .then(handleErrors)
      .then(response => response.json())
      .then(json => json.results[0].hits);
  }
}
