import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession, ChatMessage, chatChainService } from '@/lib/langchain/chain';

const SESSIONS_KEY = 'chat_sessions';

function getSessions(): ChatSession[] {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function GET() {
  const sessions = getSessions();
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const session: ChatSession = {
      id: uuidv4(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const sessions = getSessions();
    sessions.unshift(session);
    saveSessions(sessions);

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建会话失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, messages } = body;

    const sessions = getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);

    if (index === -1) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    sessions[index] = {
      ...sessions[index],
      messages: messages as ChatMessage[],
      updatedAt: Date.now(),
    };
    saveSessions(sessions);

    await chatChainService.loadMessagesToMemory(sessionId, messages as ChatMessage[]);

    return NextResponse.json(sessions[index]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新会话失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: '缺少 sessionId' }, { status: 400 });
    }

    const sessions = getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    saveSessions(filtered);

    chatChainService.clearSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除会话失败' },
      { status: 500 }
    );
  }
}
