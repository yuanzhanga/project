<template>
<div id="app">
    <!-- 保持组件不卸载，防止再次发送网络请求消耗性能 -->
    <router-view v-slot="{ Component }">
    <keep-alive include="home">
      <component :is="Component"></component>
    </keep-alive>
  </router-view>
  <!-- 作用相等，但提倡第一种 -->
  <!-- <keep-alive include="home">
    <router-view></router-view>
  </keep-alive> -->
  <Tabbar v-show="!route.meta.hidetabbar" />
</div>
</template>

<script setup name=''>
import Tabbar from "./components/tab-bar/tab-bar.vue";
import { RouterView } from "vue-router";
import { useRoute } from "vue-router";
const route = useRoute();
</script>

<style scoped>
</style>