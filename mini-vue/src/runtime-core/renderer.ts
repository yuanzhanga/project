import { effect } from "../reactivity/effect";
import { EMPTY_OBJ, isObject } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { shouldUpdateComponent } from "./componentUpdateUtils";
import { createAppAPI } from "./createApp";
import { queueJob } from "./scheduler";
import { Fragment, Text } from "./vnode";

export function createRender(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options; //解构options
  function render(vnode, container) {
    //调用patch
    patch(null, vnode, container, null, null);
  }
  //n1老的，n2新的，没有n1则是初次渲染
  function patch(n1, n2, container, parentComponent, anchor) {
    //判断vode是不是element
    // if (typeof vnode.type === "string") {
    //   processElement(vnode, container);
    // } else if (isObject(vnode.type)) {
    //   processComponent(vnode, container);
    // }
    const { type, shapeFlag } = n2;
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        //利用位运算符提高性能
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent, anchor);
        }
    }
  }
  //*fragment片段
  function processFragment(n1, n2, container: any, parentComponent, anchor) {
    mountChildren(n2.children, container, parentComponent, anchor); //只渲染孩子元素
  }
  //*text文本元素
  function processText(n1, n2, container: any) {
    const { children } = n2; //纯文本内容
    const textNode = (n2.el = document.createTextNode(children)); //把el真实DOM存到vnode对象上
    container.append(textNode); //挂载
  }
  //*element普通元素
  function processElement(n1, n2, container: any, parentComponent, anchor) {
    if (!n1) {
      //如果没有n1则是初次渲染
      mountElement(n2, container, parentComponent, anchor);
    } else {
      //更新
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }
  //元素初次渲染
  function mountElement(vnode, container: any, parentComponent, anchor) {
    const { type, props, children, shapeFlag } = vnode;
    //处理type
    const el = (vnode.el = hostCreateElement(type)); //把el真实DOM存到vnode对象上
    //处理props和事件
    for (const key in props) {
      const val = props[key];
      hostPatchProp(el, key, null, val); //调用patchProp处理属性和事件
    }
    //处理children 判断是string还是array
    // if (typeof children === "string") {
    //   el.textContent = children;
    // } else if (Array.isArray(children)) {
    //   mountChildren(children, el);
    // }
    //位运算
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent, anchor);
    }
    //挂载
    hostInsert(el, container, anchor); //把el挂载到container上
  }
  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach((child) => {
      //再次判断孩子是普通元素还是组件
      patch(null, child, container, parentComponent, anchor); //递归调用patch
    });
  }
  //元素更新
  function patchElement(n1, n2, container, parentComponent, anchor) {
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    const el = (n2.el = n1.el);
    //更新children
    patchChildren(n1, n2, el, parentComponent, anchor);
    //更新props
    patchProps(el, oldProps, newProps);
  }
  //更新props
  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const preProp = oldProps[key];
        const nextProp = newProps[key];
        if (preProp !== nextProp) {
          //新旧Props不一样直接挂载新的nextProp
          hostPatchProp(el, key, preProp, nextProp);
        }
      }
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          //新的属性里不存在这个key，直接删掉
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }
  //更新children
  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const preShapeFlag = n1.shapeFlag; //老节点的类型
    const c1 = n1.children; //老节点
    const shapeFlag = n2.shapeFlag; //新节点的类型
    const c2 = n2.children; //新节点
    //*新节点是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      //*老节点是数组
      if (preShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        //把老的清空再执行设置新的text
        unmountChildren(c1);
      }
      //*老节点是文本,直接比较是否相等
      if (c1 !== c2) {
        // 设置新的text
        hostSetElementText(container, c2);
      }
    }
    //*新节点是数组
    else {
      //new array
      //*老节点是文本
      if (preShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        //把老的清空再执行设置新的text
        hostSetElementText(container, ""); //把老的文本清空
        mountChildren(c2, container, parentComponent, anchor);
      }
      //*老节点是数组,diff算法
      else {
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }
  //清空老的数组节点
  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      //remove
      hostRemove(el);
    }
  }
  //数组 diff 数组
  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1;
    let e2 = l2 - 1;
    const isSameVNodeType = (n1, n2) => {
      return n1.type === n2.type && n1.key === n2.key;
    };
    //1.左侧对比
    while (i <= e1 && i <= e2) {
      const prevChild = c1[i];
      const nextChild = c2[i];
      if (isSameVNodeType(prevChild, nextChild)) {
        patch(prevChild, nextChild, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      i++;
    }
    //2.右侧对比
    while (i <= e1 && i <= e2) {
      const prevChild = c1[e1];
      const nextChild = c2[e2];
      if (isSameVNodeType(prevChild, nextChild)) {
        patch(prevChild, nextChild, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    //3. 新的比老的长,创建新的
    if (i > e1 && i <= e2) {
      // 如果是这种情况的话就说明 e2 也就是新节点的数量大于旧节点的数量
      // 也就是说新增了 vnode
      // 应该循环 c2
      // 锚点的计算：新的节点有可能需要添加到尾部，也可能添加到头部，所以需要指定添加的问题
      // 要添加的位置是当前的位置(e2 开始)+1
      // 因为对于往左侧添加的话，应该获取到 c2 的第一个元素
      // 所以我们需要从 e2 + 1 取到锚点的位置
      const nextPos = e2 + 1;
      const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
      while (i <= e2) {
        patch(null, c2[i], container, parentComponent, anchor);
        i++;
      }
    }
    //4. 新的比老的短,删除旧的
    else if (i > e2 && i <= e1) {
      // 这种情况的话说明新节点的数量是小于旧节点的数量的
      // 那么我们就需要把多余的删除
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    }
    //*5.中间乱序的部分,[i,e1],[i,e2]
    else {
      // 左右两边都比对完了，然后剩下的就是中间部位顺序变动的
      // a,b,[c,d,e],f,g  |  a,b,[e,c,d],f,g
      let s1 = i; //旧数组中间部分的起始索引
      let s2 = i; //新数组中间部分的起始索引
      const keyToNewIndexMap = new Map(); //[key,保存元素的新索引]，先把 key 和 newIndex 绑定好，方便后续基于 key 找到 newIndex
      const toBePatched = e2 - s2 + 1; //需要处理新节点的数量
      let patched = 0; //已经处理的节点数量，大于toBePatched的直接删除（优化）
      let moved = false; //是否需要移动
      let maxNewIndexSoFar = 0; //新元素是否大于历史最大元素，如果大于则改变move的值
      // 创建数组的时候给定数组的长度，这个是性能最快的写法
      const newIndexToOldIndexMap = new Array(toBePatched); // 初始化 从新的index（从零开始）映射为老的index
      // 都初始化为 0 , 后面处理的时候 如果发现是 0 的话，那么就说明新值在老的里面不存在
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;

      // 时间复杂度是 O(1)
      //遍历新数组去记录新索引
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      // 遍历老数组
      // 1. 需要找出老节点有，而新节点没有的 -> 需要把这个节点删除掉
      // 2. 新老节点都有的，—> 需要 patch
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        //!优化点 如果老的节点大于新节点的数量的话，那么这里在处理老节点的时候就直接删除即可
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }
        let newIndex;
        if (prevChild.key != null) {
          // 这里就可以通过key快速的查找了，看看在新的里面这个节点存在不存在
          // 时间复杂度O(1)
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          // 如果没key 的话，那么只能是遍历所有的新节点来确定当前节点存在不存在了
          // 时间复杂度O(n)
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }
        //判断这个节点在不在新数组里
        if (newIndex === undefined) {
          // 当前节点的key 不存在于 newChildren 中，需要把当前节点给删除掉
          hostRemove(prevChild.el);
        } else {
          //判断是否移动
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          newIndexToOldIndexMap[newIndex - s2] = i + 1; //避免如果i=0,会认为映射不存在
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }

      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []; //最长递增子序列
      let j = increasingNewIndexSequence.length - 1; //循环最长递增子序列
      //循环新数组
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 确定当前要处理的节点索引
        //从后往前
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        // 锚点等于当前节点索引+1
        // 也就是当前节点的后面一个节点(又因为是倒遍历，所以锚点是位置确定的节点)
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor; //锚点
        if (newIndexToOldIndexMap[i] === 0) {
          // 说明新节点在老的里面不存在
          // 需要创建
          patch(null, nextChild, container, parentComponent, anchor);
        } else if (moved) {
          // 需要移动
          // 1. j 已经没有了 说明剩下的都需要移动了
          // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            // 移动的话使用 insert 即可
            hostInsert(nextChild.el, container, anchor);
          } else {
            // 这里就是命中了  index 和 最长递增子序列的值
            // 所以可以移动指针了
            j--;
          }
        }
      }
    }
  }
  //component定义组件（有App(setup(),render())）
  function processComponent(n1, n2, container: any, parentComponent, anchor) {
    if (!n1) {
      mountComponent(n2, container, parentComponent, anchor);
    } else {
      updateComponent(n1, n2);
    }
  }
  function mountComponent(
    initialVNode: any,
    container: any,
    parentComponent,
    anchor
  ) {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));
    setupComponent(instance); //给instance加属性
    setupRenderEffect(instance, initialVNode, container, anchor);
  }
  function updateComponent(n1, n2) {
    const instance = (n2.component = n1.component); //更新组件实例
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2; //下次更新的vnode
      instance.update(); //更新组件
    } else {
      n2.el = n1.el; //如果不需要更新则直接把el真实DOM存到vnode对象上
      instance.vnode = n2; //更新vnode
    }
  }
  function setupRenderEffect(
    instance: any,
    initialVNode: any,
    container: any,
    anchor
  ) {
    //用于更新vnode，依赖收集触发依赖，把函数赋值给instance.update
    instance.update = effect(
      () => {
        if (!instance.isMounted) {
          //初始化
          const subTree = (instance.subTree = instance.render.call(
            instance.proxy
          )); // 调用render方法，拿到返回的vnode,call解决this问题
          patch(null, subTree, container, instance, anchor);
          initialVNode.el = subTree.el; //把el真实DOM存到vnode对象上
          instance.isMounted = true; //标记组件已经挂载
        } else {
          //更新
          //需要一个vnode
          const { next, vnode } = instance; //获取下次更新的vnode和上一次的vnode
          if (next) {
            next.el = vnode.el; //把el真实DOM存到vnode对象上
            updateComponentPreRender(instance, next); //更新组件的vnode
          }
          const subTree = instance.render.call(instance.proxy);
          const preSubTree = instance.subTree; //获取上一次的vnode
          instance.subTree = subTree; //更新subTree
          patch(preSubTree, subTree, container, instance, anchor);
          initialVNode.el = subTree.el; //把el真实DOM存到vnode对象上
        }
      },
      {
        scheduler: () => {
          console.log('scheduler');
          // 把 effect 推到微任务的时候在执行
          //!因为如果同步更新视图会更新很多次，可以把更新保留到最后统一执行
          // queueJob(effect);
          queueJob(instance.update);
        },
      }
    );
  }
  //更新组件的vnode
  function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode; //更新vnode
    instance.next = null; //清空下次更新的vnode
    instance.props = nextVNode.props; //更新props
  }
  return {
    createApp: createAppAPI(render), //暴露createApp方法
  };
}

//最长递增子序列，生成子序列的索引
function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}

//扩展末尾最长连续递增子序列
// function move(n) {
//   let cnt = 1;
//   let v = n[n.length - 1];
//   for (let i = n.length - 2; i >= 0; i--) {
//     if (n[i] < v) {
//       console.log(n[i], v);
//       cnt++;
//       v = n[i];
//     } else {
//       break
//     }
//   }
//   console.log(n.length - cnt);
// }
// move([1,4,6, 2, 3,5]);
