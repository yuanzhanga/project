import { localCache } from '@/utils/cache'
import { loginToken } from '@/global/index'
import { BASE_URL, TIME_OUT } from './config'
import HYRequest from './request'

const hyRequest = new HYRequest({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  interceptors: {
    requestSuccessFn: (config) => {
      //把授权token放入header
      const token = localCache.getCache(loginToken)
      if (config.headers && token) {
        config.headers.Authorization = token
      }
      return config
    },
  },
})

export default hyRequest
