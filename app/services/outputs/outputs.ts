import Vue from 'vue';
import { FOutput } from './output';
import { StatefulService, mutation } from '../stateful-service';
import { ipcRenderer } from 'electron';
import * as obs from '../obs-api';

export interface IOutputServiceState {
  outputs: Dictionary<FOutput>;
}

export class OutputService extends StatefulService<IOutputServiceState> {
  static initialState: IOutputServiceState = {
    outputs: {}
  };

  static getUniqueId(): string {
    return 'output_' + ipcRenderer.sendSync('getUniqueId');
  }

  protected init() {}

  @mutation()
  private ADD_OUTPUT(output: FOutput) {
    Vue.set(this.state.outputs, output.uniqueId, output);
  }

  @mutation()
  private REMOVE_OUTPUT(uniqueId: string) {
    Vue.delete(this.state.outputs, uniqueId);
  }

  @mutation()
  private UPDATE_ENCODERS(
    uniqueId: string,
    audioEncoderId: string,
    videoEncoderId: string
  ) {
    FOutput.setEncoders(
      this.state.outputs[uniqueId],
      audioEncoderId,
      videoEncoderId
    );
  }

  @mutation()
  private UPDATE_SERVICE(uniqueId: string, serviceId: string) {
    FOutput.setService(this.state.outputs[uniqueId], serviceId);
  }

  @mutation()
  private START_OUTPUT(uniqueId: string) {
    FOutput.start(this.state.outputs[uniqueId]);
  }

  @mutation()
  private STOP_OUTPUT(uniqueId: string) {
    FOutput.stop(this.state.outputs[uniqueId]);
  }

  addOutput(output: FOutput) {
    this.ADD_OUTPUT(output);
  }

  removeOutput(uniqueId: string) {
    /* Release directly to avoid a third map lookup. */
    const output = obs.OutputFactory.fromName(uniqueId);
    output.release();

    this.REMOVE_OUTPUT(uniqueId);
  }

  startOutput(uniqueId: string) {
    this.START_OUTPUT(uniqueId);
  }

  stopOutput(uniqueId: string) {
    this.STOP_OUTPUT(uniqueId);
  }

  setOutputEncoders(
    uniqueId: string,
    audioEncoderId: string,
    videoEncoderId: string
  ) {
    this.UPDATE_ENCODERS(uniqueId, audioEncoderId, videoEncoderId);
  }

  setOutputService(uniqueId: string, serviceId: string) {
    this.UPDATE_SERVICE(uniqueId, serviceId);
  }

  isOutputActive(uniqueId: string): boolean {
    return FOutput.isActive(this.state.outputs[uniqueId]);
  }
}
