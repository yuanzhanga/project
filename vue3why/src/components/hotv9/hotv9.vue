<template>
  <div class="content">
    <img :src="item.data.image.url" alt="" />
    <div class="littlebox">
      <div class="location">{{ item.data.summaryText }}</div>

      <span class="title">{{ item.data.houseName }}</span>
      
      <div class="foot">
        <span class="star">{{ item.data.commentScore }}星</span>
        <span class="price">{{ item.data.finalPrice }}</span>
      </div>
    </div>
  </div>
</template>

<script setup name=''>
const { item } = defineProps(["item"]);
</script>

<style scoped>
.content {
  width: 47%;
  height: auto;
  position: relative;
  padding: 5px;
}
.location {
  font-size: 14px;
}
img {
  width: 100%;
  height: auto;
  border-radius: 5px;
}
.littlebox {
  position: absolute;
  bottom: 5px; /*调整这个值来设置文字距离顶部的距离 */
  left: 10px; /*调整这个值来设置文字距离左侧的距离 */
  color: white;
  padding: 5px;
}
.title {
  font-size: 16px;
  word-wrap: wrap;
}
.foot {
  display: flex;
  justify-content: space-between;
}
.price {
  margin-right: 10px;
} 
</style>