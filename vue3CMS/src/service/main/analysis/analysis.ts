import hyRequest from '@/service'

//*获取顶部四个卡片里的数据
export function getAmountListData() {
  return hyRequest.get({
    url: '/goods/amount/list',
  })
}

//*获取商品数量
export function getGoodsCategoryCount() {
  return hyRequest.get({
    url: '/goods/category/count',
  })
}

//*获取商品销量
export function getGoodsCategorySale() {
  return hyRequest.get({
    url: '/goods/category/sale',
  })
}

//*商品被收藏次数
export function getGoodsCategoryFavor() {
  return hyRequest.get({
    url: '/goods/category/favor',
  })
}

//*不同地区的销量
export function getGoodsAddressSale() {
  return hyRequest.get({
    url: '/goods/address/sale',
  })
}
