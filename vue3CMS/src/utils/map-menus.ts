import { subMenuProps } from 'element-plus'
import type { RouteRecordRaw } from 'vue-router' //加到路由数组类型

//*获取所有路由
function loadLocalRouters() {
  const localRouter: RouteRecordRaw[] = [] //所有路由
  /*匹配router文件夹里的所有ts文件*/
  const files = import.meta.glob('../router/main/**/*.ts', {
    eager: true, //立即返回结果，不要异步
  })
  //获取所有路由不管有没有
  for (const key in files) {
    const module: any = files[key]
    localRouter.push(module.default) //ts文件里的内容加到路由数组里
  }
  return localRouter
}

//*获取符合菜单的路由
const localRouter = loadLocalRouters()
export let firstMenu: any = null
export function mapMenusToRouters(userMenus: any[]) {
  const routes: RouteRecordRaw[] = [] //动态路由
  for (const menu of userMenus) {
    for (const subMenu of menu.children) {
      const route = localRouter.find((item) => item.path === subMenu.url)
      if (route) {
        //**把main里顶层路由重定向到第一个页面
        if (!routes.find((item) => item.path === menu.url)) {
          routes.push({ path: menu.url, redirect: route })
        }
        routes.push(route)
      }
      //*匹配第一次进入页面的路由
      if (!firstMenu && route) firstMenu = subMenu
    }
  }
  return routes
}

//*根据路由确定菜单高亮
export function mapPathToMenus(path: string, userMenus: any[]) {
  for (const item of userMenus) {
    for (const subMenu of item.children) {
      if (subMenu.url === path) {
        return subMenu //返回符合的菜单
      }
    }
  }
}

//*根据菜单生成面包屑
export function mapMenusToBreadcrumbs(path: string, userMenus) {
  console.log(path,userMenus)
  const breadCrumb: any[] = []
  for (const item of userMenus) {
    for (const subMenu of item.children) {
      if (subMenu.url === path) {
        breadCrumb.push(item) //父
        breadCrumb.push(subMenu) //子
      }
    }
  }
  return breadCrumb
}

//**角色菜单映射到id的列表
export function mapMenuListGetId(menuList) {
  if(!menuList) return []
  const ids: number[] = []
  function recurseGetId(menus: any[]) {
    for (const menu of menus) {
      if (menu.children) {
        recurseGetId(menu.children)
      } else {
        ids.push(menu.id)
      }
    }
  }
  recurseGetId(menuList)
  return ids
}

//*菜单映射用户权限
export function mapMenuToPermissions(menuList: any[]) {
  const permissions: string[] = []
  function recurseGetPermissions(menus: any[]) {
    for (const item of menus) {
      if (item.type === 3) {
        permissions.push(item.permission)
      } else {
        recurseGetPermissions(item.children ?? [])
      }
    }
  }
  recurseGetPermissions(menuList)
  return permissions
}
