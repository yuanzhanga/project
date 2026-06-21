import { getCurrentInstance } from "./component";

//存储依赖注入的值
export function provide(key, value) {
  const currentInstance = getCurrentInstance();
  if (currentInstance) {
    let { provides, parent } = currentInstance;
    //初始化
    if (provides === parent.provides) {
      provides = currentInstance.provides = Object.create(parent.provides);
    }
    provides[key] = value;
  }
}

//获取依赖注入的值
export function inject(key, defaultValue) {
  const currentInstance = getCurrentInstance();
  if (currentInstance) {
    const parentProvides = currentInstance.parent?.provides;
    if (key in parentProvides) {
      return parentProvides[key];
    } else {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
