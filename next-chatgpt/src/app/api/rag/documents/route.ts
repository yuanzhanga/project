import { NextResponse } from "next/server";
import { deleteDocument, listDocuments } from "@/lib/rag/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ documents: listDocuments() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取文档列表失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少文档 id" }, { status: 400 });
    }
    const ok = await deleteDocument(id);
    if (!ok) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除文档失败" },
      { status: 500 }
    );
  }
}
