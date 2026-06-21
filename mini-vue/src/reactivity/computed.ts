import { ReactiveEffect } from "./effect";

class ComputedRefImpl {
  private _getter; //存储Computed函数
  private _value; //存储计算后的值
  private _dirty = true; //标记是否需要重新计算//Computed缓存
  private _effect; //存储依赖函数，依赖改变自动执行
  constructor(getter) {
    this._getter = getter; //保存getter函数
    this._effect = new ReactiveEffect(getter, () => {//依赖改变时执行的函数
      if (!this._dirty) {
        this._dirty = true; //当依赖改变时，设置_dirty为true，表示需要重新计算
      }
    });
  }
  //依赖改变时，重新计算值，不改变直接返回缓存
  get value() {
    //如果需要重新计算
    if (this._dirty) {
      this._dirty = false; //重置dirty标记
      this._value = this._effect.run(); //调用getter函数计算值
    }
    //调用getter函数返回值
    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter);
}
