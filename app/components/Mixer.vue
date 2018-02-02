<template>
<div>
  <div class="studio-controls-top">
    <h4 class="studio-controls__label">
      Mixer
    </h4>
    <div>
      <label><input type="checkbox" v-model="useGLVolmeter"/>Use a shader for volmeter</label>
      <i
          class="fa fa-cog icon-btn"
          @click="showAdvancedSettings()"/>
    </div>
  </div>
  <div class="studio-controls-selector mixer-panel">
    <MixerItem
        v-for="audioSource in audioSources"
        :audioSource="audioSource"
        :key="audioSource.sourceId"
        :useGLVolmeter="useGLVolmeter"
    />
  </div>
</div>
</template>

<script lang="ts" src="./Mixer.vue.ts"></script>
