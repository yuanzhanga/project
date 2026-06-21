let add = require('../add.js')
test('1+1=8',()=>{
    //准备数据--given
    let a = 1
    let b = 2
    //触发测试动作-when
    let r = add(a,b)
    //验证-then
    //toBe jest匹配器
    expect(r).toBe(3)
})