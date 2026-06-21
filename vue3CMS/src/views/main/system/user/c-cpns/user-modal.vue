<template>
  <div class="user-modal">
    <el-dialog
      v-model="dialogFormVisible"
      :title="isNewRef ? '新建用户' : '编辑用户'"
      width="500"
      center
      draggable
    >
      <el-form :model="newUserForm" label-width="100px" size="large">
        <el-form-item label="用户名" :label-width="80" prop="name">
          <el-input v-model="newUserForm.name" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="真实姓名" :label-width="80" prop="realname">
          <el-input v-model="newUserForm.realname" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item v-if="isNewRef" label="密码" :label-width="80" prop="password">
          <el-input v-model="newUserForm.password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="手机号" :label-width="80" prop="cellphone">
          <el-input v-model="newUserForm.cellphone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="选择角色" :label-width="80" prop="roleId">
          <el-select v-model="newUserForm.roleId" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="item in entireRoles"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择部门" :label-width="80" prop="departmentId">
          <el-select
            v-model="newUserForm.departmentId"
            placeholder="请选择部门"
            style="width: 100%"
          >
            <el-option
              v-for="item in entireDepartments"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogFormVisible = false">取消</el-button>
          <el-button type="primary" @click="handleConfirmClick"> 确认 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="" lang="ts">
import useMainStore from '@/store/main/main'
import useSystemStore from '@/store/main/system/system'
import { storeToRefs } from 'pinia'
import { ref, reactive } from 'vue'
const { newUserDataAction, editUserDataAction } = useSystemStore() //新增和编辑用户的网络请求函数
//获取所有用户部门信息
const { entireRoles, entireDepartments } = storeToRefs(useMainStore())
//表单的双向绑定
const dialogFormVisible = ref(false)
const newUserForm = reactive({
  name: '',
  realname: '',
  password: '',
  cellphone: '',
  roleId: '',
  departmentId: '', //服务器要校验的数据类型要一致
})

const isNewRef = ref(true) //根据是否是编辑来显示密码框
const editIdRef = ref<number>(-1) //编辑时的id
//设置模态框显示状态
function setModalVisible(isNew?, userInfo? = {}) {
  isNewRef.value = isNew ?? true
  //判断是新增还是编辑进行不同的模态框展示
  if (!isNew) {
    editIdRef.value = userInfo?.id //记录确认按钮点击时要用id
    for (const key in newUserForm) {
      newUserForm[key] = userInfo[key]
    }
  } else {
    for (const key in newUserForm) {
      newUserForm[key] = ''
    }
  }
  dialogFormVisible.value = true
}
//确认按钮点击
function handleConfirmClick() {
  dialogFormVisible.value = false //关闭模态框
  if (isNewRef.value) {
    newUserDataAction(newUserForm)
  } else {
    editUserDataAction(editIdRef.value, newUserForm)
  }
}
defineExpose({ setModalVisible }) //暴露设置模态框显示状态方法给父组件
</script>

<style scoped lang="less"></style>
