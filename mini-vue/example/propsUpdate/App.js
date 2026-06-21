import { h, ref } from "../../lib/mini-vue.js";
import Child from "./Child.js";

export default {
  name: "App",
  setup() {
    const msg = ref("123");
    window.msg = msg;

    const changeChildProps = () => {
      msg.value = "456";
    };
    const changeProps = () => {
      // p.value.a++
      q.value++
      console.log(p.value)
    };
    let p = ref({
      a:1,
      b:2
    })
    let q = ref(5)
    return { msg, changeChildProps,changeProps,p ,q};
  },

  render() {
    console.log(this.q)
    return h("div", {q:this.q}, [
      h("div", {q:this.q}, "你好" + this.msg),
      h(
        "button",
        {
          onClick: this.changeProps,
        },
        "change props"
      ),
      // h(Child, {
      //   msg: this.msg,
      // }),
    ]);
  },
};
