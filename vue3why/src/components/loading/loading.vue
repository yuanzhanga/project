<template>
  <div class="load" @click="quit()">Loading...</div>
</template>

<script setup name=''>
import useMainstore from "@/stores/modules/main";
const mainStore = useMainstore(); //load
const quit = () => {
  mainStore.isLoad = false;
};
</script>

<style scoped>
.load {
  background: rgba(123, 123, 123, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  z-index: 9;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
</style>