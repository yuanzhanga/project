<template>
  <div class="tab-bar">
    <template v-for="(item, index) in footdata" :key="index">
      <div
        class="tab-bar-item"
        :name="item.to"
        @click="updaterRouter(item, index)"
        :class="{ active: currentindex === index }"
      >
        {{ item.name }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch,onMounted,watchEffect } from "vue";
import { useRouter, useRoute } from "vue-router";
import footdata from "@/assets/foot.js";

const router = useRouter();//用于获取路由实例
const route = useRoute(); // 使用 useRoute 监听路由变化,用于获取当前路由的信息
const currentindex = ref(-1);
function updaterRouter(item, index) {
  currentindex.value = index;
  router.push(item.to);
}

// 监听路由变化以更新 currentindex
// onMounted(() => {
//   watch(() => route.path, (newPath) => {
//   footdata.forEach((item, index) => {
//     if (newPath === item.to) {
//       currentindex.value = index;
//     }
//   });
// });
// })
//优化
watchEffect(() => {
  footdata.forEach((item, index) => {
    if (route.path === item.to) {
      currentindex.value = index;
    }
  });
});
</script>




<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  border-top: 1px solid black;
  z-index: 5;
  background-color: #fff;
}
.tab-bar-item {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
.active {
  background-color: #008cba;
  color: white;
}
</style>