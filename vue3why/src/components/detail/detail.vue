<template>
  <div ref="detailRef" class="detail">
    <tabcontrol
      v-if="isShowSearch"
      :tabClick="tabClick"
      :currentindex="currentindex"
      ref="tabcontrolRef"
    />
    <div class="head">
      <span @click="back()">
        <span class="xiaoyu">{{ "<" }}</span>
        旅途
      </span>
      <span>房屋详细</span>
      <div></div>
    </div>
    <div class="main" v-if="mainPart" v-memo="[mainPart]">
      <swipe
        :ref="getsectionRef"
        :swipedata="mainPart.topModule.housePicture.housePics"
      />
      <infos :infosdata="mainPart.topModule" />
      <housefacility :ref="getsectionRef" :Facilitydata="Facilitydata" />
      <landlordfacility :ref="getsectionRef" :landlord="landlord" />
      <hotfacility :ref="getsectionRef" :commentModule="commentModule" />
      <notice :ref="getsectionRef" :rules="rules" />
      <gmap :position="position" />
      <!-- <swipe  :swipedata="mainPart.topModule.housePicture.housePics" />
      <infos name="顶部" :ref='getsectionRef' :infosdata="mainPart.topModule" />
      <housefacility name="设施" :ref='getsectionRef' :Facilitydata="Facilitydata" />
      <landlordfacility name="介绍" :ref='getsectionRef' :landlord="landlord" />
      <hotfacility name="评论" :ref='getsectionRef' :commentModule="commentModule" />
      <notice name="须知" :ref='getsectionRef' :rules="rules" />
      <gmap :position="position" /> -->
    </div>
  </div>
</template>

<!-- http://codercba.com:1888/api/detail/infos?houseId=44173741 -->
<script setup name=''>
import { watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import detailRequest from "@/service/modules/detail";
import swipe from "./cpns/swipe.vue";
import infos from "./cpns/infos.vue";
import housefacility from "./cpns/housefacility.vue";
import landlordfacility from "./cpns/landlordfacility.vue";
import hotfacility from "./cpns/hotfacility.vue";
import notice from "./cpns/notice.vue";
import gmap from "./cpns/map.vue";
import tabcontrol from "./cpns/tabcontrol.vue";
import useScroll from "@/hooks/uesScroll";
//根据传参确定视口
let detailRef = ref();
const { scrollTop } = useScroll(detailRef);
import { computed, ref } from "vue";
const route = useRoute(); //单个路由信息
const router = useRouter(); //所有路由
const back = () => {
  //返回上一页
  router.back();
};
//简化需要的数据不用一直点点点
let detaildata = ref({});
let mainPart = computed(() => detaildata.value.mainPart);
let houseFacility = computed(
  () => detaildata.value.mainPart.dynamicModule.facilityModule
);
let landlord = computed(
  () => detaildata.value.mainPart.dynamicModule.landlordModule
);
let commentModule = computed(
  () => detaildata.value.mainPart.dynamicModule.commentModule
);
let rules = computed(() => detaildata.value.mainPart.dynamicModule.rulesModule);
let position = computed(
  () => detaildata.value.mainPart.dynamicModule.positionModule
);
// 要在页面展示的简短数据
let Facilitydata = [];
detailRequest(route.params.id).then((res) => {
  //获取id根据路由id跳转对应内容
  detaildata.value = res.data.data;
  for (let index of houseFacility.value.houseFacility.facilitySort) {
    Facilitydata.push(houseFacility.value.houseFacility.houseFacilitys[index]);
  }
});
//显示导航栏***
let tabcontrolRef = ref();
let isShowSearch = computed(() => {
  return scrollTop.value > 200;
});
let sectionRef = [];
function getsectionRef(value) {
  /* console.log(value.$el)*/
  //因为返回卸载就没有内容了
  if (!value) return;
  sectionRef.push(value.$el);
}
//导航栏点击事件
function tabClick(item, index) {
  // console.log(item, index);
  stopWatcher(); //取消监听防止抖动
  currentindex.value = index;
  let instance = sectionRef[index].offsetTop;
  if (index == 0) {
    instance += 44;
  }
  detailRef.value.scrollTo({
    top: instance - 44, // 根据 index 调整滚动高度
    behavior: "smooth", // 平滑滚动
  });
  setTimeout(() => {
    startwatch();
  }, 500);  // 500ms 视为滚动完成后的延迟时间，根据需要调整
}
let currentindex = ref(-1);//点击的索引
//歌词算法
let stopWatcher;
function startwatch() {
  stopWatcher  = watch(scrollTop, (newvalue) => {
  const values = sectionRef.map((el) => el.offsetTop);
  let index = values.length - 1;
  for (let i = 0; i < values.length; i++) {
    if (newvalue < values[i] + 44) {
      index = i;
      break;
    }
  }
  // console.log(index)
  currentindex.value = index;
});
}
function stopWatch() {
  if (stopWatcher) {
    stopWatcher(); // 停止监听
    stopWatcher = null; // 清空函数以避免重复调用
  }
}
startwatch()//开启监听器
//另一种让连接和优化更方便的方式，但有点问题
// let sectionRef = ref({})
// const names = computed(() => {
//   return Object.keys(sectionRef.value)
// })
// function getsectionRef (value) {
//   /* console.log(value.$el)*/
//   const name = value.$el.getAttribute("name")
//   sectionRef.value[name] = value.$el
// }
// function tabClick(item, index) {
//   // console.log(item, index);
//   const key = Object.keys(sectionEls.value)[index]
//   const el = sectionRef.value[key]
//   let instance = el.offsetTop
//   if (index ==0) {
//     instance +=44
//   }
//    detailRef.value.scrollTo({
//       top: instance-44, // 根据 index 调整滚动高度
//       behavior: "smooth" // 平滑滚动
//     });

// }
</script>

<style scoped>
.detail {
  height: 100vh;
  overflow-y: auto;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f1f1f1;
  padding: 10px;
  font-size: 20px;
  height: 35px;
  color: #fcb687;
}
.xiaoyu {
  color: #000;
}
</style>