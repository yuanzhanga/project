<template>
  <div class="user">
    <userSearch @queryClick="handleQueryClick" @resetClick="handleResetClick" />
    <userContent ref="listRef" @newClick="handleNewClick" @editClick="handleEditClick" />
    <useModal ref="modalRef" />
  </div>
</template>

<script setup name="" lang="ts">
import userSearch from './c-cpns/user-search.vue'
import userContent from './c-cpns/user-content.vue'
import useModal from './c-cpns/user-modal.vue'
import { ref } from 'vue'
const listRef = ref<InstanceType<typeof userContent>>()
//子组件传来的数据进行网络请求
//#region 根据传过来的表单进行查询
function handleQueryClick(searchForm) {
  listRef.value?.fetchUserListData(searchForm)
}
//#endregion
//#region重置
function handleResetClick() {
  listRef.value?.fetchUserListData()
}
//#endregion
//#region 与模态框的交互
const modalRef = ref<InstanceType<typeof useModal>>() //模态框
function handleNewClick() {
  modalRef.value?.setModalVisible()
}
function handleEditClick(currentUser: any) {
  console.log(currentUser)
  modalRef.value?.setModalVisible(false, currentUser)
}
//#endregion
</script>

<style scoped>
.user {
  /* 父元素设置圆角和超出部分隐藏,所以看起来子元素也有了圆角 */
  border-radius: 8px;
  overflow: hidden;
}
</style>
