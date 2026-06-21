import { ref } from 'vue'
import pageModal from '@/components/page-modal/page-modal.vue'
function usePageModal(newCallback?, editCallback?) {
  const modalRef = ref<InstanceType<typeof pageModal>>() //模态框
  //新建
  function handleNewClick() {
    modalRef.value?.setModalVisible()
    if (newCallback) editCallback(newCallback)
  }
  //编辑

  function handleEditClick(currentUser: any) {
    modalRef.value?.setModalVisible(false, currentUser)
    if (editCallback) editCallback(currentUser)
  }
  return {
    modalRef,
    handleNewClick,
    handleEditClick,
  }
}
export default usePageModal
