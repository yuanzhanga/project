<template>
  <div class="login-panel">
    <h1 class="title">后台管理系统</h1>
    <div class="tabs">
      <el-tabs type="border-card" stretch v-model="activeTab">
        <el-tab-pane label="账号登录" name="account">
          <!-- 用了插槽el-tab-pane的label属性可以不写 -->
          <template #label>
            <div class="tab">
              <el-icon><User /></el-icon>
              <span>账号登录</span>
            </div>
          </template>
          <AccountLoginTab ref="accountRef" :isRemPwd></AccountLoginTab>
        </el-tab-pane>
        <el-tab-pane label="手机登录" name="phone">
          <template #label>
            <div class="tab">
              <el-icon><Cellphone /></el-icon>
              <span>手机登录</span>
            </div>
          </template>
          <PhoneLoginTabVue />
        </el-tab-pane>
      </el-tabs>
    </div>
    <div class="control-account">
      <el-checkbox v-model="isRemPwd" label="记住密码" size="large" />
      <el-link type="primary">忘记密码</el-link>
    </div>
    <el-button class="login-btn" type="primary" @click="handleLoginBtn">立即登录</el-button>
  </div>
</template>

<script setup name="" lang="ts">
import { ref } from 'vue'
import PhoneLoginTabVue from './PhoneLoginTab.vue'
import AccountLoginTab from './AccountLoginTab.vue'
import { localCache } from '@/utils/cache'
const isRemPwd = ref<boolean>(localCache.getCache('isRemPwd') ?? false) //是否记住密码
const activeTab = ref('account') //控制哪个登录页面
//处理登录事件，用defineExpose和ref通信
const accountRef = ref<InstanceType<typeof AccountLoginTab>>()
function handleLoginBtn() {
  if (activeTab.value === 'account') {
    accountRef.value?.loginAction(isRemPwd.value)
  } else {
    console.log(2)
  }
}
</script>

<style scoped lang="less">
.login-panel {
  width: 330px;
  margin-bottom: 220px;
  .title {
    font-size: 25px;
    font-weight: 800;
    text-align: center;
    margin: 10px;
  }
  .control-account {
    margin: 5px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .login-btn {
    width: 100%;
  }
  .tabs {
    width: 100%;
    .tab {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      span {
        margin-left: 5px;
      }
    }
  }
}
</style>
