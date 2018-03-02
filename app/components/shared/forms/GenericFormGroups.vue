<template>
  <div>
    <div v-for="(parameter, idx) in value">
      <component
        v-if="parameter.visible && propertyComponentForType(parameter.type, parameter.subType)"
        :is="propertyComponentForType(parameter.type, parameter.subType)"
        :value="value[idx]"
        @input="value => onInputHandler(value, idx)"
      />
    </div>
  </div>
</template>

<script lang="ts" src="./GenericForm.vue.ts"></script>