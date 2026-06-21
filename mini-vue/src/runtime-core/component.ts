import { proxyRefs } from "../reactivity";
import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";

//*创建instance实例
export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type, //App{render(),setup()}，是一个组件实例
    setupState: {}, //保存组件的一系列值
    props: {}, //传递参数，只读
    emit: () => {},
    slots: {}, //插槽
    provides: parent ? parent.provides : {}, //提供的依赖注入
    proxy: null,//代理对象，解决this指向问题
    parent, //父组件
    isMounted: false, //是否已经挂载，没有则初始化
    subTree: {}, //存放上一个的vnode
    next:null//下次更新的vnode
  };
  component.emit = emit.bind(null, component) as any;
  return component;
}
//*在instance上添加各种属性
export function setupComponent(instance) {
  // 初始化props，slots，emit
  initProps(instance, instance.vnode.props); //把虚拟节点的props属性移到instance上
  initSlots(instance, instance.vnode.children);
  setupStatefulComponent(instance);
}
function setupStatefulComponent(instance: any) {
  const Component = instance.type;

  //ctx 解决this指向问题
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
  const { setup } = Component;
  if (setup) {
    setCurrentInstance(instance); // 设置当前实例,执行setup时currentInstance是实例
    //函数或对象
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    }); // 调用setup函数，拿到返回值
    setCurrentInstance(null); // 执行完setup清除当前实例
    handleSetupResult(instance, setupResult); // 处理setup的返回值
  }
}
function handleSetupResult(instance, setupResult) {
  if (typeof setupResult === "object") {
    instance.setupState = proxyRefs(setupResult); // 把setup的返回值放到实例上，作为组件的state，如果是ref自动解包
  }
  finishComponentSetup(instance); // 完成组件的挂载
}
function finishComponentSetup(instance: any) {
  const Component = instance.type;
  if(compiler && !Component.render){
    if(Component.template){
      Component.render = compiler(Component.template)
    }
  }
  if (Component.render) {
    instance.render = Component.render; // 把组件的render方法放到实例上
  }
}

//导出组件实例
let currentInstance: any = null;
export function getCurrentInstance() {
  return currentInstance;
}
// 设置当前实例
function setCurrentInstance(instance) {
  currentInstance = instance;
}

let compiler;
export function registerRuntimeCompiler(_compiler) {
  compiler = _compiler;
}
