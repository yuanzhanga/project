import { isObject } from "../shared/index";
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers"; //处理reactive的get,set函数

export const enum ReactiveFlags { //枚举类型，表示对象的状态
  IS_REACTIVE = "isReactive",
  IS_READONLY = "isReadonly",
}
function createActiveObject(raw: any, baseHandlers) {
  if(!isObject(raw)){
    console.warn(`target ${raw} 必须是一个对象`);
    return raw;
  }
  return new Proxy(raw, baseHandlers);
}
export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}
//只是最外层只读，深层不影响
export function shallowReadonly(raw) {
  return createActiveObject(raw, shallowReadonlyHandlers);
}

export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE]; //如果是reactive对象，返回true
}
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]; //如果是readonly对象，返回true
}
export function isProxy(value) {
  return isReactive(value) || isReadonly(value); //如果是reactive或readonly对象，返回true
}