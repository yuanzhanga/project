/// <reference types="vite/client" />

declare module '*.vue' {//声明vue文件是一个组件
    import { DefineComponent } from 'vue'
    const component: DefineComponent
    export default component
}
