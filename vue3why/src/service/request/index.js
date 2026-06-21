import { baseURL, timeout } from '@/service/request/config'
import axios from 'axios'
import useMainstore from "@/stores/modules/main";

//const mainStore = useMainstore(); 放这里页面显示不出来，因为Vue 应用还没有初始化完毕，要放到拦截器里先让初始化再操作

const httpRequest = axios.create({
    baseURL: baseURL,
    timeout: timeout,
})

// 请求拦截器
httpRequest.interceptors.request.use(
    config => {
        const mainStore = useMainstore(); // load
        mainStore.isLoad = true; // 开始请求时设置加载状态为 false
        return config;
    },
    error => {
        return Promise.reject(error);
    }
)

//响应拦截器
httpRequest.interceptors.response.use(
    response => {
        const mainStore = useMainstore(); // load
        mainStore.isLoad = false; // 请求完成时设置加载状态为 true
        return response;
    },
    error => {
        // 处理响应错误
        if (error.response) {
            switch (error.response.status) {
                case 404:
                    console.log('请求的资源未找到');
                    break;
                case 500:
                    console.log('服务器发生了内部错误');
                    break;
                default:
                    console.log(`请求错误, 状态码：${error.response.status}`);
            }
        } else {
            // 请求超时或者断网的情况
            console.log('请求超时或者断网');
        }
        return Promise.reject(error);
    }
);

export default httpRequest;
