<template>
<div class="home">
  {{ aaa }}
  {{q}}
  <button id='btn' @click=q++>click</button>
</div>
</template>

<script setup name=''>
import { ref} from 'vue'
defineProps(['aaa'])
let q = ref('1')
</script>

<style scoped>
.home{

}
</style>