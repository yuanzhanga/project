# 架构分析

- **架构风格**：AI Agent / LLM 应用架构；MVC / Model-Service-Controller 倾向
- **置信度**：高

## 分层分析

- API 层
- Service 层（业务逻辑）
- 前端组件层

## 模块地图

- **Promise**：Promise
- **axios简易源码**：axios简易源码
- **axios简易源码\axios**：axios简易源码\axios
- **chatgpt-clone**：chatgpt-clone
- **chatgpt-clone\public**：chatgpt-clone\public
- **chatgpt-clone\server**：chatgpt-clone\server
- **chatgpt-clone\src**：chatgpt-clone\src
- **chatgpt-clone\uploads**：chatgpt-clone\uploads
- **contrib_output**：contrib_output
- **mini-vue**：mini-vue
- **mini-vue\example**：mini-vue\example
- **mini-vue\lib**：mini-vue\lib
- **mini-vue\mini-vue前置**：mini-vue\mini-vue前置
- **mini-vue\src**：mini-vue\src
- **next-chatgpt**：next-chatgpt

## 依赖观察

- 主要框架：TypeScript, Vue, Express, React, Next.js, LangChain（来自 axios简易源码\axios\package.json, chatgpt-clone\package.json, mini-vue\package.json）

## 架构优势（基于可见证据）

- 目录体现出分层意识，职责划分有迹可循
- 存在测试目录（mini-vue\mini-vue前置\jest\tests, mini-vue\mini-vue前置\learn-vtu\src\components\__tests__, mini-vue\src\compiler-core\__tests__）

## 架构风险

- 未发现部署/CI 配置，交付方式无法从仓库确认