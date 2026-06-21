import { defineStore } from "pinia";
import searchRequest from '@/service/modules/search'

const useSearchStore = defineStore('search', {
    state: () => {
        return {
            citylist:{},
        }

    },
    actions: {
        async fetchSearch() {
            const response = await searchRequest() //获取城市信息
            this.citylist = response.data
        }

    }
})
export default useSearchStore