// import {
//     ref,
//     effect,
// } from './node_modules/@vue/reactivity/dist/reactivity.esm-browser.js'
// let a = ref(10)
// effect(()=>{
//     console.log(214)
// })
// effect(()=>{
//     console.log(214)
// })
// let b = ref(1)
// b.value = 5
// console.log(b.value)
import { App } from "./App.js";
import { createApp } from "./core/index.js";
createApp(App).mount(document.querySelector("#app"));
