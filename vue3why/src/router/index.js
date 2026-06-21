import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views//home/home.vue'
import Favor from '@/views/favor/favor.vue'
import Order from '@/views/order/order.vue'
import Message from '@/views/message/message.vue'
import City from '@/views/city/city.vue'
import Search from '@/views/search/search.vue'
import Detail from '@/components/detail/detail.vue'
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: 'home',
      component: Home
    },
    {
      path: '/home',
      name: 'home',
      component: Home
    },
    {
      path: '/favor',
      name: 'favor',
      component: Favor
    },
    {
      path: '/order',
      name: 'order',
      component: Order,
    },
    {
      path: '/message',
      name: 'message',
      component: Message,
    },
    {
      path: '/city',
      name: 'city',
      component: City,
      meta: {
        hidetabbar : true
      }
    },
    {
      path: '/search',
      name: 'search',
      component: Search,
      meta: {
        hidetabbar : true
      }
    },
    {
      path: '/detail/:id',
      name: 'detail',
      component: Detail,
      meta: {
        hidetabbar : true
      }
    }
  ]
})

export default router
