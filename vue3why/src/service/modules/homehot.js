import httpRequest from '../request/index'
export default function (n) {
    return httpRequest({
        url: '/home/houselist',
        params: {//传入参数
            page: n
        }
    })
}