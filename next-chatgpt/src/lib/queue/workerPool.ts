import { v4 as uuidv4 } from "uuid";
import { chatChainService } from "@/lib/langchain/chain";
// - 前端限制 ：最多同时 2 个 SSE 请求，避免浏览器连接数限制
// - 后端限制 ：最多同时 3 个 RPC 调用，避免 RPC 连接占满
// - 队列管理 ：超出限制的请求自动排队等待
// - 流式支持 ：保持 SSE 的流式输出特性
// - 请求取消 ：支持取消单个或所有请求
// - 排队 ：超出限制的请求进入队列等待
// - 计数 ：使用计数器跟踪活跃请求数
// - 回调 ：完成后通知队列继续处理下一个
// - 取消 ：AbortController 支持中断请求
interface QueuedRequest {
  id: string;
  sessionId: string;
  message: string;
  resolve: (content: string) => void;
  reject: (error: Error) => void;
  onChunk?: (chunk: string) => void;
}

class WorkerPool {
  private queue: QueuedRequest[] = []; // 等待队列
  private activeCount = 0; // 当前活跃请求数
  private maxConcurrent = 3; // 限制最大并发数
  // 入口方法：接收请求，加入队列
  async process(
    sessionId: string,
    message: string,
    onChunk?: (chunk: string) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: uuidv4(),
        sessionId,
        message,
        resolve,
        reject,
        onChunk,
      };

      this.queue.push(queuedRequest);
      this.processNext();
    });
  }
  // 核心：处理队列中的请求
  private async processNext() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const request = this.queue.shift()!;

    try {
      // 执行实际的 RPC 调用
      const result = await this.executeRPC(request);
      request.resolve(result);
    } catch (error) {
      request.reject(error as Error);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private async executeRPC(request: QueuedRequest): Promise<string> {
    // 调用 chatChainService
    const result = await chatChainService.generateResponse(
      request.sessionId,
      request.message,
      (chunk) => {
        request.onChunk?.(chunk);
      },
    );
    return result;
  }

  // 获取队列状态
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeCount,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

export const workerPool = new WorkerPool();
