<template>
  <div class="search">
    <el-form label-width="50" size="large" :model="searchForm" ref="formRef">
      <el-row :gutter="20" :span="24">
        <el-col :span="8">
          <el-form-item label="用户名" prop="name" label-width="80">
            <el-input placeholder="请输入查询的用户名" v-model="searchForm.name" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="真实姓名" prop="realname" label-width="80">
            <el-input placeholder="请输入查询的真实姓名" v-model="searchForm.realname" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="手机号码" prop="cellphone" label-width="80">
            <el-input placeholder="请输入查询的手机号码" v-model="searchForm.cellphone" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="状态" prop="enable" label-width="80">
            <el-select placeholder="选择状态" style="width: 100%" v-model="searchForm.enable">
              <el-option label="启用" :value="1" />
              <el-option label="禁止" :value="0" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="创建时间" prop="createAt" label-width="80">
            <el-date-picker
              type="daterange"
              range-separator="-"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              v-model="searchForm.createAt"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <div class="btns">
      <el-button icon="RefreshRight" @click="handleResetClick">重置</el-button>
      <el-button icon="Search" type="primary" @click="handleQueryClick">查找</el-button>
    </div>
  </div>
</template>

<script setup name="" lang="ts">
import { usePermissions } from '@/hooks/usePermissions'
import { reactive, ref } from 'vue'
const isQuery = usePermissions('users:query')
const emit = defineEmits(['resetClick', 'queryClick'])
//表单的双向绑定
const searchForm = reactive({
  name: '',
  realname: '',
  cellphone: '',
  enable: '',
  createAt: '', //服务器要校验的数据类型要一致
})
//ref的表单
const formRef = ref()
//*重置事件
function handleResetClick() {
  formRef.value?.resetFields() //内置重置方法
  emit('resetClick')
}
//*查询事件
function handleQueryClick() {
  //把参数传给父组件再传给子组件网络请求
  emit('queryClick', searchForm)
}
</script>

<style scoped lang="less">
.search {
  padding: 20px;
  background-color: #fff;
}
.btns {
  text-align: right;
  .el-button {
    font-size: 16px;
    padding: 8px;
  }
}
</style>
