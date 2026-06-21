<template>
  <div class="main-menu">
    <div class="logo">
      <img class="img" src="@/assets/img/logo.svg" />
      <div class="title" v-show="!isFold">后台管理系统</div>
    </div>
    <div class="menu">
      <el-menu
        text-color="#8b9eb2"
        active-text-color="#fff"
        background-color="#001129"
        :default-active="defaultActive"
        :collapse="isFold"
      >
        <template v-for="item in userMenus" :key="item.id">
          <el-sub-menu :index="item.id + ''">
            <template #title>
              <el-icon>
                <!-- 动态组件，渲染图标 -->
                <component :is="item.icon.split('-icon-')[1]"></component>
              </el-icon>
              <span>{{ item.name }}</span>
            </template>
            <template v-if="item.children">
              <template v-for="subMenu in item.children" :key="subMenu.id">
                <el-menu-item :index="String(subMenu.id)" @click="handleItemClick(subMenu)">
                  <span>{{ subMenu.name }}</span>
                </el-menu-item>
              </template>
            </template>
          </el-sub-menu>
        </template>
      </el-menu>
    </div>
  </div>
</template>

<script setup name="" lang="ts">
import useLoginStore from '@/store/login/login'
import { mapPathToMenus } from '@/utils/map-menus'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const { userMenus } = useLoginStore()
const { isFold } = defineProps(['isFold']) //是否折叠菜单
// 监听item的点击,跳转对应路由
const router = useRouter()
function handleItemClick(item: any) {
  const url = item.url
  router.push(url)
}
//根据路由确定每次刷新后哪个菜单高亮
const route = useRoute()//当前路由
const defaultActive = computed(()=>{//根据路由变化自动计算
  const pathMenu = mapPathToMenus(route.path, userMenus)
  return pathMenu.id + ''
})
</script>

<style scoped lang="less">
.main-menu {
  background-color: #001129;
  height: 100%;
  .logo {
    height: 50px;
    display: flex;
    justify-content: flex-start; //从左到右图标不会弹
    align-items: center;
    margin-left: 13px;
    .img {
      height: 40%;
      margin: 0 10px;
    }
    .title {
      font-size: 16px;
      font-weight: 700;
      color: white;
      white-space: nowrap; //文本不换行
    }
  }
}

.el-menu {
  border-right: none; //把自带边框去掉
  user-select: none;
}

.el-sub-menu {
  .el-menu-item {
    padding-left: 50px !important;
    background-color: #0c2135;
  }

  .el-menu-item:hover {
    color: #fff;
  }

  .el-menu-item.is-active {
    background-color: #0a60bd;
  }
}
</style>
