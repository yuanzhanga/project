import { createRender } from "../runtime-core/index";
//提供操作dom的函数
//创建dom元素
function createElement(type) {
  return document.createElement(type);
}
//添加dom属性和事件
function patchProp(el, key, preVal, nextVal) {
  // console.log(el,key,preVal,nextVal)
  const isOn = (key: string) => /^on[A-Z]/.test(key); //onClick
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}
//挂载元素
function insert(child, parent, anchor) {
  parent.insertBefore(child, anchor || null); //把child挂载到anchor锚点元素之前
}

//删除元素
function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}
//设置新文本节点
function setElementText(el, text) {
  el.textContent = text;
}
const renderer: any = createRender({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText,
}); //返回一个对象

export function createApp(...arg) {
  return renderer.createApp(...arg);
}
export * from "../runtime-core/index";
