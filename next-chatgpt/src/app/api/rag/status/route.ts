import { NextResponse } from "next/server";
import { getRagStatus } from "@/lib/rag/service";

// 该接口依赖运行时的 Ollama 检测结果，必须动态渲染
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getRagStatus());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取 RAG 状态失败" },
      { status: 500 }
    );
  }
}
