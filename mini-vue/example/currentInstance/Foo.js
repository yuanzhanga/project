import { h, getCurrentInstance } from "../../lib/mini-vue.js";

export const Foo = {
  render() {
    return h("div", {}, "foo");
  },
  setup(props) {
    const instance = getCurrentInstance();
    console.log("foo", instance);
    return {
      count: props.count, //返回count，就存到setupState里，this通过proxy可以访问到
    };
  },
};
