import Vue from 'vue';
import { Subject } from 'rxjs/Subject';

import { StatefulService, mutation } from './stateful-service';
import { nodeObs } from './obs-api';
import electron from 'electron';

interface IPerformanceState {
  CPU: number;
  numberDroppedFrames: number;
  percentageDroppedFrames: number;
  bandwidth: number;
  frameRate: number;
}

// TODO: merge this service with PerformanceMonitorService

// Keeps a store of up-to-date performance metrics
export class PerformanceService extends StatefulService<IPerformanceState> {

  static initialState: IPerformanceState = {
    CPU: 0,
    numberDroppedFrames: 0,
    percentageDroppedFrames: 0,
    bandwidth: 0,
    frameRate: 0
  };

  droppedFramesDetected = new Subject<number>();
  private intervalId: number;

  @mutation()
  SET_PERFORMANCE_STATS(stats: IPerformanceState) {
    Object.keys(stats).forEach(stat => {
      Vue.set(this.state, stat, stats[stat]);
    });
  }

  init() {
    this.intervalId = window.setInterval(() => {
      console.warn('Performance Stats not implemented yet');
    }, 2 * 1000);
  }

  stop() {
    clearInterval(this.intervalId);
    this.SET_PERFORMANCE_STATS(PerformanceService.initialState);
  }

}
