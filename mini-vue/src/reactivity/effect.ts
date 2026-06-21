import { extend } from "../shared";
//全局变量
let activeEffect; //保存依赖
let shouldTrack = false; //是否收集依赖,和stop有关

export class ReactiveEffect {
  private _fn: any;
  deps = []; //依赖收集的数组,存的set
  active = true; //表示这个依赖是否活跃,默认是活跃的,和stop方法有关
  scheduler?: Function | undefined; // scheduler是一个函数,可以在执行依赖时传入一个函数,这个函数会在响应式对象更新触发set时执行
  onStop?: () => void | undefined; // onStop是一个函数,stop方法被调用时执行的回调,用于清理工作
  constructor(fn, scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    if (!this.active) {
      return this._fn(); //如果依赖不活跃,则直接执行函数并返回
      //shouldTrack为false，fn里执行的track不会收集依赖
    }
    //依赖活跃,未被stop时执行
    shouldTrack = true; //设置shouldTrack为true,表示可以收集依赖
    activeEffect = this; //把依赖保存到全局
    const result = this._fn(); //执行这个函数并把返回值(如果有)return出去
    shouldTrack = false; //执行完fn,全局变量重置
    return result; //返回函数执行的结果
  }
  stop() {
    if (this.active) {
      clearupEffect(this); //清除依赖
      if (this.onStop) {
        this.onStop(); //如果有onStop函数,则执行
      }
      this.active = false; //设置active为false,表示这个依赖不再活跃
    }
  }
}
function clearupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect); //从依赖数组中每个dep(set结构)都删除当前_effect依赖
  });
  effect.deps.length = 0; //清空依赖数组
}
let targetMap = new Map();
//收集依赖
export function track(target, key) {
  // if (!activeEffect) return; //如果没有activeEffect,则不收集依赖，用于reactive里的get方法报错
  // if (!shouldTrack) return; //如果shouldTrack为false,则不收集依赖,用于stop方法
  if (!isTracking()) return; //如果不收集依赖,则直接返回
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  trackEffects(dep); //收集依赖
}
export function trackEffects(dep) {
  if(dep.has(activeEffect)) return; //如果依赖已经存在,则不再收集
  dep.add(activeEffect); //收集依赖
  activeEffect.deps.push(dep); //反向收集，将当前依赖添加到依赖数组中
}
export function isTracking() {
  //如果没有activeEffect,则不收集依赖，用于reactive里的get方法报错
  //如果shouldTrack为false,则不收集依赖,用于stop方法
  return shouldTrack && activeEffect !== undefined; //判断是否收集依赖
}
//执行依赖
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key); //对应值保存的依赖
  if (!dep) return;
  triggerEffects(dep); //执行依赖
}
export function triggerEffects(dep) {
  for (let effect of dep) {
    if (!effect.scheduler) {
      //判断scheduler
      effect.run(); //执行依赖
    } else {
      effect.scheduler(); //如果有scheduler函数,则执行scheduler函数
    }
  }
}
export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  extend(_effect, options); //将options上的属性扩展到_effect上
  //extend优化_effect.onStop = options.onStop; //如果有onStop函数,则保存到_effect上
  _effect.run(); //执行run之后把当前依赖赋值给activeEffect，再保存到对应dep中
  const runner: any = _effect.run.bind(_effect); //把这个函数返回，需要时可以再次执行
  runner.effect = _effect; //将_effect挂载到runner上，方便后续操作
  return runner;
}

export function stop(runner) {
  runner.effect.stop();
}
