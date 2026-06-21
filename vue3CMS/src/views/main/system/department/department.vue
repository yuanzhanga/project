<template>
  <div class="department">
    <pageSearch @queryClick="handleQueryClick" @resetClick="handleResetClick" :searchConfig />
    <pageContent
      ref="listRef"
      @newClick="handleNewClick"
      @editClick="handleEditClick"
      :contentConfig
    >
      <!-- <template #leader="scope">{{ scope.row.leader }}</template> -->
    </pageContent>
    <pageModal ref="modalRef" :modalConfig="modalConfigRef" />
  </div>
</template>

<script setup name="" lang="ts">
//传入配置文件动态生成页面内容
import searchConfig from './config/search.config.ts'
import contentConfig from './config/content.config'
import modalConfig from './config/modal.config'
import pageSearch from '@/components/page-search/page-search.vue'
import pageContent from '@/components/page-content/page-content.vue'
import pageModal from '@/components/page-modal/page-modal.vue'
import { computed } from 'vue'
import useMainStore from '@/store/main/main'
import usePageContext from '@/hooks/usePageContent.ts'
import usePageModal from '@/hooks/usePageModal.ts'

//对modalConfig的一些操作
const modalConfigRef = computed(() => {
  //传给子组件的配置更改一下
  const mainStore = useMainStore()
  const department = mainStore.entireDepartments.map((item) => {
    return { label: item.name, value: item.id }
  })
  modalConfig.formItems.forEach((item) => {
    if (item.prop === 'parentId') {
      item.options.push(...department)
    }
  })
  return modalConfig
})

//对列表内容的操作
const { listRef, handleQueryClick, handleResetClick } = usePageContext()
//与模态框的交互
const { modalRef, handleNewClick, handleEditClick } = usePageModal()
</script>

<style scoped>
.department {
  /* 父元素设置圆角和超出部分隐藏,所以看起来子元素也有了圆角 */
  border-radius: 8px;
  overflow: hidden;
}
</style>
