<template>
  <van-swipe class="my-swipe" :autoplay="3000" indicator-color="white">
    <template v-for="item in swipedata" :key="item">
      <van-swipe-item>
        <img :src="item.url" alt="" />
      </van-swipe-item>
    </template>
    <template #indicator="{ active, total }">
      <!-- 组件自带的属性 当前页数和总数 -->
      <!-- <span class="custom-indicator">{{ active+1 }}/{{ total }}</span> -->
      <div class="flex">
        <template v-for="(value, key) in swipeseparatedata">
          <!-- ***对数据进行操作，比较巧妙的一个点***-->
           <!-- 判断有没有数据 -->
          <span
            v-if="swipedata[active] && swipedata[active].enumPictureCategory"
            class="custom-indicator"
            :class="{ indexactive: swipedata[active].enumPictureCategory == key }"
          >
            {{ getName(value[0].title) }}
            <span v-if="swipedata[active].enumPictureCategory == key">{{ getindex(swipedata[active]) }}/{{ value.length }}</span>
          </span>
          <!--  -->
        </template>
      </div>
    </template>
  </van-swipe>
</template>

<script setup name=''>
import { ref } from "vue";

const { swipedata } = defineProps({
  swipedata: {
    type: Array,
    default: () => [],
  },
});
console.log(swipedata)
let swipeseparatedata = {};
//把返回的数据重新分组
for (let item of swipedata) {
  let valueArray = swipeseparatedata[item.enumPictureCategory];
  if (!valueArray) {
    valueArray = [];
    swipeseparatedata[item.enumPictureCategory] = valueArray;
  }
  valueArray.push(item);
}
//正则去处理返回的数据形式
const nameReg = /【(.*?)】/i;
const getName = (name) => {
  const results = nameReg.exec(name);
  return results[1];
};
//获取在当前分组下的当前图片索引
const getindex = (item) => {
  let valueArray = swipeseparatedata[item.enumPictureCategory];
  return valueArray.findIndex((data) => data === item) + 1
};
console.log(swipeseparatedata)
</script>

<style scoped>
.my-swipe .van-swipe-item {
  color: #fff;
  font-size: 20px;
  height: 250px;
  text-align: center;
  background-color: #39a9ed;
}
img {
  width: 100%;
  height: 250px;
}
.custom-indicator {
  width: 100%;
  background: rgba(0, 0, 0);
  color: white;
  font-weight: 600;
  text-align: center;
}
.flex {
  width: 50%;
  height: 20px;
  position: absolute;
  bottom: 0;
  right: 0;
  padding: 2px 5px;
  font-size: 12px;
  line-height: 22.5px;
  display: flex;
  justify-content: space-around;
}
.indexactive {
  background-color: #fff;
  border-radius: 20%;
  color: black;
}
</style>