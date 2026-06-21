import {
  isReactive,
  isReadonly,
  reactive,
  readonly,
  shallowReadonly,
} from "../reactive";
import { effect, stop } from "../effect";
import { isRef, ref } from "../ref";
import { computed } from "../computed";
describe("effect", () => {
  it("happy path", () => {
    let user = reactive({
      age: 10,
    });
    expect(isReactive(user)).toBe(true); //判断user是否是reactive对象
    let nextAge;
    let runner = effect(() => {
      nextAge = user.age;
    });
    expect(nextAge).toBe(10);
    stop(runner); //停止依赖收集
    user.age++; //修改值
    expect(nextAge).toBe(10);
  });
  it("should return runner when call effect", () => {
    //effect会返回一个runner函数,执行这个函数会再次执行effect里的fn函数
    let foo = 10;
    let runner = effect(() => {
      foo++;
      return "foo";
    });
    expect(foo).toBe(11);
    let res = runner(); //执行runner函数
    expect(foo).toBe(12);
    expect(res).toBe("foo");
  });
  it("readonly", () => {
    let user = readonly({
      age: 10,
    });
    expect(isReadonly(user)).toBe(true); //判断user是否是reactive对象
    // user.age = 20; //修改只读对象的值
    expect(user.age).toBe(10); //值不变
  });
  it("shallowReadonly", () => {
    let user = reactive({
      age: 10,
      info: {
        name: "John",
      },
    });
    expect(isReactive(user)).toBe(true); //判断user是否是reactive对象
    // expect(isReactive(user.info)).toBe(false); //info不是reactive对象
    user.age++; //修改值
    expect(user.age).toBe(11);
    user.info.name = "Doe"; //修改info的name属性
    expect(user.info.name).toBe("Doe"); //值变了
  });
});
describe("ref", () => {
  it("ref", () => {
    const a = ref(1);
    let dummy;
    let calls = 0;
    effect(() => {
      calls++;
      dummy = a.value;
    });
    expect(calls).toBe(1);
    expect(dummy).toBe(1);
    a.value = 2;
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
    // same value should not trigger
    a.value = 2;
    expect(calls).toBe(2);
    expect(dummy).toBe(2);
  });
  it.only("isRef", () => {
    const a = ref({
      q: ref(3),
    });
    const user = reactive({
      age: 1,
    });
    expect(isRef(a.value.q)).toBe(true);
    expect(isRef(1)).toBe(false);
    expect(isRef(user)).toBe(false);
  });
});
describe.only("computed", () => {
  it("computed", () => {
    const a = reactive({
      age: 1,
    });
    let b = computed(() => {
      return a.age + 1;
    });
    expect(b.value).toBe(2);
  });
  it.only("should compute lazily", () => {
    const value = reactive({
      foo: 1,
    });
    const getter = jest.fn(() => {
      return value.foo;
    });
    const cValue = computed(getter);

    // lazy
    expect(getter).not.toHaveBeenCalled();

    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute until needed
    value.foo = 2;
    expect(getter).toHaveBeenCalledTimes(1);

    // now it should compute
    expect(cValue.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
