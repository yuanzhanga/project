<template>
  <div>
    <pageContent
      ref="listRef"
      @newClick="handleNewClick"
      @editClick="handleEditClick"
      :contentConfig
    />
  </div>
</template>

<script setup name="" lang="ts">
import contentConfig from './config/content.config'
import pageContent from '@/components/page-content/page-content.vue'
import usePageContext from '@/hooks/usePageContent.ts'
import usePageModal from '@/hooks/usePageModal.ts'
//对列表内容的操作
const { listRef } = usePageContext()
//与模态框的交互
const {handleNewClick, handleEditClick } = usePageModal()
</script>

<style scoped></style>
