export * from "./runtime-dom/index"
import { registerRuntimeCompiler } from "./runtime-core/index";

import { baseCompile } from "./compiler-core/src/compile";
import * as runtimeDom from "./runtime-dom/index";
//生成render函数
function compileToFunction(template, options = {}) {
  const { code } = baseCompile(template, options);

  // 调用 compile 得到的代码在给封装到函数内，
  // 这里会依赖 runtimeDom 的一些函数，所以在这里通过参数的形式注入进去
  const render = new Function("Vue", code)(runtimeDom);

  return render;
}

registerRuntimeCompiler(compileToFunction);