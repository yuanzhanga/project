import { extend, isObject } from "../shared/index";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly; // 如果是reactive对象，返回true
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly; // 如果是readonly对象，返回true
    }
    const res = Reflect.get(target, key);
    if (!isReadonly) {
      track(target, key);
    }
    //判断shallow
    if (shallow) {
      return res; // 如果是shallow，直接返回值，不进行嵌套处理
    }
    //判断嵌套
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}
function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value);
    // 先赋新值再触发依赖
    trigger(target, key);
    return res;
  };
}

//函数只初始化一次
const get = createGetter(); //reactive
const set = createSetter();
const getReadonly = createGetter(true);
const getShallowReadonly = createGetter(false, true);
export const mutableHandlers = {
  get: get,
  set: set,
};

export const readonlyHandlers = {
  get: getReadonly,
  set(target, key, value) {
    console.warn(`key ${key} set失败，因为 ${target} 是一个只读对象`);
    return true; // 只读对象，禁止修改
  },
};

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: getShallowReadonly,
});
