<template>
  <facility :title="'预定须知'" more="">
    <div class="body">
      <template v-for="item in rules.orderRules">
        <div class="box">
          <span>{{ item.title }}</span>
          <span>{{ item.introduction }}</span>
        </div>
      </template>
    </div>
  </facility>
</template>
  
  <script setup name=''>
import facility from "./facility.vue";
const { rules } = defineProps(["rules"]);
//console.log(rules);
</script>
  
  <style scoped>
.body {
  flex: 2;
  margin: 5px;
}
.box {
  width: 100%;
  height: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  text-align: left;
}
</style>