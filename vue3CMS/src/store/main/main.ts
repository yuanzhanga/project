import { defineStore } from 'pinia'
import { getEntireRoles, getEntireDepartments, getEntireMenus } from '@/service/main/main.ts'
const useMainStore = defineStore('main', {
  state: () => ({
    entireRoles: [],
    entireDepartments: [],
    entireMenus: [],
  }),
  actions: {
    //*获取全局用户，部门,菜单信息
    async fetchEntireDataAction() {
      const roleResult = await getEntireRoles()
      const departmentResult = await getEntireDepartments()
      const menuResult= await getEntireMenus()
      this.entireRoles = roleResult.data.list
      this.entireDepartments = departmentResult.data.list
      this.entireMenus = menuResult.data.list
    },
  },
})
export default useMainStore
