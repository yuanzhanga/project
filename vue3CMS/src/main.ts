import { createApp } from 'vue'
import App from './App.vue'
// import 'normalize.css'
import './assets/css/index.less'
import router from './router'
//把创建pinia放到store文件夹
import pinia from './store/index.ts'
//全局注册ElementPlus
// import ElementPlus from 'element-plus'
// import 'element-plus/dist/index.css'
// app.use(ElementPlus)

//引入局部elmessage和elloading样式或者使用插件
import 'element-plus/theme-chalk/el-message.css'
const app = createApp(App)
//全局导入图标,可以抽离成一个单独的中间件用use使用
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia).use(router)
app.mount('#app')
