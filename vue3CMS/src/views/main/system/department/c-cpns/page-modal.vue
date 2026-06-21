<template>
  <div class="page-modal">
    <el-dialog
      v-model="dialogFormVisible"
      :title="isNewRef ? '新建部门' : '编辑部门'"
      width="500"
      center
      draggable
    >
      <el-form :model="newUserForm" label-width="100px" size="large">
        <el-form-item label="部门名称" :label-width="80" prop="name">
          <el-input v-model="newUserForm.name" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="部门领导" :label-width="80" prop="leader">
          <el-select v-model="newUserForm.leader" placeholder="请选择部门领导" style="width: 100%">
            <el-option
              v-for="item in entireRoles"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="上级部门" :label-width="80" prop="parentId">
          <el-select
            v-model="newUserForm.parentId"
            placeholder="请选择上级部门"
            style="width: 100%"
          >
            <el-option
              v-for="item in entireRoles"
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
const { newPageDataAction, editPageDataAction } = useSystemStore() //新增和编辑用户的网络请求函数
//获取所有用户部门信息
const { entireRoles, entireDepartments } = storeToRefs(useMainStore())
//表单的双向绑定
const dialogFormVisible = ref(false)
const newUserForm = reactive({
  name: '',
  leader: '',
  parentId: '',
})

const isNewRef = ref(true) //根据是否是编辑来显示框的title
const editIdRef = ref<number>(-1) //编辑时的id
//设置模态框显示状态
function setModalVisible(isNew?, userInfo? = {}) {
  isNewRef.value = isNew ?? true
  //判断是新增还是编辑进行不同的模态框展示
  if (!isNew) {
    editIdRef.value = userInfo?.id //记录确认按钮点击时要用的id
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
  if (!isNewRef.value && editIdRef.value) {
    editPageDataAction('department', editIdRef.value, newUserForm)
  } else {
    newPageDataAction('department', newUserForm)
  }
}
defineExpose({ setModalVisible }) //暴露设置模态框显示状态方法给父组件
</script>

<style scoped lang="less"></style>
