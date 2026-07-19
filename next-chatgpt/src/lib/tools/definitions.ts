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
];
