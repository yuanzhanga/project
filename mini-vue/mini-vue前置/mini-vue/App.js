import { reactive, h } from "./core/index.js";
export const App = {
  render(ctx /*App.setup()*/) {
    // let element = document.createElement("div"); //要返回的节点
    /*给节点的操作*/
    // let text = document.createTextNode("nihao");
    // let text1 = document.createTextNode(ctx.c.age);
    // element.append(text);
    // element.append(text1);
    /*。。。。*/
    let btn = document.createElement("button");
    btn.textContent = "1111";
    document.querySelector("body").append(btn);
    btn.onclick = function () {
      ctx.c.p = [
        h("p", {}, "nihao"),

        ]
    };
    return h(ctx.c.tag, {},ctx.c.p);
  },
  setup() {
    //响应式数据reactive
    let c = reactive({
      age: 111,
      tag: "div",
      p: [
        h("p", {}, "nihao"),
         h("p", {}, '31'),
        ]
    });
    window.c = c;
    return {
      c,
    };
  },
};
