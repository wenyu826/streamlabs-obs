<template>
<div>
  <!-- Video Settings -->
  <div class="section">
    <div class="section-title--dropdown">
      <h4 class="section-title" @click="videoCollapsed = !videoCollapsed">
        <i class="fa fa-plus"  v-show="videoCollapsed"></i>
        <i class="fa fa-minus" v-show="!videoCollapsed"></i>
        Video
      </h4>
    </div>
    <div class="section-contect section-content--dropdown" v-if="!videoCollapsed">
      <ListInput
        v-model="videoFormatForm"
        @input="inputVideoFormat" />

      <ListInput
        v-model="videoColorSpaceForm"
        @input="inputVideoColorSpace" />

      <ListInput
        v-model="videoColorRangeForm"
        @input="inputVideoColorRange" />
    </div>
  </div>

  <!-- Audio Settings -->
  <div class="section">
    <div class="section-title--dropdown">
      <h4 class="section-title" @click="audioCollapsed = !audioCollapsed">
        <i class="fa fa-plus"  v-show="audioCollapsed"></i>
        <i class="fa fa-minus" v-show="!audioCollapsed"></i>
        Audio
      </h4>
    </div>
    <div class="section-contect section-content--dropdown" v-if="!audioCollapsed">
      <ListInput
        v-model="monitoringDevicesForm"
        @input="inputMonitoringDevices" />
    </div>
  </div>

  <!-- Stream Delay Settings -->
  <div class="section">
    <div class="section-title--dropdown">
      <h4 class="section-title" @click="streamDelayCollapsed = !streamDelayCollapsed">
        <i class="fa fa-plus"  v-show="streamDelayCollapsed"></i>
        <i class="fa fa-minus" v-show="!streamDelayCollapsed"></i>
        Stream Delay
      </h4>
    </div>
    <div class="section-contect section-content--dropdown" v-if="!streamDelayCollapsed">
      <BoolInput v-model="streamDelayEnabled" />

      <IntInput 
        v-model="streamDelayTime"
        @input="inputStreamDelayTime"
        v-if="streamDelayEnabled.value" />

      <BoolInput
        v-model="streamPreserve"
        v-if="streamDelayEnabled.value" />
    </div>
  </div>

  <!-- Network Settings -->
  <div class="section">
    <div class="section-title--dropdown">
      <h4 class="section-title" @click="networkCollapsed = !networkCollapsed">
        <i class="fa fa-plus"  v-show="networkCollapsed"></i>
        <i class="fa fa-minus" v-show="!networkCollapsed"></i>
        Network
      </h4>
    </div>
    <div class="section-contect section-content--dropdown" v-if="!networkCollapsed">
      <GenericForm
        v-model="networkForm"
        @input="inputNetwork" />
    </div>
  </div>
</div>
</template>

<script lang="ts" src="./AdvancedSettings.vue.ts"></script>