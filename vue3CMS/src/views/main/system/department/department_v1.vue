<template>
  <div class="department">
    <pageSearch @queryClick="handleQueryClick" @resetClick="handleResetClick" />
    <pageContent ref="listRef" @newClick="handleNewClick" @editClick="handleEditClick" />
    <pageModal ref="modalRef" />
  </div>
</template>

<script setup name="" lang="ts">
import pageSearch from './c-cpns/page-search.vue'
import pageContent from './c-cpns/page-content.vue'
import pageModal from './c-cpns/page-modal.vue'
import { ref } from 'vue'
const listRef = ref<InstanceType<typeof pageContent>>()
//子组件传来的数据进行网络请求
//#region 根据传过来的表单进行查询
function handleQueryClick(searchForm) {
  listRef.value?.fetchPageListData(searchForm)
}
//#endregion
//#region重置
function handleResetClick() {
  listRef.value?.fetchPageListData()
}
//#endregion

//#region 与模态框的交互
const modalRef = ref<InstanceType<typeof pageModal>>() //模态框
function handleNewClick() {
  modalRef.value?.setModalVisible()
}
function handleEditClick(currentUser: any) {
  modalRef.value?.setModalVisible(false, currentUser)
}
//#endregion
</script>

<style scoped>
.department {
  /* 父元素设置圆角和超出部分隐藏,所以看起来子元素也有了圆角 */
  border-radius: 8px;
  overflow: hidden;
}
</style>
