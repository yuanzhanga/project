---
name: web_search
description: 使用 Google 搜索引擎搜索互联网，获取最新的网页信息。当用户询问实时信息、新闻、事实查询、最新动态，或需要从互联网上查找任何信息时使用此工具。
displayName: 网络搜索
icon: "🌐"
autoExecute: true
risk: safe
parameters: {"type":"object","properties":{"query":{"type":"string","description":"搜索关键词，尽量简洁明确。例如: 'GPT-5 release date 2025', '今天的天气北京'"},"num":{"type":"number","description":"返回结果数量，默认为5，最大10"}},"required":["query"]}
---

## 使用说明

- 当用户询问实时信息、新闻、最新动态、事实核查、或本地数据之外的信息时调用。
- `query` 用简洁关键词；`num` 默认 5、最大 10。
- 需要配置 `SERPER_API_KEY` 才能真实执行。
