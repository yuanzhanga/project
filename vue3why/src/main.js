import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'normalize.css'
import App from './App.vue'
import router from './router'
import '@/css/reset.css'
// initAMapApiLoader({
//     // 高德的key
//     key: '39e98a97a1c752983b102b43a5d54672',
//     securityJsCode: 'be7e26ce3d7e9cd271ddae84a5a2b600'
//   });
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
