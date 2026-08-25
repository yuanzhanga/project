import { NextResponse } from "next/server";
import { toolRegistry } from "@/lib/tools/registry";
import { registerAllTools } from "@/lib/tools/executor";

export const dynamic = "force-dynamic";

let registered = false;

export async function GET() {
  try {
    if (!registered) {
      registerAllTools();
      registered = true;
    }
    const tools = toolRegistry.getAll().map((e) => ({
      name: e.definition.function.name,
      description: e.definition.function.description,
      meta: e.definition.meta,
    }));
    return NextResponse.json({ tools });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取工具列表失败" },
      { status: 500 }
    );
  }
}
