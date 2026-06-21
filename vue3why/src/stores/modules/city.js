import { defineStore } from "pinia";
import cityRequest from "@/service/modules/city";

const useCityStore = defineStore('city', {
    state: () => {
        return {
            allcities: { a: 111 },
            currentcity: {}
        }

    },
    actions: {
        async fetchCity() {
            const response = await cityRequest() //获取城市信息
            this.allcities = response.data.data
        }

    }
})
export default useCityStore