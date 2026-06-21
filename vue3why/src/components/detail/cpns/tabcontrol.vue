<template>
  <div class="tab-bar">
    <div
      class="tab-bar-item"
      v-for="(item, index) in title"
      :key="index"
      @click="tabClick(item, index)"
       :class="{ active: currentindex === index}"
    >
      {{ item }}
    </div>
  </div>
</template>
  
  <script setup>
let title = ['顶部','设施','介绍','评论']
let {tabClick,currentindex} = defineProps(["tabClick",'currentindex']);
</script>
  <style scoped>
.tab-bar {
  position: fixed;
  width: 100%;
  height: 40px;
  display: flex;
  border-top: 1px solid black;
  z-index: 5;
  background-color: #fff;
}
.tab-bar-item {
  flex: 1;
  display: flex;
  font-size: 15px;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
.active {
  background-color: #008cba;
  color: white;
}
</style>