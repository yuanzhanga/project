import { ShapeFlags } from "../shared/shapeFlags";
export const Fragment = Symbol("Fragment"); //只插入插槽元素
export const Text = Symbol("Text"); //只插入文本元素

export {
  createVNode as createElementVNode, //为了和h函数区分开
};
export function createVNode(type, props?, children?) {
  const vnode = {
    type, //App对象
    props,
    children,
    component: null, //组件实例(如果是组件的话)
    el: null, // 真实的DOM根元素(是dom元素)，this.$el
    shapeFlag: getShapeFlag(type),
    key: props && props.key, // 用于优化的key
  };

  //判断孩子是组件还是普通元素
  if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN; //或运算符
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  //判断是不是插槽（组件+children是object）
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof children === "object") {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN; //如果是插槽，就加上这个标志位
    }
  }
  return vnode;
}

function getShapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}

export function createTextVNode(text: string) {
  return createVNode(Text, {}, text); //创建一个文本节点的vnode
}
