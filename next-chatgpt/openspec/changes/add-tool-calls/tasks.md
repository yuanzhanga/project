# Tasks: Tool Call 功能实现

## Phase 1: 类型定义 & 工具基础设施

- [x] **1.1 创建工具类型定义** — `src/lib/tools/types.ts`
  - `ToolMeta`、`ToolCall`、`ToolCallStatus`、`ToolDefinition`、`ToolExecutor`、`ToolRegistry` 类型
  - 从 `chain.ts` 的 `ChatMessage` 中抽取出 `ToolCall` 类型以便共享

- [x] **1.2 创建工具注册表** — `src/lib/tools/registry.ts`
  - `Map<string, ToolExecutor>` 注册表
  - `register(executor)`、`get(name)`、`getAll()`、`getDefinitions()` 方法
  - `getDefinitions()` 返回不含 `meta` 的纯 LLM 工具定义列表

- [x] **1.3 创建工具定义** — `src/lib/tools/definitions.ts`
  - 三个工具定义：`get_current_time`、`get_weather`、`calculate`
  - 每个工具带 `meta: { autoExecute, displayName, icon, risk }`
  - 导出 `toolDefinitions: ToolDefinition[]`

- [x] **1.4 创建工具执行器** — `src/lib/tools/executor.ts`
  - `getCurrentTimeExecutor`：使用 `Intl.DateTimeFormat` 获取格式化时间
  - `getWeatherExecutor`：返回 mock 天气数据（随机生成）
  - `calculateExecutor`：安全沙箱计算（正则白名单 + `new Function` 受限作用域）
  - `registerAllTools()` 函数注册所有工具
  - 在应用启动时调用 `registerAllTools()`

## Phase 2: 消息模型扩展

- [x] **2.1 扩展 ChatMessage 类型** — `src/lib/langchain/chain.ts`
  - `role` 新增 `"tool"`
  - 新增可选字段 `tool_calls?: ToolCall[]`
  - 新增可选字段 `tool_call_id?: string`
  - 新增可选字段 `name?: string`

- [x] **2.2 适配 localStorage 序列化** — `src/app/page.tsx`
  - 加载会话时校验 `tool_calls`、`tool_call_id`、`name` 字段
  - 旧数据兼容：缺失字段设为 `undefined`，不在序列化时丢失

## Phase 3: 后端 LLM 调用改造

- [x] **3.1 改造 ChatChainService** — `src/lib/langchain/chain.ts`
  - `ChatOpenAI` 配置：baseURL → `http://103.242.175.254:20022/v1`，model → `mock-interview-model`
  - `generateResponse()` 签名改为接收 `messages: ChatMessage[]` 替代 `userMessage: string`
  - 绑定工具：`llm.bindTools(toolDefinitions)`
  - 流式处理 `AIMessageChunk`：分别处理 `content` 和 `tool_call_chunks`
  - 累积 tool_call_chunks 的 args 片段
  - 返回类型扩展：`{ content, finishReason, toolCalls }`
  - 新增 `convertToLangChainMessages()` 方法：ChatMessage[] → LangChain BaseMessage[]
  - 处理 `assistant` + `tool_calls` → `AIMessage` with tool_calls
  - 处理 `tool` role → `ToolMessage`

- [x] **3.2 适配 WorkerPool** — `src/lib/queue/workerPool.ts`
  - `process()` 方法适配新的 `generateResponse` 签名
  - 传递完整的 `messages` 数组
  - 传递 `onToken` 回调

- [x] **3.3 适配 SummaryBufferMemory** — `src/lib/langchain/memory.ts`
  - 评估：memory 仍然用于压缩长对话，但 tool 消息不参与摘要
  - 如果 memory 的 `addAIMessage` / `addUserMessage` 需要适配 tool_calls，则更新
  - 检查不需要改动（大概率不需要）

## Phase 4: API 路由改造

- [x] **4.1 改造 SSE Chat API** — `src/app/api/chat/route.ts`
  - 请求体改为 `{ sessionId, messages: ChatMessage[] }`
  - SSE 事件格式改为结构化 JSON：`data: {"type":"chunk","data":"..."}\n\n`
  - 新增 `type: "tool_calls"` 事件
  - `type: "done"` 事件扩展 `finishReason` 字段
  - 适配新的 `generateResponse` 调用方式

- [x] **4.2 创建 Tool Execute API** — `src/app/api/tools/execute/route.ts`
  - `POST` 接收 `{ name, arguments }`
  - 从 registry 查找工具并执行
  - 返回 `{ status: "success"|"error", result: string }`
  - 错误处理：未知工具 404、执行异常 500

## Phase 5: WebSocket 服务端改造

- [x] **5.1 改造 WebSocket 消息格式** — `src/lib/websocket/server.ts`
  - 接收消息改为 `{ sessionId, messages: ChatMessage[] }`
  - 适配 `generateResponse(sessionId, messages, onToken)`
  - 新增 `type: "tool_calls"` 响应
  - `type: "done"` 响应扩展 `finishReason` 字段

## Phase 6: 前端流式解析改造

- [x] **6.1 改造 useSSEQueue** — `src/hooks/useSSEQueue.ts`
  - 解析 JSON 格式的 SSE data line：`data: {"type":"...","data":...}\n\n`
  - 处理 `type: "chunk"` → `onChunk`
  - 处理 `type: "tool_calls"` → `onToolCalls`
  - 处理 `type: "done"` → `onComplete` + finishReason
  - 处理 `type: "error"` → `onError`
  - 保留 `[DONE]` 兼容

- [x] **6.2 改造 useWebSocket** — `src/hooks/useWebSocket.ts`
  - 消息处理器新增 `onToolCalls` 回调
  - `sendMessage` 签名改为发送完整 messages 数组
  - `done` 响应处理 `finishReason`

- [x] **6.3 改造 useChatClient** — `src/hooks/useChatClient.ts`
  - 新增回调：`onToolCalls?: (toolCalls: ToolCall[]) => void`
  - `onComplete` 回调签名扩展：`(content: string, finishReason: string) => void`
  - `sendMessage` 改为 `(sessionId: string, messages: ChatMessage[]) => Promise<...>`
  - WebSocket 和 SSE 分支都适配新签名

## Phase 7: 前端 UI 组件

- [x] **7.1 创建 ToolCallCard 组件** — `src/components/ToolCallCard.tsx`
  - 根据 `status` 渲染不同状态：
    - `pending`: 工具名 + 参数摘要 + [执行] [取消] 按钮
    - `executing`: 工具名 + 加载动画
    - `completed`: 工具名 + ✅ + 结果摘要（可折叠展开）
    - `error`: 工具名 + ❌ + 错误信息
    - `cancelled`: 工具名 + 🚫 已取消
  - Props: `toolCall: ToolCall`, `onExecute?`, `onCancel?`
  - 使用 Tailwind 样式，匹配现有 AI 气泡风格

- [x] **7.2 创建 ToolCallGroup 组件** — `src/components/ToolCallGroup.tsx`
  - 管理多个 ToolCallCard 的并行展示
  - auto 工具立即进入 executing 状态
  - manual 工具等待用户操作
  - Props: `toolCalls: ToolCall[]`, `onExecute`, `onCancel`

- [x] **7.3 改造 VirtualMessageList** — `src/components/VirtualMessageList.tsx`
  - `role === "tool"` 消息渲染为小型结果标签（嵌入在消息流中）
  - `role === "assistant"` 且 `msg.tool_calls` 存在时，渲染 AI 文本 + ToolCallGroup
  - 流式消息行保持不变

## Phase 8: page.tsx 集成 — Tool Call 循环

- [x] **8.1 新增状态管理** — `src/app/page.tsx`
  - 新增 `chatPhase` 状态：`"idle" | "streaming" | "awaiting_tools" | "sending_tools"`
  - 新增 `pendingToolCalls` 状态
  - 新增 `currentSessionMessages` 状态（维护完整的 messages 数组）

- [x] **8.2 实现 Tool Call 循环逻辑**
  - `handleToolCalls()`: 收到 tool_calls 后的处理
    - 分流 auto / manual
    - auto 直接调用 `POST /api/tools/execute`
    - manual 等用户操作
    - 全部 resolved → 构造 tool 消息 → 追加到 messages → 自动触发下一轮
  - `handleToolExecute(toolCallId)`: 用户点击执行
  - `handleToolCancel(toolCallId)`: 用户点击取消
  - 循环终止条件：`finishReason === "stop"`（不再有 tool_calls）

- [x] **8.3 改造 handleSendMessage**
  - 不再只传 `(sessionId, message)`
  - 改为构造完整 `messages` 数组发给 `sendChatMessage`
  - 用户消息追加到 `currentSessionMessages` 后发送

- [x] **8.4 适配 onComplete / onToolCalls 回调**
  - `onComplete`: 检查 `finishReason`，如果是 `"tool_calls"` 则进入 `handleToolCalls`
  - `onToolCalls`: 存储 tool_calls 用于 UI 渲染

## Phase 9: 联调测试 & 边界处理

- [x] **9.1 端到端测试**
  - 测试场景 1：用户问"现在几点" → AI 调用 get_current_time → 返回时间 → AI 回复
  - 测试场景 2：用户问"北京天气怎么样" → AI 调用 get_weather → 返回 mock 数据 → AI 回复
  - 测试场景 3：用户问"计算 123 * 456" → AI 调用 calculate → 返回结果 → AI 回复
  - 测试场景 4：用户问"现在几点了，顺便查一下北京天气" → AI 并行调用两个工具

- [x] **9.2 错误场景处理**
  - API 返回 500 错误（20% 概率）：展示错误提示 + 重试按钮
  - 流中断（无 [DONE]）：超时检测 + 已接收内容保留
  - 消息结构非法 (400)：展示错误消息
  - 工具执行超时：前端 loading 状态 + 超时提示

- [x] **9.3 兼容性测试**
  - 旧 localStorage 数据加载（无 tool_calls 字段的旧消息）
  - WebSocket → SSE 降级时 tool_calls 仍正常工作
  - 长时间多轮 tool call 循环不丢消息

- [x] **9.4 启动时注册工具**
  - 在 `chatChainService` 构造函数或初始化时调用 `registerAllTools()`
  - 确认工具注册表在 API 路由和 WebSocket server 中都可访问（单例）
