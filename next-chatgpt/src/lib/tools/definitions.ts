import { ToolDefinition } from "./types";

export const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_current_time",
      description:
        "获取当前日期和时间。当用户询问当前时间、日期、星期几、今天几号时使用此工具。",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description:
              "IANA时区名，如 Asia/Shanghai, America/New_York，默认 Asia/Shanghai",
          },
        },
      },
    },
    meta: {
      autoExecute: true,
      displayName: "获取当前时间",
      icon: "🕐",
      risk: "safe",
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "查询指定城市的当前天气信息（温度、湿度、天气状况）。当用户询问天气时需要调用。",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "城市名称，如 Beijing, Shanghai, Tokyo",
          },
        },
        required: ["city"],
      },
    },
    meta: {
      autoExecute: true,
      displayName: "查询天气",
      icon: "🌤️",
      risk: "safe",
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description:
        "执行数学计算。当用户需要进行精确的数学运算时使用此工具。支持基本运算和Math函数。",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description:
              "数学表达式。支持: +, -, *, /, **, Math.sqrt(), Math.sin(), Math.cos(), Math.pow(), Math.abs(), Math.round(), Math.PI, Math.E, 括号等",
          },
        },
        required: ["expression"],
      },
    },
    meta: {
      autoExecute: true,
      displayName: "数学计算",
      icon: "🧮",
      risk: "safe",
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "使用 Google 搜索引擎搜索互联网，获取最新的网页信息。当用户询问实时信息、新闻、事实查询、最新动态，或者需要从互联网上查找任何信息时使用此工具。返回搜索结果包含标题、链接和摘要。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "搜索关键词，尽量简洁明确。例如: 'GPT-5 release date 2025', '今天的天气北京'",
          },
          num: {
            type: "number",
            description:
              "返回结果数量，默认为5，最大10。不需要大量结果时保持默认值即可。",
          },
        },
        required: ["query"],
      },
    },
    meta: {
      autoExecute: true,
      displayName: "网络搜索",
      icon: "🌐",
      risk: "safe",
    },
  },
];
