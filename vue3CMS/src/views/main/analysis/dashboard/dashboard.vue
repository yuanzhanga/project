<template>
  <div class="dashboard">
    <el-row :gutter="10">
      <template v-for="item in amountList">
        <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="6"><countCard v-bind="item" /></el-col>
      </template>
    </el-row>
    <!-- 中间部分的图表 -->
    <el-row :gutter="10">
      <el-col :span="7">
        <chart-card>
          <!-- 商品数量 -->
          <pieEchart :pie-data="showGoodsCategoryCount" />
        </chart-card>
      </el-col>
      <el-col :span="10">
        <chart-card>
          <mapEchart :map-data="showGoodsAddressSale" />
        </chart-card>
      </el-col>
      <el-col :span="7">
        <chart-card>
          <!-- 商品销售额 -->
          <roseEchart :rose-data="showGoodsCategorySale" />
        </chart-card>
      </el-col>
    </el-row>
    <!-- 底部部分的图表 -->
    <el-row :gutter="10">
      <el-col :span="12">
        <chart-card>
          <!-- 销售额折线图 -->
          <lineEchart v-bind="centerShowGoodsCategorySale" />
        </chart-card>
      </el-col>
      <el-col :span="12">
        <chart-card>
          <!-- 商品被收藏次数 -->
          <barEchart v-bind="showGoodsCategoryFavor" />
        </chart-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="" lang="ts">
import countCard from './c-cpns/count-card/count-card.vue'
import chartCard from './c-cpns/chart-card/chart-card.vue'
// import BaseChart from '@/components/page-echarts'
import { pieEchart, lineEchart, roseEchart, barEchart, mapEchart } from '@/components/page-echarts'
import useAnalysisStore from '@/store/main/analysis/analysis'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
// 1.发起数据的请求
const analysisStore = useAnalysisStore()
analysisStore.fetchAnalysisDtaAction()
// 2.从store获取数据
const { amountList, goodsCategoryCount, goodsCategorySale, goodsCategoryFavor, goodsAddressSale } =
  storeToRefs(analysisStore)
// 3.获取数据
const showGoodsCategoryCount = computed(() => {
  return goodsCategoryCount.value.map((item) => ({
    name: item.name,
    value: item.goodsCount,
  }))
})
//*这俩数据一样，不过表要返回的数据形式不一样
const centerShowGoodsCategorySale = computed(() => {
  const labels = goodsCategorySale.value.map((item) => item.name)
  const values = goodsCategorySale.value.map((item) => item.goodsCount)
  return { labels, values }
})
const showGoodsCategorySale = computed(() => {
  return goodsCategorySale.value.map((item) => ({
    name: item.name,
    value: item.goodsCount,
  }))
})
const showGoodsCategoryFavor = computed(() => {
  const labels = goodsCategoryFavor.value.map((item) => item.name)
  const values = goodsCategoryFavor.value.map((item) => item.goodsFavor)
  return { labels, values }
})
const showGoodsAddressSale = computed(() => {
  return goodsAddressSale.value.map((item) => ({
    name: item.address,
    value: item.count,
  }))
})
</script>

<style scoped lang="less">
.dashboard {
  width: 100%;
  background-color: #eceef0;
  .el-row {
    margin-bottom: 10px;
  }
}
</style>
