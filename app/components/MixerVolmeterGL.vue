<template>

<div class="volmeter" ref="volmeter">
  <canvas ref="volmeterCanvas"></canvas>
</div>

</template>

<script lang="ts" src="./MixerVolmeterGL.vue.ts"></script>

<style lang="less" scoped>
@import "../styles/index";

.volmeter {
  position: relative;
  overflow: hidden;
  margin: 10px 0;
  height: 4px;
  border-radius: 4px;
  background-color: @slider-background-color;
}

.night-theme {
  .volmeter {
    background-color: @night-slider-bg;
  }
}
</style>
