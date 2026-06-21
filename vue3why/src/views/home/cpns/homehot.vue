<template>
  <h4>精选热门</h4>
  <div class="box">
    <template v-for="item in hotlist" :key="item">
      <Hotv9
        v-if="item.discoveryContentType === 9"
        :item="item"
        @click="detail(item)"
      />
      <Hotv3 v-else :item="item" @click="detail(item.data)" />
    </template>
  </div>
</template>

<script setup name=''>
import useHotStore from "@/stores/modules/homehot";
import { storeToRefs } from "pinia";
import Hotv9 from "@/components/hotv9/hotv9.vue";
import Hotv3 from "@/components/hotv3/hotv3.vue";
import useScroll from "@/hooks/uesScroll";
import { watch } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();
const { isScroll } = useScroll();
const homeHotStore = useHotStore();
const { hotlist } = storeToRefs(homeHotStore); //解构不需要用异步
homeHotStore.fetchHot(); // 等待数据加载完成
watch(isScroll, (newvalue) => {
  //监听到达页面底部
  if (newvalue) {
    homeHotStore.fetchHot(); // 等待数据加载完成
    isScroll.value = false;
  }
});

const detail = (item) => {
  let id = item.data?.houseId ?? item.houseId;
  router.push(`/detail/${id}`); //跳转到详情页
};
</script>

<style scoped>
.box {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}
.foot {
  text-align: center;
  color: green;
}
</style>