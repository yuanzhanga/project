import { h } from "../../lib/mini-vue.js";
import { emitDemo } from "./emitDemo.js";
export const App = {
  name: "App",
  //ui逻辑
  render() {
    // return h('div',{
    //     id:'root',
    //     class:['red','hard'],
    //     onClick(){
    //         console.log(555)
    //     },
    // },"hi,"+this.msg);
    return h(
      "div",
      {
        id: "root",
        class: ["red", "hard"],
      },
      [
        h("p", {}, "hello"),
        h(emitDemo, {
          onAdd(a, b) {
            console.log("appAdd", a, b);
          },
          onAddFoo(a, b) {
            console.log("appAddFoo", a, b);
          },
        }),
      ]
    );
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};
