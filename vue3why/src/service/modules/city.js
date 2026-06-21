import httpRequest from '../request/index'
export default function() {
    return httpRequest({
        url: '/city/all',
    })
}