import { ToolExecutor } from "./types";
import { toolRegistry } from "./registry";
import { loadToolDefinitions } from "@/lib/skills/loader";

type ExecutorFn = (args: Record<string, any>) => Promise<string>;

// 执行器只负责执行业务逻辑；函数说明/参数由 src/skills/*/SKILL.md 提供
const executors: Record<string, ExecutorFn> = {
  // === get_current_time ===
  get_current_time: async (args) => {
    const timezone = args.timezone || "Asia/Shanghai";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "long",
    });
    return formatter.format(now);
  },

  // === get_weather (mock) ===
  get_weather: async (args) => {
    const city = args.city || "Beijing";
    const conditions = ["晴", "多云", "阴", "小雨", "阵雨"];
    const condition =
      conditions[Math.floor(Math.random() * conditions.length)];
    const temp = Math.floor(Math.random() * 20) + 15; // 15-35°C
    const humidity = Math.floor(Math.random() * 40) + 40; // 40-80%
    return JSON.stringify({
      city,
      temperature: `${temp}°C`,
      humidity: `${humidity}%`,
      condition,
      updateTime: new Date().toLocaleString("zh-CN"),
      note: "（Mock 数据）",
    });
  },

  // === calculate ===
  calculate: async (args) => {
    const expression = args.expression || "";

    // 安全校验：只允许数学表达式和 Math 函数
    const allowed = /^[\d\s+\-*/().%Math\.sincotaglqrpwe\s,]+$/;
    if (!allowed.test(expression)) {
      throw new Error("表达式包含不允许的字符");
    }

    const forbidden = [
      "__proto__",
      "constructor",
      "prototype",
      "global",
      "globalThis",
      "process",
      "require",
      "import",
      "fetch",
    ];
    for (const word of forbidden) {
      if (expression.includes(word)) {
        throw new Error("表达式包含禁止的关键字");
      }
    }

    // 在受限作用域中执行（只暴露 Math）
    const result = new Function(
      "Math",
      `"use strict"; return (${expression});`
    )(Math);
    return String(result);
  },

  // === web_search (Serper.dev) ===
  web_search: async (args) => {
    const query = (args.query || "").trim();
    if (!query) {
      throw new Error("搜索关键词不能为空");
    }

    const num = Math.min(Math.max(args.num || 5, 1), 10);
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      throw new Error("SERPER_API_KEY 未配置");
    }

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Serper API 请求失败: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const organic = data.organic || [];
    const results = organic.slice(0, num).map((r: any, i: number) => ({
      index: i + 1,
      title: r.title || "",
      link: r.link || "",
      snippet: r.snippet || "",
    }));

    return JSON.stringify(
      {
        query,
        totalResults: data.searchInformation?.totalResults || "未知",
        searchTime: data.searchInformation?.timeTakenDisplay || "未知",
        results,
      },
      null,
      2
    );
  },
};

/** 注册所有技能（由 SKILL.md 驱动）到全局注册表 */
export function registerAllTools(): void {
  const defs = loadToolDefinitions();
  for (const def of defs) {
    const fn = executors[def.function.name];
    if (!fn) {
      console.warn(`[Tools] 未找到技能 "${def.function.name}" 对应的执行器`);
      continue;
    }
    const executor: ToolExecutor = { definition: def, execute: fn };
    toolRegistry.register(executor);
  }
}

export function getExecutor(name: string): ExecutorFn | undefined {
  return executors[name];
}
