//是否应该更新组件
export function shouldUpdateComponent(preVNode, nextVNode) {
  const { props: prevProps } = preVNode;
  const { props: nextProps } = nextVNode;
  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true; //如果新旧props不相等，则需要更新组件
    }
  }
  return false; //如果新旧props相等，则不需要更新组件
}
