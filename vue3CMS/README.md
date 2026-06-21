亮点
//好像不用导入组件也能用
1.登录界面
父
function handleLoginBtn(){
if(activeTab.value === "account") {
console.log(isRemPwd.value)
accountRef.value?.loginAction(isRemPwd.value)//传递参数目的用来记住密码，直接传参不用继续父传子那一套
} else {
console.log(2)
}
}
子
function loginAction(isRemPwd:boolean) {
formRef.value.validate((valid: boolean) => {
//验证表单是否符合条件
if (valid) {
const name =account.name
const password = account.password
loginAccountAction({name,password }).then(()=>{
if(isRemPwd) {//记住账户
localCache.setCache('name', name)
localCache.setCache('password', password)
} else {
localCache.removeCache('name')
localCache.removeCache('password')
}
localCache.setCache('isRemPwd', isRemPwd)//记录用户是否记住，下次不用重新勾选，省下用watch
ElMessage({
message: '登录成功',
type:'success',
duration: 1000,
})
})
} else {
ElMessage({
message: '请输入正确的账号或密码',
type: 'warning',
plain: true,
})
}
})
} 
2.根据token进行路由守卫
2.身份管理菜单
3.动态组件
4.可以直接注册路由通过后端返回的url绑定菜单进入，也可以通过动态路由
5.动态路由 1.根据身份2.根据菜单
6.面包屑定位菜单
7.socket 
8.抽离组件高度封装传配置
9.传入配置可以用template判断类型,作用域插槽
10角色控制菜单树，封装一大堆
11.nextTick--promise.then微任务12.判断权限
13.echarts 把网络请求的数据传入子组件，动态传配置把数据填入配置传给base组件--数据需要做一些处理
