<template>
  <div class="content">
    <img :src="item.data.image.url" alt="" />
    <div class="littlebox">
      <div class="location">{{ item.data.location }}</div>
      <span class="title">{{ item.data.houseName }}</span>
      <div class="location">{{ item.data.summaryText }}</div>
      <div class="foot">
        <span class="newprice">￥{{ item.data.finalPrice }}</span>

        <span class="oldprice">￥{{ item.data.productPrice }}</span>
        <span class="gap">已减{{ item.data.productPrice-item.data.finalPrice }}元</span>
      </div>
    </div>
  </div>
</template>
  
  <script setup name=''>
const { item } = defineProps(["item"]);
</script>
  
  <style scoped>
.content {
  width: 48%;
  height: 254px;
  position: relative;
  padding: 5px;
}
img {
  width: 100%;
  height: auto;
  border-radius: 5px;
}
.littlebox {
  height: 56px;
  padding: 5px;
}
.location {
  font-size: 14px;
}
.title {
  display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2; /* 设置显示的行数 */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
}
.foot {
  display: flex;
  position: relative;
  justify-content: space-between;
margin-top: 15px;
}
.newprice {
  color: orange;
  font-size: 18px;
} 
.oldprice {
  font-size: 15px;
line-height: 25px;
text-decoration: line-through;
}
.gap {
  background-color: red;
  width: 48%;
  text-align: center;
  border-radius: 5rem;
}
</style>