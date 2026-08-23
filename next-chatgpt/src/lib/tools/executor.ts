import { ToolExecutor } from "./types";
import { toolDefinitions } from "./definitions";
import { toolRegistry } from "./registry";

// === get_current_time ===
export const getCurrentTimeExecutor: ToolExecutor = {
  definition: toolDefinitions[0],
  async execute(args) {
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
};

// === get_weather (mock) ===
export const getWeatherExecutor: ToolExecutor = {
  definition: toolDefinitions[1],
  async execute(args) {
    const city = args.city || "Beijing";
    // Mock 数据：随机生成天气
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
};

// === calculate ===
export const calculateExecutor: ToolExecutor = {
  definition: toolDefinitions[2],
  async execute(args) {
    const expression = args.expression || "";

    // 安全校验：只允许数学表达式和 Math 函数
    const allowed = /^[\d\s+\-*/().%Math\.sincotaglqrpwe\s,]+$/;
    if (!allowed.test(expression)) {
      throw new Error("表达式包含不允许的字符");
    }

    // 禁用危险操作
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
};

// === web_search (Serper.dev) ===
export const webSearchExecutor: ToolExecutor = {
  definition: toolDefinitions[3],
  async execute(args) {
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
        `Serper API 请求失败: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // 提取精简结果
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
      2,
    );
  },
};

/** 注册所有内置工具到全局注册表 */
export function registerAllTools(): void {
  toolRegistry.register(getCurrentTimeExecutor);
  toolRegistry.register(getWeatherExecutor);
  toolRegistry.register(calculateExecutor);
  toolRegistry.register(webSearchExecutor);
}
