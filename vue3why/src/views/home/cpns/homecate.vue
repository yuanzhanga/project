<template>
  <div v-if="!isload">Loading......</div>
  <div class="box" v-else>
    <template v-for="(item, index) in categories" :key="index">
      <span class="littlebox">
        <img :src="item.pictureUrl" alt="" />
        <span class="title">{{ item.title }}</span>
      </span>
    </template>
  </div>
</template>

<script setup name=''>
import useCategoriesStore from "@/stores/modules/categories";
import { storeToRefs } from "pinia";
import { ref } from "vue";
const categoriesStore = useCategoriesStore();
let isload = ref(false); //加入加载界面
let { categories } = storeToRefs(categoriesStore); //获取数据
categoriesStore.fetchCategories().then(() => {
  isload.value = true; //加入加载页面
}); // 等待数据加载完成

</script>

<style scoped>
.box {
  display: flex;
  justify-content: space-around;
  margin-top: 8px;
  /* overflow-x: auto; 只让图标能滚动，整个页面不滚动 */
}
img {
  width: 50px;
  height: auto;
  margin: 0 auto;
}
.littlebox {
  display: flex;
  flex-direction: column;
}
.title {
  font-size: 15px;
  text-align: center;
}
</style>