import httpRequest from '../request/index'
export default function (houseId) {
    return httpRequest({
        url: '/detail/infos',
        params: {
            houseId
        }
    })
}