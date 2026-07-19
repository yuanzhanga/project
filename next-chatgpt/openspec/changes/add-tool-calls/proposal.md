# Proposal: 添加 Tool Call 功能

## 概述

为 AI 智能助手添加 **Tool Call（函数调用）** 能力，让 AI 能够调用后端工具（如获取时间、查询天气、数学计算）来增强回复。用户在 AI 回复中看到工具调用卡片，可以决定是否执行工具，工具执行结果自动回传给 AI 继续生成回复。

## 动机

当前系统的 AI 回复是纯文本生成，存在以下局限：

- **无实时数据**：AI 不知道当前时间、天气等实时信息
- **无计算能力**：AI 无法执行精确的数学运算
- **无法扩展**：没有机制让 AI 调用外部能力

通过 Tool Call，AI 可以：

1. 识别用户意图 → 决定调用哪个工具
2. 生成工具调用参数 → 展示给用户确认
3. 获取工具执行结果 → 基于结果生成最终回复

## 范围

### 包含

- **3 个内置工具**：`get_current_time`（获取时间）、`get_weather`（查询天气，mock 数据）、`calculate`（数学计算）
- **Tool Call 流式解析**：适配 OpenAI 标准 SSE chunk 格式，支持 tool_calls delta 的流式拼接
- **工具执行确认**：支持 `autoExecute` 参数，自动执行的工具（时间/天气/计算）直接执行，手动执行的工具展示确认卡片
- **多工具并行调用**：支持 AI 同时返回多个 tool_calls，auto 工具并发执行
- **Tool Call 循环**：工具结果自动回传 AI，AI 基于结果继续生成回复
- **LLM 接入切换**：从 DeepSeek 切换到新 API 端点 (`http://103.242.175.254:20022/v1/chat/completions`)
- **完整对话历史**：适配无状态 API，每次请求携带完整 messages 数组

### 不包含

- 数据库相关工具
- 文件系统操作工具（预留扩展点，先实现 autoExecute=false 的框架）
- 用户自定义工具
- 工具调用权限管理

## 关键技术决策

| 决策 | 结论 |
|------|------|
| LLM 调用层 | 保留 LangChain，`ChatOpenAI` 的 baseURL 指向新 API |
| 消息模型 | 扩展 `ChatMessage`，新增 `tool_calls`、`tool_call_id`、`name` 字段，`role` 新增 `"tool"` |
| 传输协议 | 保留 WebSocket + SSE 双通道 fallback 架构 |
| 流式格式 | 适配 OpenAI SSE chunk JSON 格式（`delta.content` + `delta.tool_calls`） |
| 记忆管理 | `SummaryBufferMemory` 保留，用于压缩长对话历史 |
| 工具执行 | 后端 `/api/tools/execute` 端点 |
| 自动/手动 | `autoExecute` 参数：时间/天气/计算 = auto，未来文件操作 = manual |

## 非目标

- 不实现工具调用的审批流程（如多级审批）
- 不实现工具调用的超时和重试机制（初版）
- 不实现工具调用结果缓存
- 不修改现有 prompt 模板的设计风格
