<template>
  <div class="location">
    <span @click="getcity">{{
      CityStore.currentcity.cityName ?? "请选择你的城市"
    }}</span>
    <span class="position">
      <span @click="getposition">我的位置</span>
      <img src="https://picsum.photos/10/10" alt="" />
    </span>
  </div>
</template>

<script setup name=''>
import { useRouter } from "vue-router";
import useCityStore from "@/stores/modules/city";
const CityStore = useCityStore(); //代理对象
const router = useRouter(); //获取当前活跃的路由
const getposition = () => {
  navigator.geolocation.getCurrentPosition(
    (res) => {
      console.log("当前位置", res.coords.latitude, res.coords.longitude);
    },
    (err) => {
      console.log("获取失败", err);
    }
  );
}; //获取位置

const getcity = () => {
  router.push("/city");
};
</script>

<style scoped>
.location {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
.position {
  display: flex;
  justify-content: space-around;
  width: 120px;
}
.position img {
  width: 25px;
  height: 25px;
}
</style>