<template>
  <el-breadcrumb separator="/">
    <template v-for="item in breadCrumb" :key="item.name">
      <el-breadcrumb-item :to="item.url">{{ item.name }}</el-breadcrumb-item>
    </template>
  </el-breadcrumb>
</template>

<script setup name="" lang="ts">
import useLoginStore from '@/store/login/login.ts'
import { mapMenusToBreadcrumbs } from '@/utils/map-menus.ts'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const { userMenus } = useLoginStore()
const route = useRoute()
const breadCrumb = computed(() => {
  //根据路由变化自动计算
  return mapMenusToBreadcrumbs(route.path, userMenus)
})
</script>

<style scoped>
.el-breadcrumb {
  font-size: 16px;
}
</style>
