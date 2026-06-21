import hyRequest from '@/service/index'

//*对用户的增删改查
//根据返回的页面数据获取用户列表
export function postUsersListData(queryData) {
  return hyRequest.post({
    url: '/users/list',
    data: queryData,
  })
}

//删除用户
export function deleteUserById(id: number) {
  return hyRequest.delete({
    url: `/users/${id}`,
  })
}

//新增用户
export function newUserData(userInfo: any) {
  return hyRequest.post({
    url: `/users`,
    data: userInfo,
  })
}

//编辑用户
export function editUserData(id: number, userInfo: any) {
  return hyRequest.patch({
    url: `/users/${id}`,
    data: userInfo,
  })
}

//*对页面的增删改查--抽离逻辑
export function postPageListData(pageName: string, queryData) {
  return hyRequest.post({
    url: `/${pageName}/list`,
    data: queryData,
  })
}

export function deletePageById(pageName: string, id: number) {
  return hyRequest.delete({
    url: `/${pageName}/${id}`,
  })
}

export function newPageData(pageName: string, pageInfo: any) {
  return hyRequest.post({
    url: `/${pageName}`,
    data: pageInfo,
  })
}

export function editPageData(pageName: string, id: number, pageInfo: any) {
  return hyRequest.patch({
    url: `/${pageName}/${id}`,
    data: pageInfo,
  })
}
