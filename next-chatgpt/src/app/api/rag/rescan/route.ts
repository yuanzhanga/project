import { NextResponse } from "next/server";
import { rescanDocuments } from "@/lib/rag/service";

export async function POST() {
  try {
    const result = await rescanDocuments();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "扫描失败" },
      { status: 400 }
    );
  }
}
