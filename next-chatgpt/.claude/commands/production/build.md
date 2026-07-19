# Phase 3：开始实现 (Build)

**目标**：按 Phase 2 确认的方案，用 OpenSpec propose → apply → archive 流程完成开发。
**前提**：Phase 2 方案确认完毕（三步全部通过门禁）。
**注意**：本阶段**不处理 i18n**。内容用规范语言直接写。三层 fallback 保证运行时无 i18n 文件也能正常显示。

---

## 强制要求

> **OpenSpec 是本阶段唯一允许的工作流。不得跳过、不得绕过、不得手动替代。**

1. **必须走 OpenSpec**：propose → apply → archive，三步缺一不可。
2. **必须写测试**：编码时同步写测试用例，覆盖大部分场景（见下方「测试要求」）。
3. **测试不通过 = 门禁不通过**：任何测试失败都不能进入 Phase 4。
4. **不碰 i18n**：不要创建 `content/i18n/` 目录或任何 locale JSON 文件。i18n 在 Phase 5 处理。

---

## 工作流

本阶段**必须**使用 OpenSpec 的三个 skill：

```
Phase 3  =  OpenSpec propose → OpenSpec apply → OpenSpec archive
```

| 步骤 | 调用 | 产出 |
|------|------|------|
| 1. Propose | `/opsx:propose <change-name>` | proposal.md + design.md + tasks.md |
| 2. Apply | `/opsx:apply <change-name>` | 完整的可运行产出 |
| 3. Archive | `/opsx:archive <change-name>` | 归档到 openspec/changes/archive/ |

---

## 与 Phase 2 方案的衔接

OpenSpec propose 阶段的输入来自 Phase 2 的方案确认：

| OpenSpec artifact | 数据来源 |
|-------------------|---------|
| `proposal.md`（做什么 + 为什么） | Phase 2a 模板匹配 + Phase 2b 内容方案 |
| `design.md`（怎么做） | Phase 2a 差异分析 + 模板的技术架构 |
| `tasks.md`（任务分解） | Phase 2b 内容结构 + Phase 2c 物料清单 |

在执行 OpenSpec propose 前，确保 Phase 2 的方案文档在 `openspec/changes/<change-name>/` 路径下，这样 OpenSpec skill 能读取它。

---

## 模板/实例分离架构（重要）

**已改造的模板（status: ready）使用新架构：**

```
template/                          ← 共享代码（所有 instance 共用）
  └── src/
      ├── components/              ← React UI 组件
      ├── engine/                  ← 游戏引擎、AI client、类型
      ├── hooks/                   ← 共享 hooks
      ├── styles/                  ← CSS 样式
      ├── i18n/                    ← i18n 运行时（locales.ts + index.ts）
      └── ...

instances/<ip-name>/               ← 纯内容（每个 IP 独有）
  └── content/
      ├── story-data.ts            ← 故事数据（角色、章节、对话）
      ├── strings.ts               ← instance UI 字符串覆盖
      ├── resources/               ← 图片、音频物料
      └── i18n/                    ← 翻译文件（Phase 5 才创建）
```

**生产新 IP 的核心原则**：
- `template/` 一行代码都不改
- 所有工作都在 `instances/<ip-name>/content/` 下
- 构建由 `$INSTANCE` 环境变量驱动，一个 `npm run build` 对应一个 instance

**旧模板（status: legacy）使用旧架构**：instance 含完整代码副本。按模板的 REMIX_CARD 或 README 操作。

---

## tasks.md 的典型结构

### 匹配已有模板（创建 instance）

```markdown
## 基础设施
- [ ] 在 instances/<ip-name>/content/ 下创建项目文件

## 内容
- [ ] 创建 story-data.ts（或模板对应的内容文件）
  - [ ] 填写角色数据
  - [ ] 填写章节/场景数据
  - [ ] 填写结局条件
  - [ ] 填写所有 image_prompt（按 CONTENT_SPEC 规范）
- [ ] 创建 strings.ts（UI 文案集中管理）
- [ ] 放入 resources/ 物料文件

## 物料生成
- [ ] 生成封面图（ai_server /image）
- [ ] 生成场景/分镜图（ai_server /image）
- [ ] 生成结局图（ai_server /image）
- [ ] 生成 BGM（ArtClaw 或免版权素材）
- [ ] 所有物料存入 content/resources/

## 测试（强制）
- [ ] 引擎状态计算单元测试
- [ ] 条件判断单元测试
- [ ] 结局触发逻辑测试
- [ ] 边界值与异常路径测试
- [ ] 核心流程集成测试
```

### 新建模板

```markdown
## 基础设施
- [ ] 搭建 Vite + React + TypeScript 工程骨架
- [ ] 配置 vite.config.ts（$INSTANCE → @content alias）
- [ ] 配置 package.json、tsconfig.json

## 引擎
- [ ] 实现状态管理
- [ ] 实现核心循环
- [ ] 实现结局判定

## 组件
- [ ] LaunchScreen / CoverScreen
- [ ] GameScreen / MainScreen
- [ ] EndingScreen
- [ ] 其他页面

## 内容（至少 1 个示范 instance）
- [ ] 创建 instances/<demo-name>/content/story-data.ts
- [ ] 创建 instances/<demo-name>/content/strings.ts
- [ ] 生成示范物料

## 测试（强制）
- [ ] 引擎状态计算单元测试
- [ ] 条件判断单元测试
- [ ] 结局触发逻辑测试
- [ ] 边界值与异常路径测试
- [ ] 核心流程集成测试
- [ ] 创建验收脚本 template/scripts/verify.mjs
```

---

## 测试要求（强制）

编码时**必须**同步写测试，不允许只写代码不写测试：

| 类别 | 覆盖内容 | 最低要求 |
|------|---------|---------|
| **核心流程** | 游戏启动 → 核心循环 → 状态变化 → 结局触发 → 重玩 | 每个结局路径至少 1 条 |
| **状态计算** | 所有状态字段的增减逻辑、边界值、溢出保护 | 每个状态至少 2 条（正常 + 边界） |
| **条件判断** | 结局触发条件、分支条件、特殊事件条件 | 每个条件至少 1 true + 1 false |
| **异常路径** | 非法输入、空状态、极端值、快速连续操作 | 每个异常场景至少 1 条 |
| **数据完整性** | 存档/读档、状态重置、跨章节数据传递 | 每个数据操作至少 1 条 |

测试结构（新架构下测试放在 `template/__tests__/`）：
```
template/__tests__/
├── engine/           # 引擎纯函数单元测试
│   ├── state.test.ts
│   ├── conditions.test.ts
│   └── endings.test.ts
├── components/       # 组件渲染测试
│   └── *.test.tsx
└── integration/      # 核心流程集成测试
    └── game-loop.test.ts
```

---

## 物料生成

Phase 3 中物料生成和编码同步进行。不要先写代码再回头补图。

```
Phase 2 已产出 → 内容文件（所有 image_prompt 已填写）
  ↓
Phase 3 编码的同时：
  ├─ 从内容文件提取所有 image_prompt
  ├─ 图片 → ai_server /image（首选）
  ├─ ai_server 不可用 → ArtClaw（备选，异步执行）
  ├─ BGM → ArtClaw 或免版权素材
  └─ 保存到 content/resources/
```

### 物料验收（Phase 3 完成后）

- [ ] 内容文件中所有 `image_path` 指向的文件实际存在
- [ ] 内容文件中所有 `image_prompt` 非空
- [ ] 图片文件无白边（打开图片确认四周无白色/浅色边框）
- [ ] BGM 文件存在且路径正确（如有）
- [ ] 图片文件总大小合理（单张 < 500KB，总量 < 10MB）

最快校验方式：运行模板自带的 `template/scripts/validate-content.mjs`。

---

## 验收脚本

编码完成后，AI 应运行验收脚本自检：

```bash
node standard_templates/<type>/template/scripts/verify.mjs
```

验收脚本的四项检查在开发阶段就能跑：

| 步骤 | 命令 | 开发阶段可跑 |
|------|------|------------|
| TypeScript | `pnpm typecheck <模板>` | ✅ 随时（pnpm 统一入口，勿用裸 `tsc`） |
| 单元测试 | `vitest run` | ✅ 写完就测 |
| Vite 构建 | `vite build` | ✅ 有数据就能跑 |
| 运行时冒烟 | `vite --port` + HTTP GET | ✅ 本地启动检查 |

**AI 开发过程中每完成一个 task，都应该跑一次验收脚本**，而不是攒到最后 Phase 4 才发现问题。

如果模板类型还没有验收脚本，AI 应在 Phase 3 的基础设施阶段创建它。

---

## i18n 说明（为什么 Phase 3 不碰 i18n）

已改造模板的运行时内置三层 fallback：

```
target locale → zh-CN → story-data.ts 原文
```

Phase 3 内容直接用规范语言写，不创建任何 `content/i18n/` 文件。运行时 fallback 到原文，保证文字始终显示，不白屏。

i18n 文件在 Phase 5（ship）统一提取和翻译。

---

## 门禁

进入 Phase 4 复查的**强制条件**：

- [ ] OpenSpec change 的所有任务已完成（status: all_done）
- [ ] **验收脚本通过（typecheck + test + build + smoke 全部 ✅）**
- [ ] 无 TypeScript 编译错误
- [ ] 核心流程走得通（从头到尾至少一个结局）
- [ ] **所有测试用例通过（零失败、零 skip）**
- [ ] **测试覆盖了核心流程、边界条件、异常路径**
- [ ] 没有创建任何 `content/i18n/` 文件（i18n 留给 Phase 5）
