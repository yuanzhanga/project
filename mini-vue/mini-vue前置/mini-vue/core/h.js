//虚拟节点

export function h(tag, props, children){
    return {
        tag,
        props,
        children
    }
}