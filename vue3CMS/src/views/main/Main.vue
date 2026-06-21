<template>
  <el-container class="main">
    <el-aside :width="isFold ? '60px' : '210px'">
      <mainMenu :isFold></mainMenu>
    </el-aside>
    <el-container>
      <el-header height="50px">
        <mainHeader @foldChange="handleFoldChange"></mainHeader>
      </el-header>
      <el-main>
        <!-- 二级路由 -->
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup name="" lang="ts">
import mainMenu from '@/components/main-menu/mainMenu.vue'
import mainHeader from '@/components/main-header/mainHeader.vue'
import { loginToken } from '@/global/index' //全局字符串
import { localCache } from '@/utils/cache' //封装的Storage
// import router from '@/router'和useRouter一样
import { ref } from 'vue'

//菜单折叠函数
const isFold = ref(false) //是否折叠，从header传来执行逻辑再传给menu
function handleFoldChange(isFlag: boolean) {
  isFold.value = isFlag
}
</script>

<style scoped lang="less">
.main {
  background-color: #fff;
  height: 100%;
  .el-aside {
    background-color: rebeccapurple;
    &::-webkit-scrollbar {
      display: none;
    }
    transition: all 0.3s linear;
  }
  .el-header {
    width: 100%;
    padding: 0;
  }
  //整体背景
  .el-main {
    padding: 15px;
    background-color: #eceef0;
  }
}
</style>
