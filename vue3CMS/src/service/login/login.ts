import hyRequest from '../index'
import type { IAccount } from '@/types'

//用户登录接口
export function accountLoginRequest(account: IAccount) {
  return hyRequest.post({
    url: '/login',
    data: account,
  })
}

//获取用户信息
export function getUserInfoById(id: number) {
  return hyRequest.get({
    url: `/users/${id}`,
    // headers:{//配置token或者放到拦截器
    //   Authorization:'token'
    // }
  })
}
export function getUserMenusByRoleId(id: number) {
  return hyRequest.get({
    url: `/role/${id}/menu`
  })
}
