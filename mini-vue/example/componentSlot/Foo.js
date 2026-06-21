import { h, renderSlots } from "../../lib/mini-vue.js";
export const Foo = {
  render() {
    let foo = h("p", {}, `foo`);
    return h("div", {}, [
      renderSlots(this.$slots, "hander",333), //具名插槽
      foo,
      renderSlots(this.$slots, "foot",666),
    ]);
  },
  setup(props) {
    // console.log(props); //instance.props
    return {
      count: props.count, //返回count，就存到setupState里，this通过proxy可以访问到
    };
  },
};
