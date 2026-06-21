<template>
  <div class="base-chart">
    <div class="echart" ref="echartRef"></div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import ChanaJSON from '@/components/page-echarts/data/china.json'
echarts.registerMap('china', ChanaJSON as any)
interface IProps {
  option: EChartsOption // 图表的配置项
}
const { option } = defineProps<IProps>()
import { onMounted, ref, watchEffect } from 'vue'
const echartRef = ref<HTMLElement>()
onMounted(() => {
  // 1.初始化echarts实例
  const echartInstance = echarts.init(echartRef.value!, 'light', {
    renderer: 'canvas',
  })

  // 2.第一次进行setOption
  // watchEffect监听option变化, 重新执行
  watchEffect(() => echartInstance.setOption(option))

  // 3.监听window缩放
  window.addEventListener('resize', () => {
    echartInstance.resize()
  })
})
</script>

<style lang="less" scoped>
.base-chart {
  color: red;
  .echart {
    width: 100%;
    height: 300px;
  }
}
</style>
