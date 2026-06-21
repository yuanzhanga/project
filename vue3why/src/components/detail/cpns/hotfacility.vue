<template>
  <facility :title="'热门评论'" :more="`加载全部${commentModule.totalCount}条评论`">
<div class="body">
    <div class="top">
        <div class="left">
            <div class="score">{{commentModule.overall}}</div>
            <div class="title">
                <span>{{commentModule.scoreTitle  }}</span>
                <span>{{commentModule.totalCount  }}条评论</span>
                <span>{{commentModule.overall  }}星</span>
            </div>
        </div>
        <div class="right">
            <template v-for="i in commentModule.subScores">
                <span>{{ i }}</span>
            </template>
        </div>
    </div>
    <div class="center">
        <template v-for="i in commentModule.commentTagVo">
            <span :style="['color:' + i.color]">{{ i.text }}</span>
        </template>
    </div>
    <div class="buttom">
        <div class="people">
            <img :src="commentModule.comment.userAvatars" alt="">
            <div>
                <div class="name">{{ commentModule.comment.userName }}</div>
                <div class="time">{{  commentModule.comment.checkInDate}}</div>
            </div>
        </div>
        <div class="comment">{{commentModule.comment.commentDetail  }}</div>
    </div>
</div>
  </facility>
</template>

<script setup name=''>
import facility from "./facility.vue";
const { commentModule } = defineProps(["commentModule"]);
//console.log(commentModule)
</script>

<style scoped>
.body {
  flex: 2;
  margin: 2px;
}
.top {
    display: flex;
    justify-content: space-between;
    height:auto;
    margin: 0 auto;
}
.left {
    display: flex;
    justify-content: center;
    flex: 50%;
}
.score {
    font-size: 40px;
    align-content: center;
    margin: 3px;
}
.title {
    display: flex;
    justify-content: center;
    flex-direction: column;
    font-size: 17px;
    margin: 0;
}
.right {
    flex: 50%;
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 创建两列，每列占据容器的1份 */
    font-size: 14px;
    margin: 7px;
}
.right span {
    color: #666666;
}
.center {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    margin: 2px auto;
    height: auto;
    font-size: 15px;
}
.center span {
    margin: 0 12px;
    line-height: 30px;
}
.people {
    margin: 2px auto;
    height: 40px;
    margin: 5px;
    display: flex;
}
img {
    width: 10%;
    border-radius: 50%;
    height: auto;
}
.time {
    font-size: 13px;
    color: #666666;
    margin-top: 3px;
}
.comment {
    font-size: 13px;
    padding: 7px;
}
</style>