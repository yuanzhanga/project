import { createPinia } from 'pinia'
import type { App } from 'vue'
import useLoginStore from '@/store/login/login'
const pinia = createPinia()
function registerStore(app: App<Element>) {
  app.use(pinia)
  //每次刷新执行
  useLoginStore().loadLocalCacheAction()
}
export default registerStore
//导出pinia
