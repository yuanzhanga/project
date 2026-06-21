<template>
  <div class="tab">
    <img
      src="https://18403581474.oss-cn-beijing.aliyuncs.com/img/202407291510151.png"
      alt=""
    />
    <input type="search" placeholder="城市/区域/位置" />
    <button @click="back()">取消</button>
  </div>
  
  <Group />
</template>

<script setup name=''>
import router from "@/router";
import { ref } from "vue";
import Group from "./cpns/group.vue";
const back = () => {
  //点击返回到上一页
  router.back();
};

</script>

<style scoped>
img {
  width: 25px;
  height: 25px;
}
input {
  width: 80%;
}
.tab {
  display: flex;
  justify-content: space-around;
  position: fixed;
  margin: 0;
  padding: 0;
  top: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  z-index: 5;
}
</style>