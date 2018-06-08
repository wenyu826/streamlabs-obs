<template>
<modal-layout
  :title="$t('Source Interaction')"
  :content-styles="{ padding: 0 }"
  :showControls="false">
  <div
    slot="content"
    class="source-interaction-display"
    ref="display"
    @click="handleClick"
    @mousemove="handleMouseMove">
    <display :source-id="sourceId"/>
  </div>
</modal-layout>
</template>

<script lang="ts" src="./BrowserSourceInteraction.vue.ts"></script>

<style lang="less" scoped>
.source-interaction-display {
  height: 100%;
}
</style>
