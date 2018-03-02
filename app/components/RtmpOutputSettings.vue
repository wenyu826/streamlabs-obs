<template>
  <div>
    <GenericFormGroups
      v-model="settingsFormData"
      @input="save" />
  </div>
</template>

<script lang="ts" src="./RtmpOutputSettings.vue.ts"></script>

