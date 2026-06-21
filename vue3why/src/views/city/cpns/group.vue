<template>
  <div>
    <div class="tab">
      <span
        :class="{ active: currentindex == index }"
        @click="change(index)"
        v-for="(value, key, index) in allcities"
        :key="key"
        >{{ value.title }}
      </span>
    </div>

    <div class="content">
      <h2>热门</h2>
      <!-- 热门城市 -->
      <div class="list">
        <template v-for="hot in currentgroup?.hotCities" :key="hot">
          <span class="font" @click="changecity(hot)">
            {{ hot.cityName }}
          </span>
        </template>
      </div>
      <!-- 所有城市 -->
      <template v-for="group in currentgroup?.cities" :key="group">
        <h3>{{ group.group }}</h3>
        <template v-for="city in group.cities" :key="city">
          <div @click="changecity(city)">{{ city.cityName }}</div>
          <br />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup name="">
import useCityStore from "@/stores/modules/city";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
function change(index) {
  currentindex.value = index;
  if (index == 0) {
    current.value = allcities.value.cityGroup;
  } else {
    current.value = allcities.value.cityGroupOverSea;
  }
}
const CityStore = useCityStore(); //代理对象
const { allcities } = storeToRefs(CityStore);
let currentindex = ref(0);
let current = ref();
let currentgroup = computed(() => current.value);
onMounted(async () => {
  await CityStore.fetchCity(); // 等待数据加载完成
  if (allcities.value && allcities.value.cityGroup) {
    // 确保数据存在
    current.value = allcities.value.cityGroup; //一刷新页面就有数据
  }
});
const router = useRouter();
function changecity(city) {
  //跳回上一界面
  CityStore.currentcity = city;
  router.back();
}
</script>

<style scoped>
.tab {
  display: flex;
  justify-content: space-around;
  position: fixed;
  top: 25px;
  left: 0;
  right: 0;
  z-index: 5;
  background-color: #fff;
}
.tab span {
  padding-bottom: 3px;
}
.active {
  border-bottom: 2px solid red;
}
.content {
  margin-top: 60px;
  height: calc(100vm-60px);
  overflow-y: auto;
}
.list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  flex-direction: row;
}
.font {
  color: black;
  text-align: center;
  width: 20%;
  height: 30px;
  line-height: 30px;
  margin: 5px;
  padding: auto;
  background-color: rgb(246, 205, 158);
  border: 2px solid rgb(246, 205, 158);
  border-radius: 1rem;
}
</style>
