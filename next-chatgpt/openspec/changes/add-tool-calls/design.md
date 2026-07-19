# Design: Tool Call 功能架构设计

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js)                              │
│                                                                          │
│  page.tsx ─── 新增 tool call 循环状态机                                  │
│    │                                                                     │
│    ├─ onChunk(token) ──────────────▶ setStreamingContent (不变)         │
│    ├─ onToolCalls(toolCalls[]) ────▶ setPendingToolCalls ─▶ UI 分流     │
│    │                                     │                               │
│    │                              autoExecute=true  autoExecute=false    │
│    │                                     │               │               │
│    │                              直接调 executeTool   渲染 ToolCallCard │
│    │                                     │               │               │
│    │                                     └───────┬───────┘               │
│    │                                         全部 resolved               │
│    │                                             │                       │
│    └─ onComplete(content, finishReason) ◀────────┼── 发下一轮请求        │
│                                                                          │
│  useChatClient ─── 新增 onToolCalls, onFinishReason 回调                 │
│    ├─ useWebSocket ─── 解析 OpenAI SSE chunk (delta.content/tool_calls)  │
│    └─ useSSEQueue   ─── 同上                                             │
│                                                                          │
│  🆕 ToolCallCard ─── auto: 动画 | manual: [执行][取消] | done: 结果摘要  │
│  🆕 ToolCallGroup ─── 多个 ToolCallCard 的容器，管理并行状态              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    WebSocket / SSE (OpenAI chunk 格式)
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND                                         │
│                                                                          │
│  ws server.ts  OR  /api/chat/route.ts                                    │
│    ├─ 接收 { messages: ChatMessage[] }  ← 完整会话历史                   │
│    ├─ ChatOpenAI({ baseURL, modelName, streaming })                      │
│    │     .bindTools(toolDefinitions)                                     │
│    ├─ .stream(messages) → AIMessageChunk：                               │
│    │   • content chunk      → { type:"chunk", data: "..." }             │
│    │   • tool_call_chunks   → 累积拼接 → { type:"tool_calls", data:[.] }│
│    │   • finish_reason      → { type:"done", finishReason:"..." }       │
│    └─ SummaryBufferMemory 保留                                           │
│                                                                          │
│  🆕 /api/tools/execute                                                   │
│    ├─ POST { name, arguments }                                           │
│    ├─ registry.get(name).execute(args)                                   │
│    └─ → { status: "success"|"error", result: string }                   │
│                                                                          │
│  🆕 src/lib/tools/                                                       │
│    ├─ types.ts         — 类型定义                                        │
│    ├─ definitions.ts  — 三个工具的定义 + meta                            │
│    ├─ registry.ts     — Map<name, { def, execute, meta }>                │
│    └─ executor.ts     — 实际执行逻辑（时间/天气mock/计算）               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. 类型设计

### 2.1 消息模型扩展

```typescript
// src/lib/langchain/chain.ts 中的 ChatMessage 扩展

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";  // + "tool"
  content: string;
  timestamp: number;
  tool_calls?: ToolCall[];      // assistant 消息中的工具调用
  tool_call_id?: string;        // tool 消息关联的工具调用 ID
  name?: string;                // tool 消息的工具名 (可选)
}

interface ToolCall {
  id: string;                   // API 返回的 call id, 如 "call_abc123"
  type: "function";
  function: {
    name: string;               // 工具名, 如 "get_current_time"
    arguments: string;          // JSON 字符串 (流式拼接)
  };
  // ── 以下字段仅前端使用，不发给 LLM API ──
  status: ToolCallStatus;
  result?: string;
  parsedArgs?: Record<string, any>;  // JSON.parse(arguments) 缓存
}

type ToolCallStatus =
  | "pending"      // 等待用户确认 (manual 工具)
  | "approved"     // 用户已确认，等待执行
  | "executing"    // 工具执行中 (auto 工具直接进入此状态)
  | "completed"    // 执行成功
  | "error"        // 执行失败
  | "cancelled";   // 用户取消
```

### 2.2 工具定义模型

```typescript
// src/lib/tools/types.ts

interface ToolMeta {
  autoExecute: boolean;     // true = AI 调用后直接执行，不弹确认卡片
  displayName: string;      // UI 展示用中文名
  icon: string;             // emoji 图标
  risk: "safe" | "sensitive" | "dangerous";
}

interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

interface ToolDefinition {
  type: "function";
  function: FunctionDefinition;
  meta: ToolMeta;  // 不发给 LLM，仅运行时使用
}

interface ToolExecutor {
  definition: ToolDefinition;
  execute: (args: Record<string, any>) => Promise<string>;
}

type ToolRegistry = Map<string, ToolExecutor>;
```

### 2.3 传输协议消息类型

```typescript
// WebSocket 消息类型
interface WSMessage {
  type: "send";
  sessionId: string;
  messages: ChatMessage[];  // 完整会话历史
}

// WebSocket 响应类型 (扩展)
type WSResponse =
  | { type: "chunk"; data: string }                           // 文本 token
  | { type: "tool_calls"; data: ToolCall[] }                  // 🆕 工具调用
  | { type: "done"; data: string; finishReason: string }      // 完成 (扩展)
  | { type: "error"; data: string };                          // 错误

// SSE 流事件类型
type SSEEvent =
  | { type: "chunk"; data: string }
  | { type: "tool_calls"; data: ToolCall[] }
  | { type: "done"; data: string; finishReason: string }
  | { type: "error"; data: string };
```

## 3. 核心流程

### 3.1 Tool Call 完整交互流程

```
用户输入 → POST chat (messages) → SSE 流式响应
                                        │
                          ┌─────────────┼─────────────┐
                          ▼                           ▼
                   finish_reason="stop"        finish_reason="tool_calls"
                          │                           │
                          ▼                           ▼
                    正常展示回复              解析 tool_calls[]
                          │                      │
                          │              ┌───────┴───────┐
                          │              ▼               ▼
                          │        autoExecute      autoExecute
                          │         = true           = false
                          │              │               │
                          │        并发调 execute    渲染 ToolCallCard
                          │              │          [执行] [取消]
                          │              │               │
                          │              └───────┬───────┘
                          │                  全部 resolved
                          │                      │
                          │              构造 tool 消息数组
                          │              追加到 messages
                          │                      │
                          │              再次 POST chat
                          │                      │
                          └──────────────────────┘
                                   循环直到 finish_reason="stop"
```

### 3.2 page.tsx 状态机

```typescript
type ChatPhase =
  | "idle"               // 等待用户输入
  | "streaming"          // AI 流式回复中
  | "awaiting_tools"     // 等待工具执行 (manual 工具需要用户操作)
  | "sending_tools"      // 发送工具结果 → 准备下一轮 AI 调用

// 新增状态
const [chatPhase, setChatPhase] = useState<ChatPhase>("idle");
const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]);
```

状态转换：

```
  idle ──(用户发送消息)──▶ streaming ──(finish_reason)──▶ idle
                                   │
                                   └──("tool_calls")──▶ awaiting_tools
                                                              │
                                              (全部 resolved)──▶ sending_tools
                                                                      │
                                                       (自动触发)──────▶ streaming
```

### 3.3 并行工具处理逻辑

```typescript
async function handleToolCalls(
  messages: ChatMessage[],
  assistantMsg: ChatMessage,
  toolCalls: ToolCall[]
): Promise<void> {
  // 1. 按 autoExecute 分流
  const autoTools = toolCalls.filter(tc => getToolMeta(tc).autoExecute);
  const manualTools = toolCalls.filter(tc => !getToolMeta(tc).autoExecute);

  // 2. Auto 工具立即并发执行
  const autoPromises = autoTools.map(tc =>
    executeTool(tc.function.name, JSON.parse(tc.function.arguments))
      .then(result => { tc.status = "completed"; tc.result = result; })
      .catch(err => { tc.status = "error"; tc.result = err.message; })
  );

  // 3. Manual 工具等用户操作 (setPendingToolCalls → UI 渲染)
  setPendingToolCalls([...autoTools, ...manualTools]);
  setChatPhase("awaiting_tools");

  // 4. Auto 的先执行完 → 更新状态
  await Promise.all(autoPromises);

  // 5. 等待 manual 的也 resolved (用户操作触发)
  await waitForManualResolution(manualTools);

  // 6. 所有 tool results → 构造 tool 消息 → 发回 AI
  const toolMessages = toolCalls
    .filter(tc => tc.status === "completed")
    .map(tc => ({
      id: uuidv4(),
      role: "tool" as const,
      tool_call_id: tc.id,
      name: tc.function.name,
      content: tc.result || "",
      timestamp: Date.now(),
    }));

  const newMessages = [...messages, assistantMsg, ...toolMessages];
  setChatPhase("sending_tools");
  await sendChatMessages(newMessages);  // 触发新一轮 streaming
}
```

## 4. 流式解析改造

### 4.1 OpenAI Chunk 解析状态机

```
                              ┌─────────┐
                              │  IDLE   │
                              └────┬────┘
                                   │
                    收到第一个 chunk (delta.role)
                                   │
                                   ▼
                         ┌──────────────────┐
                    ┌───▶│  ACCUMULATING    │◀───┐
                    │    └────────┬─────────┘    │
                    │             │               │
                    │    ┌────────┼────────┐      │
                    │    ▼                 ▼      │
                    │ delta.content     delta.    │
                    │   !== null     tool_calls   │
                    │    │            !== null    │
                    │    ▼                 ▼      │
                    │ onChunk()    累积 tool_call  │
                    │ 文本追加      args 片段      │
                    │    │                 │      │
                    │    └────────┬────────┘      │
                    │             │               │
                    └─────────────┘               │
                                   │              │
                              finish_reason       │
                                   │              │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              │
               "stop"       "tool_calls"    (stream中断)
                    │              │              │
                    ▼              ▼              ▼
              onComplete()   onToolCalls()   onError()
              纯文本完成      附带完整        异常中断
                             工具调用列表
```

### 4.2 SSE 解析实现要点 (useSSEQueue.ts 改动)

```typescript
// 每一行 data: <JSON> 解析为 OpenAI chunk
interface DeltaChunk {
  choices?: [{
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      tool_calls?: [{
        index: number;
        id?: string;
        type?: "function";
        function?: {
          name?: string;
          arguments?: string;
        };
      }];
    };
    finish_reason?: "stop" | "tool_calls" | null;
  }];
}

// 解析循环核心逻辑
let textBuffer = "";
let toolCallsMap = new Map<number, ToolCall>();  // index → toolCall 累积

for (const line of sseLines) {
  const chunk: DeltaChunk = JSON.parse(dataStr);
  const delta = chunk.choices?.[0]?.delta;
  const finishReason = chunk.choices?.[0]?.finish_reason;

  // 处理文本内容
  if (delta?.content) {
    textBuffer += delta.content;
    onChunk(delta.content);
  }

  // 处理 tool_calls
  if (delta?.tool_calls) {
    for (const tc of delta.tool_calls) {
      if (!toolCallsMap.has(tc.index)) {
        // 首条 chunk：创建 tool call 对象
        toolCallsMap.set(tc.index, {
          id: tc.id!,
          type: "function",
          function: { name: tc.function!.name!, arguments: "" },
          status: "pending",
        });
      }
      // 后续 chunk：累积 arguments
      if (tc.function?.arguments) {
        const existing = toolCallsMap.get(tc.index)!;
        existing.function.arguments += tc.function.arguments;
      }
    }
  }

  // 处理结束
  if (finishReason) {
    const toolCalls = Array.from(toolCallsMap.values());
    if (finishReason === "tool_calls" && toolCalls.length > 0) {
      onToolCalls(toolCalls);
    }
    onComplete(textBuffer, finishReason);
  }
}
```

### 4.3 WebSocket 解析 (useWebSocket.ts 改动)

WebSocket 服务器的响应格式保持不变——后端已经将 chunk 处理成 `{ type, data }` 格式发给前端，所以 WebSocket hook 的解析逻辑不需要大改。但 `WSResponse` 的 `type` 需要扩展 `"tool_calls"` 类型：

```typescript
// useWebSocket.ts — onmessage 改动
ws.onmessage = (event) => {
  const response: WSResponse = JSON.parse(event.data);
  const handler = messageHandlersRef.current.get(response.messageId);

  switch (response.type) {
    case "chunk":
      handler?.onChunk?.(response.data);
      break;
    case "tool_calls":                              // 🆕
      handler?.onToolCalls?.(response.data);        // 🆕
      break;
    case "done":
      handler?.resolve(response.data);
      onCompleteRef.current?.(response.data, response.finishReason);  // 扩展
      messageHandlersRef.current.delete(response.messageId);
      break;
    case "error":
      handler?.reject(new Error(response.data));
      onErrorRef.current?.(new Error(response.data));
      messageHandlersRef.current.delete(response.messageId);
      break;
  }
};
```

## 5. 后端设计

### 5.1 LLM 调用改造 (chain.ts)

```typescript
// chain.ts 核心改动

import { ChatOpenAI } from "@langchain/openai";
import { toolDefinitions } from "@/lib/tools/definitions";

export class ChatChainService {
  private llm: ChatOpenAI | null = null;
  private memories: Map<string, SummaryBufferMemory> = new Map();

  private getOrCreateLLM(): ChatOpenAI {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: "mock-interview-model",  // 改：新 API 的 model
        apiKey: "not-needed",              // 改：新 API 可能不需要
        temperature: 0.7,
        streaming: true,
        configuration: {
          baseURL: "http://103.242.175.254:20022/v1",  // 改：新端点
        },
      });
    }
    return this.llm;
  }

  // 🆕 返回类型扩展：包含 tool_calls
  async generateResponse(
    sessionId: string,
    messages: ChatMessage[],                     // 🆕 接收完整历史
    onToken?: (token: string) => void,
    onToolCallChunk?: (toolCall: ToolCall) => void,  // 🆕
  ): Promise<{
    content: string;
    finishReason: string;
    toolCalls: ToolCall[];
  }> {
    const llm = this.getOrCreateLLM();
    const llmWithTools = llm.bindTools(toolDefinitions);

    // 转换 ChatMessage[] → LangChain BaseMessage[]
    const lcMessages = this.convertToLangChainMessages(messages);

    const stream = await llmWithTools.stream(lcMessages);

    let fullContent = "";
    const toolCallsMap = new Map<string, ToolCall>();
    let finishReason = "stop";

    for await (const chunk of stream) {
      // 处理文本内容
      if (chunk.content) {
        const text = typeof chunk.content === "string"
          ? chunk.content
          : chunk.content.toString();
        fullContent += text;
        onToken?.(text);
      }

      // 处理 tool_calls
      if (chunk.tool_call_chunks?.length) {
        for (const tcChunk of chunk.tool_call_chunks) {
          const id = tcChunk.id || "";
          if (!toolCallsMap.has(id)) {
            toolCallsMap.set(id, {
              id,
              type: "function",
              function: { name: tcChunk.name || "", arguments: "" },
              status: "pending",
            });
          }
          if (tcChunk.args) {
            const existing = toolCallsMap.get(id)!;
            existing.function.arguments += tcChunk.args;
            onToolCallChunk?.(existing);
          }
        }
      }

      // 处理 finish_reason
      if (chunk.response_metadata?.finish_reason) {
        finishReason = chunk.response_metadata.finish_reason;
      }
    }

    return {
      content: fullContent,
      finishReason,
      toolCalls: Array.from(toolCallsMap.values()),
    };
  }

  // 🆕 消息格式转换
  private convertToLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case "user": return new HumanMessage(msg.content);
        case "assistant":
          if (msg.tool_calls?.length) {
            return new AIMessage({
              content: msg.content,
              tool_calls: msg.tool_calls.map(tc => ({
                id: tc.id,
                type: "function",
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments),
              })),
            });
          }
          return new AIMessage(msg.content);
        case "system": return new SystemMessage(msg.content);
        case "tool":
          return new ToolMessage({
            content: msg.content,
            tool_call_id: msg.tool_call_id!,
          });
        default: return new HumanMessage(msg.content);
      }
    });
  }
}
```

### 5.2 API 路由改造 (route.ts)

```typescript
// /api/chat/route.ts 改动

interface ChatRequest {
  sessionId: string;
  messages: ChatMessage[];   // 🆕 完整历史，替代原来的 message: string
}

// SSE 流式响应适配
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();

    const sendEvent = (type: string, data: any) => {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
      );
    };

    try {
      const result = await chatChainService.generateResponse(
        body.sessionId,
        body.messages,
        (token) => sendEvent("chunk", token),
        (toolCall) => sendEvent("tool_call_chunk", toolCall),  // 🆕 可选
      );

      if (result.toolCalls.length > 0) {
        sendEvent("tool_calls", result.toolCalls);
      }
      sendEvent("done", {
        content: result.content,
        finishReason: result.finishReason,
      });
    } catch (error) {
      sendEvent("error", { message: error.message });
    }
  },
});
```

### 5.3 工具执行端点

```typescript
// 🆕 /api/tools/execute/route.ts

import { toolRegistry } from "@/lib/tools/registry";

export async function POST(request: Request) {
  try {
    const { name, arguments: args } = await request.json();

    const executor = toolRegistry.get(name);
    if (!executor) {
      return Response.json(
        { status: "error", result: `未知工具: ${name}` },
        { status: 404 }
      );
    }

    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    const result = await executor.execute(parsedArgs);

    return Response.json({ status: "success", result });
  } catch (error) {
    return Response.json({
      status: "error",
      result: error instanceof Error ? error.message : "工具执行失败",
    });
  }
}
```

### 5.4 工具实现 (definitions.ts + executor.ts)

```typescript
// src/lib/tools/definitions.ts

import { ToolDefinition } from "./types";

export const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_current_time",
      description: "获取当前日期和时间。当用户询问当前时间、日期、星期几、今天几号时使用此工具。",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "IANA时区名，如 Asia/Shanghai, America/New_York，默认 Asia/Shanghai",
          },
        },
      },
    },
    meta: {
      autoExecute: true,
      displayName: "获取当前时间",
      icon: "🕐",
      risk: "safe",
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "查询指定城市的当前天气信息（温度、湿度、天气状况）。当用户询问天气时需要调用。",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "城市名称，如 Beijing, Shanghai, Tokyo",
          },
        },
        required: ["city"],
      },
    },
    meta: {
      autoExecute: true,
      displayName: "查询天气",
      icon: "🌤️",
      risk: "safe",
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "执行数学计算。当用户需要进行精确的数学运算时使用此工具。支持基本运算和Math函数。",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "数学表达式。支持: +, -, *, /, **, Math.sqrt(), Math.sin(), Math.cos(), Math.pow(), Math.abs(), Math.round(), Math.PI, Math.E, 括号等",
          },
        },
        required: ["expression"],
      },
    },
    meta: {
      autoExecute: true,
      displayName: "数学计算",
      icon: "🧮",
      risk: "safe",
    },
  },
];
```

```typescript
// src/lib/tools/executor.ts

import { ToolExecutor } from "./types";
import { toolDefinitions } from "./definitions";
import { toolRegistry } from "./registry";

// 时间工具
export const getCurrentTimeExecutor: ToolExecutor = {
  definition: toolDefinitions[0],
  async execute(args) {
    const timezone = args.timezone || "Asia/Shanghai";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "long",
    });
    return formatter.format(now);
  },
};

// 天气工具 (mock)
export const getWeatherExecutor: ToolExecutor = {
  definition: toolDefinitions[1],
  async execute(args) {
    const city = args.city || "Beijing";
    // Mock 数据
    const conditions = ["晴", "多云", "阴", "小雨", "阵雨"];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const temp = Math.floor(Math.random() * 20) + 15;  // 15-35°C
    const humidity = Math.floor(Math.random() * 40) + 40;  // 40-80%
    return JSON.stringify({
      city,
      temperature: `${temp}°C`,
      humidity: `${humidity}%`,
      condition,
      updateTime: new Date().toLocaleString("zh-CN"),
      note: "（Mock 数据）",
    });
  },
};

// 计算工具
export const calculateExecutor: ToolExecutor = {
  definition: toolDefinitions[2],
  async execute(args) {
    const expression = args.expression || "";
    // 安全校验：只允许数学表达式和 Math 函数
    const allowed = /^[\d\s+\-*/().%Math\.sincotaglqrpwe\s,]+$/;
    if (!allowed.test(expression)) {
      throw new Error("表达式包含不允许的字符");
    }
    // 禁用危险操作
    const forbidden = ["__proto__", "constructor", "prototype", "global", "globalThis", "process", "require", "import", "fetch"];
    for (const word of forbidden) {
      if (expression.includes(word)) {
        throw new Error("表达式包含禁止的关键字");
      }
    }
    // 在受限作用域中执行
    const result = new Function(
      "Math",
      `"use strict"; return (${expression});`
    )(Math);
    return String(result);
  },
};

// 注册
export function registerAllTools(): void {
  toolRegistry.register(getCurrentTimeExecutor);
  toolRegistry.register(getWeatherExecutor);
  toolRegistry.register(calculateExecutor);
}
```

## 6. 前端组件设计

### 6.1 ToolCallCard 状态设计

```
状态 = pending (manual 工具，等用户确认)
┌────────────────────────────────────────────────────────┐
│ 📄 read_file                              ⚠️ 敏感操作  │
│                                                        │
│ 读取 /etc/config.json                                  │
│                                                        │
│                              [▶ 允许执行]  [✕ 拒绝]    │
└────────────────────────────────────────────────────────┘

状态 = executing (auto 或已确认，执行中)
┌────────────────────────────────────────────────────────┐
│ 🕐 get_current_time                         ⏳ 执行中  │
└────────────────────────────────────────────────────────┘

状态 = completed (执行成功)
┌────────────────────────────────────────────────────────┐
│ 🕐 get_current_time                          ✅ 完成   │
│ 2026年7月11日 21:30:45 CST                            │
└────────────────────────────────────────────────────────┘

状态 = error (执行失败)
┌────────────────────────────────────────────────────────┐
│ 🌤️ get_weather                              ❌ 失败   │
│ Error: 城市 "AbcXyz" 不存在                             │
└────────────────────────────────────────────────────────┘

状态 = cancelled (用户拒绝)
┌────────────────────────────────────────────────────────┐
│ 📄 read_file                               🚫 已取消   │
└────────────────────────────────────────────────────────┘
```

### 6.2 VirtualMessageList 改动

当前渲染逻辑：
```
messages.map(msg → msg.role === "user" ? 右对齐气泡 : 左对齐气泡)
```

改动后需要新增 `role === "tool"` 的处理：
```
msg.role === "tool" → 渲染 ToolCallResult（工具结果摘要，嵌入在 AI 消息流中）
msg.role === "assistant" && msg.tool_calls → 渲染 AI 文本 + ToolCallGroup
```

### 6.3 page.tsx 改动摘要

```typescript
// 新增 state
const [chatPhase, setChatPhase] = useState<ChatPhase>("idle");
const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]);
const [currentSessionMessages, setCurrentSessionMessages] = useState<ChatMessage[]>([]);

// onChunk — 不变
// onToolCalls — 🆕
//   set pendingToolCalls
//   autoExecute → 直接并发调 POST /api/tools/execute
//   !autoExecute → 等用户点击
// 全部 resolved → 构造 tool 消息 → 追加到 messages → sendChatMessages

// handleSendMessage 改动：
//   不再只传 (sessionId, message)
//   改为传 (sessionId, messages: ChatMessage[])

// handleToolExecute(toolCallId) — 🆕 用户点击执行
// handleToolCancel(toolCallId) — 🆕 用户点击取消
```

## 7. WebSocket 服务端改造 (server.ts)

WebSocket 服务端同样需要适配：
- 接收 `{ messages: ChatMessage[] }` 替代 `{ message: string }`
- 响应新增 `type: "tool_calls"` 消息
- `type: "done"` 新增 `finishReason` 字段
- 会话记忆管理：不再需要单独 `addMessageToMemory`，因为前端每次发完整历史

```typescript
// ws server.ts 改动
interface WebSocketMessage {
  sessionId: string;
  messages: ChatMessage[];  // 🆕 完整历史
}

// 处理流程：
// 1. 用 messages 中的最后一条 user 消息更新记忆
// 2. 调用 chatChainService.generateResponse(sessionId, messages, onToken, onToolCall)
// 3. 流式发送 type: "chunk" / "tool_calls" / "done"
```

## 8. API 适配注意事项

基于 API 文档 (`http://103.242.175.254:20022/v1/chat/completions`)：

| 约束 | 处理方式 |
|------|----------|
| 无状态，每次请求需完整 messages | 前端 localStorage 存储完整历史，每次请求携带 |
| `stream: true` 强制 | LangChain 的 `streaming: true` 对应 |
| `assistant(tool_calls)` 后必须跟 `tool` 消息 | page.tsx 在 tool 执行完成后自动构造 tool 消息 |
| 最后一条消息不能是 `assistant` | 发送前校验，确保以 user 或 tool 结尾 |
| 20% 概率返回错误 | 前端 onError 处理 + 重试提示 |
| 流中断不发送 `[DONE]` | 前端超时检测 + 连接关闭检测 |
| `finish_reason: "tool_calls"` 表示需要调用工具 | 解析 end chunk 中的 finish_reason |
| `arguments` 是流式 JSON 字符串拼接 | 解析器中累积所有 chunk 的 arguments 片段 |

## 9. 风险与边界情况

| 场景 | 处理 |
|------|------|
| 用户取消 manual 工具 | 该 tool call 标记为 cancelled，不包含在回传 tool 消息中 |
| 多个工具部分成功部分失败 | 成功的 tool 消息正常回传，失败的标记 status=error 但仍包含在 messages 中 |
| AI 连续多次 tool_calls | 循环处理，每次收到 tool_calls 就进入 awaiting_tools → sending_tools → streaming 循环 |
| 对话历史过长 | SummaryBufferMemory 压缩旧消息，但 tool 消息不参与摘要压缩（保持结构完整性） |
| 工具执行超时 | 初版不处理，后续迭代增加超时机制 |
| API error (20% 概率) | onError 回调 → 展示错误消息 + 允许重试 |
| 消息结构非法 (400) | 前端校验 + 错误消息展示 |

## 10. 兼容性

- **向后兼容**：`ChatMessage` 的 `tool_calls`、`tool_call_id`、`name` 均为可选字段，旧会话数据加载时不会报错
- **localStorage**：旧格式的 messages 没有新增字段，`JSON.parse` 后这些字段为 `undefined`，代码中使用 `??` / `?.` 访问
- **降级方案**：如果 API 不支持 tool calling（返回纯文本），现有流程正常运作，不会 break
