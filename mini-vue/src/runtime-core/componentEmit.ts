import { camelize, toHandlerKey } from "../shared/index";

export function emit(
  instance /*默认传入component */,
  event /*传给父组件的事件名称*/,
  ...args /*传给父组件的事件参数*/
) {
  const { props } = instance; //component.props
  //add->onAdd
  let handle = props[toHandlerKey(camelize(event))]; //获取props上的事件处理函数
  handle && handle(...args); //如果存在就调用
}
