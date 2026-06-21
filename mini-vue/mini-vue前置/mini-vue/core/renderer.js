//!将虚拟节点转化为真实DOM

//**自定义渲染器，可以封装不同浏览器的api
//根据标签创建元素
function createElement(tag) {
  return document.createElement(tag);
}
//添加标签属性
function patchProps(el, key, perValue, nextValue) {
  if (!nextValue) {
    el.removeAttribute(key, perValue);
  } else {
    el.setAttribute(key, nextValue);
  }
}
//把元素添加到父级
function insert(el, parent) {
  parent.append(el);
}
//删除节点元素
function remove(el, parent) {
  parent.removeChild(el);
}
//添加文本节点
function createTextNode(textContent) {
  return document.createTextNode(textContent);
}

//*虚拟节点转化，初始渲染
export function mountElement(vnode, container) {
  const { tag, props, children } = vnode;

  //tag
  const el = (vnode.el = createElement(tag)); //真实DOM

  //props
  for (const key in props) {
    let val = props[key]; //标签属性值
    patchProps(el, key, null, val);
  }

  //children
  //string || array
  if (typeof children === "string") {
    insert(createTextNode(children), el);
  } else if (Array.isArray(children)) {
    children.forEach((v) => {
      mountElement(v, el); //递归遍历
    });
  }

  //插入元素
  insert(el, container);
}

//*diff算法
//n1->old   n2->new
export function diff(n1, n2) {
  //!定义el,所在的真实DOM
  const el = (n2.el = n1.el); //把n1的标签元素保存给n2，下一次n2和n3比较

  //tag
  if (n1.tag !== n2.tag) {
    n1.el.replaceWith(createElement(n2.tag)); //根据n2的标签替换n1**节点**,直接重新创建新节点
  } else {
    //props
    /**
     * 1.新有旧没有，添加属性
     * 2.新没有旧有，删除属性
     */
    const oldProps = n1.props;
    const newProps = n2.props;
    if (newProps) {
      for (let key in newProps) {
        if (newProps[key] !== oldProps[key]) {
          patchProps(el, key, oldProps[key], newProps[key]); //添加属性
        }
      }
    }
    if (oldProps) {
      for (let key in oldProps) {
        if (!(key in newProps)) {
          patchProps(el, key, oldProps[key], null); //删除属性
        }
      }
    }
    //children
    /**
     * 1.新节点是字符串，旧是字符串
     * 2.新节点是字符串，旧是数组
     * 3.新节点是数组，旧是字符串
     * 4.新节点是数组，旧是数组**
     */
    const oldChildren = n1.children;
    const newChildren = n2.children;
    if (typeof newChildren === "string") {
      //新字符串
      if (typeof oldChildren === "string" && oldChildren !== newChildren) {
        el.innerText = newChildren;
      } else if (Array.isArray(oldChildren)) {
        el.innerText = newChildren;
      }
    } else if (Array.isArray(newChildren)) {
      //新数组
      if (typeof oldChildren === "string") {
        el.innerText = "";
        newChildren.forEach((v) => {
          mountElement(v, el); //根据虚拟节点创建元素挂在到el上
        });
      } else if (Array.isArray(oldChildren)) {
        //*数组和数组比较
        let oLen = oldChildren.length;
        let nLen = newChildren.length;
        let len = Math.min(oLen, nLen);
        for (let i = 0; i < len; i++) {
          diff(oldChildren[i], newChildren[i]);
        }
        if (oLen < nLen) {
          for (let i = len; i < nLen; i++) {
            let vnode = newChildren[i]; //h函数返回的虚拟节点
            mountElement(vnode, el);
          }
        } else {
          for (let i = len; i < oLen; i++) {
            let vnode = oldChildren[i]; //h函数返回的虚拟节点
            remove(vnode.el, el);
          }
        }
      }
    }
  }
}
