import { defineStore } from 'pinia'
import {
  accountLoginRequest,
  getUserInfoById,
  getUserMenusByRoleId,
} from '@/service/login/login.ts' //网络请求
import type { IAccount } from '@/types'
import { localCache } from '@/utils/cache' //获取封装Storage
import router from '@/router'
import { loginToken } from '@/global/index'
import { mapMenusToRouters, mapMenuToPermissions } from '@/utils/map-menus' //映射菜单到路由
import useMainStore from '../main/main'
const useLoginStore = defineStore('login', {
  state: () => ({
    //返回对象的简写形式
    token: '',
    //要用localCache.getCache封装过的 不然还得JSON转化
    userInfo: {}, //保存用户信息
    userMenus: [], //保存用户菜单信息
    permissions: [], //保存用户权限
  }),
  actions: {
    //*账号登录请求方法
    async loginAccountAction(account: IAccount) {
      const loginResult = await accountLoginRequest(account)
      this.token = loginResult.data.token
      localCache.setCache(loginToken, this.token)
      //*getUserInfoById获取用户数据（role）
      const id = loginResult.data.id
      const userInfoResult = await getUserInfoById(id)
      const userInfo = userInfoResult.data
      this.userInfo = userInfo
      localCache.setCache('userInfo', userInfo)
      //*getUserMenusByRoleId获取用户菜单树
      const userMenusResult = await getUserMenusByRoleId(this.userInfo.role.id)
      const userMenus = userMenusResult.data
      this.userMenus = userMenus
      localCache.setCache('userMenus', userMenus)
      //*获取所有部门和用户信息
      const { fetchEntireDataAction } = useMainStore()
      fetchEntireDataAction()
      //!根据菜单获取动态路由
      const routes = mapMenusToRouters(userMenus)
      routes.forEach((route) => {
        router.addRoute('main', route)
      })
      //*获取用户增删改查的权限
      const permissions: string[] = mapMenuToPermissions(userMenus)
      this.permissions = permissions
      localCache.setCache('permissions', permissions)

      router.push('/main')
    },

    //*每次刷新都重新获取菜单映射路由和部门和用户信息
    loadLocalCacheAction() {
      const token = localCache.getCache(loginToken)
      const userInfo = localCache.getCache('userInfo')
      const userMenus = localCache.getCache('userMenus')
      const permissions= localCache.getCache('permissions')
      if (token && userInfo && userMenus) {
        this.token = token
        this.userInfo = userInfo
        this.userMenus = userMenus
        this.permissions = permissions
        //*保持动态路由一直存在
        const routes = mapMenusToRouters(userMenus)
        routes.forEach((route) => {
          router.addRoute('main', route)
        })
        //*保持用户，部门一直存在
        const { fetchEntireDataAction } = useMainStore()
        fetchEntireDataAction()
      }
    },
  },
})
export default useLoginStore
