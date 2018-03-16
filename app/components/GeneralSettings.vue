<template>
<div>
  <div class="section">
    <p>If you are experiencing weird behavior, you can try deleting your cache directory.  This will result in you losing your scene configuration and settings, but can fix some stability issues.</p>
    <div class="margin-bot--20">
      <a class="link link--underlined" @click="showCacheDir">
        <i class="fa fa-eye" /> <span>Show Cache Directory</span>
      </a>
    </div>
    <div class="margin-bot--20">
      <a class="link link--underlined" @click="deleteCacheDir">
        <i class="fa fa-trash" /> <span>Delete Cache and Restart</span></a>
    </div>
    <div class="margin-bot--20">
      <a class="link link--underlined" @click="uploadCacheDir" :disabled="cacheUploading">
        <i class="fa fa-upload" /> <span>Upload Cache to Developers</span>
        <i class="fa fa-spinner fa-spin" v-if="cacheUploading" />
      </a>
    </div>
  </div>
  <div class="section">
    <BoolInput :value="streamInfoUpdateModel" @input="setStreamInfoUpdate" />
    <button class="button button--action" @click="restartStreamlabelsSession">
      Restart Streamlabels Session
    </button>
    <br/>
    <button class="button button--action" @click="runAutoOptimizer" v-if="isTwitch && !isRecordingOrStreaming">
      Run Auto Optimizer
    </button>
  </div>

  <!-- Source Alignment/Snapping Settings -->
  <div class="section">
    <div class="section-title--dropdown">
      <h4 class="section-title" @click="snappingCollapsed = !snappingCollapsed">
        <i class="fa fa-plus"  v-show="snappingCollapsed"></i>
        <i class="fa fa-minus" v-show="!snappingCollapsed"></i>
        Source Alignment Snapping
      </h4>
    </div>
    <div class="section-contect section-content--dropdown" v-if="!snappingCollapsed">
      <BoolInput v-model="snappingEnabled" />
      <IntInput v-model="snappingSensitivity" />
      <BoolInput v-model="snappingEdges" />
      <BoolInput v-model="snappingSources" />
    </div>
  </div>
</div>
</template>

<script lang="ts" src="./GeneralSettings.vue.ts"></script>
