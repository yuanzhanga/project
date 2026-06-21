import { hasChanged, isObject } from "../shared";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImpl {
  private _value; //存储值
  private _rawValue; //保存原始值，用于比较
  public dep; //依赖收集
  public _v_isRef = true; //标记为ref对象
  constructor(value) {
    this._rawValue = value; //保存原始值
    this._value = convert(value);
    this.dep = new Set(); //依赖收集
  }
  get value() {
    if (isTracking()) {
      trackEffects(this.dep); //收集依赖,只收集一个
    }
    return this._value; //返回值
  }
  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue; //设置新值
      this._value = convert(newValue);
      triggerEffects(this.dep); //触发依赖
    }
  }
}

function convert(value) {
  //转换
  //如果不是对象,则直接赋值,否则转换为reactive对象
  return isObject(value) ? reactive(value) : value;
}
export function isRef(ref) {
  return !!ref._v_isRef; //判断是否是ref对象
}
export function unRef(ref) {
  //如果是ref对象,则返回其value,否则直接返回值
  return isRef(ref) ? ref.value : ref;
}
//用与在render函数中使用ref对象时,自动解包
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unRef(Reflect.get(target, key)); //如果是ref对象,则返回其value,否则直接返回值
    },
    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        //如果是ref对象,则设置其value,否则直接设置值
        return (target[key].value = value);
      } else {
        return Reflect.set(target, key, value); //直接设置值
      }
    },
  });
}

export function ref(value) {
  return new RefImpl(value);
}
