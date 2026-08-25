---
name: get_weather
description: 查询指定城市的当前天气信息（温度、湿度、天气状况）。当用户询问天气时需要调用。
displayName: 查询天气
icon: "🌤️"
autoExecute: true
risk: safe
parameters: {"type":"object","properties":{"city":{"type":"string","description":"城市名称，如 Beijing, Shanghai, Tokyo"}},"required":["city"]}
---

## 使用说明

- 当用户询问某个城市的天气、温度、湿度时调用。
- `city` 必填，用城市中文名或英文名均可。
- 当前为 Mock 数据，仅示例返回结构；接入真实天气 API 时替换实现。
