<template>
  <div class="box">
    <div class="text">红土旅游</div>
    <img src="https://picsum.photos/100/100" alt="随即图片" />
  </div>
</template>

<script setup name=''>
</script>

<style scoped>
.box {
  width: 100%;
  height: 220px;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
}
div img {
  width: 100%;
  height: 200px;
  z-index: -1;
}
span img {
  height: 25px;
  width: 25px;
}
.text {
  text-align: center;
  color: orange;
}
</style>