<template>
  <div class="header-info">
    <div class="operation">
      <span>
        <el-icon><Message /></el-icon>
      </span>
      <span class="messageIcon">
        <span class="dot"></span>
        <el-icon><ChatDotRound /></el-icon>
      </span>
      <span>
        <el-icon><Search /></el-icon>
      </span>
    </div>
    <el-dropdown>
      <div class="userInfo">
        <el-avatar
          :size="30"
          src="https://upload.jianshu.io/users/upload_avatars/1102036/c3628b478f06.jpeg"
        />
        <span class="el-dropdown-link">{{ userInfo.name }}</span>
      </div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="handleExitClick">
            <el-icon><CircleClose /></el-icon>
            <span>退出系统</span>
          </el-dropdown-item>
          <el-dropdown-item divided>
            <el-icon><InfoFilled /></el-icon>
            <span>个人信息</span>
          </el-dropdown-item>
          <el-dropdown-item>
            <el-icon><Unlock /></el-icon>
            <span>修改密码</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup name="" lang="ts">
import { localCache } from '@/utils/cache'
import { loginToken } from '@/global'
import router from '@/router'
//获取登录用户名字
import useLoginStore from '@/store/login/login'
const { userInfo } = useLoginStore()
//退出登录函数
function handleExitClick() {
  localCache.removeCache(loginToken)
  router.push('/login')
}
</script>

<style scoped lang="less">
.header-info {
  display: flex;
  justify-content: space-between;
  //三个小图标
  .operation {
    width: 40%;
    display: flex;
    justify-content: space-around;
    align-items: center;
    span {
      cursor: pointer;
    }
    .messageIcon {
      position: relative;
      //红点点
    .dot {
      position: absolute;
      top: -2px;
      right: -2px;
      z-index: 10;
      width: 6px;
      height: 6px;
      background: red;
      border-radius: 100%;
    }
    }

  }
  .el-dropdown {
    &:hover {
      border: 0;
    }
    flex: 1;
    //下拉框
    .userInfo {
      border: 0;
      cursor: pointer;
      display: flex;
      justify-content: space-around;
      align-items: center;
      width: 80%;
      font-size: 16px;
      //字
      .el-dropdown-link {
        margin-right: 15px;
        white-space: nowrap;
      }
    }
  }
}
.example-showcase .el-dropdown-link {
  cursor: pointer;
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
}
</style>
