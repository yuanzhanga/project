import { h, ref } from "../../lib/mini-vue.js";
export default {
  name: "Child",
  setup(props, { emit }) {},
  render(proxy) {
    console.log(proxy)
    return h("div", {}, [h("div", {}, "child" + this)]);
  },
};
