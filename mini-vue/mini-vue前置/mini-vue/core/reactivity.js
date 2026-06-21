export class Dep {
  constructor(value) {
    this._val = value;
    this.effects = new Set();
  }
  get value() {
    this.depend(); //收集依赖
    return this._val;
  }
  set value(val) {
    this._val = val;
    this.notice(); //改变值后重新执行依赖
  }
  depend() {
    if (currentEffects) {
      //判断只收集一次
      this.effects.add(currentEffects);
    }
  }
  notice() {
    this.effects.forEach((effect) => {
      effect();
    });
  }
}

let currentEffects = null;
export function effectWatch(fn /*依赖函数*/) {
  currentEffects = fn;
  fn(); //首次执行依赖
  currentEffects = null;
}

//get和set需要是同一个Dep
let targetMap = new Map(); //储存全局reactive对象，，存储Dep，[对象，对象depMap]
export function reactive(raw) {
  return new Proxy(raw, {
    //获取对象具体属性
    get(target, key) {
      let dep = getDep(target,key)
      dep.depend();
      return Reflect.get(target, key);
    },
    set(target, key, value) {
        let dep = getDep(target,key)
        const result = Reflect.set(target,key,value)
        dep.notice()
        return result
    },
  });
}

//得到这个对象的键所对的值的Dep
function getDep(target,key){
    let depMap = targetMap.get(target);
      if (!depMap) {
        depMap = new Map(); //[对象key,key的Dep]
        targetMap.set(target, depMap);
      }
      let dep = depMap.get(key);
      if (!dep) {
        dep = new Dep(target[key]);
        depMap.set(key, dep);
      }
      return dep
}