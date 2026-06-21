import { effectWatch } from "./reactivity.js";
import { mountElement, diff } from "./renderer.js";
export function createApp(rootComponent) {
  return {
    mount(rootContainer /*document.querySelector("#app")*/) {
      const setupResult = rootComponent.setup(); //setup函数返回的对象
      let perSubTree;
      let isMount = true; //是否是渲染初始化
      /*effectWatch包render，把render函数依赖保存到effects，每次改变数据都会触发render函数*/
      effectWatch(() => {
        if (isMount) {
          //初始化
          isMount = false;
          let subTree = rootComponent.render(setupResult); //虚拟节点
          perSubTree = subTree; //将当前值赋给perSubTree作为保存
          mountElement(subTree, rootContainer); //把subTree转化为真实节点挂载到rootContainer
        } else {
          let subTree = rootComponent.render(setupResult); //新虚拟节点
          console.log("pre", perSubTree);
          console.log("cur", subTree);
          diff(perSubTree, subTree);//比较前后节点
          perSubTree = subTree;
        }
      });
    },
  };
}
