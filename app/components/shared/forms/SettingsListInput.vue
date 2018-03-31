<template>
<div class="input-container select" :class="{ disabled }">
  <div v-if="showDescription !== false" class="input-label">
    <label>{{ description }}</label>
  </div>
  <div class="input-wrapper">
    <multiselect
      :value="findOption(value)"
      :disabled="disabled"
      :options="options"
      :internal-search="internalSearch"
      :close-on-select="true"
      :allow-empty="allowEmpty"
      :placeholder="placeholder"
      :loading="loading"
      label="description"
      @input="onInputHandler"
      @search-change="onSearchChange">
      <template slot="option" slot-scope="props">
        <span>
          {{ props.option.description }}
        </span>
      </template>
    </multiselect>
  </div>
</div>
</template>

<script lang="ts" src="./SettingsListInput.vue.ts"></script>
