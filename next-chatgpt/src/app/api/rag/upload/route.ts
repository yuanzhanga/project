import { NextResponse } from "next/server";
import { addDocument } from "@/lib/rag/service";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少文件字段" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const content = buffer.toString("utf-8");
    const result = await addDocument(file.name, content, buffer);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "RAG 上传失败";
    // 业务性错误（如 Ollama 离线、格式不支持）返回 400
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
