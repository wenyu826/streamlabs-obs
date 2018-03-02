<template>
<div>
  <div class="section">
    <div class="input-container select">
      <div class="input-label">
        <label>Stream Type</label>
      </div>
      <div class="input-wrapper">
        <multiselect
          :options="serviceType"
          :value="serviceType[0]"
          @input="setServiceType"
          label="label">
        </multiselect>
      </div>
    </div>
  </div>
  <div class="section">
    <GenericFormGroups
      v-model="settingsFormData"
      @input="save" />
  </div>
</div>
</template>

<script lang="ts" src="./StreamSettings.vue.ts"></script>

