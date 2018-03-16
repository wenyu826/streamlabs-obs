<template>
  <div>
    <div class="section">
      <button class="button button--sm button--soft-warning">
        Restore Defaults
      </button>
    </div>

    <!-- TCP Settings -->
    <div class="section">
      <div class="section-title--dropdown">
        <h4 class="section-title" @click="tcpCollapsed = !tcpCollapsed">
          <i class="fa fa-plus"  v-show="tcpCollapsed"></i>
          <i class="fa fa-minus" v-show="!tcpCollapsed"></i>
          TCP
        </h4>
      </div>
      <div class="section-contect section-content--dropdown" v-if="!tcpCollapsed">
        <BoolInput 
          v-model="tcpEnabled" 
          @input="inputTcpEnabled" />

        <BoolInput 
          v-model="tcpAllowRemote"
          @input="inputTcpAllowRemote"
          v-if="tcpEnabled.value" />

        <IntInput 
          v-model="tcpPort"
          @input="inputTcpPort"
          v-if="tcpEnabled.value" />
      </div>
    </div>

    <!-- Named Pipe Settings -->
    <div class="section">
      <div class="section-title--dropdown">
        <h4 class="section-title" @click="namedPipeCollapsed = !namedPipeCollapsed">
          <i class="fa fa-plus"  v-show="namedPipeCollapsed"></i>
          <i class="fa fa-minus" v-show="!namedPipeCollapsed"></i>
          Named Pipe
        </h4>
      </div>
      <div class="section-contect section-content--dropdown" v-if="!namedPipeCollapsed">
        <BoolInput 
          v-model="namedPipeEnabled"
          @input="inputNamedPipeEnabled" />

        <TextInput
          v-model="namedPipePipeName"
          @input="inputNamedPipePipeName"
          v-if="namedPipeEnabled.value" />
      </div>
    </div>

    <!-- Web Sockets Settings -->
    <div class="section">
      <div class="section-title--dropdown">
        <h4 class="section-title" @click="webSocketsCollapsed = !webSocketsCollapsed">
          <i class="fa fa-plus"  v-show="webSocketsCollapsed"></i>
          <i class="fa fa-minus" v-show="!webSocketsCollapsed"></i>
          Web Sockets
        </h4>
      </div>
      <div class="section-contect section-content--dropdown" v-if="!webSocketsCollapsed">
        <BoolInput
          v-model="webSocketsEnabled"
          @input="inputWebSocketsEnabled" />

        <BoolInput
          v-model="webSocketsAllowRemote"
          @input="inputWebSocketsAllowRemote"
          v-if="webSocketsEnabled.value" />

        <IntInput 
          v-model="webSocketsPort"
          @input="inputWebSocketsPort"
          v-if="webSocketsEnabled.value" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" src="./ApiSettings.vue.ts"></script>

