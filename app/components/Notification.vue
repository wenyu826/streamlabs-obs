<template>
  <div class="notification notification--warning" v-if="notificationShown">
    <div class="notification-message">
      We noticed your stream is lagging. Try changing your FPS in <a @click="showSettingsWindow">settings</a>. More information <a @click="showNotificationInfo">here</a>.
    </div>
    <i
      class="fa fa-times notification-close"
      @click="closeNotification" />
  </div>
</template>

<script lang="ts" src="./Notification.vue.ts"></script>

<style lang="less" scoped>
@import "../styles/index";

.notification {
  position: absolute;
  padding: 8px 12px;
  border-radius: 3px;
  right: 20px;
  height: 38px;
  display: flex;
  align-items: center;

  a {
    color: inherit;

    &:hover {
      color: inherit;
    }
  }
}

.notification--warning {
  background-color: #FEE2E3;
  color: @red;

  .notification-message {
    &:before {
      content: '\f06a';
      font-family: FontAwesome;
    }
  }
}

.notification-message {
  padding-right: 20px;
}

.notification-close {
  position: absolute;
  right: 8px;
}

.night-theme {
  .notification--warning {
    background-color: #3B2A33;
  }
}
</style>
