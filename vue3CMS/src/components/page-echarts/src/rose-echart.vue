<template>
  <div class="rose-echart">
    <baseEchart :option="roseOption" />
  </div>
</template>

<script setup name="" lang="ts">
import baseEchart from '..'
import type { EChartsOption } from 'echarts'
import type { IEchartValueType } from '../types'
import { computed } from 'vue'
interface IProps {
  roseData: IEchartValueType[]
}
const props = defineProps<IProps>()
const roseOption = computed<EChartsOption>(() => {
  return {
    // 手指放上去的时候显示的文本
    tooltip: {
      trigger: 'item',
    },
    // 图例:
    legend: {
      show:false,
      top: 'bottom',
    },
    toolbox: {
      show: true,
      feature: {
        mark: { show: true },
        dataView: { show: true, readOnly: false },
        restore: { show: true },
        saveAsImage: { show: true },
      },
    },
    series: [
      {
        name: '111 Chart',
        type: 'pie',
        radius: [30, 140],
        center: ['50%', '50%'],
        roseType: 'area',
        itemStyle: {
          borderRadius: 8,
        },
        data: props.roseData,
      },
    ],
  }
})
</script>

<style scoped>
</style>
