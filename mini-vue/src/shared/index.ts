//通用型工具函数
export * from "./toDisplayString";
export const extend = Object.assign;

export const EMPTY_OBJ = {}; //解决空对象!==的问题
export const isObject = (val) => {
  return val !== null && typeof val === "object";
};

export const isString = (val) => typeof val === "string";

export function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}

export const hasOwn = (val, key) =>
  Object.prototype.hasOwnProperty.call(val, key);

//正则匹配事件，修改大小写，驼峰命名 add-foo -> onAddFoo
export const camelize = (str: string): string => {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ""));
};
export const capitalize = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);
export const toHandlerKey = (str: string) =>
  str ? `on${capitalize(str)}` : ``;
