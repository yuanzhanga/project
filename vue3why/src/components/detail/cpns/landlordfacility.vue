<template>
  <facility :title="'房东介绍'" more="查看房东主页">
    <img :src="landlord.topScroll" alt="" />
    <div class="body">
      <div class="main">
        <div class="lord">
          <img :src="landlord.hotelLogo" alt="" />
          <div class="title">
            <div class="top">{{ landlord.hotelName }}</div>
            <div class="buttom">
              <template
                v-for="(item, index) in landlord.hotelTags"
                :key="index"
              >
                <span
                  >{{ item.tagText.text }}&nbsp;<span
                    v-if="index < landlord.hotelTags.length - 1"
                    >|</span
                  ></span
                >
              </template>
            </div>
          </div>
        </div>
        <div class="touch">
          <button class="button">联系房东</button>
        </div>
      </div>
      <div class="comment">
        <template v-for="item in landlord.hotelSummary">
          <div class="percent">
            <div class="up">{{ item.title }}</div>
            <div class="center">{{ item.introduction }}</div>
            <div class="up">{{ item.tip }}</div>
          </div>
        </template>
      </div>
    </div>
  </facility>
</template>

<script setup name=''>
import facility from "./facility.vue";
const { landlord } = defineProps(["landlord"]);
// console.log(landlord);
</script>

<style scoped>
.body {
  flex: 2;
  margin: 5px;
}
img {
  width: 95%;
  margin: 5px auto 0 auto;
}
.main {
  width: 100%;
  display: flex;
  justify-content: space-between;
}
.lord {
  flex: 2;
  display: flex;
  justify-content: space-between;
}
.lord img {
  width: 19%;
  height: auto;
  margin: 0 auto;
}
.title {
  width: 30%;
  flex: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}
.top {
  font-weight: bold;
}
.buttom {
  font-size: 13px;
  font-weight: 100;
}
.touch {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.button {
  height: 28px;
  font-size: 14px;
  color: white;
  border-radius: 15%;
  border: 0;
  background: linear-gradient(to right, #fe8d1f, #f7a42f);
}
.comment {
  width: 100%;
  height: 70%;
  display: flex;
  justify-content: space-between;
}
.percent {
  width: 32%;
  height: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}
.up {
  font-size: 15px;
  font-weight: 300;
  color: gray;
  margin: 3px;
}
.center {
  font-weight: 700;
  font-size: 25px;
}
</style>