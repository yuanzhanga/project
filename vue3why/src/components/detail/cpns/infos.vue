<template>
  <div class="title">{{ infosdata.houseName }}</div>
  <div class="word">
    <template v-for="(item, index) in infosdata.houseTags" :key="index">
      <span
        :style="[
          'color: ' + (item.tagText ? item.tagText.color : ''),
          'background: ' + (item.tagText ? item.tagText.background.color : ''),
        ]"
        >{{ item.tagText?.text }}</span
      >
    </template>
  </div>
  <div class="comment">
    <div class="great">
      <span class="score">{{ infosdata.commentBrief.overall }}</span>
      <span class="zan">{{ infosdata.commentBrief.scoreTitle }}</span>
      <span class="fangdong">'{{ infosdata.commentBrief.commentBrief }}'</span>
    </div>
    <div class="com">
      {{ infosdata.commentBrief.totalCount }}条评论&nbsp;<span
        style="color: #000"
        >></span
      >
    </div>
  </div>
  <div class="comment">
    <div class="great">
      <span class="zan">{{ infosdata.nearByPosition.address }}</span>
    </div>
    <div class="com">地图*周边&nbsp;<span style="color: #000">></span></div>
  </div>
</template>
v
<script setup name=''>
const { infosdata } = defineProps({
  infosdata: {
    type: Object,
    default: () => {},
  },
});
</script>

<style scoped>
.title {
  font-size: 23px;
  font-weight: bold;
  margin: 5px;
}
.word {
  width: 100%;
  height: 20px;
  display: flex;
  line-height: 20px;
  font-size: 13px;
  font-weight: 600;
  justify-content: space-around;
}
.comment {
  background-color: #f4f6f8;
  width: 90%;
  height: 50px;
  margin: 15px auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.great {
  flex: 2;
}
.score {
  font-size: 30px;
  font-weight: bold;
  margin: 0 3px;
}
.zan {
  font-size: 16px;
  font-weight: 600;
  margin: 0 3px;
}
.fangdong {
  font-size: 13px;
  font-weight: 300;
  margin: 0 3px;
}
.com {
  color: #f1b079;
  height: 100%;
  font-size: 17px;
  line-height: 50px;
}
</style>