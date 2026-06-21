import { defineStore } from "pinia";
import dayjs from "dayjs";
const useMainstore = defineStore('main', {
    state: () => ({
        token: '',
        start: dayjs(), // 使用 dayjs 对象
        end: dayjs().add(1, 'day'), // 使用 dayjs 对象
        isLoad: false,
    }),
    getters: {
        startdate: (state) => state.start.format("M月DD日"), // 格式化日期
        enddate: (state) => state.end.format("M月DD日"), // 格式化日期
        gap: (state) => dayjs(state.end).diff(dayjs(state.start), 'day') // 计算日期间隔
    },
    actions: {
        updateEndDate() {
            this.end = this.end.add(1, 'day');
        },
        setLoading(status) {
            this.isLoad = status;
        }
    }
});

export default useMainstore;



