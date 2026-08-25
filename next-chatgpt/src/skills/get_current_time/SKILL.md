---
name: get_current_time
description: 获取当前日期和时间。当用户询问当前时间、日期、星期几、今天几号时使用此工具。
displayName: 获取当前时间
icon: "🕐"
autoExecute: true
risk: safe
parameters: {"type":"object","properties":{"timezone":{"type":"string","description":"IANA时区名，如 Asia/Shanghai, America/New_York，默认 Asia/Shanghai"}}}
---

## 使用说明

- 当用户询问现在几点、今天几号、星期几、当前日期时间时调用。
- `timezone` 默认 `Asia/Shanghai`；用户提到其他国家/地区时按其指定时区。
- 无需联网，直接返回本地时间。
