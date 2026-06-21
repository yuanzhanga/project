import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { SummaryBufferMemory } from "./memory";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
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

  constructor() {
    // 延迟初始化，只在需要时才创建 LLM
  }

  private getOrCreateLLM(): ChatOpenAI {
    if (!this.llm) {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error(
          "DeepSeek API key not found. Please set DEEPSEEK_API_KEY environment variable.",
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
        }),
      );
    }
    return this.memories.get(sessionId)!;
  }

  public async generateResponse(
    sessionId: string,
    userMessage: string,
    onToken?: (token: string) => void,
  ): Promise<string> {
    const llm = this.getOrCreateLLM();
    const memory = this.getOrCreateMemory(sessionId);
    const history = await memory.loadMemoryVariables();
    const chatHistory = history.chat_history as BaseMessage[];

    const historyText = chatHistory
      .map((msg) => {
        if (msg instanceof HumanMessage) return `Human: ${msg.content}`;
        if (msg instanceof AIMessage) return `AI: ${msg.content}`;
        if (msg instanceof SystemMessage) return `System: ${msg.content}`;
        return `Unknown: ${msg.content}`;
      })
      .join("\n");

    const prompt = PromptTemplate.fromTemplate(
      `你是一个有帮助的AI助手。请根据对话历史和用户的最新问题提供有用的回答。

对话历史：
{chat_history}

用户问题：
{input}

AI回答：`,
    );

    if (onToken) {
      const chain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
      ]);
      const stream = await chain.stream({
        chat_history: historyText,
        input: userMessage,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        fullResponse += chunk;
        onToken(chunk);
      }
      return fullResponse;
    } else {
      const chain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
      ]);
      const result = await chain.invoke({
        chat_history: historyText,
        input: userMessage,
      });
      return result;
    }
  }

  public async addMessageToMemory(
    sessionId: string,
    message: ChatMessage,
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
    messages: ChatMessage[],
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
