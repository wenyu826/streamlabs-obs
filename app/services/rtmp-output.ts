import { FOutput, OutputService } from './outputs';
import { FProvider, ProviderService } from './providers';
import { FAudioEncoder, FVideoEncoder, EncoderService } from './encoders';
import { StatefulService, mutation } from './stateful-service';
import { Inject } from 'util/injector';

import PouchDB from 'pouchdb-core';
import PouchDBWebSQL from 'pouchdb-adapter-node-websql';
PouchDB.plugin(PouchDBWebSQL);

/* A wrapper class that handles the global rtmp output 
 * and it's associated objects and state. */

interface RtmpOutputServiceState {
  revision: string;
  rtmpOutputId: string;
}

export class RtmpOutputService extends StatefulService<RtmpOutputServiceState> {
  private initialized = false;
  private db = new PouchDB('RtmpOutputService.sqlite3', { adapter: 'websql' });

  @Inject() outputService: OutputService;
  @Inject() providerService: ProviderService;
  @Inject() encoderService: EncoderService;

  @mutation()
  UPDATE_OUTPUT(uniqueId: string) {
    this.state.rtmpOutputId = uniqueId;
  }

  /* This occurs when the database doesn't exist */
  private handleDbError(error: any): void {
    /* A 404 is normal on a cold start */
    if (error.status !== 404) {
      /* Unsure how to proceed from here. */
      throw Error(
        `Problem with rtmp-output configuration document: ${error.message}`);
    }

    console.log('rtmp-output didn\'t exist, creating document...');
    const outputId = OutputService.getUniqueId();
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

    this.providerService.addProvider(providerId, provider);
    this.encoderService.addAudioEncoder(audioEncoderId, audioEncoder);
    this.encoderService.addVideoEncoder(videoEncoderId, videoEncoder);
    this.outputService.addOutput(outputId, fOutput);

    this.outputService.setOutputProvider(outputId, providerId);
    this.outputService.setOutputEncoders(
      outputId,
      audioEncoderId,
      videoEncoderId
    );

    /* It's vital this put succeeds or else we'll end up with
     * multiple outputs being created. If the rtmp output doesn't
     * know what encoder/output is associated with it, then it will
     * just create a new one */
    this.db.put({
      _id: 'rtmp-output',
      rtmpOutputId: outputId
    });

    this.UPDATE_OUTPUT(outputId);
  }

  private syncConfig(result: any): void {
    if (result.rtmpOutputId) {
      if (this.outputService.isOutput(result.rtmpOutputId)) {
        this.UPDATE_OUTPUT(result.rtmpOutputId);
        return;
      }
    }
  }

  async initialize() {
    if (this.initialized) return;
    await this.outputService.initialize();

    await this.db.get('rtmp-output')
      .then((result: any) => { this.syncConfig(result); })
      .catch((error: any) => { this.handleDbError(error); });

    this.initialized = true;
  }

  serialize(): object {
    return {
      rtmpOutputId: this.state.rtmpOutputId
    };
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

  getProviderId(): string {
    return this.outputService.getOutputProvider(this.state.rtmpOutputId);
  }

  getOutputId() {
    return this.state.rtmpOutputId;
  }

  private isValidProviderType(type: string): boolean {
    switch (type) {
      case 'rtmp_common':
      case 'rtmp_custom':
        return true;
    }

    return false;
  }

  /* The functions below surgically removes
   * parts of the output and change them out. 
   * These must be taken care of else we'll be
   * put in a really weird state (audio missing,
   * video not encoded correctly, etc.) */
  setProviderType(type: string) {
    const outputId = this.state.rtmpOutputId;
    const providerId = ProviderService.getUniqueId();
    const oldProviderId = 
      this.outputService.getOutputProvider(outputId);

    if (!this.isValidProviderType(type)) {
      throw Error('Invalid provider type given');
    }

    const provider = new FProvider(
      type,
      providerId
    );

    this.providerService.addProvider(providerId, provider);

    /* TODO FIXME We need to make sure we're not actively
     * using this output, otherwise weird things can happen. */
    this.outputService.setOutputProvider(outputId, providerId);
    this.providerService.removeProvider(oldProviderId);
  }
}
