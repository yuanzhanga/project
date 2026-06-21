import vnode from "./vnode.js";
export default function (sel, data, c) {
  if (arguments.length !== 3) {
    throw new Error("参数数量不对");
  }
  if (typeof c === "string" || typeof c === "number") {//原始类型
    return vnode(sel, data, undefined, c, undefined);
  } else if (Array.isArray(c)) {//h函数数组
    let children = [];
    for (const item of c) {
      if (!(typeof item === "object" && item.hasOwnProperty("sel"))) {
        throw new Error("传入的数组里有不是h函数的");
      }
      children.push(item);
    }
    return vnode(sel, data, children, undefined, undefined);
  } else if (typeof c === "object" && c.hasOwnProperty("sel")) {//单个h函数
    return vnode(sel, data, c, undefined, undefined);
  } else {
    console.log("参数不对");
  }
}
