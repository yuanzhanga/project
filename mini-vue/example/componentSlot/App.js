import { h, createTextVNode } from "../../lib/mini-vue.js";
import { Foo } from "./Foo.js";
export const App = {
  name: "App",
  //ui逻辑
  render() {
    let app = h("div", {}, "app");
    let foo = h(
      Foo,
      {},
      {
        hander: (age) => [h("p", {}, "123" + age), createTextVNode("aaa")],
        foot: (a) => h("p", {}, "234" + a),
      }
    );
    return h("div", {}, [app, foo]);
  },
  setup() {
    return {
      msg: "mini-vue",
    };
  },
};
