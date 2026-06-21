import { h, ref } from "../../lib/mini-vue.js";
import { Foo } from "./Foo.js";
export const App = {
  name: "App",
  //ui逻辑
  render() {
    return h("div", {}, [
      h("p", {}, "count" + this.count),
      h("button", { onClick: this.onClick }, "click"),
    ]);
  },
  setup() {
    let count = ref(0);
    let onClick = () => {
      count.value++;
    };
    return {
      onClick,
      count,
    };
  },
};
