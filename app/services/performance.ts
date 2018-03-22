import Vue from 'vue';
import { Subject } from 'rxjs/Subject';
import { Inject } from 'util/injector';
import { StatefulService, mutation } from './stateful-service';
import { RtmpOutputService } from 'services/rtmp-output';
import { OutputFactory, Global } from 'services/obs-api';
import electron from 'electron';

interface IPerformanceState {
  CPU: number;
  numberDroppedFrames: number;
  percentageDroppedFrames: number;
  lastTotalBytes: number;
  bandwidth: number;
  frameRate: number;
}

// TODO: merge this service with PerformanceMonitorService

// Keeps a store of up-to-date performance metrics
export class PerformanceService extends StatefulService<IPerformanceState> {

  @Inject() rtmpOutputService: RtmpOutputService;

  static initialState: IPerformanceState = {
    CPU: 0,
    numberDroppedFrames: 0,
    percentageDroppedFrames: 0,
    lastTotalBytes: 0,
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

  }

  async initialize() {
    await this.rtmpOutputService.initialize();

    const interval = 1000 * 3;

    this.intervalId = window.setInterval(() => {
      const outputId = this.rtmpOutputService.getOutputId();
      const obsOutput = OutputFactory.fromName(outputId);

      const numberDroppedFrames = obsOutput.framesDropped;
      const totalFrames  = obsOutput.totalFrames;
      const percentageDroppedFrames = numberDroppedFrames / totalFrames * 100.0;

      const totalBytes = obsOutput.totalBytes;
      const lastTotalBytes = this.state.lastTotalBytes;
      let bandwidth = 0;

      if (totalBytes > lastTotalBytes) {
        bandwidth = ((totalBytes - lastTotalBytes) * 8) / interval;
        console.log(`Bytes Between: ${totalBytes - lastTotalBytes}`);
      }

      const frameRate = Global.getActiveFps();

      const CPU = electron.remote.app.getAppMetrics().map(proc => {
        return proc.cpu.percentCPUUsage;
      }).reduce((sum, usage) => sum + usage);

      this.SET_PERFORMANCE_STATS({
        CPU,
        numberDroppedFrames,
        percentageDroppedFrames,
        lastTotalBytes: totalBytes,
        bandwidth,
        frameRate
      });
    }, interval);
  }

  stop() {
    clearInterval(this.intervalId);
    this.SET_PERFORMANCE_STATS(PerformanceService.initialState);
  }

}
