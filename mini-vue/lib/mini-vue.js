const Fragment = Symbol("Fragment"); //只插入插槽元素
const Text = Symbol("Text"); //只插入文本元素
function createVNode(type, props, children) {
    const vnode = {
        type, //App对象
        props,
        children,
        component: null, //组件实例(如果是组件的话)
        el: null, // 真实的DOM根元素(是dom元素)，this.$el
        shapeFlag: getShapeFlag(type),
        key: props && props.key, // 用于优化的key
    };
    //判断孩子是组件还是普通元素
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */; //或运算符
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    //判断是不是插槽（组件+children是object）
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */; //如果是插槽，就加上这个标志位
        }
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text); //创建一个文本节点的vnode
}

function h(type, props = null, children = []) {
    return createVNode(type, props, children);
}

/**
 * Compiler runtime helper for rendering `<slot/>`
 * 用来 render slot 的
 * 之前是把 slot 的数据都存在 instance.slots 内(可以看 componentSlot.ts)，
 * 这里就是取数据然后渲染出来的点
 * 这个是由 compiler 模块直接渲染出来的 -可以参看这个 demo https://vue-next-template-explorer.netlify.app/#%7B%22src%22%3A%22%3Cdiv%3E%5Cn%20%20%3Cslot%3E%3C%2Fslot%3E%5Cn%3C%2Fdiv%3E%22%2C%22ssr%22%3Afalse%2C%22options%22%3A%7B%22mode%22%3A%22module%22%2C%22prefixIdentifiers%22%3Afalse%2C%22optimizeImports%22%3Afalse%2C%22hoistStatic%22%3Afalse%2C%22cacheHandlers%22%3Afalse%2C%22scopeId%22%3Anull%2C%22inline%22%3Afalse%2C%22ssrCssVars%22%3A%22%7B%20color%20%7D%22%2C%22bindingMetadata%22%3A%7B%22TestComponent%22%3A%22setup-const%22%2C%22setupRef%22%3A%22setup-ref%22%2C%22setupConst%22%3A%22setup-const%22%2C%22setupLet%22%3A%22setup-let%22%2C%22setupMaybeRef%22%3A%22setup-maybe-ref%22%2C%22setupProp%22%3A%22props%22%2C%22vMySetupDir%22%3A%22setup-const%22%7D%2C%22optimizeBindings%22%3Afalse%7D%7D
 * 其最终目的就是在 render 函数中调用 renderSlot 取 instance.slots 内的数据
 * TODO 这里应该是一个返回一个 block ,但是暂时还没有支持 block ，所以这个暂时只需要返回一个 vnode 即可
 * 因为 block 的本质就是返回一个 vnode
 *
 * @private
 */
function renderSlots(slots, name, props = {}) {
    const slot = slots[name]; //具名插槽
    if (slot && typeof slot === "function") {
        return createVNode("Fragment", {}, slot(props)); //调用slot函数，传入props,作用域插槽
    }
}

//通用型工具函数
const extend = Object.assign;
const EMPTY_OBJ = {}; //解决空对象!==的问题
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
function hasChanged(value, oldValue) {
    return !Object.is(value, oldValue);
}
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
//正则匹配事件，修改大小写，驼峰命名 add-foo -> onAddFoo
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ""));
};
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const toHandlerKey = (str) => str ? `on${capitalize(str)}` : ``;

//全局变量
let activeEffect; //保存依赖
let shouldTrack = false; //是否收集依赖,和stop有关
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = []; //依赖收集的数组,存的set
        this.active = true; //表示这个依赖是否活跃,默认是活跃的,和stop方法有关
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
    effect.deps.forEach((dep) => {
        dep.delete(effect); //从依赖数组中每个dep(set结构)都删除当前_effect依赖
    });
    effect.deps.length = 0; //清空依赖数组
}
let targetMap = new Map();
//收集依赖
function track(target, key) {
    // if (!activeEffect) return; //如果没有activeEffect,则不收集依赖，用于reactive里的get方法报错
    // if (!shouldTrack) return; //如果shouldTrack为false,则不收集依赖,用于stop方法
    if (!isTracking())
        return; //如果不收集依赖,则直接返回
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
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return; //如果依赖已经存在,则不再收集
    dep.add(activeEffect); //收集依赖
    activeEffect.deps.push(dep); //反向收集，将当前依赖添加到依赖数组中
}
function isTracking() {
    //如果没有activeEffect,则不收集依赖，用于reactive里的get方法报错
    //如果shouldTrack为false,则不收集依赖,用于stop方法
    return shouldTrack && activeEffect !== undefined; //判断是否收集依赖
}
//执行依赖
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key); //对应值保存的依赖
    if (!dep)
        return;
    triggerEffects(dep); //执行依赖
}
function triggerEffects(dep) {
    for (let effect of dep) {
        if (!effect.scheduler) {
            //判断scheduler
            effect.run(); //执行依赖
        }
        else {
            effect.scheduler(); //如果有scheduler函数,则执行scheduler函数
        }
    }
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    extend(_effect, options); //将options上的属性扩展到_effect上
    //extend优化_effect.onStop = options.onStop; //如果有onStop函数,则保存到_effect上
    _effect.run(); //执行run之后把当前依赖赋值给activeEffect，再保存到对应dep中
    const runner = _effect.run.bind(_effect); //把这个函数返回，需要时可以再次执行
    runner.effect = _effect; //将_effect挂载到runner上，方便后续操作
    return runner;
}

function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === "isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly; // 如果是reactive对象，返回true
        }
        else if (key === "isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly; // 如果是readonly对象，返回true
        }
        const res = Reflect.get(target, key);
        if (!isReadonly) {
            track(target, key);
        }
        //判断shallow
        if (shallow) {
            return res; // 如果是shallow，直接返回值，不进行嵌套处理
        }
        //判断嵌套
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        // 先赋新值再触发依赖
        trigger(target, key);
        return res;
    };
}
//函数只初始化一次
const get = createGetter(); //reactive
const set = createSetter();
const getReadonly = createGetter(true);
const getShallowReadonly = createGetter(false, true);
const mutableHandlers = {
    get: get,
    set: set,
};
const readonlyHandlers = {
    get: getReadonly,
    set(target, key, value) {
        console.warn(`key ${key} set失败，因为 ${target} 是一个只读对象`);
        return true; // 只读对象，禁止修改
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: getShallowReadonly,
});

function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.warn(`target ${raw} 必须是一个对象`);
        return raw;
    }
    return new Proxy(raw, baseHandlers);
}
function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
//只是最外层只读，深层不影响
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}

class RefImpl {
    constructor(value) {
        this._v_isRef = true; //标记为ref对象
        this._rawValue = value; //保存原始值
        this._value = convert(value);
        this.dep = new Set(); //依赖收集
    }
    get value() {
        if (isTracking()) {
            trackEffects(this.dep); //收集依赖,只收集一个
        }
        return this._value; //返回值
    }
    set value(newValue) {
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue; //设置新值
            this._value = convert(newValue);
            triggerEffects(this.dep); //触发依赖
        }
    }
}
function convert(value) {
    //转换
    //如果不是对象,则直接赋值,否则转换为reactive对象
    return isObject(value) ? reactive(value) : value;
}
function isRef(ref) {
    return !!ref._v_isRef; //判断是否是ref对象
}
function unRef(ref) {
    //如果是ref对象,则返回其value,否则直接返回值
    return isRef(ref) ? ref.value : ref;
}
//用与在render函数中使用ref对象时,自动解包
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key)); //如果是ref对象,则返回其value,否则直接返回值
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                //如果是ref对象,则设置其value,否则直接设置值
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value); //直接设置值
            }
        },
    });
}
function ref(value) {
    return new RefImpl(value);
}

function emit(instance /*默认传入component */, event /*传给父组件的事件名称*/, ...args /*传给父组件的事件参数*/) {
    const { props } = instance; //component.props
    //add->onAdd
    let handle = props[toHandlerKey(camelize(event))]; //获取props上的事件处理函数
    handle && handle(...args); //如果存在就调用
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $emit: (i) => i.emit,
    $slots: (i) => i.slots,
    $props: (i) => i.props,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance } /*解构赋值*/, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initSlots(instance, children) {
    //slots
    const { vnode } = instance; //vnode是组件的虚拟节点
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalObjectSlots(children, instance.slots); //把children的内容放到instance.slots中
    }
}
function normalObjectSlots(children, slots) {
    for (const key in children) {
        // console.log(key)//key是具名插槽的名字
        const value = children[key]; //插槽实例函数（(age) => h("p", {}, "123"+age)）返回虚拟节点
        slots[key] = (props) => normalizeSlotValue(value(props)); //{key: function}
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

//*创建instance实例
function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type, //App{render(),setup()}，是一个组件实例
        setupState: {}, //保存组件的一系列值
        props: {}, //传递参数，只读
        emit: () => { },
        slots: {}, //插槽
        provides: parent ? parent.provides : {}, //提供的依赖注入
        proxy: null, //代理对象，解决this指向问题
        parent, //父组件
        isMounted: false, //是否已经挂载，没有则初始化
        subTree: {}, //存放上一个的vnode
        next: null //下次更新的vnode
    };
    component.emit = emit.bind(null, component);
    return component;
}
//*在instance上添加各种属性
function setupComponent(instance) {
    // 初始化props，slots，emit
    initProps(instance, instance.vnode.props); //把虚拟节点的props属性移到instance上
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
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
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render; // 把组件的render方法放到实例上
    }
}
//导出组件实例
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
// 设置当前实例
function setCurrentInstance(instance) {
    currentInstance = instance;
}

//存储依赖注入的值
function provide(key, value) {
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
function inject(key, defaultValue) {
    var _a;
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

//是否应该更新组件
function shouldUpdateComponent(preVNode, nextVNode) {
    const { props: prevProps } = preVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true; //如果新旧props不相等，则需要更新组件
        }
    }
    return false; //如果新旧props相等，则不需要更新组件
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                //先把component -> vnode
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

const queue = [];
const activePreFlushCbs = [];
const p = Promise.resolve();
let isFlushPending = false;
//同步视图，返回一个promise
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
//异步更新视图
function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    // 执行所有的 job
    queueFlush();
}
function queueFlush() {
    // 如果同时触发了两个组件的更新的话
    // 这里就会触发两次 then （微任务逻辑）
    // 但是这是没有必要的
    // 我们只需要触发一次即可处理完所有的 job 调用，触发一次就在微任务排队了
    // 所以需要判断一下 如果已经触发过 nextTick 了
    // 那么后面就不需要再次触发一次 nextTick 逻辑了
    if (isFlushPending)
        return; //只执行一次创建promise的过程
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    // 先执行 pre 类型的 job
    // 所以这里执行的job 是在渲染前的
    // 也就意味着执行这里的 job 的时候 页面还没有渲染
    flushPreFlushCbs();
    // 这里是执行 queueJob 的
    // 比如 render 渲染就是属于这个类型的 job
    let job;
    while ((job = queue.shift())) {
        if (job) {
            job();
        }
    }
}
function flushPreFlushCbs() {
    // 执行所有的 pre 类型的 job
    for (let i = 0; i < activePreFlushCbs.length; i++) {
        activePreFlushCbs[i]();
    }
}

function createRender(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options; //解构options
    function render(vnode, container) {
        //调用patch
        patch(null, vnode, container, null, null);
    }
    //n1老的，n2新的，没有n1则是初次渲染
    function patch(n1, n2, container, parentComponent, anchor) {
        //判断vode是不是element
        // if (typeof vnode.type === "string") {
        //   processElement(vnode, container);
        // } else if (isObject(vnode.type)) {
        //   processComponent(vnode, container);
        // }
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                //利用位运算符提高性能
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
        }
    }
    //*fragment片段
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor); //只渲染孩子元素
    }
    //*text文本元素
    function processText(n1, n2, container) {
        const { children } = n2; //纯文本内容
        const textNode = (n2.el = document.createTextNode(children)); //把el真实DOM存到vnode对象上
        container.append(textNode); //挂载
    }
    //*element普通元素
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            //如果没有n1则是初次渲染
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            //更新
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    //元素初次渲染
    function mountElement(vnode, container, parentComponent, anchor) {
        const { type, props, children, shapeFlag } = vnode;
        //处理type
        const el = (vnode.el = hostCreateElement(type)); //把el真实DOM存到vnode对象上
        //处理props和事件
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val); //调用patchProp处理属性和事件
        }
        //处理children 判断是string还是array
        // if (typeof children === "string") {
        //   el.textContent = children;
        // } else if (Array.isArray(children)) {
        //   mountChildren(children, el);
        // }
        //位运算
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(children, el, parentComponent, anchor);
        }
        //挂载
        hostInsert(el, container, anchor); //把el挂载到container上
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((child) => {
            //再次判断孩子是普通元素还是组件
            patch(null, child, container, parentComponent, anchor); //递归调用patch
        });
    }
    //元素更新
    function patchElement(n1, n2, container, parentComponent, anchor) {
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        //更新children
        patchChildren(n1, n2, el, parentComponent, anchor);
        //更新props
        patchProps(el, oldProps, newProps);
    }
    //更新props
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const preProp = oldProps[key];
                const nextProp = newProps[key];
                if (preProp !== nextProp) {
                    //新旧Props不一样直接挂载新的nextProp
                    hostPatchProp(el, key, preProp, nextProp);
                }
            }
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    //新的属性里不存在这个key，直接删掉
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    //更新children
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const preShapeFlag = n1.shapeFlag; //老节点的类型
        const c1 = n1.children; //老节点
        const shapeFlag = n2.shapeFlag; //新节点的类型
        const c2 = n2.children; //新节点
        //*新节点是文本
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            //*老节点是数组
            if (preShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                //把老的清空再执行设置新的text
                unmountChildren(c1);
            }
            //*老节点是文本,直接比较是否相等
            if (c1 !== c2) {
                // 设置新的text
                hostSetElementText(container, c2);
            }
        }
        //*新节点是数组
        else {
            //new array
            //*老节点是文本
            if (preShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                //把老的清空再执行设置新的text
                hostSetElementText(container, ""); //把老的文本清空
                mountChildren(c2, container, parentComponent, anchor);
            }
            //*老节点是数组,diff算法
            else {
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    //清空老的数组节点
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            //remove
            hostRemove(el);
        }
    }
    //数组 diff 数组
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0;
        const l2 = c2.length;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        const isSameVNodeType = (n1, n2) => {
            return n1.type === n2.type && n1.key === n2.key;
        };
        //1.左侧对比
        while (i <= e1 && i <= e2) {
            const prevChild = c1[i];
            const nextChild = c2[i];
            if (isSameVNodeType(prevChild, nextChild)) {
                patch(prevChild, nextChild, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        //2.右侧对比
        while (i <= e1 && i <= e2) {
            const prevChild = c1[e1];
            const nextChild = c2[e2];
            if (isSameVNodeType(prevChild, nextChild)) {
                patch(prevChild, nextChild, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        //3. 新的比老的长,创建新的
        if (i > e1 && i <= e2) {
            // 如果是这种情况的话就说明 e2 也就是新节点的数量大于旧节点的数量
            // 也就是说新增了 vnode
            // 应该循环 c2
            // 锚点的计算：新的节点有可能需要添加到尾部，也可能添加到头部，所以需要指定添加的问题
            // 要添加的位置是当前的位置(e2 开始)+1
            // 因为对于往左侧添加的话，应该获取到 c2 的第一个元素
            // 所以我们需要从 e2 + 1 取到锚点的位置
            const nextPos = e2 + 1;
            const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
            while (i <= e2) {
                patch(null, c2[i], container, parentComponent, anchor);
                i++;
            }
        }
        //4. 新的比老的短,删除旧的
        else if (i > e2 && i <= e1) {
            // 这种情况的话说明新节点的数量是小于旧节点的数量的
            // 那么我们就需要把多余的删除
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        //*5.中间乱序的部分,[i,e1],[i,e2]
        else {
            // 左右两边都比对完了，然后剩下的就是中间部位顺序变动的
            // a,b,[c,d,e],f,g  |  a,b,[e,c,d],f,g
            let s1 = i; //旧数组中间部分的起始索引
            let s2 = i; //新数组中间部分的起始索引
            const keyToNewIndexMap = new Map(); //[key,保存元素的新索引]，先把 key 和 newIndex 绑定好，方便后续基于 key 找到 newIndex
            const toBePatched = e2 - s2 + 1; //需要处理新节点的数量
            let patched = 0; //已经处理的节点数量，大于toBePatched的直接删除（优化）
            let moved = false; //是否需要移动
            let maxNewIndexSoFar = 0; //新元素是否大于历史最大元素，如果大于则改变move的值
            // 创建数组的时候给定数组的长度，这个是性能最快的写法
            const newIndexToOldIndexMap = new Array(toBePatched); // 初始化 从新的index（从零开始）映射为老的index
            // 都初始化为 0 , 后面处理的时候 如果发现是 0 的话，那么就说明新值在老的里面不存在
            for (let i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            // 时间复杂度是 O(1)
            //遍历新数组去记录新索引
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 遍历老数组
            // 1. 需要找出老节点有，而新节点没有的 -> 需要把这个节点删除掉
            // 2. 新老节点都有的，—> 需要 patch
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                //!优化点 如果老的节点大于新节点的数量的话，那么这里在处理老节点的时候就直接删除即可
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                if (prevChild.key != null) {
                    // 这里就可以通过key快速的查找了，看看在新的里面这个节点存在不存在
                    // 时间复杂度O(1)
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 如果没key 的话，那么只能是遍历所有的新节点来确定当前节点存在不存在了
                    // 时间复杂度O(n)
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                //判断这个节点在不在新数组里
                if (newIndex === undefined) {
                    // 当前节点的key 不存在于 newChildren 中，需要把当前节点给删除掉
                    hostRemove(prevChild.el);
                }
                else {
                    //判断是否移动
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    newIndexToOldIndexMap[newIndex - s2] = i + 1; //避免如果i=0,会认为映射不存在
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            const increasingNewIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : []; //最长递增子序列
            let j = increasingNewIndexSequence.length - 1; //循环最长递增子序列
            //循环新数组
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 确定当前要处理的节点索引
                //从后往前
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                // 锚点等于当前节点索引+1
                // 也就是当前节点的后面一个节点(又因为是倒遍历，所以锚点是位置确定的节点)
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor; //锚点
                if (newIndexToOldIndexMap[i] === 0) {
                    // 说明新节点在老的里面不存在
                    // 需要创建
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 需要移动
                    // 1. j 已经没有了 说明剩下的都需要移动了
                    // 2. 最长子序列里面的值和当前的值匹配不上， 说明当前元素需要移动
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 移动的话使用 insert 即可
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        // 这里就是命中了  index 和 最长递增子序列的值
                        // 所以可以移动指针了
                        j--;
                    }
                }
            }
        }
    }
    //component定义组件（有App(setup(),render())）
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        setupComponent(instance); //给instance加属性
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component); //更新组件实例
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2; //下次更新的vnode
            instance.update(); //更新组件
        }
        else {
            n2.el = n1.el; //如果不需要更新则直接把el真实DOM存到vnode对象上
            instance.vnode = n2; //更新vnode
        }
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        //用于更新vnode，依赖收集触发依赖，把函数赋值给instance.update
        instance.update = effect(() => {
            if (!instance.isMounted) {
                //初始化
                const subTree = (instance.subTree = instance.render.call(instance.proxy)); // 调用render方法，拿到返回的vnode,call解决this问题
                patch(null, subTree, container, instance, anchor);
                initialVNode.el = subTree.el; //把el真实DOM存到vnode对象上
                instance.isMounted = true; //标记组件已经挂载
            }
            else {
                //更新
                //需要一个vnode
                const { next, vnode } = instance; //获取下次更新的vnode和上一次的vnode
                if (next) {
                    next.el = vnode.el; //把el真实DOM存到vnode对象上
                    updateComponentPreRender(instance, next); //更新组件的vnode
                }
                const subTree = instance.render.call(instance.proxy);
                const preSubTree = instance.subTree; //获取上一次的vnode
                instance.subTree = subTree; //更新subTree
                patch(preSubTree, subTree, container, instance, anchor);
                initialVNode.el = subTree.el; //把el真实DOM存到vnode对象上
            }
        }, {
            scheduler: () => {
                console.log('scheduler');
                // 把 effect 推到微任务的时候在执行
                //!因为如果同步更新视图会更新很多次，可以把更新保留到最后统一执行
                // queueJob(effect);
                queueJob(instance.update);
            },
        });
    }
    //更新组件的vnode
    function updateComponentPreRender(instance, nextVNode) {
        instance.vnode = nextVNode; //更新vnode
        instance.next = null; //清空下次更新的vnode
        instance.props = nextVNode.props; //更新props
    }
    return {
        createApp: createAppAPI(render), //暴露createApp方法
    };
}
//最长递增子序列，生成子序列的索引
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}
//扩展末尾最长连续递增子序列
// function move(n) {
//   let cnt = 1;
//   let v = n[n.length - 1];
//   for (let i = n.length - 2; i >= 0; i--) {
//     if (n[i] < v) {
//       console.log(n[i], v);
//       cnt++;
//       v = n[i];
//     } else {
//       break
//     }
//   }
//   console.log(n.length - cnt);
// }
// move([1,4,6, 2, 3,5]);

//提供操作dom的函数
//创建dom元素
function createElement(type) {
    return document.createElement(type);
}
//添加dom属性和事件
function patchProp(el, key, preVal, nextVal) {
    // console.log(el,key,preVal,nextVal)
    const isOn = (key) => /^on[A-Z]/.test(key); //onClick
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
//挂载元素
function insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null); //把child挂载到anchor锚点元素之前
}
//删除元素
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
//设置新文本节点
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRender({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
}); //返回一个对象
function createApp(...arg) {
    return renderer.createApp(...arg);
}

export { createApp, createRender, createTextVNode, getCurrentInstance, h, inject, nextTick, provide, proxyRefs, ref, renderSlots };
