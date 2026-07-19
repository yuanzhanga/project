import { v4 as uuidv4 } from "uuid";
import { chatChainService, ChatMessage } from "@/lib/langchain/chain";
import { ToolCall } from "@/lib/tools/types";

interface QueuedRequest {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  resolve: (result: GenerateResult) => void;
  reject: (error: Error) => void;
  onChunk?: (chunk: string) => void;
  onToolCalls?: (toolCalls: ToolCall[]) => void;
}

export interface GenerateResult {
  content: string;
  finishReason: string;
  toolCalls: ToolCall[];
}

class WorkerPool {
  private queue: QueuedRequest[] = [];
  private activeCount = 0;
  private maxConcurrent = 3;

  async process(
    sessionId: string,
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void,
    onToolCalls?: (toolCalls: ToolCall[]) => void,
  ): Promise<GenerateResult> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: uuidv4(),
        sessionId,
        messages,
        resolve,
        reject,
        onChunk,
        onToolCalls,
      };

      this.queue.push(queuedRequest);
      this.processNext();
    });
  }

  private async processNext() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const request = this.queue.shift()!;

    try {
      const result = await this.executeRPC(request);
      request.resolve(result);
    } catch (error) {
      request.reject(error as Error);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private async executeRPC(request: QueuedRequest): Promise<GenerateResult> {
    const result = await chatChainService.generateResponse(
      request.sessionId,
      request.messages,
      (chunk) => {
        request.onChunk?.(chunk);
      },
    );
    return result;
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

export const workerPool = new WorkerPool();
