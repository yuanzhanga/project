<template>
  <div class="login">
    <loginPanel></loginPanel>
  </div>
</template>

<script setup name="" lang="ts">
import loginPanel from './c-cpns/login-panel.vue'
</script>

<style scoped>
.login {
  width: 100%;
  height: 100%;
  background: url(@/assets/img/login-bg.svg);
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
