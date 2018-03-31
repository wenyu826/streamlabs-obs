<template>
<div>
   <div class="section">
    <ResolutionInput
        :value="baseResolutionValue"
        description="Base Resolution"
        @input="inputBaseResolution"
        :options="baseResolutionOptions"
        :disabled="isActive" />

    <ResolutionInput
        :value="outputResolutionValue"
        description="Output Resolution"
        @input="inputOutputResolution"
        :options="outputResolutionOptions"
        :disabled="isActive" />

    <SettingsListInput
        :value="downscaleFilterValue"
        @input="inputDownscaleFilter"
        description="Downscale Filter"
        :disabled="isActive"
        :options="downscaleFilterOptions" />

    <SettingsListInput
        :value="fpsTypeValue"
        @input="inputFpsType"
        description="FPS Type" 
        :disabled="isActive" 
        :options="fpsTypeOptions" />
    
    <SettingsListInput
        v-if="fpsTypeValue === 0"
        :value="fpsCommonValuesValue"
        @input="inputFpsCommon"
        description="FPS Common Values"
        :disabled="isActive"
        :options="fpsCommonOptions" />

    <SettingsIntInput
        v-if="fpsTypeValue === 1"
        :value="fpsIntegerValue"
        description="Integer FPS Value"
        :min=1
        :max=1000000
        :step=1
        :disabled="isActive"
        @input="inputFpsInteger" />

    <SettingsIntInput
        v-if="fpsTypeValue === 2"
        :value="fpsFractionNumValue"
        description="Fraction FPS Value"
        :min=1
        :max=1000000
        :step=1
        :disabled="isActive"
        @input="inputFpsFractionNum" />

    <SettingsIntInput
        v-if="fpsTypeValue === 2"
        :value="fpsFractionDenValue"
        description="Denominator FPS Value"
        :min=1
        :max=1000000
        :step=1
        :disabled="isActive"
        @input="inputFpsFractionDen" />

  </div>
</div>
</template>

<script lang="ts" src="./VideoSettings.vue.ts"></script>