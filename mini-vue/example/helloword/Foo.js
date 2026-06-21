import { h } from "../../lib/mini-vue.js";

export const Foo = {
  render() {
    // console.log(this); //instance.proxy
    return h("div", {}, "foo" + this.count);
  },
  setup(props) {
    // console.log(props); //instance.props
    return {
      count: props.count,//返回count，就存到setupState里，this通过proxy可以访问到
    };
  },
};
