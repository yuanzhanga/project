// 组件 provide 和 inject 功能
import { h, provide, inject } from "../../lib/mini-vue.js";

const ProviderOne = {
  name: "ProviderOne",
  setup() {
    provide("foo", "foo");
    provide("bar", "bar");
    // return () => h(Consumer);
  },
  render() {
    return h("div", {}, [h("p", {}, "ProviderOne"), h(ProviderTwo)]);
  }
};

const ProviderTwo = {
  setup() {
    // override parent value
    provide("foo", "fooOverride");
    provide("baz", "baz");
    const foo = inject("foo");
    // 这里获取的 foo 的值应该是 "foo"
    // 这个组件的子组件获取的 foo ，才应该是 fooOverride
    // if (foo !== "foo") {
    //   throw new Error("Foo should equal to foo");
    // }
    // return () => h(Consumer);
    return {
      foo,
    };
  },
  render() {
    return h("div", {}, [h("p", {}, `ProviderTwo,${this.foo}`), h(Consumer)]);
  }
};

const Consumer = {
  name: "Consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const baz = inject("baz",'defaultBaz'); // 设置默认值
    // return () => {
    //   return h("div", {}, `${foo}-${bar}-${baz}`);
    // };
    return {
      foo,
      bar,
      baz,
    };
  },
  render() {
    console.log(this.foo, this.bar, this.baz);
    return h("div", {}, `Consumer: ${this.foo} - ${this.bar} - ${this.baz}`);
  },
};

export default {
  name: "App",
  setup() {
    return () => h("div", {}, [h("p", {}, "apiInject"), h(ProviderOne)]);
  },
  render() {
    return h("div", {}, [h("p", {}, "apiInject"), h(ProviderOne)]);
  }
};
