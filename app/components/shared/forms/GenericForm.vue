<template>
  <div>
    <div v-for="(parameter, inputIndex) in value">
      <component
        v-if="parameter.visible && propertyComponentForType(parameter.type, parameter.subType)"
        :is="propertyComponentForType(parameter.type, parameter.subType)"
        :value="value[inputIndex]"
        @input="value => onInputHandler(value, inputIndex)"
      />
    </div>
  </div>
</template>

<script lang="ts" src="./GenericForm.vue.ts"></script>
