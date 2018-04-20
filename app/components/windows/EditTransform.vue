<template>
<modal-layout
  :title="title"
  :show-controls="false">
  <div slot="content">
    Edit Transform: {{ sceneItem.name }}
  </div>
</modal-layout>
</template>

<script lang="ts" src="./EditTransform.vue.ts" ></script>
