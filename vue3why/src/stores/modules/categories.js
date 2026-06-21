import { defineStore } from "pinia";
import categoriesRequest from '@/service/modules/categories'

const useCategoriesStore = defineStore('categories', {
    state: () => {
        return {
            categories: []
        }

    },
    actions: {
        async  fetchCategories() {
            const response = await categoriesRequest() //获取图标信息
            this.categories = response.data.data
        }

    }
})
export default useCategoriesStore