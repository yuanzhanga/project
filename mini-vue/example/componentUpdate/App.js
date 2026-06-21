// 在 render 中使用 proxy 调用 emit 函数
// 也可以直接使用 this
// 验证 proxy 的实现逻辑
import { getCurrentInstance, h, nextTick, ref } from "../../lib/mini-vue.js";
import Child from "./Child.js";

export default {
  name: "App",
  setup() {
    const msg = ref(123);
    let c = ref(0);
    window.msg = msg.value;
    let a = getCurrentInstance();
    const changeChildProps = () => {
      msg.value++;
    };
    const change = () => {
      for (let i = 0; i < 30; i++) {
        c.value = i;
      }
      console.log(a);

      nextTick(() => {
        console.log(a);
      });
    };
    return { msg, c, changeChildProps, change };
  },

  render() {
    return h("div", {}, [
      h("div", {}, "你好"),
      h(
        "button",
        {
          onClick: this.changeChildProps,
        },
        "change child props"
      ),
      h(Child, {
        msg: this.msg,
      }),
      h(
        "button",
        {
          onClick: this.change,
        },
        "change"
      ),
      h(Child, {
        msg: this.c,
      }),
    ]);
  },
};
