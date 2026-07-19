import { ChatOpenAI } from "@langchain/openai";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { SummaryBufferMemory } from "./memory";
import { ToolCall } from "@/lib/tools/types";
import { toolDefinitions } from "@/lib/tools/definitions";
import { registerAllTools } from "@/lib/tools/executor";

let toolsRegistered = false;
function ensureToolsRegistered(): void {
  if (!toolsRegistered) {
    registerAllTools();
    toolsRegistered = true;
  }
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export class ChatChainService {
  private memories: Map<string, SummaryBufferMemory> = new Map();
  private llm: ChatOpenAI | null = null;

  private getOrCreateLLM(): ChatOpenAI {
    if (!this.llm) {
      ensureToolsRegistered();
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error(
          "DeepSeek API key not found. Please set DEEPSEEK_API_KEY environment variable."
        );
      }
      this.llm = new ChatOpenAI({
        modelName: "deepseek-chat",
        apiKey: apiKey,
        temperature: 0.7,
        streaming: true,
        configuration: {
          baseURL: "https://api.deepseek.com/v1",
        },
      });
    }
    return this.llm;
  }

  private getOrCreateMemory(sessionId: string): SummaryBufferMemory {
    if (!this.memories.has(sessionId)) {
      this.memories.set(
        sessionId,
        new SummaryBufferMemory({
          maxTokenLimit: parseInt(process.env.MAX_CONTEXT_TOKENS || "8000"),
          summaryThreshold: parseInt(process.env.SUMMARY_THRESHOLD || "4000"),
          llm: this.getOrCreateLLM(),
        })
      );
    }
    return this.memories.get(sessionId)!;
  }

  /** 使用 LangChain + DeepSeek，绑定工具，处理流式 tool calls */
  public async generateResponse(
    sessionId: string,
    messages: ChatMessage[],
    onToken?: (token: string) => void
  ): Promise<{
    content: string;
    finishReason: string;
    toolCalls: ToolCall[];
  }> {
    ensureToolsRegistered();
    const llm = this.getOrCreateLLM();

    // 绑定工具定义（去掉 meta）
    const llmWithTools = llm.bindTools(
      toolDefinitions.map((d) => {
        const { meta: _meta, ...def } = d;
        return def;
      }) as any
    );

    // 转换为 LangChain 消息格式
    const lcMessages = this.convertToLangChainMessages(messages);

    // 更新服务端记忆
    const memory = this.getOrCreateMemory(sessionId);
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "user") {
      try { await memory.addUserMessage(lastMsg.content); } catch { /* ok */ }
    }

    // 流式调用
    const stream = await llmWithTools.stream(lcMessages);

    let fullContent = "";
    const toolCallsMap = new Map<string, ToolCall>();
    let finishReason = "stop";

    for await (const chunk of stream) {
      // 文本内容
      const content = (chunk as any).content;
      if (content && typeof content === "string") {
        fullContent += content;
        onToken?.(content);
      }

      // tool_call_chunks（LangChain 流式 tool call 格式）
      const tcChunks = (chunk as any).tool_call_chunks;
      if (tcChunks?.length) {
        for (const tc of tcChunks) {
          // 始终用 index 作为稳定 key（id 可能在后续 chunk 才出现）
          const idx = tc.index ?? 0;
          const key = String(idx);
          if (!toolCallsMap.has(key)) {
            toolCallsMap.set(key, {
              id: tc.id || "",
              type: "function",
              function: { name: tc.name || "", arguments: "" },
              status: "pending",
            });
          }
          const existing = toolCallsMap.get(key)!;
          if (tc.id && !existing.id) existing.id = tc.id;
          if (tc.name && !existing.function.name) existing.function.name = tc.name;
          if (tc.args) existing.function.arguments += tc.args;
        }
      }

      // finish_reason
      const meta = (chunk as any).response_metadata;
      if (meta?.finish_reason) {
        finishReason = meta.finish_reason;
      }
    }

    // 处理 tool_calls（非流式回退：有些模型在流结束后才提供完整 tool_calls）
    const toolCalls = Array.from(toolCallsMap.values());
    if (toolCalls.length === 0) {
      // 尝试从流的最后一个 chunk 获取（AIMessage 格式）
      // 部分 LangChain 版本在流结束后通过 additional_kwargs 提供
    }

    // 更新记忆
    if (fullContent.trim()) {
      try { await memory.addAIMessage(fullContent); } catch { /* ok */ }
    }

    // 过滤掉不完整的 tool call（没有名字的占位条目）
    const validToolCalls = Array.from(toolCallsMap.values()).filter(
      (tc) => tc.function.name
    );

    return { content: fullContent, finishReason, toolCalls: validToolCalls };
  }

  /** ChatMessage[] → LangChain BaseMessage[] */
  private convertToLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case "user":
          return new HumanMessage(msg.content);
        case "assistant":
          if (msg.tool_calls?.length) {
            return new AIMessage({
              content: msg.content,
              tool_calls: msg.tool_calls.map((tc) => ({
                id: tc.id,
                type: "tool_call" as const,
                name: tc.function.name,
                args: (() => {
                  try { return JSON.parse(tc.function.arguments); } catch {
                    return {};
                  }
                })(),
              })),
            });
          }
          return new AIMessage(msg.content);
        case "system":
          return new SystemMessage(msg.content);
        case "tool":
          return new ToolMessage({
            content: msg.content,
            tool_call_id: msg.tool_call_id!,
          });
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  public async addMessageToMemory(
    sessionId: string,
    message: ChatMessage
  ): Promise<void> {
    const memory = this.getOrCreateMemory(sessionId);
    if (message.role === "user") {
      await memory.addUserMessage(message.content);
    } else if (message.role === "assistant") {
      await memory.addAIMessage(message.content);
    }
  }

  public getMemoryStats(sessionId: string) {
    const memory = this.memories.get(sessionId);
    if (!memory) return null;
    return {
      tokenCount: memory.getTokenCount(),
      summary: memory.getSummary(),
      messageCount: memory.chatHistory.messages.length,
    };
  }

  public clearSession(sessionId: string): void {
    this.memories.delete(sessionId);
  }

  public async loadMessagesToMemory(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    const memory = this.getOrCreateMemory(sessionId);
    memory.clear();
    for (const msg of messages) {
      if (msg.role === "user") {
        await memory.addUserMessage(msg.content);
      } else if (msg.role === "assistant") {
        await memory.addAIMessage(msg.content);
      }
    }
  }
}

export const chatChainService = new ChatChainService();
