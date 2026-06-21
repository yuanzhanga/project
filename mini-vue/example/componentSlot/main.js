import { App } from "./App.js"
import { createApp } from "../../lib/mini-vue.js"
let rootContainer = document.querySelector('#app')
createApp(App).mount(rootContainer)