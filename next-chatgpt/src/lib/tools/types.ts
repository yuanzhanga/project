// === 工具元信息 ===
export interface ToolMeta {
  /** true = AI 调用后直接执行，不弹确认卡片 */
  autoExecute: boolean;
  /** UI 展示用中文名 */
  displayName: string;
  /** emoji 图标 */
  icon: string;
  /** 危险等级 */
  risk: "safe" | "sensitive" | "dangerous";
}

// === 工具函数定义（对齐 OpenAI function calling 格式） ===
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
}

// === 完整工具定义（含元信息） ===
export interface ToolDefinition {
  type: "function";
  function: FunctionDefinition;
  meta: ToolMeta; // 不发给 LLM，仅运行时使用
}

// === 工具执行器 ===
export interface ToolExecutor {
  definition: ToolDefinition;
  execute: (args: Record<string, any>) => Promise<string>;
}

// === 工具注册表类型 ===
export type ToolRegistry = Map<string, ToolExecutor>;

// === Tool Call 状态 ===
export type ToolCallStatus =
  | "pending"     // 等待用户确认 (manual 工具)
  | "approved"    // 用户已确认，等待执行
  | "executing"   // 工具执行中 (auto 工具直接进入此状态)
  | "completed"   // 执行成功
  | "error"       // 执行失败
  | "cancelled";  // 用户取消

// === Tool Call 对象（前后端共享） ===
export interface ToolCall {
  id: string;                    // API 返回的 call id，如 "call_abc123"
  type: "function";
  function: {
    name: string;                // 工具名，如 "get_current_time"
    arguments: string;           // JSON 字符串（流式拼接）
  };
  // ── 以下字段仅前端使用，不发给 LLM API ──
  status: ToolCallStatus;
  result?: string;
  parsedArgs?: Record<string, any>;  // JSON.parse(arguments) 缓存
}

// === 聊天状态阶段 ===
export type ChatPhase =
  | "idle"              // 等待用户输入
  | "streaming"         // AI 流式回复中
  | "awaiting_tools"    // 等待工具执行 (manual 工具需要用户操作)
  | "sending_tools";    // 发送工具结果 → 准备下一轮 AI 调用
