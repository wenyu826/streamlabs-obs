import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import { Subscription } from 'rxjs/subscription';
import { AudioSource } from '../services/audio';
import { VOLMETER_UPDATE_INTERVAL } from '../services/audio/audio';


const vertexShaderSource = `
attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0, 1);
  }
`;

const fragmentShaderSource = `
uniform mediump float u_progress;
uniform mediump vec2 u_resolution;
  void main() {

    if ( u_progress > (gl_FragCoord.x / u_resolution.x )) {
      gl_FragColor = vec4(47. /255., 175. / 255., 147. / 255., 1.0);
    } else {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
  }
`;


@Component({})
export default class MixerVolmeterGL extends Vue {
  @Prop() audioSource: AudioSource;

  volmeterSubscription: Subscription;
  width: number;
  height: number;
  progress: number;
  prevProgress: number;
  timeToNextEvent: number;

  mounted() {
    this.subscribeVolmeter();
    const container = this.$refs.volmeter as HTMLDivElement;

    const canvas = this.$refs.volmeterCanvas as HTMLCanvasElement;
    const gl: WebGLRenderingContext = canvas.getContext('webgl');
    this.width = container.offsetWidth;
    this.height = 50;
    canvas.width = this.width;
    canvas.height = this.height;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
        1.0, -1.0,
        1.0,  1.0]),
      gl.STATIC_DRAW
    );

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);


    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    // Check if it compiled
    const success = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
    if (!success) {
      // Something went wrong during compilation; get the error
      throw 'could not compile shader:' + gl.getShaderInfoLog(fragmentShader);
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    this.progress = 0;
    this.prevProgress = 0;
    this.timeToNextEvent = VOLMETER_UPDATE_INTERVAL;
    let currentTime = performance.now();

    const render = (time?: number) => {
      if (!time) time = currentTime;
      const dt  = (time - currentTime);
      currentTime = time;

      this.timeToNextEvent -= dt;

      if (!this.volmeterSubscription) return;

      window.requestAnimationFrame(render);

      gl.clearColor(1.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const positionLocation = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const locationOfColorShift = gl.getUniformLocation(program, 'u_progress');
      const locationOfResolution = gl.getUniformLocation(program, 'u_resolution');

      const iterpolationFactor = Math.min(
        1,
        (VOLMETER_UPDATE_INTERVAL - this.timeToNextEvent) / VOLMETER_UPDATE_INTERVAL
      );

      const interpolatedProgress =
        this.prevProgress + (this.progress - this.prevProgress) * iterpolationFactor;

      gl.uniform1f(locationOfColorShift, interpolatedProgress);
      gl.uniform2f(locationOfResolution, this.width, this.height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

    };

    render();
  }

  destroyed() {
    this.unsubscribeVolmeter();
  }


  subscribeVolmeter() {
    this.volmeterSubscription = this.audioSource.subscribeVolmeter(volmeter => {
      this.prevProgress = this.progress;
      this.progress = volmeter.level;
      this.timeToNextEvent = VOLMETER_UPDATE_INTERVAL;
    });
  }

  unsubscribeVolmeter() {
    this.volmeterSubscription && this.volmeterSubscription.unsubscribe();
    this.volmeterSubscription = null;
  }

  private interpolateProgress() {

  }
}
