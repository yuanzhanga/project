<template>
  <el-form
    label-width="60px"
    size="large"
    ref="formRef"
    :model="account"
    :rules="accountRules"
    status-icon
  >
    <el-form-item label="账号" prop="name">
      <el-input v-model="account.name" />
    </el-form-item>
    <el-form-item label="密码" prop="password">
      <el-input v-model="account.password" show-password />
    </el-form-item>
  </el-form>
</template>

<script setup name="" lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import useLoginStore from '@/store/login/login'
import type { IAccount } from '@/types' //账户数据的类型
import { localCache } from '@/utils/cache'
//表单数据,记住账户逻辑
const account = reactive<IAccount>({
  name: localCache.getCache('name') ?? '',
  password: localCache.getCache('password') ?? '',
})
//表单规则，要和数据名字相同
const accountRules = {
  name: [
    { required: true, message: '账号不能为空', trigger: 'blur' },
    { min: 6, max: 20, message: '必须是6~20位的数字或字母', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { min: 6, max: 20, message: '必须是6~20位的数字或字母', trigger: 'blur' },
  ],
}
//登录按钮事件
const formRef = ref()
// const {isRemPwd} = defineProps(['isRemPwd'])//是否记住密码
const { loginAccountAction } = useLoginStore() //取出网络请求函数
function loginAction(isRemPwd: boolean) {
  formRef.value.validate((valid: boolean) => {
    //验证表单是否符合条件
    if (valid) {
      const name = account.name
      const password = account.password
      loginAccountAction({ name, password }).then(() => {
        if (isRemPwd) {
          //记住账户
          localCache.setCache('name', name)
          localCache.setCache('password', password)
        } else {
          localCache.removeCache('name')
          localCache.removeCache('password')
        }
        localCache.setCache('isRemPwd', isRemPwd) //记录用户是否记住，下次不用重新勾选
        ElMessage({
          message: '登录成功',
          type: 'success',
          duration: 1000,
        })
      })
    } else {
      ElMessage({
        message: '请输入正确的账号或密码',
        type: 'warning',
        plain: true,
      })
    }
  })
}
defineExpose({ loginAction })
</script>

<style scoped></style>
