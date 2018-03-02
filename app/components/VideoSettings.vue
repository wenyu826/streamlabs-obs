<template>
<div>
   <div class="section">
    <ResolutionInput v-model="baseResolutionFormData" @input="inputBaseResolution"/>
    <ResolutionInput v-model="outputResolutionFormData" @input="inputOutputResolution"/>
    <ListInput v-model="downscaleFilterFormData" @input="inputDownscaleFilter"/>
    <ListInput v-model="fpsTypeFormData" @input="inputFpsType"/>
    <ListInput v-model="fpsCommonValuesFormData" @input="inputFpsCommon" v-if="fpsType === 0"/>
    <IntInput  v-model="fpsIntegerFormData" @input="inputFpsInteger" v-if="fpsType === 1"/>
    <IntInput  v-model="fpsFractionNumFormData" @input="inputFpsFractionNum" v-if="fpsType === 2"/>
    <IntInput  v-model="fpsFractionDenFormData" @input="inputFpsFractionDen" v-if="fpsType === 2"/>
  </div>
</div>
</template>

<script lang="ts" src="./VideoSettings.vue.ts"></script>