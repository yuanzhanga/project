import { createRouter, createWebHashHistory } from 'vue-router'
import { loginToken } from '@/global/index' //获取一个字符串，防止写错
import { firstMenu } from '@/utils/map-menus'
const router = createRouter({
  history: createWebHashHistory(),
  // 映射关系: path => component
  routes: [
    {
      path: '/',
      redirect: '/main',
    },
    {
      path: '/login',
      component: () => import('../views/login/Login.vue'),
    },
    {
      path: '/main',
      name: 'main',
      component: () => import('../views/main/Main.vue'),
    },
    {
      path: '/:pathMatch(.*)',
      component: () => import('../views/not-found/NotFound.vue'),
    },
  ],
})

// 导航守卫
router.beforeEach((to) => {
  const token = localStorage.getItem(loginToken)
  if (to.path.startsWith('/main') && !token) {
    return '/login'
    // router.push('/login')效果一样
  }
  //匹配第一次路由
  if (to.path === '/main') {
    return firstMenu.url
  }
})
export default router
