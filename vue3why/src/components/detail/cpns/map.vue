<template>
  <facility :title="'地图周边'">
    <div class="baidu" ref="mapRef"></div>
  </facility>
</template>

<script setup>
import facility from "./facility.vue";
import { onMounted, ref } from "vue";
const { position } = defineProps(["position"]);
const mapRef = ref(null); // 声明 ref
// console.log(position);
onMounted(() => {
  let map = new BMapGL.Map(mapRef.value); // 创建地图实例
  let point = new BMapGL.Point(position.longitude, position.latitude); // 创建点坐标
  map.centerAndZoom(point, 15); // 初始化地图，设置中心点坐标和地图级别
let marker = new BMapGL.Marker(point);        // 创建标注   
map.addOverlay(marker);                     // 将标注添加到地图中
});
</script>

<style scoped>
.baidu {
  height: 200px;
}
</style>