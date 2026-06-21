<template>
  <div class="count-card">
    <div class="header">
      <div class="title">{{ props.title }}</div>
      <div class="icon">
        <el-tooltip :content="props.tips" placement="top" effect="light">
          <el-icon><Warning /> </el-icon>
        </el-tooltip>
      </div>
    </div>
    <div class="count" ref="countRef1">{{ props.number1 }}</div>
    <div class="total">
      <span>{{ props.subtitle }}</span>
      <span ref="countRef2">{{ props.number2 }}</span>
    </div>
  </div>
</template>

<script setup name="" lang="ts">
import { ref, onMounted } from 'vue'
import { CountUp } from 'countup.js'
interface IProps {
  title?: string
  tips?: string
  amount: string
  number1?: number
  number2?: number
  subtitle?: string
}
const props = withDefaults(defineProps<IProps>(), {
  title: '商品',
  tips: '111',
  amount: '',
  number1: 52222,
  number2: 111,
  subtitle: '总销量',
})
//为卡片数字加动画
const countRef1 = ref(null)
const countRef2 = ref(null)
const countOption = {
  //数字配置前面有符号
  prefix: props.amount === 'saleroom' ? '￥' : '',
}
onMounted(() => {
  const countup1 = new CountUp(countRef1.value!, props.number1, countOption)
  const countup2 = new CountUp(countRef2.value!, props.number1, countOption)
  countup1.start()
  countup2.start()
})
</script>

<style scoped lang="less">
.count-card {
  display: flex;
  flex-direction: column;
  height: 80px;
  background-color: #fff;
  .header {
    display: flex;
    justify-content: space-between;
    .title {
      color: #666;
      font-size: 11px;
      margin: 8px;
    }
    .icon {
      font-size: 11px;
      margin: 8px;
    }
  }
  .count {
    flex: 1;
    margin: 0 8px;
    font-size: 20px;
  }
  .total {
    font-size: 11px;
    margin: 8px;
  }
}
</style>
