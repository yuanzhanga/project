# Production · 互动图文标准化生产流程

根据用户需求，按五阶段标准化流程生产互动图文。

## 用法

- `/production`：**主入口（推荐所有用户使用）**。AI 自动引导逐阶段推进，用户只需描述需求。
- `/production:brief [描述]`：只执行 Phase 1（聊聊想法）
- `/production:plan [描述]`：只执行 Phase 2（方案确认）
- `/production:build [change名称]`：只执行 Phase 3（开始实现）
- `/production:review [change名称]`：只执行 Phase 4（验收复查）
- `/production:ship [名称]`：只执行 Phase 5（i18n + 发布）

> **普通用户不需要记子命令。** 输入 `/production`，AI 会一步步引导你走完整个流程。子命令是给熟悉技术细节的用户用的快捷方式。

---

## 核心原则

1. **五段式门禁**：brief → plan → build → review → ship。前一阶段未确认不能进入下一阶段。
2. **聊清楚再动手**：Phase 1 纯聊天（不谈技术），Phase 2 确认所有方案（模板、内容、物料），Phase 3 才写代码。
3. **AI 自动判断复杂度**：AI 在 Phase 2 内部判断是「基于已有模板创建 instance」还是「需要新建模板」，用户看到的是自然语言推荐，不需要知道技术术语。
4. **i18n 最后做**：Phase 3-4 完全不碰翻译，故事写完了、验收通过了，Phase 5 再提取 i18n。
5. **OpenSpec 强制**：Phase 3 实现阶段**必须**走 OpenSpec 流程（propose → apply → archive），不得跳过。
6. **测试必写**：Phase 3 编码时**必须**同步写测试用例，覆盖核心流程、边界条件、异常路径。
7. **复查必跑**：Phase 4 复查时**必须**运行自动验收脚本（`verify.mjs`），验证类型检查 + 测试 + 构建 + 冒烟全部通过。
8. **AI 验收 ≠ 人工验收**：AI 不能打开浏览器看、不能手动点击测试。验收必须脚本化、可机器判断。人工抽查（文案、图片、节奏）是必不可少的。
9. **移动端优先**：所有页面在移动端 WebView 中运行，必须考虑安全区、键盘遮挡、小屏适配。

---

## 工作流总览

```
用户说"我想做一个XX游戏"
  ↓
Phase 1: brief — 聊聊想法
  ├─ 纯对话，不谈技术
  ├─ 聊清楚：题材、玩法、角色、氛围、结局
  └─ 🚪 用户确认需求摘要
  ↓
Phase 2: plan — 方案确认
  ├─ Step 2a: AI 匹配模板（或判断需要新建）
  ├─ Step 2b: 内容方案（章节/角色/结局）
  ├─ Step 2c: 物料方案（图片/BGM/tags）
  └─ 🚪 用户确认所有方案项
  ↓
Phase 3: build — 开始实现
  ├─ OpenSpec propose → apply → archive
  ├─ 编码 + 测试 + 物料生成
  └─ 🚪 测试通过 + 构建成功
  ↓
Phase 4: review — 验收复查
  ├─ 自动验收 (verify.mjs)
  ├─ Remix 合规检查
  └─ 🚪 人工抽查通过
  ↓
Phase 5: ship — i18n + 发布
  ├─ 提取 content keys → 生成 i18n JSON (zh-CN + en)
  ├─ 生成发布物料 + 构建打包
  └─ 产出 workspace/dist_zip/<name>.zip
```

详细流程见各阶段子文件。

---

## 模板速查表

> AI 在 Phase 2 (plan) 根据用户意图查此表匹配模板。

| 模板目录 | 核心玩法 | 状态 | i18n | 实例数 | 适合 | 不适合 |
|---------|---------|------|------|--------|------|--------|
| `companion-chat` | AI 角色对话陪伴 | ready | full | 6 | 角色聊天、恋爱对话、虚拟陪伴 | 无对话的纯叙事 |
| `ai-mystery-dialogue` | AI 推理对话 + 动态 prompt | ready | partial | 1+ | 推理悬疑、侦探对话、AI 嫌疑人 | 静态分支叙事 |
| `ai-romance-drama` | AI 恋爱剧情生成 | ready | partial | 1+ | AI 驱动的恋爱故事 | 非恋爱题材 |
| `comic-mystery` | 漫画分镜叙事 → AI 问答推理 | ready | partial | 6 | 悬疑推理、犯罪侦探、密室解谜 | 体育竞技、恋爱养成 |
| `duo-chat` | 双人 AI 对话 | ready | partial | 1+ | 双角色互动、对决、谈判 | 单人叙事 |
| `romance-battle` | 告白对战，AI 每回合生成叙事 | ready | full | 3 | 恋爱竞争、修罗场、多人恋爱 | 非恋爱题材 |
| `otome-romance` | 乙女恋爱攻略，多角色好感度 | ready | full | 5 | 乙女向、多角色攻略、女性向恋爱 | 男性向题材 |
| `power_struggle` | 权谋斗争，多势力博弈 | ready | full | 3 | 权力斗争、政治博弈、派系对抗 | 轻松日常、恋爱喜剧 |
| `crisis-negotiation` | 危机谈判模拟 | legacy | none | 1+ | 谈判模拟、危机处理 | — |
| `history-simulator` | 历史模拟推演 | legacy | none | 1+ | 历史推演、文明模拟 | — |
| `horror-exploration` | 恐怖场景探索 + 线索收集 | legacy | none | 3 | 恐怖逃脱、密室探索、灵异 | 需要先改造（含 stage2/ 特殊结构） |
| `ai-survival` | AI 生存冒险 | legacy | none | 0 | 生存挑战、末日求生 | 无活跃实例 |
| `branching-romance` | 预置文本叙事 + 选项分支 | legacy | none | 0 | 静态恋爱分支故事 | 无活跃实例 |
| `pelican-town` | 小镇/农场模拟经营 | legacy | none | 0 | 农场经营、小镇生活 | 无活跃实例 |
| `sports-worldcup` | 多步决策 → 算法结算 → 锦标赛 | legacy | none | 0 | 体育竞技、赛事模拟 | 无活跃实例 |
| `survival-roguelike` | 抽卡 + 资源管理 + 非线性事件 | legacy | none | 0 | Roguelike 生存、卡牌驱动 | 无活跃实例 |

**状态说明**：
- **ready**：已完成 template/instance 分离 + i18n 框架，可直接用于生产新 instance
- **legacy**：旧模式（instance 含完整代码副本），需先改造
- **wip**：改造进行中

**i18n 覆盖**：`full` = 全部 12 语言 | `partial` = 部分语言 | `none` = 无 i18n

---

## 运行环境

### 目标平台

所有互动图文产品运行在**移动端 WebView**（嵌入 React Native 原生 App 内），不是桌面浏览器。

### 屏幕规格

- **设计基准**：375×812px（Figma iPhone X 画板）
- **最大宽度**：`max-width: 430px`，居中显示
- **最小宽度**：360px（小屏手机兼容）
- **方向**：竖屏（portrait），不支持横屏

### 安全区（Safe Area）

必须使用 CSS `env(safe-area-inset-*)` 适配刘海屏、底部指示条：

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
```

关键适配位置：
- 顶部导航栏：`padding-top: max(8px, env(safe-area-inset-top))`
- 底部操作区：`padding-bottom: max(12px, env(safe-area-inset-bottom))`
- 全屏遮罩（封面/结局）：同时适配 top 和 bottom

### 键盘适配

移动端输入框弹出键盘时会遮挡底部内容。必须通过 `window.visualViewport` 监听键盘高度，动态调整输入区域。

### 触摸交互

- `touch-action: manipulation` — 消除 300ms 点击延迟
- `-webkit-tap-highlight-color: transparent` — 去除点击高亮
- 滑动手势：水平滑动阈值 50px，水平位移 > 垂直位移 × 1.5 才算有效滑动
- 禁止用户缩放（`user-scalable=no`）

### 返回按钮适配（WebView vs 浏览器）

**核心问题**：WebView 中客户端框架自带原生返回按钮，如果 Web 页面也渲染内嵌返回按钮，会出现两个返回按钮并存。

**解决方案**：按运行环境切换返回按钮的渲染策略。

环境检测：
```ts
import { inApp } from '@inplay/sdk';
// inApp() 检测 window.ReactNativeWebView 是否存在
```

原生导航栏同步：
```ts
import { bridge, initBridge } from '@inplay/template-common';
// bridge.setNavBar(visible, canGoBack) 控制原生返回按钮
```

| 环境 | Web 返回按钮 | 原生返回按钮 | 返回事件来源 |
|------|------------|------------|------------|
| **浏览器** | 显示 | 不存在 | Web 按钮 onClick |
| **WebView** | 隐藏 | `setNavBar` 控制 | `initBridge({ onBack })` |

**检查清单**：
- [ ] 所有 Web 内嵌返回按钮在 WebView 中隐藏
- [ ] `bridge.setNavBar(visible, canGoBack)` 在 phase 切换时正确同步
- [ ] 浏览器模式下 Web 返回按钮照常显示和工作
- [ ] WebView 中隐藏按钮用 `<div />` 占位，保持 flex 布局不塌陷

---

## 可用基础设施

生产新 IP 时，不需要从零造轮子。**不同模板使用的基础设施可能不同**——生产时先选定模板类型，再查看该模板实际导入的库。

### 通信桥（`@inplay/template-common`）

路径：`workspace/standard_templates/`，通过 Vite alias `@inplay/template-common` 导入。这是**大多数标准模板使用的通信桥库**。

```ts
import { bridge, initBridge } from '@inplay/template-common';
```

- `bridge.ai.text()` — AI 文本生成（QA 问答、推理笔记）
- `bridge.ai.image()` — AI 图片生成（运行时重生成分镜）
- `bridge.setNavBar()` / `bridge.instory.*` — 原生桥通信
- `initBridge({ onReady, onBack, onResume })` — 初始化

### 环境检测（`@inplay/sdk`）

```ts
import { inApp } from '@inplay/sdk';
```

用于条件渲染（WebView 中隐藏返回按钮，浏览器中显示）。

### 本地 AI 代理（ai_server）— 图片生成首选

路径：`ai_server/`，端口 `3101`。同步 HTTP 请求，60s 超时，直接返回 base64 data URI。

```bash
cd ai_server
cp .env.example .env   # 填写 ANTHROPIC_AUTH_TOKEN + GEMINI_API_KEY
npm install && npm start
```

### AI 生视频/生 BGM（ArtClaw）— 图片生成备选

路径：`.claude/skills/artclaw-skill/`，通过 `python3 scripts/artclaw.py` CLI 调用。

**ArtClaw 仅在以下场景使用**：
- 视频生成（ai_server 暂不支持）
- BGM / 音效生成（ai_server 暂不支持）
- ai_server 不可用时的图片生成备选

所有 ArtClaw 命令是长时任务，必须异步执行（`run_in_background: true`）。

### 样式系统

不同模板使用不同的样式方案。生产时先查看模板源码确认：

| 模板 | 样式方案 |
|------|---------|
| `comic-mystery` | 纯 CSS 变量（`tokens.css` → `base.css` → `components.css`） |
| `branching-romance` / `otome-romance` / `romance-battle` / `survival-roguelike` | 纯 CSS 变量 |

换视觉风格时只需编辑 `tokens.css` 中的 CSS 变量即可改变整个色板。

---

## 物料生成策略

### 图片生成首选 ai_server，备选 ArtClaw

| 维度 | ai_server (`/image`) — **首选** | ArtClaw — 备选 |
|------|-------------------------------|----------------|
| **适用场景** | **图片生成**：批量预生成 + 运行时重生成 | **视频/BGM** + 图片备选 |
| **调用方式** | HTTP `POST /image` 或 SDK `bridge.ai.image()` | `python3 scripts/artclaw.py` CLI |
| **响应方式** | 同步 HTTP，60s 超时，直接返回 | 异步长时任务，需轮询 |

### 生成时机

```
Phase 3（build）：预生成（Pre-generation）
  ├─ 所有物料在编码阶段一次性生成
  ├─ 产出存入 content/resources/
  ├─ 图片优先 ai_server /image
  └─ 每个 image_prompt 必须提前写在内容文件中

Phase 5（ship）：发布物料
  └─ publish-cli --gen-only 提取/生成封面、NPC 图片、视频
```

### 图片生成规格

所有物料图片统一 **1080×1920 像素（9:16 竖屏），JPG/PNG 格式**。

**每个模板类型的物料需求由该模板的 `CONTENT_SPEC.md` 定义**，生产时先读取对应模板的 CONTENT_SPEC。

通用原则：
- 每个 panel/场景的 `image_prompt` 必须在 Phase 2 (plan) 就写好
- 同一个 IP 内的风格关键词前缀保持一致
- **必须包含无白边约束**：prompt 结尾加 `Full bleed image. No white borders. No margins. No comic panel frames. The image fills the entire frame edge to edge without any padding. No text.`
- prompt 长度建议 50-150 词
- **参考图优先**：NPC 物料生成必须先检查是否有角色参考图

### NPC 物料生成

**不是所有 IP 都需要 NPC。** AI 在 Phase 2 (plan) 和 Phase 5 (ship) 根据 IP 核心玩法主动推断。

需要 NPC：角色互动是核心玩法（恋爱攻略、小镇模拟、AI 对话悬疑、生存冒险）
不需要 NPC：纯剧情/纯推理/策略模拟（海龟汤、静态漫画、体育经理、密室逃脱）

NPC 命名规则：
- `id` 和 `bot_slug` 必须英文（小写字母 + 下划线）
- `name` 字段必须英文（拉丁字母），严禁中文
- `speaker` 字段必填，从 ship.md 音色列表按人设匹配

---

## 方法论文档

| 文件 | 用途 |
|------|------|
| `standard_templates/docs/production-workflow.md` | 生产流程完整定义（含验证方法、目录结构、测试原则） |
| `standard_templates/docs/TRANSFORMATION_SUMMARY.md` | 模板改造经验总结（template/instance 分离 + i18n） |
| `standard_templates/<type>/CONTENT_SPEC.md` | 模板类型定义：玩法、Core Loop、物料规格 |
| `standard_templates/<type>/README.md` | 模板速查 + 文件导航 |
| `standard_templates/<type>/template/scripts/verify.mjs` | 自动验收脚本 |
| `standard_templates/<type>/template/scripts/validate-content.mjs` | 内容结构校验 |
| `production/brief.md` | Phase 1 详细指令 |
| `production/plan.md` | Phase 2 详细指令 |
| `production/build.md` | Phase 3 详细指令 |
| `production/review.md` | Phase 4 详细指令 |
| `production/ship.md` | Phase 5 详细指令 |
