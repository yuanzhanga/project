<template>
  <div class="page-modal">
    <el-dialog
      v-model="dialogFormVisible"
      :title="isNewRef ? modalConfig.header.newTitle : modalConfig.header.editTitle"
      width="500"
      center
      draggable
    >
      <el-form :model="formData" label-width="100px" size="large">
        <template v-for="item in modalConfig.formItems" :key="item.prop">
          <el-form-item :label="item.label" :label-width="80" :prop="item.prop">
            <template v-if="item.type === 'select'">
              <el-select
                v-model="formData.parentId"
                :placeholder="item.placeholder"
                style="width: 100%"
              >
                <!-- 部门列表 -->
                <el-option
                  v-for="i in item.options"
                  :key="i.value"
                  :label="i.label"
                  :value="i.value"
                />
              </el-select>
            </template>
            <!-- 作用域插槽自己定义内容 -->
            <template v-else-if="item.type === 'custom'">
              <!-- 传给父组件的插槽 -->
              <slot :name="item.slotName"></slot>
            </template>
            <template v-else>
              <el-input v-model="formData[item.prop]" :placeholder="item.placeholder" />
            </template>
          </el-form-item>
        </template>
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
import useSystemStore from '@/store/main/system/system'
import { ref, reactive } from 'vue'
const { newPageDataAction, editPageDataAction } = useSystemStore() //新增和编辑用户的网络请求函数
//获取所有用户部门信息
//表单的双向绑定
const { modalConfig, otherInfo } = defineProps(['modalConfig', 'otherInfo']) //传入配置
const initialvalue = {}
for (const item of modalConfig.formItems) {
  initialvalue[item.prop] = ''
}
const formData = reactive(initialvalue)

//模态框是否显示状态
const dialogFormVisible = ref(false)
const isNewRef = ref(true) //根据是否是编辑来显示框的title
const editIdRef = ref<number>(-1) //编辑时的id
//设置模态框显示状态
function setModalVisible(isNew?, userInfo? = {}) {
  isNewRef.value = isNew ?? true
  //判断是新增还是编辑进行不同的模态框展示
  if (!isNew) {
    editIdRef.value = userInfo?.id //记录确认按钮点击时要用的id
    for (const key in formData) {
      formData[key] = userInfo[key]
    }
  } else {
    for (const key in formData) {
      formData[key] = ''
    }
  }
  dialogFormVisible.value = true
}

//确认按钮点击
function handleConfirmClick() {
  dialogFormVisible.value = false //关闭模态框
  //对传入的参数进行操作
  let infoData = formData
  if (otherInfo) {
    //有其他参数
    infoData = { ...formData, ...otherInfo }
  }
  //判断新建编辑
  if (!isNewRef.value && editIdRef.value) {
    editPageDataAction(modalConfig.pageName, editIdRef.value, infoData)
  } else {
    newPageDataAction(modalConfig.pageName, infoData)
  }
}
defineExpose({ setModalVisible }) //暴露设置模态框显示状态方法给父组件
</script>

<style scoped lang="less"></style>
