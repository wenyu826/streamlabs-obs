<template>
<div>
  <div class="section">
    <SettingsListInput
        :options="serviceTypeOptions"
        :value="serviceTypeValue"
        :disabled="isActive"
        @input="inputServiceType"
        description="Service Type" />
  </div>
  <div class="section">
    <GenericForm
      :value="settingsFormData"
      @input="save" />
  </div>
</div>
</template>

<script lang="ts" src="./StreamSettings.vue.ts"></script>

