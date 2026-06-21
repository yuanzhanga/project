<template>
  <div class="show">
    <div class="content">
      <div class="time">
        <div class="zhu">住 {{ startdate }}</div>
        <div class="li">离 {{ enddate }}</div>
      </div>
      <input type="search" placeholder="关键字/位置/城市" class="search" />

      <div class="icon">搜索</div>
    </div>
  </div>
</template>

<script setup name=''>
//日期设置为今天
import useMainstore from '@/stores/modules/main'
import { storeToRefs } from "pinia";
const {startdate, enddate} = storeToRefs(useMainstore());
</script>

<style scoped>
.show {
  background-color: #fff;
  width: 100%;
  height: 60px;
}
.content {
  background-color: #f1f1f1;
  width: 90%;
  height: 70%;
  margin: 5px auto;
  display: flex;
  justify-content: space-between;
}
.time {
  font-size: 15px;
  margin: 3px;
}
.search {
  flex: 2;
  border: 0cap;
  background-color: #f1f1f1;
}
.icon {
  width: 10%;
  margin: 8px auto;
}
</style>