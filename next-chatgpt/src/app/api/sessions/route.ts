import { NextResponse } from "next/server";
import { ChatMessage, chatChainService } from "@/lib/langchain/chain";
import { sessionStore } from "@/lib/session/sessionStore";

export async function GET() {
  return NextResponse.json(sessionStore.getAll());
}

export async function POST(request: Request) {
  try {
    let id: string | undefined;
    try {
      const body = await request.json();
      id = body?.id;
    } catch {
      // 空 body 时创建一个新的会话 id
    }
    const session = sessionStore.create(id);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建会话失败" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, messages } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
    }

    const updated = sessionStore.update(
      sessionId,
      (messages ?? []) as ChatMessage[]
    );
    if (!updated) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    // 同步服务端记忆，让后续对话基于最新上下文压缩
    await chatChainService.loadMessagesToMemory(sessionId, updated.messages);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新会话失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
    }

    const removed = sessionStore.remove(sessionId);
    if (!removed) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    chatChainService.clearSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除会话失败" },
      { status: 500 }
    );
  }
}
