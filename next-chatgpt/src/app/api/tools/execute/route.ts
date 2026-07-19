import { NextResponse } from "next/server";
import { toolRegistry } from "@/lib/tools/registry";
import { registerAllTools } from "@/lib/tools/executor";

// 确保工具已注册
try {
  registerAllTools();
} catch (err) {
  console.error("[tools/execute] Failed to register tools:", err);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, arguments: args } = body;

    if (!name) {
      return NextResponse.json(
        { status: "error", result: "缺少工具名称" },
        { status: 400 }
      );
    }

    const executor = toolRegistry.get(name);
    if (!executor) {
      return NextResponse.json(
        { status: "error", result: `未知工具: ${name}` },
        { status: 404 }
      );
    }

    let parsedArgs: Record<string, any> = {};
    if (typeof args === "string" && args) {
      try { parsedArgs = JSON.parse(args); } catch { parsedArgs = {}; }
    } else if (args && typeof args === "object") {
      parsedArgs = args;
    }

    const result = await executor.execute(parsedArgs);

    return NextResponse.json({ status: "success", result });
  } catch (error) {
    console.error("[tools/execute] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        result: error instanceof Error ? `${error.message}\n${error.stack}` : "工具执行失败",
      },
      { status: 500 }
    );
  }
}
