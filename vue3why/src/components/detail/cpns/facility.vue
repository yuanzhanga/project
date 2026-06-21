<template>
<div class="facility">
    <div class="head">{{title}}</div>
    <slot><div class="body"></div></slot>
    <div class="foot" v-if="more">{{more}}&nbsp;<span style="color:#000">></span></div>
</div>
</template>

<script setup name=''>
const {title} =defineProps({
    title: {
    default: () => ''
    },
    more: {
    default: () => ''
    }
})
</script>

<style scoped>
.facility {
    background-color: #f4f6f8;
    width: 90%;
    height: auto;
    margin: 15px auto;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}
.head {
    font-size: 20px;
    margin: 10px 0 0 15px;
    font-weight: bold;
}
.body {
    flex: 2;
    background-color: #ca4545;
    margin: 10px;
}
.foot {
    display: flex;
    justify-content: flex-end;
    color: #f1b079;
    font-size: 15px;
}
</style>