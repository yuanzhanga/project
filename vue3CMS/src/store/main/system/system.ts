import { defineStore } from 'pinia'
import {
  postUsersListData,
  deleteUserById,
  newUserData,
  editUserData,
  //* 以下对各个页面抽离
  postPageListData,
  deletePageById,
  newPageData,
  editPageData,
} from '@/service/main/system/system.ts'
import useMainStore from '../main'
const useSystemStore = defineStore('system', {
  state: () => ({
    userList: [],
    usersTotalCount: 0,
    //*页面
    pageList: [],
    pageTotalCount: 0,
  }),
  actions: {
    //#region对单个页面的逻辑
    //*根据页面数据获取用户列表
    async postUsersListAction(queryData) {
      const data = await postUsersListData(queryData)
      this.userList = data.data.list
      this.usersTotalCount = data.data.totalCount
    },

    //*根据id删除用户
    async deleteUserAction(id: number) {
      const deleteUser = await deleteUserById(id) //返回删除的用户
      this.postUsersListAction({ size: 10, offset: 0 }) //重新获取删除后的数据
    },

    //*新增用户
    async newUserDataAction(userInfo) {
      const newUser = await newUserData(userInfo)
      console.log(newUser)
      this.postUsersListAction({ size: 10, offset: 0 }) //重新获取添加后的用户列表数据
    },

    //*编辑用户
    async editUserDataAction(id: number, userInfo) {
      const editUser = await editUserData(id, userInfo)
      console.log(editUser)
      this.postUsersListAction({ size: 10, offset: 0 }) //重新获取添加后的用户列表数据
    },
    //#endregion

    //*对页面的整体抽离逻辑
    async postPageListAction(pageName: string, queryData) {
      const data = await postPageListData(pageName, queryData)
      this.pageList = data.data.list
      this.pageTotalCount = data.data.totalCount
      //重新获取更新后的所有部门用户信息
      const mainStore = useMainStore()
      mainStore.fetchEntireDataAction()
    },

    async deletePageAction(pageName: string, id: number) {
      const deletePage = await deletePageById(pageName, id) //返回删除的用户
      this.postPageListAction(pageName, { size: 10, offset: 0 }) //重新获取删除后的数据
      const mainStore = useMainStore()
      mainStore.fetchEntireDataAction()
    },

    async newPageDataAction(pageName: string, pageInfo) {
      const newData = await newPageData(pageName, pageInfo)
      this.postPageListAction(pageName, { size: 10, offset: 0 }) //重新获取添加后的用户列表数据
    },

    async editPageDataAction(pageName: string, id: number, pageInfo) {
      const editData = await editPageData(pageName, id, pageInfo)
      this.postPageListAction(pageName, { size: 10, offset: 0 }) //重新获取添加后的用户列表数据
    },
  },
})
export default useSystemStore
