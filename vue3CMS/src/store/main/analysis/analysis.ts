import {
  getAmountListData,
  getGoodsAddressSale,
  getGoodsCategoryCount,
  getGoodsCategoryFavor,
  getGoodsCategorySale,
} from '@/service/main/analysis/analysis'
import { defineStore } from 'pinia'
const useAnalysisStore = defineStore('analysis', {
  state: () => ({
    // 定义状态
    amountList: [],
    goodsCategoryCount: [],//数量
    goodsCategorySale: [],//销量
    goodsCategoryFavor: [],//收藏次数
    goodsAddressSale: [],//不同地区的销量
  }),
  actions: {
    //获取卡片数据,商品数量，商品销售
    async fetchAnalysisDtaAction() {
      const amountResult = await getAmountListData()
      this.amountList = amountResult.data
      const goodsCategoryCount = await getGoodsCategoryCount()
      this.goodsCategoryCount = goodsCategoryCount.data
      const goodsCategorySale = await getGoodsCategorySale()
      this.goodsCategorySale = goodsCategorySale.data
      getGoodsCategoryFavor().then((res) => {
        this.goodsCategoryFavor = res.data
      })
      getGoodsAddressSale().then((res) => {
        this.goodsAddressSale = res.data
      })
    },
  },
})
export default useAnalysisStore
