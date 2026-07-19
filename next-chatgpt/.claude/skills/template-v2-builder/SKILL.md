---
name: template-v2-builder
description: 把 templates_v2 下的互动图文/游戏模板改造成「三槽位 + 运行时 fetch + 预构建壳」的 v2 架构。当用户说"把 X 模板改造成运行时加载"、"让模板不再 per-instance 编译"、"把 story-data.ts 挤出去"、"对齐 pelican-town 的产物布局"或要求把一个模板升级到与 pelican-town 同构时使用。本 skill 是改造执行器：按 spec 的 7 节给出可落地的步骤序列，并以 pelican-town/dist 为权威产物契约。不写最终成稿文本，不调生成中台。
metadata:
  version: "1.0"
---

# 模板 v2 架构改造执行器

**目标**：把一个模板改造成与 `pelican-town` 同构的 v2 架构——instance 输入「纯填充化」、内容「运行时 fetch」、JS 壳「与 instance 解耦、每种模板只构建一次」。本 skill 服务三种入口：

1. **旧模板迁移**：把 `workspace/standard_templates/<模板>` 下的 v1 模板**整体迁移**到 `workspace/templates_v2/<模板>`，按 v2 架构重写。迁移完成后旧目录可废弃。
2. **v2 模板深化**：已落在 `templates_v2/` 但未完全对齐 pelican-town 的模板（如 duo-chat / ai-romance-drama），按本 skill 步骤补齐到同构。
3. **全新创建**：从零新建一个 `templates_v2/<新模板>`，直接按 v2 架构落地。

**权威来源**：
- 改造规范：`docs/template-instance-refactor-spec.md`（本 skill 是其执行视图，按节落地）
- 产物契约范本：`workspace/templates_v2/pelican-town/dist/`（首个落地该模式的模板，**布局**照抄；但**输出目录名**改为 `dist_template/`，见下）
- 内容契约范本：`workspace/templates_v2/pelican-town/CONTENT_SPEC.md`（字段表/AI 契约/资源规格/部署模型）

**下游契约**：C 端 UGC remix 流水线（Go 后端 assemble/publish）消费本改造的产物——预构建壳 + content/ 三槽位 + meta/manifest.json，**全程无 Node/Vite 热路径**。本改造是其后置前置任务。

---

## 何时触发

- 用户要把某模板「升级到 v2」「对齐 pelican-town」「让 instance 零 TS 改动」「运行时 fetch 内容」
- 用户要把 `standard_templates/` 下的旧模板迁移到 `templates_v2/`（如「改造一下 romance-battle」）
- 用户新建一个 templates_v2 模板并要求直接按 v2 架构落地
- 用户在 duo-chat / ai-romance-drama 上做 i18n/结构外置或运行时化相关改动

**入口判定**：先看目标模板当前在哪——
- 在 `workspace/standard_templates/<id>/` → 旧模板迁移入口（入口 1）
- 在 `workspace/templates_v2/<id>/` 但未完全对齐 pelican-town → v2 深化入口（入口 2）
- 不存在 → 全新创建入口（入口 3）

不同入口在 Step 0 的审计深度和起点不同，但 Step 1→10 的目标态一致。

## 改造范围（重要边界）

**本 skill 只改造模板本身，不拆解 instance 实例数据。**

模板 v2 化的目标是让「新建 instance 零 TS 改动」——即建立**三槽位 schema + 运行时 fetch + 预构建壳 + 骨架产物**这套机制。机制建立后，具体 instance 的 `config.json` / `i18n/*.json` / `resources/` 填充是**创作侧/二阶段流水线**的工作，不在本 skill 范围内。

具体含义：
- **要做**：改 `template/src/{config,i18n,content,engine,components}` 建立运行时化机制；写 `build-skeleton.mjs` 产骨架 `dist_template/`；同步 `CONTENT_SPEC.md` + `content_spec_template.yaml`；改造测试让它们用 mock 数据或扫 instance 目录 runtime 加载
- **不做**：批量拆解每个 instance 的 `story-data.ts` / `strings.ts` / v1 i18n 到 v2 三槽位；为每个 instance 翻译全 12 语言；为每个 instance 填 `meta/manifest.json`；**向 `templates_v2/<id>/instances/` 目录写入任何 instance 数据**
- **Instance 仅作为校验工具**：v1 的 `instances/` 目录**不复制到 `templates_v2/`**。如果 Step 10 需要验证 loader/schema 能跑通，**在测试里用 mock 数据构造 StoryData**（通过 `setConfigForTest()` + `setContentI18nForTest()` 注入），不拷贝任何 instance 文件到 v2 目录。v1 instance 的 `story-data.ts` 仅作为审计时理解数据结构的参考，**不转化为 v2 三槽位文件**
- **content_spec_template.yaml 校验用 instance 交叉验证**：写完 YAML 范本后，可对照 v1 的 `story-data.ts` / i18n 检查 YAML 是否覆盖了所有需要的字段和资产 id，但**不生成 instance 目录**

**改造完成后的 `templates_v2/<id>/` 目录结构**（干净态，无 instance）：

```
templates_v2/<id>/
  CONTENT_SPEC.md                 # 内容契约文档
  content_spec_template.yaml      # 一阶段需求文档模板
  README.md                       # （可选）
  REMIX_CARD.md                   # （可选）
  template/
    src/                          # 模板源码
    tests/                        # 模板测试（全部用 mock 数据）
    scripts/
      build-skeleton.mjs          # 骨架构建脚本
    vite.config.ts
    vitest.config.ts
    tsconfig.json
    package.json
    index.html
    .gitignore
  # 注意：没有 instances/ 目录
```

**`dist_template/` 按骨架态提交到 git**：`dist_template/` 是 `vite build` + `build-skeleton.mjs` 的产物，但**提交骨架态**（与 pelican-town / duo-chat / romance-battle 一致）——下游 C 端 remix 流水线消费这个预构建壳，提交后可直接取用、有版本可追溯。每次改造完成后运行 `vite build && node scripts/build-skeleton.mjs` 重产骨架再提交；**`.gitignore` 只忽略 `node_modules/` 和 Vite 默认 `dist/`，不忽略 `dist_template/`**。注意：**不要提交 fill-content 预览填充后的实质内容**——提交前先跑 `build-skeleton.mjs`（或 `pack-template.mjs` 默认会重置）把 `content/` 重置回骨架态（空串 i18n、默认 config、空 resources 目录）。

**判定信号**：

| 用户说 | 行为 |
|---|---|
| 「把模板改造好就行」「不用拆 instance」「instance 数据后面再填」 | 严格按上述边界，只做模板机制，不碰 instance |
| 「把所有 instance 都拆了」 | 才进入批量拆解（二审阶段批量处理） |
| 「帮我验证一下 kaguya-sama 能不能跑」 | 仅验证，不生成文件到 v2 目录；直接在 v1 目录读取数据做一次性测试 |

---

## 产物契约（pelican-town/dist 布局即权威，输出目录名 `dist_template/`，骨架态）

改造完成的模板，其 `dist_template/` 必须能产出以下布局——**逐项对齐 pelican-town/dist 的内部结构，不得擅自变更**。**输出目录名固定为 `dist_template/`**（不叫 `dist/`），避免与 Vite 默认 `dist/`、其他子项目的 `dist/` 混淆，让一眼可识别「这是模板预构建壳」。

**关键语义：`dist_template/` 是骨架（skeleton），不是可运行的 instance**——内容文件只产结构、不产实质值，资源只产目录、不复制文件：

- `content/i18n/<locale>.json`：只写**固定 key**，value 一律空串 `""`（占位语言即最终态；`en.json` 同样产 key 空值，由二阶段填充真实文本）
- `content/config.json`：只写**全字段形态的骨架**——结构字段给类型默认值（`[]`/`{}`/`""`/`0`），不填任何具体 IP 的数值/颜色/id（如 `characters: []`、`publish: { id: "", tags: [] }`）
- `content/resources/`：只创建**目录树**（`images/scenes/`、`images/characters/`、`BGM/`、`videos/`），**不复制任何图片/音频/视频文件进去**；约定路径（如 `cover-bg.png`）在 config/CONTENT_SPEC 里声明但不落实体文件
- `assets/`、`index.html`、`manifest.json`：预构建壳的实体产物（JS/CSS 已编译、HTML 已生成、顶层 manifest 已写）——这部分是真编译产物，不是骨架
- `meta/manifest.json`、`CONTENT_SPEC.md`、`content_spec_template.yaml`：实体文件，由模板直接产出

> **⚠️ 关键例外：remix 流水线只生成「文本(i18n) + 图片(resources)」，不生成 config 结构。** 后端 `assembler.go` 的 `writeConfig` 把模板 `config.json` **原样下发、只 patch `ip_name`**；文本管线（`planner.go`+`prompt.go`）只填 `en.json` 骨架里**已存在的 key**（LLM 按 content_spec 填）。推论：
> - **凡是「结构不能由 content_spec 派生」的模板（每角色专属数值/机制、anchor 事件、endings、胜负条件等），骨架 config.json 必须烘进一套完整、固定、IP-free 的结构**（如 power_struggle 的 5 位非对称领袖 + 15 anchors + 12 endings），否则线上 `entities.characters` 为空 → 选角空白、角色资源永不被请求。`characters: []` 只适用于结构本就 per-instance 可空、或结构由 content_spec 直接决定的模板。
> - **骨架 `en.json` 必须包含该固定结构的全部文本 key**（`characters.<id>.*`、`anchors.<id>.*`、`endings.<id>.*`…，值空串），LLM 才会填；漏 key = 该文本线上永远空。建议在 `build-skeleton.mjs` 里**从 config 结构派生 i18n key 集**（遍历 characters/anchors/endings 生成 key），保证 config 与 i18n 骨架天然同步。
> - **固定结构里非核心数值字段的标签**（StatusLedger 显示）走 `strings.field.<key>`（线上 LLM 按 IP 填），离线回退 `src/i18n/locales.ts` 的 `field.<key>`；loader 的 `fieldLabel` 要带这条回退链。
> - 资源路径（`portraitImage`/`advisorPortrait` 等）必须与 `content_spec_template.yaml` 的 `assets_needed[].path` 对齐，线上生成图才落在前端请求的路径上。

```
<template>/dist_template/
  index.html                          # 实体：预构建壳入口
  assets/                             # 实体：预构建 JS/CSS（编译产物，instance 无关）
    index-<hash>.js
    index-<hash>.css
  content/                            # 骨架：三槽位的形状契约，值留空、资源留目录
    config.json                       # 骨架：全字段形态，结构默认值，无 IP 实质
    i18n/<locale>.json                # 骨架：固定 key + 空串 ""，含 en.json
    resources/                        # 骨架：仅目录树，无文件
      images/
        scenes/                       # 空
        characters/                   # 空
      BGM/                            # 空
      videos/                         # 空
  meta/
    manifest.json                     # 实体：发布元数据骨架（id/tags 留空）
  manifest.json                       # 实体：顶层模板标识 { name, description, slug }
  CONTENT_SPEC.md                     # 实体：内容契约文档
  content_spec_template.yaml          # 实体：一阶段需求文档模板
```

**运行时 fetch 约定**：bundle 以同源相对路径 `./content/...` 取内容，故 `content/` 必须与 `index.html` 同级部署。组装步骤 = 拷预构建壳（含骨架 `content/`）+ 二阶段/组装步骤往 `content/` 里**填充实质值与实体资源**（覆盖空 key、写真实 config 值、复制生成图片音频）+ 生成 `meta/manifest.json` + zip，**全程无编译**。

> **目录名硬性要求**：模板的预构建壳产物目录**必须叫 `dist_template/`**，不得用 Vite 默认的 `dist/`。`vite.config.ts` 里 `build.outDir` 须显式设为 `'dist_template'`。发布/组装流水线只认 `dist_template/`。pelican-town 早期产物留在 `dist/`（含真实 instance 内容），仅作布局参考；新模板及重新构建时一律用 `dist_template/` 且按骨架态产出。

---

## content_spec_template.yaml 契约（worker 消费视角）

`content_spec_template.yaml` 是一阶段产出的**需求文档**，但同时也是 remix_job worker 的**强类型机器输入**——填好的 YAML 会被 `remixgate.Validate` 做 schema 检查、被 `remixpipe.ParseContentSpec` 反序列化成 `ContentSpec` 结构体，驱动 planner / poller / assembler 全流程。模板作者写 `content_spec_template.yaml` 时必须同时满足「人审可读」和「机器可消费」两个约束。

权威实现（`instory_backend` 仓）：
- 校验门：`internal/pkg/remixgate/gate.go`
- 结构体 + 解析：`internal/pkg/remixpipe/spec.go`
- planner / poller / assembler：`internal/pkg/remixpipe/{planner,poller,assembler}.go`
- prompt 构造：`internal/pkg/remixpipe/prompt.go` / `text.go` / `manifest.go`

### 两层校验模型

填好的 YAML 要过两层校验，任一不过 → remix_submit 直接 400：

1. **模板声明层**：模板的 `StoryTemplateVersion.content_spec`（JSON 字段，admin 后台维护）声明哪些顶层 section 是必需的、哪些 dotted 路径是 required。gate 遍历这份 JSON，要求 YAML 里对应 section 非空、对应路径可解析到非空值（路径用 dot 写法如 `world.setting`，不穿 list）。
2. **worker 硬约束层**（与模板声明无关，所有模板一律生效）：
   - `assets_needed` 和 `characters` 必须是 list（`gate.go:51-56`）
   - `assets_needed[].id` 必须非空且唯一（`gate.go:112-117`）
   - `assets_needed[].ref` 必须指向已声明的 id，且 ref 图必须是 DAG（`gate.go:104-163`）

模板维护时，`content_spec_template.yaml`（YAML 范本）和模板 `content_spec` JSON（校验声明）必须同步，否则会出现「范本写得对但提交被拒」或「范本缺字段但 gate 不拦」。

### worker 消费的字段表

worker 的 `ContentSpec` 结构体只消费以下 6 个顶层 section。**其它 section（如 `world` / `player` / `narrative` / `endings` / `content_scale` 等模板自定义 section）worker 不直接读，但会原样保留进 i18n 文本填充 LLM 上下文**（见下方「textPromptSpec 行为」）。

| 顶层 | 子字段 | 类型 | worker 消费点 | 备注 |
|---|---|---|---|---|
| `meta` | `working_title` | string | manifest.id、Story 标题 fallback、config.ip_name | 非空时覆写 config.json 的 ip_name（`assembler.go:269-270`） |
| | `template_id` | string | manifest NPC bot_slug 前缀（`manifest.go:56`） |  |
| | `spec_language` | string | **声明但不读** | 基准 locale 硬编码为 `en`，与该字段无关 |
| `genre` | `tone` | string | 仅 BGM prompt（`prompt.go:30-31`） |  |
| `characters[]` | `id` | string | 角色 keying（资产命名、`villager.<id>.*` 文本键、manifest NPC） |  |
| | `name` | string | manifest.Name、glossary、MAP override `villager.<id>.name` |  |
| | `personality` | string | MAP override `villager.<id>.personality` | 仅 base locale(en) 覆写 |
| | `voice` | string | MAP override `villager.<id>.talk_style` | **不是 TTS**，是说话风格文本键 |
| | `role_in_story` | string | MAP override `villager.<id>.role` |  |
| | `persona_brief` | string | manifest NPC system_prompt 第 1 块（`manifest.go:89-90`） |  |
| | `appearance` | string | manifest NPC system_prompt 第 2 块（"Appearance: " 前缀，`manifest.go:92-93`） |  |
| | `theme_color` | string | **声明但不读** | 颜色走 config.json，不走 spec |
| | `voice_type` | string | manifest NPC `speaker` 字段（`manifest.go:58`） | **不是 TTS**，仅字符串写入 manifest |
| `visual_style` | `art_style` | string | manifest 视觉风格行 + NPC system_prompt（`manifest.go:103`） |  |
| | `music_style` | string | 仅 BGM prompt（`prompt.go:33-34`） |  |
| | `palette` | string | manifest 视觉风格行 |  |
| | `lighting` | string | manifest 视觉风格行 |  |
| | `reference_keywords` | []string | 图片/视频 prompt 前缀（`prompt.go:13`） |  |
| `publish` | `tags` | []string | `manifest.drama_tag`（`manifest.go:78`） |  |
| | `catalog_title` | string | Story 标题 + manifest 标题（优先于 `working_title`，`assembler.go:207`） |  |
| | `catalog_description` | string | Story 描述 + manifest 描述 fallback（`assembler.go:210`） |  |
| `assets_needed[]` | `id` | string | 资产稳定句柄，ref 引用依据 | 必填、唯一 |
| | `type` | string | `MediaKind()` 派生：`bgm`→BGM、`video`/`cover_video`→Video、**其它一律→Image**（`spec.go:65-74`） | 见下方「type 语义」 |
| | `spec` | string | 正则 `(\d+)\s*[xX]\s*(\d+)` 抽宽高驱动图片 aspect ratio（`handler.go:247-255`） | 仅 image 分支读；解析失败回退平台默认。**必须从下方「图片规格表」中选择最接近的比例** |
| | `path` | string | 资产在 `content/resources/` 下的完整相对路径（`assembler.go:101-103`） | assembler 按此写入 R2 |
| | `usage` | string | 仅 BGM prompt 拼接（`prompt.go:36-37`） |  |
| | `subject` | string | 图片/视频 prompt 主体（`prompt.go:17`） | image/video 必填 |
| | `ref` | []string | 依赖的资产 id 列表，驱动 DAG 排序 + ref 图 URL 传入 | 必须指向已声明 id；图必须无环 |
| | `ref_note` | string | 图片/视频 prompt 后缀（仅当 ref 非空时追加，`prompt.go:18-21`） |  |

### 图片规格表（`spec` 字段可用值，**以 pelican-town 实际规格为权威**）

`spec` 字段驱动图片生成时的宽高比（aspect ratio）。**所有 Image 资产的 `spec` 必须从下表中选取**——这套规格直接照搬 pelican-town 的现存产物（权威范本）。按目标的用途和大致宽高比，选择最接近的规格。非标准比例不新增自定义尺寸，一律用下表最接近的宽高比替代。

| spec | 宽高比 | 适用资产 | pelican-town 用量 |
|---|---|---|---|
| `"1080x1920 png"` | 9:16 竖屏 | cover/封面图、scene_bg/场景背景、cg/CG 事件图、chat_bg | **最常用**，竖屏全屏展示（30 个） |
| `"512x768 png"` | 2:3 竖屏 | sprite/角色立绘、avatar/角色头像、card | 角色全身立绘（11 个） |
| `"1024x1024 png"` | 1:1 正方形 | 方形图标、徽章、正方构图的场景 | 少量（1 个） |
| `"mp3"` | N/A | bgm/背景音乐 | BGM（5 个） |
| `"9:16 1080p 10s"` | 9:16 视频 | cover_video/封面视频 | 1 个（**但 video 被 planner 跳过，恒不生成**） |
| `""` | N/A | voice_type 等非资产条目 | 留空 |

**选取规则**（按 type 选 spec）：
- `cover` / `scene_bg` / `cg` / chat_bg → `"1080x1920 png"`（9:16 竖屏，最常用）
- `sprite` / `avatar` / `card` → `"512x768 png"`（2:3 竖屏角色）
- 正方形图标/徽章 → `"1024x1024 png"`（1:1）
- `bgm` → `"mp3"`
- `cover_video` / `video` → `"9:16 1080p 10s"`（但 video 生成被跳过，见下）

> **非标准比例的处理**：worker 的正则 `(\d+)\s*[xX]\s*(\d+)` 只抽宽高算比例（`handler.go:247-255`），解析失败回退平台默认。所以即使写了非标准分辨率也不会报错，但**为保持产物一致性，必须从上表选规格**。如果目标是某个介于 9:16 和 1:1 之间的比例，就近选 `"1080x1920 png"`（偏竖）或 `"1024x1024 png"`（偏方）。**禁止**自创如 `768x1365`、`256x256` 等表外尺寸。

> pelican-town 范本里有 `meta.remix_source`、`genre.themes`、`genre.references`、`assets_needed[].count` 等字段——这些 worker 完全不读，是模板自创的人审/文档语义字段，新模板可保留可省略，不影响 remix_job。

### type 语义与 video 跳过

worker 的 `MediaKind()`（`spec.go:65-74`）对 `type` 的识别很窄：
- `bgm` → BGM 资产（走 Gemini Lyria 3 生成 30s 纯器乐）
- `video` / `cover_video` → Video 资产
- **其它任何值**（`cover` / `scene_bg` / `sprite` / `avatar` / `card` / 自定义）→ 一律按 Image 资产处理

pelican-town 范本里用的 `cover` / `scene_bg` / `sprite` 等 `type` 值是**给人看的语义标签**，对 worker 来说都是 Image。

**video 资产被 planner 静默丢弃**（`planner.go:106-109`）：声明 `type: video` 或 `type: cover_video` 的资产永远不会被生成（耗时太久，暂未启用）。模板不要在 `assets_needed` 里依赖 video 资产产出——`cover_video` 这个 id 虽然会被 assembler 特殊识别（写入 `Story.cover_video_url`），但因为 video 生成被跳过，实际永远是空值。

### 特殊 asset id 命名约定

assembler 靠硬编码 id 命名约定把资产绑到角色/封面上，**这些约定不在 schema 里强制，但模板示例 YAML 必须遵守**，否则资产挂不上：

| id 模式 | 绑定到 | 代码位置 |
|---|---|---|
| `cover` | `Story.cover_url` + manifest 背景图 | `assembler.go:119` |
| `cover_video` | `Story.cover_video_url`（但 video 生成被跳过，恒空） | `assembler.go:121` |
| `sprite_<charID>` 或 `<charID>_avatar` | 角色 avatar（`meta/characters/<id>_avatar.png`） | `assembler.go:357-361` |
| `scene_npc_<charID>_*` | 角色 chat_bg（`meta/characters/<id>_chat_bg.png`） | `assembler.go:339-349` |

只有生成了 avatar 的角色才会进 manifest 的 NPC 列表（`manifest.go:45-48`），且 `validatePackage` 要求至少 1 个 NPC standee（`assembler.go:328-330`）。

### locale 模型

- **基准 locale 硬编码为 `en`**（`planner.go:93`），与 `meta.spec_language` 无关。`spec_language` 字段在 worker 结构体里声明但从不读取。
- 支持 locale 列表来自模板的 `config.json`（`game_meta.supported_locales` 或顶层 `locales`），**不是 YAML 声明**。
- 文本资产生成模型：每个支持 locale 一份 base chunk（en）+ N 份 translate chunk（其它 locale ref 到 en 的对应 chunk）。
- translate chunk 失败时降级为 en 文本（`poller.go:120-130`）；base chunk 失败则整个 job 失败。

### MAP override（spec → i18n 强制覆写）

`poller.go:255-261` + `text.go:52-80`：spec 里的 `characters[].{name, personality, voice, role_in_story}` 会在 base locale(en) 文本填充完成后，**强制覆写** i18n 里对应的 `villager.<id>.{name, personality, talk_style, role}` 键——但仅当该键已存在于 i18n skeleton 时才覆写。translate chunk 不走 override，靠 translate prompt 继承。

这条行为意味着：spec 里的角色字段既是「人审需求」，也是「i18n 兜底真值」——LLM 填得不对会被 spec 覆写。

### 无 TTS，audio 只有 BGM

worker **没有任何 TTS / narration / 语音合成步骤**。`characters[].voice` 映射到 `villager.<id>.talk_style`（说话风格文本键），`voice_type` 映射到 manifest NPC `speaker`（纯字符串）。audio 只通过 `type: bgm` 走 Gemini Lyria 3 生成纯器乐。

**不要在 YAML 里加顶层 `scenes` / `audio` / `narration` / `voice` / `tts` 字段**——worker 不消费，pelican-town 范本也没有这些顶层。

### textPromptSpec 行为（哪些字段喂给 i18n LLM）

`spec.go:91-114`：把 YAML 喂给 i18n 文本填充 LLM 之前，会**剥离 `assets_needed` 和 `visual_style` 两个顶层 key** 再 re-marshal。其余所有 section（包括 worker 不直接消费的 `world` / `player` / `narrative` / `endings` / `content_scale` 等模板自定义 section）会原样进入 LLM 上下文。

这意味着模板作者在 YAML 里写的「人审向」section（如 `narrative.opening_beats`、`endings[].trigger`）会作为创作上下文喂给 i18n 文本填充 LLM——这些字段虽然 worker 代码不直接读，但对生成质量有实际影响，不能瞎填。

### publish / meta 是功能字段，不是纯描述

`publish.catalog_title` / `publish.catalog_description` / `meta.working_title` 不是纯文档文本，它们驱动：
- Story 标题（`catalog_title` 优先于 `working_title`，`assembler.go:207`）
- Story 描述（`catalog_description` 作为 `game_meta.description` 的 fallback，`assembler.go:210`）
- manifest.id（`working_title`，`manifest.go:74`）
- config.json 的 `ip_name`（`working_title` 非空时覆写，`assembler.go:269-270`）

---

## 改造步骤

按下列 Step 1→10 顺序执行。每步落地后跑测试，绿了再推进。pelican-town 是首个落地范本——任何一步拿不准时，去看它怎么做的。

### Step 0：审计现状

先摸清待改造模板当前的耦合点。**入口不同，审计面不同**：

**入口 2（v2 深化）/ 入口 3（全新创建）**——已有/即将按 v2 起步，对照 spec §1 的「仍在代码里的东西」清单：

| 审计项 | 在哪查 | 期望改造后 |
|---|---|---|
| `import '@content/config.json'` | `template/src/config/index.ts` | 改为运行时 fetch（Step 6） |
| `import.meta.glob('@content/i18n/*.json')` | `template/src/i18n/index.ts` | 改为运行时 fetch（Step 6） |
| 每个 instance 的 `content/story-data.ts` | `instances/*/content/` | 删除，由模板 loader 替代（Step 4） |
| i18n key 里的 IP 专有 slug | `instances/*/content/i18n/*.json` | 改为位置化固定 key（Step 2） |
| `ai_system_prompt` 里的格式契约 | `instances/*/content/i18n/*.json` 或 `story-data.ts` | 拆分：人设→i18n，格式→`buildSystemPrompt()`（Step 5） |
| 颜色重复定义 | `tokens.css` vs instance | 单一来源 config（Step 3） |
| `vite.config.ts` 里的 per-instance `@content` 别名 | `template/vite.config.ts` | 移除，build 与 instance 无关（Step 6） |

**入口 1（旧模板迁移，`standard_templates/<id>` → `templates_v2/<id>`）**——v1 模板耦合更重，**额外审计**以下项（v1 可能根本没 i18n 外置、没三槽位分离，审计面更广）：

| v1 额外审计项 | 在哪查 | 期望改造后 |
|---|---|---|
| 文本是否硬编码在 TS/TSX 里（未外置 i18n） | `template/src/**/*.{ts,tsx}` | 全部外置到 `content/i18n/*.json`，代码里只剩 `translateContent()` 调用 |
| `template/src/i18n/` 是 UI i18n 还是含 instance 内容 | `template/src/i18n/` | UI i18n 留模板侧；instance 内容 i18n 迁到 `instances/*/content/i18n/` |
| instance 内容散落位置 | `instances/*/content/` 及 `instances/*/` 其他 | 全部归拢到三槽位（`i18n/` + `config.json` + `resources/`） |
| `story-data.ts` 里的结构 vs 文本 vs 资源路径 | `instances/*/content/story-data.ts` | 结构→`config.json`、文本→i18n、路径→约定推导 |
| 引擎/组件里对 instance slug 的硬编码引用 | `template/src/engine/`、`template/src/components/` | 改为位置化 id 或经 config 间接引用 |
| `package.json` 的 `publish` 块手写情况 | `instances/*/package.json` | `id`/`tags` 迁 `config.json`；`title`/`description` 迁 i18n；其余由 build 派生 |
| 有无 `dist/` 旧产物需清理 | `instances/*/dist/` 或 `template/dist/` | 迁移时丢弃，新产物出 `dist_template/` |
| `vite.config.ts` 的 `@content` / `publicDir` 绑定方式 | `template/vite.config.ts` | v1 多为 per-instance `INSTANCE` env 切换，须改为 instance 无关 |
| 裸根资源 URL（`${BASE_URL}images/...`、`${BASE_URL}BGM/...`、`chapter_bg.jpg`） | `template/src/**/*.tsx`、`engine/bgm.ts` | v1 靠 `publicDir` 伺服在根；v2 资源在 `content/resources/`，须经 `toUrl()`/`imageUrl()` 解析并请求 `.webp`（见 Step 5④） |

**迁移路径**：在 `workspace/templates_v2/<id>/` 下新建目录结构（`template/`、`instances/`、`CONTENT_SPEC.md`、`content_spec_template.yaml`），把 v1 的引擎/UI 代码迁过来并按 Step 1→10 改造；v1 的 instance 内容拆解到新三槽位。**迁移完成前不要删 v1 目录**——留作对照，全部验收通过后再由用户决定是否清理。

**全新创建（入口 3）**跳过审计，直接按 Step 1→10 从空模板起步，pelican-town 的目录结构和文件作为脚手架范本。

把审计结果列成 punch list 给用户，标明每项属于哪个入口、当前状态、目标状态，作为本 skill 的执行计划。

### Step 1：角色 id 位置化 + 固定 key schema（spec §3.1）

把 IP 专有 slug（`fushiguro`/`itadori`/`harvey`…）改成**位置固定 id**：

- duo-chat：`a` `b`（固定两个）
- ai-romance-drama：`a`（单男主，按需扩展）
- pelican-town：保留语义 slug（`harvey`/`pierre`…）——**这是 pelican-town 的已知偏离**，新模板若 NPC 数固定且少，优先位置化；NPC 多且语义强（如 pelican-town 10 个村民），可保留语义 slug，但 i18n key schema 仍须模板级固定

i18n key 全部改为模板级固定：
- `char.a.name` / `char.a.tagline` / `char.a.tags.0` / `char.a.persona`
- `beat.0.directive` / `beat.1.directive`
- **`game_meta.ip_name` / `game_meta.description`（强制）——每个模板的每个 `i18n/*.json` 都必须含这两个 key**

**收益**：二阶段用一套固定 key 列表填充每种语言 JSON，无需先读 instance 才知道 key 长什么样。

> **`game_meta.ip_name` / `game_meta.description` 是跨模板横切的强制契约**：所有 templates_v2 模板的 `i18n/<locale>.json` 都必须包含这两个 key（占位语言可为空串 `""`，但 key 不能省）。这两个 key 是发布层/橱窗展示的 IP 标识，与模板类型无关，故作为模板改造的硬性验收项。

### Step 2：删 `story-data.ts`，模板固定 loader 替代（spec §3.2）

删除每个 instance 的 `content/story-data.ts`。在 `template/src/content/loader.ts`（或等价位置）实现固定 loader：

- 从 `config.json` 读结构（角色 id 列表、颜色、opening_dialogue 说话人序列、beat 顺序）
- 从 i18n 读文本（按 Step 1 的固定 key schema）
- 按约定推导资源路径（如 `char.a` → `resources/images/characters/a.png`、`a_card.png`）
- 组装成引擎现有的 `StoryData` 类型返回

loader 暴露 `buildStoryData(config, locale)` 纯函数，instance 不再 import `StoryData`、不写任何 TS。

### Step 3：`config.json` schema + 默认值（spec §3.3 / §3.5）

给 `config.json` 定一个 TS 类型 + 默认值：`template/src/config/types.ts` + `defaults.ts`。loader 用它校验 + 兜底，也作为二阶段填充 config 的契约。

**全字段恒在**——可选项也写出来，空值用 `""` / `[]` 占位（如无 bgm 写 `"bgm": ""`），不靠省略。这样二阶段填充有一份固定形状可对齐。

`config.json` 承载所有**与语言无关**的值：

- 结构：角色 id 列表、opening_dialogue 说话人序列、beat 顺序
- 数值：金币目标、好感度阈值、季节日程
- 枚举：季节、时段、结局 id
- 颜色：角色主题色、结局色——**单一来源**，运行时由 config 注入 CSS 变量，**禁止**在 `tokens.css` 重复
- 语言索引：`game_meta.supported_locales`（pelican-town 路径）或顶层 `locales`（duo-chat / ai-romance-drama 路径），见 Step 7
- 发布结构：`publish: { id, tags }`（标题/描述走 i18n `publish.title` / `publish.description`）

**判定规则**：会展示给用户、或作为内容喂给 AI → 进 i18n；纯结构/数值/枚举/颜色 → 进 config。

参考 `pelican-town/dist/content/config.json` 的全字段形态——它是范本（pelican-town 现存产物在 `dist/`，新模板输出到 `dist_template/`，文件内容形态一致）。

#### config.json 与 content_spec_template.yaml 的路径对应（强制）

`config.json` 中所有静态资源路径字段，必须与 `content_spec_template.yaml` 中 `assets_needed` 的 `path` **一一对应、完全一致**。这些路径是模板级固化的，**不应该在实例化时让大模型填充**：

| config.json 字段 | 对应 YAML asset id | 说明 |
|---|---|---|
| `meta.cover_image` | `cover` | 封面图片路径 |
| `opening.image_path` | `opening` | 开场图路径 |
| `ai_config.bgm_path` | `bgm` | BGM 音频路径（空串 = 无 BGM） |
| `characters[].image_path` | `sprite_<charID>` | 每个角色的立绘路径 |

**规则**：
- config.json 里的资源路径值与 YAML 中 `assets_needed[].path` **逐字相同**——不能 config 写 `images/cover.png` 而 YAML 写 `images/cover-bg.png`
- 路径是模板结构的一部分，在 `build-skeleton.mjs` 产骨架时就写入 config.json，实例化时只填 i18n 文本和 subject 描述，**不修改路径**
- avatar（`<charID>_avatar`）路径只在 YAML 的 `assets_needed` 里声明，不出现在 config.json——assembler 按 `sprite_<id>` / `<id>_avatar` 命名约定自动挂到角色上
- 如果模板有多个角色，config.json 的 `characters[].image_path` 和 YAML 的 `sprite_<charID>` 按顺序一一对应

**正确做法**：`build-skeleton.mjs` 根据 YAML 的 `assets_needed` 生成 config.json 骨架时，直接**硬编码**对应路径。二阶段实例化时 config.json 原样使用，不重写路径字段。

**错误做法**：config.json 路径留空，让大模型在实例化时猜测填写——这会导致路径与 YAML 不一致、remix_job 产物挂不上运行时。

#### 资源路径统一走 resourceUrl()（强制）

**这是一个常见的改造遗漏 bug**：`config.json` 中不同字段的路径在代码中被消费的方式不一致——有的走了 `resourceUrl()`（自动加 `content/resources/` 前缀），有的原样使用（需要手动带前缀），导致同一份 config 里路径规则分裂。

**`resourceUrl()` 的定义**（`utils/resourceUrl.ts`）：

```ts
const RESOURCE_BASE = 'content/resources/'
export function resourceUrl(path: string): string {
  if (!path) return ''
  return `${import.meta.env.BASE_URL}${RESOURCE_BASE}${path}`
}
```

**改造时必须逐字段审计**：`config.json` 里每一个资源路径字段，在代码中被读取后，最终是怎么拼成 URL 的。列出下表，确保所有路径**统一走 `resourceUrl()`**：

| config.json 字段 | 典型消费位置 | 是否走了 `resourceUrl()` | 正确路径格式 |
|---|---|---|---|
| `meta.cover_image` | CoverScreen `<img src={resourceUrl(...)}>` | **是** | `images/cover-bg.png`（相对路径，不带前缀） |
| `meta.cover_video` | CoverScreen `<video src={resourceUrl(...)}>` | **是** | `videos/cover-bg.mp4`（相对路径） |
| `characters[].image_path` | imageClient `fetch(resourceUrl(...))` | **是** | `images/characters/a.png`（相对路径） |
| `opening.image_path` | CoverScreen `imageUrl: cfg.opening.imagePath` → 写入 segment，后续直接作为 `<img src>` | **极易遗漏** — 原样写入 segment，不走 `resourceUrl()` | 如果不包 → 需要手写 `content/resources/images/opening.jpg`；包了 → 写 `images/opening.jpg` |
| `opening.video_path` | 同上，原样写入 segment | **极易遗漏** | 同上 |
| `opening.scene_images[]` | 原样写入 segment.extraImages | **极易遗漏** | 同上 |
| `opening.scene_videos[]` | 原样写入 segment.extraVideos | **极易遗漏** | 同上 |
| `ai_config.bgm_path` | useBGM `new Audio(url)` — 直接给 Audio 构造器 | **极易遗漏** — 不走 `resourceUrl()` | 如果不包 → 需要手写 `content/resources/BGM/bgm.mp3`；包了 → 写 `BGM/bgm.mp3` |

**改造动作**：

1. **在 loader 中统一处理**（推荐）：在 `buildStoryData()` / loader 里，对所有从 config 读出的路径统一调用 `resourceUrl()` 后再传给组件/segment/engine。这样 config.json 里所有路径都是相对路径（不带 `content/resources/` 前缀），与 `resourceUrl()` 的行为一致。
2. **逐处包 `resourceUrl()`**（次选）：在 `CoverScreen` 里写 segment 的 `imageUrl`/`videoUrl` 时、在 `useBGM` 里创建 `Audio` 前，显式调用 `resourceUrl()`。
3. **禁止半包半不包**：绝不能出现"cover_image 走 `resourceUrl()` 但 opening.image_path 不走"的情况——这导致 config.json 中同一个 `content/resources/` 前缀对有些字段是多余的、对有些字段是必需的，填 config 的人无法知道该不该加前缀。

**验收方法**：改造完成后，config.json 中所有资源路径统一为**相对于 `content/resources/` 的相对路径**（如 `images/cover-bg.png`），运行时不出现路径重复（`content/resources/content/resources/...`）或 404。在 Step 10 的 checklist 中增加此项检查。

### Step 4：拆分 `ai_system_prompt`（spec §3.4）

把现状一坨的 `ai_system_prompt` 拆两半：

| 部分 | 归属 | 内容 |
|---|---|---|
| 人设文本 | i18n（IP 相关，随实例/语言变） | 由一阶段 `persona_brief` 生成；key 如 `ai.persona` 或 `char.a.persona` / `char.b.persona` |
| 格式外壳 | 模板固定 `buildSystemPrompt()` | JSON 输出契约、charId 绑定（a/b）、narrator 必填、suggestions 规则、语言指令——模板级固定，注入人设文本拼出最终 system prompt |

**收益**：二阶段只产人设文本（创意实质），格式契约由模板保证正确，不会因生成器猜测破坏 JSON 契约。

### Step 5：运行时 fetch 改造（spec §6.1–6.4）

把构建期绑定的两类 JSON 改为运行时 fetch：

**① `config/index.ts`：静态 import → 运行时 fetch**
- 去掉 `import rawConfig from '@content/config.json'`
- 改为 `fetch('./content/config.json')` 拿 raw，再走现有 `loadConfig()` 校验/兜底
- `loadConfig()` / `injectThemeColors()` / `hexToRgba()` 等纯逻辑不变
- `config` 不再是模块级常量 → 见 Step 6 异步启动

**② `i18n/index.ts`：eager glob → 运行时 fetch**
- 去掉 `import.meta.glob('@content/i18n/*.json', { eager: true })`
- 改为按需 `fetch('./content/i18n/<locale>.json')`（至少取请求语言 + 兜底 en）
- `contentI18nMap` 改为 fetch 后填充；`translateContent()` / `resolveStrings()` 等纯逻辑不变
- 语言清单问题：`availableContentLocales()` 不能再靠 glob——读 `config` 的语言索引（Step 7）

**③ `vite.config.ts`：去掉 per-instance 绑定**
- 移除指向具体 instance 的 `@content` 别名与 `publicDir`
- build **与 instance 无关**（一种模板构建一次）
- `content/` 改由组装步骤放到 `dist_template/` 旁，作为同源静态文件被运行时 fetch；不参与编译
- `build.outDir` 显式设为 `'dist_template'`（不用 Vite 默认 `dist/`）

**④ 资源 URL 解析：`content/resources/` 前缀 + 请求 `.webp`（v1→v2 高频陷阱）**

v1 用 `publicDir: resources`，把 `resources/` 直接伺服在站点根，所以 v1 代码到处写 `` `${import.meta.env.BASE_URL}images/cover-bg.png` `` 这种**裸根路径**。v2 把资源挪进 `content/resources/`（第 3 槽位，运行时 fetch），裸根路径会全部 404。**移除 `publicDir` 后必须同步改掉所有图片/音频/视频 URL 构造**，否则编译/测试全过、线上图全裂（骨架态因 resources 为空不暴露，填了真内容才炸）。

落地（**照抄 `romance-battle/template/src/utils.ts`**）：建一个 `src/utils.ts`，所有资源 URL 一律过它，禁止组件里直接拼 `${BASE_URL}...`：

```ts
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')
// 音频/视频/已是 webp 的图：仅加 content/resources/ 前缀
export const toUrl = (p: string) => {
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  const rel = p.replace(/^\//, '')
  return `${BASE}/${rel.startsWith('content/resources/') ? rel : `content/resources/${rel}`}`
}
// 图片：把扩展名改写成 .webp 再走 toUrl
export const imageUrl = (p: string) => {
  if (!p || /^https?:\/\//.test(p)) return p
  return toUrl(p.replace(/\.(png|jpe?g|gif|bmp|webp)$/i, '.webp'))
}
```

**为什么图片一律请求 `.webp`**：remix 后端 assembler 对每张生成图都会再编码出一个 **`.webp` 兄弟文件**（`instory_backend` 仓 `internal/pkg/remixpipe/{assembler.go,webp.go}`，Quality 80，与原图同名换扩展名），并在 manifest 里优先用 `.webp`。所以前端无脑请求 `.webp` 永远命中且更小——`imageUrl()` 把 config 里存的任意扩展名（`.png`/`.jpg`）改写成 `.webp` 即可，不依赖 instance 存的是什么格式。

配套同步：
- 组件里 cover/角色立绘/场景背景/头像等 `<img src>` 全改 `imageUrl(path)`；BGM/视频用 `toUrl(path)`（不改扩展名）。
- `content_spec_template.yaml` 的 `assets_needed[].path` 一律写 `.webp`；`CONTENT_SPEC.md` 素材表标注 WebP。`spec` 字段格式 token（如 `"1080x1920 png"`）只是宽高比载体、worker 不读格式，可不动，但 `path` 必须 `.webp`。
- 涉及 `resolveBgmUrl()` 等默认资源路径的引擎函数：默认值改成 `toUrl('BGM/bgm.mp3')` 这类相对路径，**别再写裸 `${BASE_URL}BGM/...`**；对应单测断言一并改为 `/content/resources/...`。

> 自检：改完 `grep -rn "BASE_URL}\(images\|chapter\|BGM\|cover\)" src` 应为空——任何组件里还在拼裸根资源 URL 都是漏网。

### Step 6：异步 bootstrap（spec §6.3）

`config` 与 `contentI18nMap` 从「import 即就绪的同步常量」变成「需 await fetch 的异步值」：

- `main.tsx` 增加 bootstrap：先 `await` 取 `config.json` + 所需 `i18n/<locale>.json`（及 en 兜底），**再** render（期间显示 loading）
- 所有**模块顶层**就读 `config` / `translateContent` / `contentI18nMap` 的地方，挪到 bootstrap 完成之后（改为函数内取值、或经 context/store 注入）
- `buildStoryData(cfg = config)`、各组件的 `buildStoryData()` / `resolveStrings()` 调用点逐一核对求值时机
- `injectThemeColors()` 依赖 `config`，须在 bootstrap 拿到 config 后调用

这是唯一有扩散的部分，范围限于 template 引擎初始化路径，可控。

### Step 7：locale 契约（spec §7）

**规范语言码**（12 全集）：
```
en, zh-CN, zh-TW, ja, ko, es, pt, id, th, de, fr, ru
```
- 简体中文统一 `zh-CN`（i18n 文件名、`supported_locales`、`Locale` 类型、`getCurrentLocale()` 兜底、`buildSystemPrompt()` 语言壳全部以此为准）
- 繁体中文 `zh-TW`
- 推荐 instance 覆盖全集 12 个；最少必须含 `en`

**语言索引声明**（二选一，与 §6.2② 对齐）：
- templates_v2 通用：`config.json` 顶层 `locales: string[]`
- 或复用已有字段：`config.game_meta.supported_locales`（pelican-town 走这条）

`availableContentLocales()` 读该索引，**不依赖目录 glob**。

**文件契约 + 缺省兜底**：
- 索引里声明的每个 locale，`content/i18n/<locale>.json` 应存在；占位语言允许是空对象 `{}`
- **`en.json` 是唯一完整真实来源**（fallback locale），必须含全部固定 key（含 persona 模板变量等）
- `translateContent()` **逐键回退**：请求 locale 的键 → en 同名键 → 调用方兜底参数。空 `{}` 或缺键的 locale 文件优雅回退 en，不渲染空串
- 运行时 fetch 对非 en 语言文件 404 容忍；仅 `config.json` / `en.json` 缺失为致命

**TTS 映射**：`LOCALE_TTS_MAP` 把 app locale 映射到 BCP-47 语音区域码（多数同名，`'en': 'en-US'`）。

### Step 8：测试改造（spec §6.5 / §7.5）

template 自带测试假设构建期加载，须一并改：

- `tests/i18n.vitest.ts` / `tests/i18n_validation.vitest.ts`：依赖 eager glob 的 `contentI18nMap`，改为喂 mock 数据或从 fixture fetch
- `tests/content-validation.vitest.ts` / `tests/instances_validation.vitest.ts`：校验逻辑走运行时 loader（接受注入的 config/i18n，而非编译期常量）；**用 mock 数据覆盖主要测试**，instance 扫描为可选的附加检查（`instances/` 目录不存在时优雅跳过）
- 新增：bootstrap 异步加载 + loading/失败态的测试
- 新增：`content_spec_template.yaml` 存在性和基本结构校验测试
- **locale 断言放宽**：`en` 为完整真实来源（校验全 key 非空），其余 locale 仅校验「存在的值为非空字符串」，允许空/部分
- persona 模板变量等结构约束断言，只对**实际提供了该键**的 locale 生效
- `expectedLocales` / 语言名映射 / 语言指令断言全部用 `zh-CN`
- **不依赖任何外部 instance 文件即全部通过**——`npx vitest run` 在干净的 `templates_v2/<id>/template/` 下全绿

### Step 9：CONTENT_SPEC.md 同步（spec §3.7）

模板 `CONTENT_SPEC.md` **必须同步更新**，否则 remix 用户会按过时的「每个 instance 都要 `vite build`」操作。同步要求三点：

1. **新增「运行时加载 / 免重编部署」说明**（REMIX Guide 内）：内容运行时 fetch；JS 壳**编译一次且 instance 无关**（`INSTANCE` env 不影响 build，仅选 dev server 的内容目录）；remix = 替换 `dist_template/content/`，无 per-instance 编译、零 TS。附 `dist_template/` 布局图（`index.html` + `assets/*` = 壳；`content/{config.json,i18n,resources}` = 可替换 instance）
2. **区分两个 content 位置**：`instances/<name>/content/` = **创作源**（编写/版本管理）；`dist_template/content/` = 运行壳实际 fetch 的**部署副本**。发布即把前者装配进后者（或同源静态托管 / R2）
3. **修正 Completion Checklist**：删除/改写误导性的 `INSTANCE=<name> npx vite build` 条目——壳构建 instance 无关，改为「dev 用 `INSTANCE=<name> npx vite` 验证 + 拷 `content/` 进 `dist_template/content/` 后 `vite preview` 做部署校验」。注明非 en 语言文件缺失运行时容忍回退 en（仅 `config.json` / `en.json` 为致命）

**正文的「内容契约」（字段表、AI 契约、资源规格）不受运行时加载影响、无需改动**——只补部署模型与 checklist。

pelican-town 的 `CONTENT_SPEC.md` 已按上述三点更新，作为同步范本。

### Step 10：组装样例包 + 验收

按产物契约（见上方「产物契约」节）组装一个样例包，供后端 assemble/publish 步骤对接：

1. `npx vite build`（一次，instance 无关，`build.outDir: 'dist_template'`）→ 产 `dist_template/index.html` + `dist_template/assets/`（实体编译产物）+ 骨架 `dist_template/content/`（key 空值、资源空目录）+ 实体 `meta/`、`manifest.json`、`CONTENT_SPEC.md`、`content_spec_template.yaml`
2. **填充实质**：拷某 instance 的 `content/`（含真实 i18n 值、真实 config 值、实体图片音频）**覆盖** `dist_template/content/` 骨架（或由二阶段生成后写入）
3. 生成/补全 `dist_template/meta/manifest.json`
4. 打包交付：用 Step 13 的 `pack-template.mjs` 把 `dist_template/` 打成 `~/Downloads/<id>.zip`（默认重置骨架）

> `dist_template/` 出 `vite build` 时是骨架态（i18n key 空串、config 结构默认值、resources 仅目录树）；可发布的 instance 包 = 骨架被实质内容覆盖后的 `dist_template/`。**不要**往 `vite build` 产物里复制任何 instance 专有图片/音频——那是组装/二阶段的事。

> **`build-skeleton.mjs` 必须先 `rmSync(content/, {recursive,force})` 再重建（照抄 romance-battle 的「wipe + recreate」）**。只 `mkdirSync`+写 `.gitkeep` 不删旧文件 → Step 12 `fill-content` 预览填充的真实 config/i18n/图片会**残留**，被 `pack-template` 默认重置时也清不掉（pack 只是重跑 build-skeleton），最终**泄进交付 zip**（表现：zip 里混进 instance 的 `.webp`/`.mp3`、config 看似骨架但 resources 非空）。自检：`unzip -l ~/Downloads/<id>.zip | grep -iE '\.webp|\.png|\.mp3'` 必须为空。

### Step 11: 更新 remix-master

当模版生成完毕且通过验收后请将新做/改造的模版更新到 remix-master/SKILL.md 的 `模板速查表` 中

模版速查表需要的信息：
1. 模板id
2. 核心玩法
3. NPC 数量
4. 驱动模式
5. 适合场景
6. 不适合场景

### Step 12：本地预览（fill-content + vite preview）

`npx vite preview` 静态伺服已构建的 `dist_template/`，**不经过** `vite.config.ts` 里那个 `apply: 'serve'` 的 dev 内容插件——所以它读的是 `dist_template/content/` 的实际文件。骨架态 content（i18n 空串、resources 空目录）会渲染成空白，因此预览前必须先把某个 instance 的真实内容**填充**进壳。这是**机械操作**，用 skill 自带工具 `scripts/fill-content.mjs`，不要手敲 cp：

```bash
node .claude/skills/template-v2-builder/scripts/fill-content.mjs <template-id> [instance-name]
# 例：node .claude/skills/template-v2-builder/scripts/fill-content.mjs duo-chat sample
cd workspace/templates_v2/<template-id>/template && npx vite preview
```

行为契约：

- **填充源**：`workspace/templates_v2/<id>/instances/<name>/content/`（v2 三槽位：`config.json` + `i18n/` + `resources/`）。省略 `instance-name` 时：只有 1 个 instance 则自动选用，多个则列出待选
- **填充目标**：`dist_template/content/`——**先清空再拷贝** instance 内容（不残留骨架文件），让 instance 未提供的 locale 在运行时 404 容忍回退 en，而非渲染骨架空串
- **预览**：`npx vite preview`（伺服 `dist_template/`，`base: './'`，与真实部署同构）
- **前置校验**：缺 `dist_template/index.html`（壳未构建）→ 报错提示先 `npx vite build && node scripts/build-skeleton.mjs`；instances 目录为空 → 报错提示先建 v2 instance
- **这是预览专用污染**：填充后的 `dist_template/content/` 是临时态。**Step 13 打包默认会重置回骨架**，不会误把填充内容打进交付包

> **预览态 ≠ 交付态**：填充只为肉眼验证「真实内容跑在真实壳上」。验证完不要手动清理——直接跑 Step 13 打包，它会 `build-skeleton.mjs` 重置骨架后再 zip。

### Step 13：打包交付（zip → ~/Downloads）

模板验收通过后，把预构建壳打成 zip 交付给下游（后端 assemble/publish 对接、或人工分发）。这一步是**机械操作**，用 skill 自带工具 `scripts/pack-template.mjs` 完成，不要手敲 zip 命令：

```bash
node .claude/skills/template-v2-builder/scripts/pack-template.mjs <template-id>
# 例：node .claude/skills/template-v2-builder/scripts/pack-template.mjs romance-battle
```

行为契约：

- **默认先重置骨架再打包**：打包前自动重跑模板自带的 `scripts/build-skeleton.mjs`，wipe & 重建 `content/`（空串 i18n、默认 config、空 resources/）——**这会清掉 Step 12 预览填充残留的 instance 内容**，保证交付 zip 永远是干净骨架态
- **打包对象**：`workspace/templates_v2/<id>/template/dist_template/` 的**内容**（不含 `dist_template/` 这层目录）——解压即得 `index.html` + `assets/` + `content/` + `meta/` 同级铺开的可部署壳，`content/` 与 `index.html` 同级，满足运行时 `./content/...` fetch 约定
- **命名**：以模板 id 命名 → `<id>.zip`
- **落地**：`~/Downloads/<id>.zip`（已存在则先删后建，绝不追加到旧档）
- **`--keep-content` 逃生口**：跳过骨架重置、按 `content/` 现状打包（用于打一个已填充实质内容的 instance 发布包；非本 skill 默认场景）
- **前置校验**：缺 `dist_template/` 或 `dist_template/index.html`（壳未构建）→ 报错退出，提示先跑 `npx vite build && node scripts/build-skeleton.mjs`；默认重置模式下缺 `scripts/build-skeleton.mjs` → 报错（或用 `--keep-content` 跳过）
- **repo root 解析**：默认 `git rev-parse --show-toplevel`，失败则从 cwd 向上找 `workspace/templates_v2`；也可作为末位参数显式传入

### Step 14：模版填充 → remix_request（生成 remix job 入参）

模板机制验收通过后，用模板产一个具体 instance 的 **remix job 入参**：把某 instance 的内容填进 `content_spec`，封装成 remix pipeline 唯一入参 `remix_request_<xxx>.json`。分两半——**填充是创作/判断，封装是机械**：

**① 填充（创作，按需判断）**：复制空白 `content_spec_template.yaml` → `content_spec_<xxx>.yaml`（`xxx` = instance 或变体名，如 `kaguya`），根据该模板 instance 的资源填关键字段：

```bash
cp workspace/templates_v2/<id>/content_spec_template.yaml \
   workspace/templates_v2/<id>/content_spec_<xxx>.yaml
# 然后填字段
```

填什么、怎么填——**严格依上方「content_spec_template.yaml 契约」节**：
- `meta`（`working_title` / `template_id` / `spec_language`）、`genre.tone`
- `characters[]`（`id` 只读；`name` / `personality` / `voice` / `role_in_story` / `persona_brief` / `appearance` / `theme_color`）
- `visual_style`、`publish`（`tags` / `catalog_title` / `catalog_description`）
- `assets_needed[]`（每个 `id` / `type` / `spec` / `path` / `subject` / `ref`）——`spec` 取值**必须从「图片规格表」选**；特殊 id 命名（`cover` / `sprite_<charID>` / `scene_npc_<charID>_*` 等）遵守「特殊 asset id 命名约定」
- 数据来源：该模板 instance 的 `config.json` / `i18n/*.json` / `resources/`（romance-battle 的 instance 在 `workspace/standard_templates/romance-battle/instances/<name>/`），并参照同目录 `content_spec_template.example.yaml` 范本

**② 封装（机械）**：用 skill 自带工具把填好的 yaml 封装成 remix_request——不要手敲 python/jq：

```bash
node .claude/skills/template-v2-builder/scripts/make-remix-request.mjs <id> content_spec_<xxx>.yaml
# 例：node .claude/skills/template-v2-builder/scripts/make-remix-request.mjs romance-battle content_spec_kaguya.yaml
```

行为契约：

- **入参**：`<template-id>` + 填好的 yaml 路径（先按 cwd 解析，再按 `workspace/templates_v2/<id>/` 解析）
- **slug 自动注入**：`template_slug` = `<template-id>`，**无需手改任何 `remix_request.json`**
- **产物**：`{ template_slug, content_spec_yaml }`——`content_spec_yaml` 是**整份 yaml 原文字符串**（worker 自己解析校验），不是结构化对象
- **命名/落地**：默认 `remix_request_<stem>.json` 落在输入 yaml 同目录；`<stem>` = yaml 文件名去掉前缀 `content_spec_` 与 `.yaml`（`content_spec_kaguya.yaml` → `remix_request_kaguya.json`）。`--out <file>` 可覆盖
- **前置校验**：`<template-id>` 不是 `templates_v2/` 下真实目录 → 报错；yaml 不存在或为空 → 报错

**下游**：`remix_request_<xxx>.json` 提交给 remix pipeline（remix_submit）。worker 过 `remixgate.Validate` 两层校验（见上方「两层校验模型」）→ `remixpipe.ParseContentSpec` 反序列化 → planner/poller/assembler 生成图片/文本/BGM。**填错会 400**——所以填充时务必对照契约节的字段表、`spec` 规格表、ref DAG 约束。

**验收 checklist**（承 spec §5 / §6.7 / §7.6，逐项打勾）：

- [ ] 任一 instance 删除 `story-data.ts` 后仍能正常运行（loader 从 config + i18n 组装）
- [ ] 角色 id 全部位置化（或语义 slug 但 key schema 模板级固定），i18n key 与 config key 为模板级固定 schema
- [ ] 颜色仅存于 `config.json`，`tokens.css` 无重复
- [ ] `ai_system_prompt` 拆分完成：人设在 i18n，格式契约在模板 `buildSystemPrompt()`
- [ ] 新建一个空白 instance：仅填三槽位、零 TS 改动即可跑通
- [ ] `config/index.ts` 与 `i18n/index.ts` 不再出现 `@content` 构建期绑定，改为运行时 fetch
- [ ] `vite.config.ts` build 与 instance 无关：一种模板构建一次，产物可被任意同模板 instance 复用
- [ ] `main.tsx` 异步 bootstrap 跑通：先加载 `content/`，再 render；含 loading 与加载失败态
- [ ] 语言索引契约落地（`config.locales` 或 `game_meta.supported_locales`），`availableContentLocales()` 不依赖 glob
- [ ] 取一个 instance，**不跑 Vite build**，仅「预构建壳 + content/ + meta/」打包即可正常运行
- [ ] template 测试全绿（按 Step 8 改造）
- [ ] 产出符合产物契约布局的样例包，供后端组装/发布步骤对接
- [ ] **本地预览**：`node .claude/skills/template-v2-builder/scripts/fill-content.mjs <id> <instance>` 填充后 `npx vite preview`，真实内容在真实壳上正常渲染
- [ ] **打包交付**：`node .claude/skills/template-v2-builder/scripts/pack-template.mjs <id>` 跑通——默认重置骨架（清掉预览填充残留），`~/Downloads/<id>.zip` 生成，解压后 `index.html` / `assets/` / `content/` / `meta/` 在 zip 根同级，且 `content/` 为骨架态
- [ ] **模版填充**（产 remix job 入参时）：`content_spec_<xxx>.yaml` 按契约填好后，`node .claude/skills/template-v2-builder/scripts/make-remix-request.mjs <id> content_spec_<xxx>.yaml` 跑通，生成 `remix_request_<xxx>.json`（`template_slug` = 模板 id，yaml 原文嵌为字符串）
- [ ] **`content_spec_template.yaml` 通过 `contentspeccheck` 校验**：在 instory_backend 仓跑 `go run ./cmd/contentspeccheck -yaml <模板>/content_spec_template.yaml`，退出码必须为 0（可有 warning，不可有 error）。如模板已发布到 admin 后台且有 `content_spec` JSON，加 `-template-spec <path>` 跑完整两层校验。Error = remix_job 会失败或产物有瑕疵，不得验收通过
- [ ] **预构建壳产物目录名为 `dist_template/`**（`vite.config.ts` 的 `build.outDir` 显式设为 `'dist_template'`），不得用 Vite 默认 `dist/`
- [ ] **`dist_template/` 出 `vite build` 时是骨架态**：`content/i18n/*.json` 只写固定 key、value 空串；`content/config.json` 只写全字段形态、结构默认值、无 IP 实质；`content/resources/` 仅目录树、**不复制任何图片/音频/视频文件**；`assets/`/`index.html`/`manifest.json`/`CONTENT_SPEC.md`/`content_spec_template.yaml` 是实体编译产物
- [ ] 全模板 app locale 码统一为 §7.1 的 12 个全集，简体中文为 `zh-CN`
- [ ] **每个 `i18n/<locale>.json` 都含 `game_meta.ip_name` + `game_meta.description` 两个 key；
- [ ] `en.json` 完整；`translateContent()` 逐键回退 en 验证通过（空 locale 文件不渲染空串）
- [ ] **所有资源 URL 经 `toUrl()`/`imageUrl()` 解析到 `content/resources/`，图片请求 `.webp`**（Step 5④）；`grep -rn "BASE_URL}\(images\|chapter\|BGM\|cover\)" src` 为空，`content_spec`/`CONTENT_SPEC` 图片 `path` 均 `.webp`
- [ ] **`config.json` 中所有资源路径统一走 `resourceUrl()`**：`cover_image`、`cover_video`、`characters[].image_path`、`opening.image_path`、`opening.video_path`、`scene_images`、`scene_videos`、`bgm_path` 全部在代码中经 `resourceUrl()` 拼接 URL；config.json 中所有路径为相对路径（不带 `content/resources/` 前缀），运行时不出现路径重复或 404
- [ ] `CONTENT_SPEC.md` 已按 Step 9 同步

---

## 约束（Guardrails）

1. **config.json 必须与语言无关**——会展示给用户、或作为内容喂给 AI 的东西进 i18n；纯结构/数值/枚举/颜色进 config
2. **二阶段 instance 输入用 JSON，一阶段需求文档用 YAML（且 YAML 是 worker 强类型机器输入）**——二阶段消费的 instance 输入（i18n、config）一律 JSON；一阶段产出的 `content_spec_yaml` 虽然是人可读的需求文档，但同时是 remix_job worker 的强类型机器输入（`remixgate.Validate` 做 schema + ref DAG 校验，`remixpipe.ParseContentSpec` 反序列化驱动 planner/poller/assembler 全流程）。填写 `content_spec_template.yaml` 时必须同时满足「人审可读」和「机器可消费」两个约束，详见下方「content_spec_template.yaml 契约」节
3. **颜色单一来源**——config 是唯一来源，CSS 变量由 config 注入，禁止 `tokens.css` 重复
4. **新建 instance 零 TS 改动**——改造完成的验收标准
5. **预构建壳与 instance 解耦**——一种模板的 bundle 内容不得依赖任一具体 instance；instance 差异只允许存在于 `content/`
6. **config.json 资源路径与 YAML 一一对应、模板固化**——`config.json` 中所有静态资源路径（`meta.cover_image`、`opening.image_path`、`ai_config.bgm_path`、`characters[].image_path`）必须与 `content_spec_template.yaml` 的 `assets_needed[].path` 逐字一致。路径是模板结构、在 `build-skeleton.mjs` 产出时即固化，实例化时不修改路径，只填 i18n 文本和 subject 描述
7. **本改动落在 client submodule（drama-engine）**，是 C 端 remix 流水线的跨仓前置任务，blocks 后端 assemble/publish 实现
8. **运行时化先在单模板验证**——模式确立后再推其他；pelican-town 已首发落地，可作其他模板（duo-chat / ai-romance-drama）推广的范本
9. **目标态一律 `templates_v2/`**——三种入口（旧模板迁移 / v2 深化 / 全新创建）的最终产物都落在 `workspace/templates_v2/<id>/`。旧 `standard_templates/<id>` 是迁移**起点**，迁移完成后由用户决定是否清理，**不要**在迁移过程中删 v1 目录

---

## 落地状态参考（pelican-town）

pelican-town 已首个落地该模式，与 spec「计划态」有两点实际偏离，**按实际为准**：

1. **首个落地模板是 pelican-town，非 duo-chat**——spec §6.6① 的「先在 duo-chat 验证」是计划口径，本树由 pelican-town 首次落地
2. **语言索引选了第三方案**——复用 `config.game_meta.supported_locales`（已存在字段），未新增顶层 `config.locales`，也未生成 `i18n/index.json`。`availableContentLocales()` 改读 `config.game_meta.supported_locales`；运行时 `loadContentLocale(locale)` 不查索引、直接 fetch `./content/i18n/<locale>.json`，非 en 语言缺文件 → 404 容忍回退 en（仅 `config.json` / `en.json` 致命）

推广到 duo-chat / ai-romance-drama 时，语言索引可走顶层 `config.locales`（spec §6.2② 推荐方案 a）或复用 `supported_locales`（pelican-town 路径）——任选其一，与模板现有字段形态对齐即可。
