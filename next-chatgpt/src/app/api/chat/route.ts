import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage, chatChainService } from "@/lib/langchain/chain";
import { workerPool, GenerateResult } from "@/lib/queue/workerPool";

interface ChatRequest {
  sessionId: string;
  messages: ChatMessage[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;

    if (!body.sessionId || !body.messages?.length) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type, data })}\n\n`
            )
          );
        };

        try {
          const result: GenerateResult = await workerPool.process(
            body.sessionId,
            body.messages,
            (token) => sendEvent("chunk", token)
          );

          // 发送 tool_calls（如果存在）
          if (result.toolCalls.length > 0) {
            sendEvent("tool_calls", result.toolCalls);
          }

          // 发送完成事件
          sendEvent("done", {
            content: result.content,
            finishReason: result.finishReason,
          });

          // 发送结束标记（兼容旧客户端）
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          sendEvent("error", {
            message:
              error instanceof Error ? error.message : "服务器内部错误",
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器内部错误" },
      { status: 500 }
    );
  }
}
