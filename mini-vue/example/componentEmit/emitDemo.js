import { h } from "../../lib/mini-vue.js";

export const emitDemo = {
  render() {
    let btn = h(
      "button",
      {
        onClick: this.emitAddFoo,
      },
      "点击"
    );
    let foo = h("p", {}, "foo");
    return h("div", {}, [btn, foo]);
  },
  setup(props, { emit }) {
    let emitAdd = () => {
      console.log("emitadd");
      emit("add", 1, 2);
    };
    let emitAddFoo = () => {
      console.log("emitaddfoo");
      emit("add-foo", 3, 4);
    };
    return {
      emitAdd,
      emitAddFoo,
    };
  },
};
