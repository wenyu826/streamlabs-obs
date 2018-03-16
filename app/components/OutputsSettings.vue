<template>
<div>

  <!-- Output Settings Mode Selection -->

  <div class="section">
    <ListInput
      v-model="outputSettingsModeForm"
      @input="inputOutputSettingsMode" />
  </div>

  <!-- Simple Stream Settings -->

  <div v-if="outputSettingsModeForm.value === 0">
    <div class="section">
      <div class="section-title--dropdown">
        <h4 class="section-title" @click="simpleRtmpStreamCollapsed = !simpleRtmpStreamCollapsed">
          <i class="fa fa-plus"  v-show="simpleRtmpStreamCollapsed"></i>
          <i class="fa fa-minus" v-show="!simpleRtmpStreamCollapsed"></i>
          Streaming
        </h4>
      </div>
      <div class="section-content section-content--dropdown" v-if="!simpleRtmpStreamCollapsed">
        <IntInput
          v-model="simpleRtmpVideoBitrateForm"
          @input="inputSimpleRtmpVideoBitrate" />
        
        <ListInput
          v-model="simpleRtmpVideoEncoderTypeForm"
          @input="inputSimpleRtmpVideoEncoderType" />

        <IntInput
          v-model="simpleRtmpAudioBitrateForm"
          @input="inputSimpleRtmpAudioBitrate" />
      </div>
    </div>
  </div>

  <!-- Advanced Stream Settings -->

  <div v-if="outputSettingsModeForm.value === 1">
    <div class="section">
      <div class="section-title--dropdown">
        <h4 class="section-title" @click="advRtmpStreamCollapsed = !advRtmpStreamCollapsed">
          <i class="fa fa-plus"  v-show="advRtmpStreamCollapsed"></i>
          <i class="fa fa-minus" v-show="!advRtmpStreamCollapsed"></i>
          Streaming
        </h4>
      </div>
      <div class="section-content section-content--dropdown" v-if="!advRtmpStreamCollapsed">
        <ListInput
          v-model="advRtmpVideoEncoderTypeForm"
          @input="inputAdvRtmpVideoEncoderType" />

        <GenericForm 
          v-model="advRtmpVideoEncoderForm"
          @input="inputAdvRtmpVideoEncoder" />
      </div>
    </div>
  </div>

  <!-- Recording Settings -->

  <div class="section">
    <div class="section-title--dropdown">
      <h4 class="section-title" @click="recordingCollapsed = !recordingCollapsed">
        <i class="fa fa-plus"  v-show="recordingCollapsed"></i>
        <i class="fa fa-minus" v-show="!recordingCollapsed"></i>
        Recording
      </h4>
    </div>
    <div class="section-contect section-content--dropdown" v-if="!recordingCollapsed">
      <PathInput
        v-model="recordingFolderPath"
        @input="inputRecordingFolderPath" />

      <ListInput
        v-model="recordingFormat"
        @input="inputRecordingFormat" />
    </div>
  </div>
</div>
</template>


<script lang="ts" src="./OutputsSettings.vue.ts"></script>

