# Phase 4：验收复查 (Review)

**目标**：自动验收 + Remix 合规 + 人工抽查，三级确认项目质量。
**前提**：Phase 3 实现完成（所有 tasks 标记完成，门禁通过）。
**结果**：✅ 通过 → 进入 Phase 5 / ⚠️ 小问题 → 修复 → 进入 Phase 5 / ❌ 未通过 → 退回 Phase 3。

---

## 核心思路：AI 验收 ≠ 人工验收

AI 不能打开浏览器看、不能手动点击测试、不能凭直觉判断"这个配色怪怪的"。所以复查分三层：

```
第一层：自动验收（机器做）
  → AI 运行 verify.mjs 脚本
  → 产出明确的 pass/fail + 退出码
  → 不依赖视觉判断、不依赖手动操作

第二层：Remix 合规检查（机器 + AI 交叉验证）
  → 确认 template/instance 分离正确、安全区适配到位、路径命名规范
  → verify.mjs 只验证了"能跑"，不验证"符合标准"

第三层：人工抽查（人做）
  → 打开浏览器/WebView 实际体验
  → 文案有没有语病
  → 图片风格是否统一
  → 游戏节奏是否合适
  → 交互反馈是否正常
```

**AI 不能在第三层说"看起来正常"——那不是 AI 的判断，是编的。**

---

## 强制验证项

> 以下三项**缺一不可**，任何一项不通过则复查不通过，退回 Phase 3。

| # | 验证项 | 验证方式 | 通过标准 |
|---|--------|---------|---------|
| 1 | **自动验收通过** | 运行 `node standard_templates/<type>/template/scripts/verify.mjs` | 退出码 0，四项检查全部通过 |
| 2 | **测试用例全部通过** | 运行测试命令（验收脚本已包含） | 零失败、零 skip、零 todo |
| 3 | **功能完整性** | 按检查清单逐项核对 | 所有检查项通过 |

---

## 自动验收（第一层）

### 验收脚本

每个标准模板类型应提供验收脚本：

```
standard_templates/<type>/template/scripts/verify.mjs
```

脚本自动执行四项检查：

| 步骤 | 检查内容 | 验证方式 | 原理 |
|------|---------|---------|------|
| 1. TypeScript | 纯逻辑模块无类型错误 | `pnpm typecheck <模板>` | 编译时检查，不依赖运行时（pnpm workspace 下须经统一入口，裸 `tsc` 会因 catalog/严格隔离失配） |
| 2. 单元测试 | 引擎 + 状态计算 + 条件判断 | `vitest run` | 纯函数测试，node 环境直接跑 |
| 3. Vite 构建 | import 完整、无编译错误 | `vite build` | Rollup 打包，能构建=模块依赖无断裂 |
| 4. 运行时冒烟 | dev server 启动 + 页面可达 | HTTP GET + 状态码检查 | 确认浏览器能加载，不依赖 AI 服务 |

**设计原则**：
- 不依赖人工视觉判断
- 不依赖 AI API 服务
- 不需要额外依赖 — 只用 vite/vitest/typescript + Node 内置模块
- 退出码 0 = 全部通过，非 0 = 有问题

### 为什么必须有第 3 步（构建检查）

**只看测试通过不等于项目能跑。** 测试只覆盖了纯逻辑，但不会发现：
- CSS 文件忘记 import
- 组件 import 路径错误
- 第三方模块别名配置错误
- 数据文件缺失或路径错误

这些问题只有 `vite build` 会报。**构建检查跳过或静默通过 = 埋坑。**

### 验收结果报告格式

```
验收开始

── 1. TypeScript 类型检查 ──
  ✓ 纯逻辑模块类型通过

── 2. 单元测试 ──
  ✓ 全部 XX 个测试通过

── 3. Vite 构建检查 ──
  ✓ Vite 构建成功

── 4. 运行时冒烟测试 ──
  启动 dev server :3123 ...
  ✓ 页面 HTML 可达
  ✓ 入口模块可达

════════════════════════════════════════
✅ 全部通过
```

**重要：自动验收只是最低门槛。** 冒烟测试只检查了 HTTP 200 和 JS 文件可加载，不验证：
- 页面在真实移动端 WebView 中的渲染效果
- 安全区适配是否正确（刘海屏 / 底部指示条遮挡）
- 触摸交互是否正常（点击、滑动、键盘弹起）
- AI API 调用是否正常工作

**AI 无法打开浏览器验证这些，但必须在复查报告中明确标注哪些已验证、哪些需要人工确认。**

---

## Remix 合规检查（第二层 · 机器 + AI 交叉验证）

> **verify.mjs 通过只证明了「能跑」，不证明「符合 remix 标准」。** 以下检查必须逐项核验。

### 1. Template/Instance 分离检查（ready 模板）

**问题**：template/ 和 instance/content/ 职责不清，instance 里藏了代码，或 template 里硬编码了实例内容。

**检查方法**：
```bash
# instance content/ 下不应有 .tsx 或引擎 .ts 文件
find instances/<name>/content/ -name "*.tsx" -o -name "*.ts" | grep -v "story-data\|strings"

# template/src/ 下不应有 instance 特定的角色名、故事文本
grep -rn "<角色名或IP关键词>" template/src/
```

**通过标准**：
- `instances/<name>/content/` 只有内容文件（story-data.ts、strings.ts）和资源（resources/、i18n/）
- `template/src/` 零 instance 特定字符串

### 2. src/ 零硬编码检查

**检查方法**：
```bash
# 搜硬编码的图片/资源路径
grep -rn "'images/\|\.jpg'\|\.png'\|\.mp3'" src/ template/src/
# 搜硬编码的 localStorage key
grep -rn "'localStorage" src/ template/src/
```

**通过标准**：零命中。所有资源路径来自内容文件或 `strings`，所有 key 名从 `game_meta` 派生。

### 3. 移动端安全区适配

**问题**：模板在桌面端开发，容易忘记移动端 WebView 的刘海屏/底部指示条遮挡。

**检查方法**：
```bash
grep -c "safe-area-inset" src/styles/ template/src/styles/
```

**必查区域**（每个都要有 `max(Xpx, env(safe-area-inset-*))` 或等效处理）：
- 顶部：封面标题区、状态栏/header、序章标签、结局页顶部
- 底部：封面按钮区、选择区域、CG 字幕区、结局页底部
- 容器：`#root` 必须有 `max-width: 430px; height: 100dvh; overflow: hidden`

**通过标准**：`safe-area-inset` 出现 ≥ 8 次，`index.html` 的 viewport meta 有 `viewport-fit=cover`。

### 4. 路径/命名无中文

**检查方法**：
```bash
ls -d standard_templates/*/
```

**通过标准**：所有模板文件夹名 ASCII-only。

### 5. 资源路径相对化检查

**问题**：模板 `src/` 中使用硬编码绝对路径（如 `src="/images/cover-bg.png"`），Vite 的 `base: './'` 不会重写 JS 字符串字面量中的路径。

**检查方法**：
```bash
# 检查 src/ 中是否有以 / 开头的硬编码资源路径
grep -rn "'/images\|'/BGM\|'/bgm\|'/scenes\|'/videos" src/ template/src/ --include="*.ts" --include="*.tsx" | grep -v "import.meta.env.BASE_URL"

# 构建后验证：dist JS 中不能有绝对资源路径
grep -rn "'/images\|'/BGM\|'/bgm\|'/scenes" dist/assets/ --include="*.js" 2>/dev/null
```

**通过标准**：
1. 所有资源引用使用 `import.meta.env.BASE_URL` 或等价包装器
2. `content/` 数据文件中的路径全部为相对路径（不以 `/` 开头）
3. 构建产物 `dist/` 中零绝对资源路径

### 6. i18n 三层 Fallback 验证

**问题**：Phase 3 不创建 i18n 文件，运行时必须能 fallback 到原文。

**检查方法**：
- 确认 `content/i18n/` 目录不存在（Phase 3 不应该创建）
- 确认 `template/src/i18n/index.ts` 存在且实现了三层 fallback
- 启动 dev server，验证页面文字正常显示（不白屏、不报错）

**通过标准**：无 i18n 文件时游戏正常运行，文字从原文 fallback。

---

## 人工抽查（第三层）

> **AI 不能越俎代庖。** 以下项目 AI 只能提醒，不能代替人判断。

1. 文案是否有语病或不符合 IP 设定
2. 图片风格是否统一
3. 游戏节奏是否合适（太快/太慢）
4. 有没有奇怪的交互反馈

---

## 步骤

### Step 1：定位检查清单

检查清单的来源（按优先级）：
1. Phase 2 方案确认中生成的内容清单
2. 模板类型预设 checklist → `standard_templates/<type>/checklists/production-review.md`
3. 通用检查清单（见下方）

### Step 2：运行自动验收（强制）

```bash
node standard_templates/<type>/template/scripts/verify.mjs
```

确认四项检查全部通过。**不允许跳过任何一步。**

如果模板类型还没有验收脚本，则分别手动运行：
1. `pnpm typecheck <模板>`（在仓库根；省略 `<模板>` 则检查整个 workspace）
2. `npx vitest run`
3. `npx vite build`
4. `npx vite --port 3099` → `curl http://localhost:3099`

### Step 3：运行测试验证（强制）

- 全部测试通过（绿色、零失败）
- 没有 `skip` 或 `todo` 标记
- 覆盖率抽查：核心流程 ✅ / 边界条件 ✅ / 异常路径 ✅

### Step 4：Remix 合规检查（强制）

按 § Remix 合规检查 逐项验证。**任何一项不通过 = 复查不通过。**

### Step 5：逐项功能检查

对清单的每一项，对照代码确认有对应实现。

### Step 6：报告结果

---

## 复查报告模板

```
## 复查报告：<change-name>

### 自动验收
[粘贴 verify.mjs 完整输出]

### 强制验证
[ ] 自动验收通过（退出码 0，四项全部通过）
[ ] 测试全部通过（零失败、零 skip）
[ ] 功能检查清单逐项通过

### Remix 合规检查
[ ] template/instance 分离正确（content/ 无代码，template/ 无实例内容）
[ ] src/ 零硬编码（grep 无 IP 特定字符串命中）
[ ] 安全区适配到位（safe-area-inset ≥ 8 处，viewport-fit=cover）
[ ] 路径/命名无中文（模板文件夹名 ASCII-only）
[ ] 资源路径相对化（无绝对路径、content/ 路径相对、dist/ 零绝对路径）
[ ] i18n fallback 正常（无 i18n 文件时游戏正常运行）

### 运行时确认
> AI 无法直接验证以下项目，需人工在移动端 WebView 或浏览器中确认。
[ ] 游戏启动 → 封面显示正常，无顶部/底部遮挡
[ ] 完成第一轮核心循环 → 状态变化在 UI 正确显示
[ ] 推进到结局 → 结局画面正常
[ ] 重玩 → 状态正确重置
[ ] 安全区适配实际生效（刘海屏 / 底部指示条不遮挡内容）
[ ] 键盘弹起时输入区域跟随上移（如有输入功能）

### 功能检查
#### 基础路径
[ ] 游戏启动 → 看到封面 → 进入游戏
[ ] 完成第一轮核心循环 → 看到状态变化
[ ] 推进到结局 → 看到结局画面
[ ] 重玩 → 回到开头

#### 特殊路径
[ ] 中途触发特殊结局（如果有）
[ ] 状态达到阈值触发不同结局
[ ] 走完所有章节/场景

#### 功能检查
[ ] 所有选择反馈正确
[ ] 状态变化在 UI 上正确显示
[ ] 章节过渡正常

#### 内容检查
[ ] 所有文案是新 IP 的内容，无参考模板残留
[ ] 所有图片路径正确，文件存在
[ ] 所有 image_prompt 已填写

### 人工抽查项（提醒）
[ ] 文案无语病 / 符合 IP 设定
[ ] 图片风格统一
[ ] 游戏节奏合适
[ ] 交互反馈正常

### 复查结果
✅ 全部通过 | ⚠️ 有小问题 | ❌ 未通过

### 未通过原因（如果有）
- 具体问题描述
- 对应的修复建议
```

---

## 复查结果处理

| 结果 | 处理 |
|------|------|
| ✅ 全部通过 | 进入 Phase 5 (`/production:ship <name>`) |
| ⚠️ 小问题（文案错误、图片风格微调） | 修复问题 → 重新自动验收 → 进入 Phase 5 |
| ❌ 关键问题（验收不通过、合规不通过、流程不通、测试失败、构建失败） | 退回 Phase 3，修复后重新复查 |
