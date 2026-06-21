<template>
    <facility :title="'房屋设施'" more="查看全部设备">
      <div class="body">
        <template
          v-for="item in Facilitydata"
          :key="item.groupId"
        >
          <div class="list">
            <div class="title">
              <img :src="item.icon" alt="">
              <span>{{ item.groupName}}</span>
            </div>
            <div class="content">
              <template v-for="i in item.facilitys.slice(0,4)">
                <div>{{ i.name }}</div>
              </template>
            </div>
          </div>
        </template>
      </div>
      </facility>
</template>

<script setup name=''>
import facility from "./facility.vue";
const {Facilitydata} = defineProps({
  Facilitydata:{
    default:()=>[]

  }
})
//console.log(Facilitydata)
</script>

<style scoped>
.body {
  flex: 2;
  margin: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.list {
  position: relative;
  width: 90%;
  height: 32%;
  display: flex;
  margin: 3px auto;
}
.title {
  font-size: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  text-align: center;
  font-weight: 550;
}
img {
  width: 20px;
  height: 20px;
  margin: 0 auto;
}
.content {
  flex: 50%;
  display: grid;
  font-size: 14px;
  text-align: center;
  margin: 5px 0 0 0px ;
  grid-template-columns: repeat(2, 1fr); /* 创建两列，每列占据容器的1份 */
}
</style>