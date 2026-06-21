import { ref } from 'vue'
import pageContent from '@/components/page-content/page-content.vue'
//搜素哦组件对列表内容的操作封装的函数
function usePageContext() {
  const listRef = ref<InstanceType<typeof pageContent>>()
  //查询
  function handleQueryClick(searchForm) {
    listRef.value?.fetchPageListData(searchForm)
  }
  //重置
  function handleResetClick() {
    listRef.value?.fetchPageListData()
  }
  return {
    listRef,
    handleQueryClick,
    handleResetClick,
  }
}
export default usePageContext
