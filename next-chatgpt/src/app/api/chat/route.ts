import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, chatChainService } from '@/lib/langchain/chain';
import { workerPool } from '@/lib/queue/workerPool';

interface ChatRequest {
  sessionId: string;
  message: string;
  provider?: string;
}

interface ChatResponse {
  sessionId: string;
  messageId: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ChatRequest;
    
    if (!body.sessionId || !body.message) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const messageId = uuidv4();
    
    const userMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      content: body.message,
      timestamp: Date.now(),
    };

    await chatChainService.addMessageToMemory(body.sessionId, userMessage);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const encoder = new TextEncoder();
          
          // 使用 WorkerPool 处理请求
          const onToken = (token: string) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`));
          };

          const response = await workerPool.process(
            body.sessionId,
            body.message,
            onToken
          );

          const aiMessage: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: response,
            timestamp: Date.now(),
          };
          
          await chatChainService.addMessageToMemory(body.sessionId, aiMessage);

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}
