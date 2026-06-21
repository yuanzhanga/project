<template>
  <div class="home" ref="homeRef">
    <homeTop></homeTop>
    <homeArea />
    <homeSearch />
    <homeCategories />
    <showsearch v-if="isShowSearch" class="showsearch" />
    <homeHot />
    <loading v-if="mainStore.isLoad" />
  </div>
</template>
<script>
export default {
  name: "home",
};
</script>
<script setup name=''>
import { computed, onActivated, ref, watch } from "vue";
import homeTop from "./cpns/hometop.vue";
import homeArea from "./cpns/homearea.vue";
import homeSearch from "./cpns/homesearch.vue";
import homeCategories from "./cpns/homecate.vue";
import homeHot from "./cpns/homehot.vue";
import showsearch from "./cpns/showsearch.vue";
import useScroll from "@/hooks/uesScroll";
import loading from "@/components/loading/loading.vue";
import useMainstore from "@/stores/modules/main";
const mainStore = useMainstore(); //load
const homeRef =ref()
const { scrollTop } = useScroll(homeRef);//为了能正常网络请求
const scroll = useScroll();//为了引出搜索框
// let isShowSearch = ref(false)
// watch(scrollTop, (newvalue) => {
//   isShowSearch.value = newvalue > 430;

// });//监听isShowSearch的两种写法
let isShowSearch = computed(() => {
  return scroll.scrollTop.value > 430;
});
//让界面返回时还在原来的位置
onActivated(()=>{
  homeRef.value.scrollTo({
    top:scrollTop.value
  })
})
</script>

<style scoped>
.home {
  padding-bottom: 60px;
  height: 100vh;
  box-sizing: border-box;
}
.show {
  transition: all 1s linear;
}
.showsearch {
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 9;
}
</style>