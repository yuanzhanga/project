import { ShapeFlags } from "../shared/shapeFlags";

export function initSlots(instance, children) {
  //slots
  const { vnode } = instance; //vnode是组件的虚拟节点
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalObjectSlots(children, instance.slots); //把children的内容放到instance.slots中
  }
}
function normalObjectSlots(children: any, slots: any) {
  for (const key in children) {
    // console.log(key)//key是具名插槽的名字
    const value = children[key]; //插槽实例函数（(age) => h("p", {}, "123"+age)）返回虚拟节点
    slots[key] = (props) => normalizeSlotValue(value(props)); //{key: function}
  }
}
function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value];
}
