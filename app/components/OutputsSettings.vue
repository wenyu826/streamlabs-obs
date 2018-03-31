<template>
<div>

  <!-- Output Settings Mode Selection -->

  <div class="section">
    <SettingsListInput
      :value="outputSettingsModeValue"
      @input="inputOutputSettingsMode"
      :options="outputSettingsModeOptions"
      :disabled="isActive"
      description="Output Mode" />
  </div>

  <!-- Simple Stream Settings -->

  <div v-if="outputSettingsModeValue === 0">
    <div class="section">
      <div class="section-title--dropdown">
        <h4 class="section-title" @click="simpleRtmpStreamCollapsed = !simpleRtmpStreamCollapsed">
          <i class="fa fa-plus"  v-show="simpleRtmpStreamCollapsed"></i>
          <i class="fa fa-minus" v-show="!simpleRtmpStreamCollapsed"></i>
          Streaming
        </h4>
      </div>
      <div class="section-content section-content--dropdown" v-if="!simpleRtmpStreamCollapsed">
        <SettingsIntInput
          v-bind="rtmpVideoBitrateProps"
          ref="simpleVideoBitrate"
          @input="inputSimpleRtmpVideoBitrate"
          description="Video Bitrate" />
        
        <SettingsListInput
          :value="simpleRtmpVideoEncoderTypeValue"
          @input="inputSimpleRtmpVideoEncoderType"
          :disabled="isStreaming"
          :options="videoEncoderOptions"
          description="Video Encoder" />

        <SettingsIntInput
          v-bind="rtmpAudioBitrateProps"
          @input="inputSimpleRtmpAudioBitrate"
          description="Audio Bitrate" />
      </div>
    </div>
  </div>

  <!-- Advanced Stream Settings -->

  <div v-if="outputSettingsModeValue === 1">
    <div class="section">
      <div class="section-title--dropdown">
        <h4 class="section-title" @click="advRtmpStreamCollapsed = !advRtmpStreamCollapsed">
          <i class="fa fa-plus"  v-show="advRtmpStreamCollapsed"></i>
          <i class="fa fa-minus" v-show="!advRtmpStreamCollapsed"></i>
          Streaming
        </h4>
      </div>
      <div class="section-content section-content--dropdown" v-if="!advRtmpStreamCollapsed">
        <SettingsListInput
          :value="advRtmpVideoEncoderTypeValue"
          @input="inputAdvRtmpVideoEncoderType"
          :disabled="isActive"
          :options="videoEncoderOptions"/>

        <GenericForm 
          :value="advRtmpVideoEncoderForm"
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
      <SettingsPathInput
        :value="recordingFolderPathValue"
        @input="inputRecordingFolderPath"
        description="Recording Path"
        :disabled="isRecording" 
        :properties="[ 'openDirectory' ]"/>

      <SettingsListInput
        :value="recordingFormatValue"
        @input="inputRecordingFormat"
        description="Recording Format"
        :options="recordingFormatOptions"
        :disabled="isRecording" />
    </div>
  </div>
</div>
</template>


<script lang="ts" src="./OutputsSettings.vue.ts"></script>

