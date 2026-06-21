<template>
  <div class="search" v-if="isQuery">
    <el-form label-width="50" size="large" :model="searchForm" ref="formRef">
      <el-row :gutter="20" :span="24">
        <template v-for="item in props.searchConfig.formItems" :key="item.prop">
          <el-col :span="8">
            <el-form-item :label="item.label" :prop="item.prop" label-width="80">
              <template v-if="item.type === 'input'">
                <el-input :placeholder="item.placeholder" v-model="searchForm[item.prop]" />
              </template>
              <template v-if="item.type === 'date-picker'">
                <el-date-picker
                  type="daterange"
                  range-separator="-"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  v-model="searchForm[item.prop]"
                />
              </template>
            </el-form-item>
          </el-col>
        </template>
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
const props = defineProps(['searchConfig'])
const emit = defineEmits(['resetClick', 'queryClick'])
//判断是否有查询权限
const isQuery = usePermissions(`${props.searchConfig.pageName}:query`)
//表单的双向绑定
const initialForm = {} //配置传过来的初始值
for (const item of props.searchConfig.formItems) {
  initialForm[item.prop] = item.initialValue ?? '' // 初始值
}
const searchForm = reactive(initialForm)
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
