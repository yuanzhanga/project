<template>
    <div>
      <div class="buttons">
        <button v-for="(section, index) in sections" :key="index" @click="scrollToSection(index)">
          Scroll to Section {{ index + 1 }}
        </button>
      </div>
  
      <div ref="scrollContainer" class="scroll-container">
        <div v-for="(section, index) in sections" :key="index" class="section">
          <h2>Section {{ index + 1 }}</h2>
          <p>{{ section }}</p>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  // 模拟内容
  const sections = [
    "This is content for section 1.",
    "This is content for section 2.",
    "This is content for section 3.",
    "This is content for section 4."
  ];
  
  const scrollContainer = ref(null); // 获取滚动容器的引用
  
  // 定义滚动到指定部分的函数
  function scrollToSection(index) {
    const sectionHeight = 300; // 每个 section 的高度，假设固定高度
    if (scrollContainer.value) {
      scrollContainer.value.scrollTo({
        top: index * sectionHeight, // 计算滚动的目标位置
        behavior: 'smooth' // 平滑滚动
      });
    }
  }
  </script>
  
  <style scoped>
  .scroll-container {
    height: 300px; /* 设置容器高度 */
    overflow-y: auto; /* 允许垂直滚动 */
    border: 1px solid #ccc;
  }
  
  .section {
    height: 100px; /* 每个 section 高度 */
    padding: 20px;
    background-color: #f9f9f9;
    border-bottom: 1px solid #ddd;
  }
  
  .buttons {
    margin-bottom: 20px;
  }
  </style>
  