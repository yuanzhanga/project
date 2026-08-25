---
name: calculate
description: 执行数学计算。当用户需要进行精确的数学运算时使用此工具。支持基本运算和Math函数。
displayName: 数学计算
icon: "🧮"
autoExecute: true
risk: safe
parameters: {"type":"object","properties":{"expression":{"type":"string","description":"数学表达式。支持: +, -, *, /, **, Math.sqrt(), Math.sin(), Math.cos(), Math.pow(), Math.abs(), Math.round(), Math.PI, Math.E, 括号等"}},"required":["expression"]}
---

## 使用说明

- 当用户需要计算器、公式求值、百分比、单位换算等精确计算时调用。
- 只允许包含数字、运算符、括号和 Math 函数，禁止执行任意代码。
- 示例请求：`sqrt(2) * 10 + (3+4)**2`
