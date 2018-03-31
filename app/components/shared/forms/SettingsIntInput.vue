<template>
<div class="input-container IntInput" :class="{ disabled }">
  <div class="input-label">
    <label v-if="showDescription !== false">{{ description }}</label>
  </div>
  <div class="input-wrapper">
    <div class="int-input">
      <input
        type="text"
        ref="input"
        :value="value.toString(10)"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        @input="input"
      />
      <div class="arrows">
        <div class="arrow arrow-up" @click="increment">
          <i class="fa fa-chevron-up"></i>
        </div>
        <div class="arrow arrow-down" @click="decrement">
          <i class="fa fa-chevron-down"></i>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts" src="./SettingsIntInput.vue.ts"></script>

<style lang="less">
@import "../../../styles/index";

.int-input {
  position: relative;

  .arrows {
    .absolute(0, 8px, 0, auto);
    width: 30px;
    color: @grey;
    opacity: .7;
    cursor: pointer;
    .transition;

    &:hover {
      opacity: 1;
    }

    .arrow {
      display: flex !important;

      .fa {
        position: relative;
        font-size: 9px;
      }

      &:active {
        color: black;
      }

      &.arrow-up {
        .absolute(6px, 0px, auto, auto);
      }

      &.arrow-down {
        .absolute(auto, 0px, 6px, auto);
      }
    }
  }
}
</style>
