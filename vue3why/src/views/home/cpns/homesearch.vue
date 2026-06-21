<template>
  <div class="box">
    <div class="start">
      <div class="tip">入住</div>
      <div class="startdate">{{ startdate }}</div>
    </div>
    <div class="center">住{{ gap }} 晚</div>
    <div class="end">
      <div class="tip">离开</div>
      <div>
        <span class="enddate">{{ enddate }}</span>
        <button @click="mainStore.updateEndDate()">+</button>
      </div>
    </div>
  </div>
  <div class="input">
    <div class="price">
      <div class="people"></div>
    </div>
  </div>
  <div>价格不限&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;人数不限</div>
  <br />
  <div>关键字/位置/国家名</div>
  <br />
  <div class="city">
    <template v-for="city in citylist" :key="city">
      <template v-for="item in city" :key="item">
        <span class="font">{{ item.tagText.text }}</span>
      </template>
    </template>
  </div>
  <div class="box">
    <button class="btn" @click="startsearch()">开始搜索</button>
  </div>
</template>

<script setup name=''>
import { storeToRefs } from "pinia";
import useSearchStore from "@/stores/modules/search";
import { useRouter } from "vue-router";
//日期设置为今天
import useMainstore from "@/stores/modules/main";
const mainStore = useMainstore();//更新日期函数
let { startdate, enddate, gap } = storeToRefs(useMainstore());
//城市
const searchStore = useSearchStore();
const { citylist } = storeToRefs(searchStore);
searchStore.fetchSearch();
//点击开始搜索
const router = useRouter();
function startsearch() {
  router.push({
    path: "/search",
    query: {
      startDate: startdate.value,
      endDate: enddate.value,
    },
  });
}
</script>

<style scoped>
.box {
  display: flex;
  justify-content: space-around;
}
.tip {
  font-size: 15px;
}
.center {
  font-size: 17px;
}
.font {
  margin: 20px;
  padding: auto;
  cursor: pointer;
  color: #000;
  transition: color 0.3s;
  white-space: nowrap;
}
.btn {
  margin: 5px;
  border: 2px solid orange;
  border-radius: 3rem;
  font-size: 25px;
  width: 50%;
  height: 40px;
  left: 50px;
  background-color: orange;
  cursor: pointer;
}
</style>