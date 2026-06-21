<template>
  <div class="role">
    <pageSearch @queryClick="handleQueryClick" @resetClick="handleResetClick" :searchConfig />
    <pageContent
      ref="listRef"
      @newClick="handleNewClick"
      @editClick="handleEditClick"
      :contentConfig
    />
    <pageModal ref="modalRef" :modalConfig :otherInfo>
      <template #menulist>
        <el-tree
          ref="treeRef"
          style="max-width: 600px"
          :data="entireMenus"
          show-checkbox
          node-key="id"
          :props="{ children: 'children', label: 'name' }"
          @check="handleElTreeClick"
        />
      </template>
    </pageModal>
  </div>
</template>

<script setup name="" lang="ts">
import searchConfig from './config/search.config'
import contentConfig from './config/content.config'
import modalConfig from './config/modal.config'
import pageSearch from '@/components/page-search/page-search.vue'
import pageContent from '@/components/page-content/page-content.vue'
import pageModal from '@/components/page-modal/page-modal.vue'
import usePageContext from '@/hooks/usePageContent.ts'
import usePageModal from '@/hooks/usePageModal.ts'
import useMainStore from '@/store/main/main'
import { storeToRefs } from 'pinia'
import { ref, nextTick } from 'vue'
import { mapMenuListGetId } from '@/utils/map-menus'
//对列表内容的操作
const { listRef, handleQueryClick, handleResetClick } = usePageContext()
//与模态框的交互
const { modalRef, handleNewClick, handleEditClick } = usePageModal(newCallback, editCallback)
//获取所有菜单
const { entireMenus } = storeToRefs(useMainStore())
//菜单树选中事件，把要添加的权限给modal组件传过去
const otherInfo = ref({})
function handleElTreeClick(currentNode, node) {
  const menuList = [...node.checkedKeys, ...node.halfCheckedKeys]
  otherInfo.value = { menuList }
}

//新建和编辑时把列表传回菜单树
const treeRef = ref()
function newCallback(currentItem) {
  nextTick(() => {
    treeRef.value.setCheckedKeys([])
  })
}
function editCallback(currentItem) {
  nextTick(() => {
    treeRef.value.setCheckedKeys(mapMenuListGetId(currentItem.menuList))
  })
}
</script>

<style scoped></style>
