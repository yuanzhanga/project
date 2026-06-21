import { defineStore } from "pinia";
import hotRequest from "@/service/modules/homehot";

const useHotStore = defineStore('hot', {
    state: () => {
        return {
            hotlist: [],
            n: 1
        }

    },
    actions: {
        async fetchHot() {
            const response = await hotRequest(this.n++) //获取每一页的数据
            this.hotlist.push(...response.data.data)
        }


    }
})
export default useHotStore