import { onMounted, onUnmounted, ref } from "vue";
import { throttle } from "underscore";

export default function (elRef) {
  let isScroll = ref(false); // 是否到底部
  let clientHeight = ref(0); // 可视区域高度
  let scrollTop = ref(0); // 滚动条距离顶部的高度
  let scrollHeight = ref(0); // 滚动内容的总高度
  let el = window; // 默认监听 window 滚动事件

  // 节流函数，减少滚动事件触发频率
  const listenScroll = throttle(() => {
    if (el === window) {
      clientHeight.value = document.documentElement.clientHeight;
      scrollTop.value = document.documentElement.scrollTop;
      scrollHeight.value = document.documentElement.scrollHeight;
    } else {
      clientHeight.value = el.clientHeight;
      scrollTop.value = el.scrollTop;
      scrollHeight.value = el.scrollHeight;
    }
    // 判断是否滚动到底部
    if (clientHeight.value + scrollTop.value >= scrollHeight.value - 1) {
      isScroll.value = true; // 滚动到底部
    }
  }, 100);

  // 监听滚动事件
  onMounted(() => {
    if (elRef) {
      el = elRef.value; // 如果传入了元素，则监听该元素的滚动
    }
    el.addEventListener("scroll", listenScroll);
  });

  // 移除滚动事件
  onUnmounted(() => {
    el.removeEventListener("scroll", listenScroll);
  });

  return {
    isScroll,
    clientHeight,
    scrollTop,
    scrollHeight,
  };
}
