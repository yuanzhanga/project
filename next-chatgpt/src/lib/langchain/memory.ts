import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

export interface SummaryBufferMemoryOptions {
  maxTokenLimit?: number;
  summaryThreshold?: number;
  llm?: ChatOpenAI;
  memoryKey?: string;
}

export class SummaryBufferMemory {
  private maxTokenLimit: number;
  private summaryThreshold: number;
  private llm: ChatOpenAI;
  private summary: string;
  private tokenCount: number;
  private messages: BaseMessage[];
  private memoryKey: string;

  constructor(options: SummaryBufferMemoryOptions = {}) {
    this.maxTokenLimit = options.maxTokenLimit || 8000;
    this.summaryThreshold = options.summaryThreshold || 4000;
    this.llm = options.llm || new ChatOpenAI({ 
      modelName: 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY,
      temperature: 0.1,
      configuration: {
        baseURL: 'https://api.deepseek.com/v1',
      },
    });
    this.summary = '';
    this.tokenCount = 0;
    this.messages = [];
    this.memoryKey = options.memoryKey || 'chat_history';
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private calculateTotalTokens(): number {
    let total = this.estimateTokens(this.summary);
    for (const message of this.messages) {
      total += this.estimateTokens(message.content.toString());
    }
    return total;
  }

  private async generateSummary(messages: BaseMessage[]): Promise<string> {
    if (messages.length === 0) return '';

    const messagesText = messages.map((msg) => {
      if (msg instanceof HumanMessage) return `Human: ${msg.content}`;
      if (msg instanceof AIMessage) return `AI: ${msg.content}`;
      if (msg instanceof SystemMessage) return `System: ${msg.content}`;
      return `Unknown: ${msg.content}`;
    }).join('\n');

    const prompt = PromptTemplate.fromTemplate(
      `请对以下对话历史进行简洁但全面的摘要，保留关键信息和上下文：

{messages}

摘要（用中文）：`
    );

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());
    const result = await chain.invoke({ messages: messagesText });
    
    return result.trim();
  }

  public async addUserMessage(message: string): Promise<void> {
    const msg = new HumanMessage(message);
    this.messages.push(msg);
    this.tokenCount = this.calculateTotalTokens();

    if (this.tokenCount > this.summaryThreshold) {
      await this.compressMemory();
    }
  }

  public async addAIMessage(message: string): Promise<void> {
    const msg = new AIMessage(message);
    this.messages.push(msg);
    this.tokenCount = this.calculateTotalTokens();

    if (this.tokenCount > this.summaryThreshold) {
      await this.compressMemory();
    }
  }

  private async compressMemory(): Promise<void> {
    if (this.messages.length <= 2) return;

    const halfIndex = Math.floor(this.messages.length / 2);
    const messagesToSummarize = this.messages.slice(0, halfIndex);
    const remainingMessages = this.messages.slice(halfIndex);

    const newSummary = await this.generateSummary(messagesToSummarize);
    
    this.summary = this.summary 
      ? `先前对话摘要：${this.summary}\n\n最新对话摘要：${newSummary}`
      : newSummary;

    this.messages = remainingMessages;
    this.tokenCount = this.calculateTotalTokens();
  }

  public async loadMemoryVariables(): Promise<{ chat_history: BaseMessage[] }> {
    if (this.summary && this.messages.length > 0) {
      const summaryMessage = new SystemMessage(`对话历史摘要：\n${this.summary}`);
      return {
        chat_history: [summaryMessage, ...this.messages],
      };
    }
    
    return {
      chat_history: this.messages,
    };
  }

  public getSummary(): string {
    return this.summary;
  }

  public getTokenCount(): number {
    return this.tokenCount;
  }

  public clear(): void {
    this.messages = [];
    this.summary = '';
    this.tokenCount = 0;
  }

  get chatHistory(): { messages: BaseMessage[] } {
    return { messages: this.messages };
  }
}
