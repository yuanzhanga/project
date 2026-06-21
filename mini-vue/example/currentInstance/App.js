import { h,getCurrentInstance } from "../../lib/mini-vue.js";
import { Foo } from "./Foo.js";
export const App = {
  name: "App",
  render() {
    return h("div", {}, [h("p", {}, "hello"), h(Foo)]);
  },
  setup() {
    const instance = getCurrentInstance();
    console.log('app',instance)
    return {
      msg: "mini-vue",
    };
  },
};
