<template>
  <div class="main-header">
    <el-icon class="icon" @click="handleMenuisFlod">
      <component :is="isFold ? 'Expand' : 'Fold'"></component>
    </el-icon>
    <div class="breadcrumb">
      <headCrumb />
    </div>
    <div class="info"><HeaderInfo /></div>
  </div>
</template>

<script setup name="" lang="ts">
import { ref } from 'vue'
import HeaderInfo from '@/components/main-header/c-cpns/header-info.vue'
const emit = defineEmits(['foldChange']) //事件名称数组
//判断是否折叠菜单，传给父组件
const isFold = ref(false)
function handleMenuisFlod() {
  isFold.value = !isFold.value
  emit('foldChange', isFold.value)
}
</script>

<style scoped lang="less">
.main-header {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  .icon {
    height: 70%;
    font-size: 20px;
    width: 20px;
    margin-right: 15px;
    cursor: pointer;
  }
  .breadcrumb {
    flex: 1;
    height: 80%;
    align-content: center;
  }
  .info {
    margin-right: -30px;
    height: 80%;
    align-content: center;
    width: 240px;
  }
}
</style>
