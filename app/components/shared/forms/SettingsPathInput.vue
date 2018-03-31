<template>
<div class="input-container">
  <div class="input-label">
    <label>{{ description }}</label>
  </div>
  <div class="input-wrapper">
    <div class="flex">
      <input
        type="text"
        ref="input"
        :value="value"
        :properties="properties"
        :filters="filters"
        :disabled="disabled"
        class="path__input"
        @change="change">
      <button
        @click="showFileDialog"
        class="path__browse-button button button--dark"
        :disabled="disabled">
        Browse
      </button>
    </div>
  </div>
</div>
</template>

<script lang="ts" src="./SettingsPathInput.vue.ts"></script>

<style lang="less" scoped>
.path__input {
  flex-grow: 1;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.path__browse-button {
  flex-shrink: 0;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: -1px;
}
</style>
