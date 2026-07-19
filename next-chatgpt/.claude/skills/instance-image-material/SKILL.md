---
name: instance-image-material
description: |
  为单个互动图文实例生成/更换图片物料（封面图 + 封面视频 + NPC 头像 + NPC 聊天背景）。
  按门禁式流程：提取描述 → 选参考图 → 用户确认 prompt → 调用 InStory R2 库生成 →
  接线 manifest → 校验 → 人工抽查。
  触发词：封面视频、封面图、换封面、cover-bg、cover-material、instance-image-material、生成封面、换头像、
          avatar、头图、聊天背景、chat_bg、重生成所有图片、重新生成所有图片。
---

# Cover Material · 实例图片物料生成

为**单个实例**生成或更换图片物料。这是 `production` 门禁哲学在小尺度上的复用：
**聊清楚再动手**（prompt 自动起草但必须人工确认）、**脚本验收 + 人工抽查**、
生成统一走 `lib/instory-image.mjs`（InStory + R2 `ref_image_url` 管线）。

支持三种物料类型：**封面**（9:16）、**NPC 头像**（1:1）、**NPC 聊天背景**（9:16）。
封面的视频部分额外走 ArtClaw REST API。

## 前置检查（每次进入必做）

1. `workspace/scripts/lib/instory-image.mjs` 存在（共享生成管线）。
2. InStory API：测试 `https://instory-api.inner.vicoo.ai`（默认），生产 `https://api.instory.art`（兜底）。lib 通过 `INSTORY_HOST` 环境变量选择。
3. ffmpeg 可用：`ffmpeg -version`（仅封面视频需要）。
4. `workspace/scripts/compress-webm.mjs` 存在（仅封面视频需要 webm 压缩）。
5. `workspace/scripts/lib/discover-targets.mjs` 存在（定位实例）。

> artclaw CLI 当前 `_add_common_args` 未定义导致崩溃，视频生成需直调 ArtClaw REST API。

## 三种物料

| 物料类型 | 触发意图 | 目标字段 | 宽高比 | ref 默认策略 | prompt 来源 |
|---------|---------|---------|--------|-------------|------------|
| **封面图** | "换封面图" | `background_img` | 9:16 | 旧封面 → 角色卡/场景页 | vision 读封面 + story-data |
| **封面视频** | "换封面视频" | `background_video` | — | 以新封面图做首帧 ref | vision + drama_tag |
| **头像** | "换头像"（需指定 NPC）| `npcs[].avatar` | 1:1 | 旧头像 → 角色卡 | `personality_desc` + 画风标签 |
| **聊天背景** | "换聊天背景"（需指定 NPC）| `npcs[].chat_bg` | 9:16 | 旧聊天背景 → 角色卡 + 场景页 | `environment_desc` + 人物锚点 |

两种操作模式：

| 模式 | 触发意图 | 行为 |
|------|---------|------|
| **单点替换** | "给 X 换头像" | 选择指定 NPC 的一种物料，生成替换 |
| **全量重生成** | "给 X 重生成所有图片" | 头像→聊天背景→封面，级联 ref |

## 定位实例

`workspace/scripts/lib/discover-targets.mjs` 的 `findTarget(name)` → `target.pubResDir` 为产物落地目录。

---

## 门禁式流程总览

```
Phase 0  按物料类型走
   ├─ Phase 0a 封面图（可选）
   │   ① 选参考图：优先用实例 cover-bg.png（现有封面）→ 角色卡/场景图 → sharp resize → R2 上传
   │   ② 起草 image_prompt（从物料拼合，用中性描述避过滤）
   │   ③ 调用 lib/instory-image.mjs → cover-bg-{vN}.png（版本化）
   │   🚪 用户确认满意
   ├─ Phase 0b 头像（可选）
   │   ① 从 manifest 确认 NPC 存在，读取 personality_desc
   │   ② 选参考图：优先 char/{id}_avatar.webp（旧头像）→ card_{id}.webp（角色卡）
   │   ③ 起草 prompt：personality_desc + portrait + anime style
   │   ④ 调用 lib/instory-image.mjs（aspect: 1:1）→ char/{id}_avatar-{vN}.webp（版本化）
   │   🚪 用户确认满意
   ├─ Phase 0c 聊天背景（可选）
   │   ① 读取 NPC environment_desc + personality_desc
   │   ② 选参考图：优先 char/{id}_chat_bg.webp（旧聊天背景）→ 角色卡 + 场景页
   │   ③ 起草 prompt：environment_desc + solo full-body + atmospheric + anime
   │   ④ 调用 lib/instory-image.mjs（aspect: 9:16）→ char/{id}_chat_bg-{vN}.webp（版本化）
   │   🚪 用户确认满意
   └─ (若只换封面视频，从 Phase 1 进)
        │
        ▼
Phase 1  看图 + 扫物料（封面视频用）
   vision 读封面图 + 扫 manifest/story-data
   🚪 确认实例 + 参考图
        │
        ▼
Phase 2  方案确认（封面视频）
   ① 选视频模型（问用户）
   ② 自动起草 cover_video_prompt
   ③ 可选参考示例图
   🚪 确认 prompt + 模型
        │
        ▼
Phase 3  生成（后台异步）
   ArtClaw REST API / CLI → cover-bg.mp4
        │
        ▼
Phase 4  压缩 + 接线 + 验收
   compress-webm.mjs → cover-bg.webm
   更新 manifest 对应字段
   🚪 validate-pub-res 通过 + 人工抽查
```

---

## Phase 0 — 图片生成

所有图片生成统一走 `workspace/scripts/lib/instory-image.mjs` 的 `generateImage()`。
该 lib 封装了完整的 InStory + R2 `ref_image_url` 管线：login → sharp resize ref → R2 upload → submit → poll → download。

### Phase 0a — 封面图

```
① 选参考图：优先 cover-bg.png（现有封面）→ 角色卡/场景图
   └─ 多张参考用 sharp 拼接成 1 张网格图（ref_image_url 是单数）
② sharp resize(1024px, fit:inside, quality:85) → R2 upload → public_url
③ 起草 image_prompt（见下方 prompt 起草规则）
④ 调用 lib: generateImage({ prompt, aspectRatio: "9:16", storyId, refImagePath })
   → 产出 cover-bg-{vN}.png（版本化，不覆盖）
```

### Phase 0b — 头像 (1:1)

```
① 从 manifest.json npcs[] 确认目标 NPC 存在
② 读取 personality_desc 作为 prompt 基础
③ 选参考图：
   - 首选：pubResDir/characters/{id}_avatar.webp（该 NPC 的现有头像，锚定已有外观）
   - 备选：该 NPC 的角色卡图（card_{id}.webp 或 images/ 下的角色正面）
   - 如均无，不传 ref（InStory 从 prompt 自由生成）
④ 起草 prompt：personality_desc + ", portrait, headshot, clean background, high quality, anime style"
⑤ 调用 lib: generateImage({ prompt, aspectRatio: "1:1", storyId, refImagePath? })
   → 产出 characters/{id}_avatar-{vN}.webp（版本化）
```

### Phase 0c — 聊天背景 (9:16)

```
① 读取 NPC environment_desc（主）+ personality_desc（辅）
② 选参考图：
   - 首选：pubResDir/characters/{id}_chat_bg.webp（该 NPC 的现有聊天背景，锚定已有环境+人物）
   - 备选：角色卡 + 场景页（page_*.jpg）拼接 → 锚定人物 + 环境
   - 如刚生成了新头像，可同时作为人物锚点 ref
③ 起草 prompt：environment_desc + personality_desc +
     ", solo full-body character illustration, standing in atmospheric scene" +
     ", vertical 9:16 phone wallpaper composition, anime art style" +
     ", cinematic lighting, rich background detail, no text, no watermark"
④ 调用 lib: generateImage({ prompt, aspectRatio: "9:16", storyId, refImagePath? })
   → 产出 characters/{id}_chat_bg-{vN}.webp（版本化）
```

### 起草 image_prompt（关键经验）

**不要**直接把 IP 角色名/具体外观写到 prompt（已验证 InStory 会对含具体人物描述的 prompt 返回 failed）。正确做法：

- **画风锚定**：`High-quality anime illustration, cel-shaded style, Genshin Impact aesthetic` 等通用风格关键词
- **场景描述**：从 story-data 提取世界观元素，写具体但不写 IP 名
  - ✅ `an abandoned ancient shrine deep in the forest at night, stone pillars wrapped in vines, warm golden wind lanterns`
  - ❌ `Xiao stands in the shrine`（角色名触发过滤）
- **人物描述**：用中性外观词，不点名
  - ✅ `a young man with dark teal hair and sharp golden eyes, wearing a white and green outfit`
  - ❌ `Xiao the yaksha guardian with anemo vision`
- **构图**：明确人物站位和空间关系（左/右/中/背对/侧身）
- **格式尾巴**：`no text no letters no words`（lib 自动追加）
- prompt 长度：600–1100 字符均可，建议控制在 800–1000 字符以内

### 参考图策略

| 场景 | 做法 |
|------|------|
| 只锚定画风+氛围 | 优先用现有同一物料作 ref |
| 锚定某一角色特征 | 用该角色 card_image 作 ref |
| 锚定多个角色特征 | 用 sharp 拼接多张角色卡为 1 张网格图作 ref |
| 多轮迭代铺路 | v_N_ 当 ref → 生成 v_N+1_，逐步改善 |
| 改场景换构图 | 用 page_*.jpg 场景图锚定目标场景画风 |

### 产出版本化

每次生成写 `{name}-{vN}.{ext}`，**不覆盖旧版**——用户对比选优后再决定接线哪张。

### 速率控制

InStory 连续提交需间隔 ≥ 10 秒（否则 403 限流）。lib 本身不强制间隔——调用方负责。

### 已知失败模式

| 现象 | 原因 | 对策 |
|------|------|------|
| `failed`（含人物/暗黑描述） | "queen"、"dark"、"murder" 等触发内容过滤 | 用中性外观词，色调用 "jewel tone palette" 替代 "dark shadows"，氛围用 "enchanted" 替代 "ominous" |
| `failed`（含 IP 角色名） | "Xiao"、"Loki"、"Snow White" 等直接点名 | 去掉所有角色名/IP 名，换纯外观描述 |
| `failed`（过于文艺/文学化描述） | "silence between them" 等抽象叙事触发过滤 | 只写纯视觉要素（场景/人物/光线/构图），避免叙事感和人物内心描写 |
| `Submit failed: 413` | 参考图 base64 payload 过大 | 走 R2 上传 + `ref_image_url`（lib 已实现） |
| `Submit failed: 400` | `story_id` 缺失 | lib 默认值兜底，调用方传 storyId 覆盖 |
| CDN 下载 403（罕见） | 浏览器防盗链误触 | lib 已内置 403 → UA 重试 |
| 轮询超时（5min+ processing） | 任务卡住 | 换 prompt/ref 重提交 |

---

## Phase 1 — 看图 + 扫物料（封面视频用）

确认封面图就位后，收集自动起草视频 prompt 的素材。

### 看图
vision 读封面图，描述实际画面：主体、场景、构图、色调、画风。

### 扫实例已有物料
- `manifest.json`：title / description / drama_tag（氛围关键词）
- `content/story-data.ts`：角色设定、场景描述、开场叙事、风格指令
- 模板类型 → 画风推断

### 🚪 门禁
确认实例定位正确、参考图无误。

---

## Phase 2 — 方案确认（封面视频 · 自动起草 + 门禁）

### 模型选择与验证记录

| 模型 | `model` 参数 | 视频 | 备注 |
|------|-------------|------|------|
| seedance | `doubao-seedance-2-0-260128` | ✅ | snow-white-v2 cover-bg-v7 ref 1080p，~5.5min，8.3MB mp4 |
| seedance 快速 | `doubao-seedance-2-0-fast-260128` | 待验证 | 未实测 |
| 可灵 | `kling-v3-omni` | ❌ | InternalError "please contact Kling"，待排查 |

### 自动起草 5 段式 cover_video_prompt

```
[主体场景]  ← 封面图 vision + 故事场景描述
[画风]      ← 模板类型推断
[色调氛围]  ← drama_tag → 氛围关键词
[运镜]      ← "Gentle slow cinematic pan revealing the scene"
[格式约束]  ← "9:16 vertical. No text overlay."
```

### 可选：提供参考示例图
视频生成时可附加参考图（如 page 场景图），通过 `content_items`（API）传入。

### 🚪 门禁
用户确认/微调 prompt + 模型后才进入 Phase 3。

---

## Phase 3 — 生成（后台异步）

因 artclaw.py CLI 当前崩溃，走 API：

```
POST https://artclaw.com/api/v1/generate/video
  X-API-KEY: <~/.artclaw/config.json 的 apiKey>
  body: { prompt, aspect_ratio, resolution, duration,
          content_items: [{ role: "reference_image", url: "<base64 data URI>" }],
          model }
  → job_id → 轮询 → 下载 mp4
```

CLI 修复后恢复 `Bash(run_in_background: true)` 模式（不加 `--no-wait`，等自动通知）。

### 轮询与下载

```
GET https://artclaw.com/api/v1/jobs/:jobId
  X-API-KEY: <key>
  → status: running → done → result.url
```

下载 mp4 后落地 `<pubResDir>/cover-bg.mp4`，进入 Phase 4 压缩。

> 参考图先 sharp resize 到 1080×1920（`fit: inside`）再 base64，避免 payload 过大。

---

## Phase 4 — 压缩 + 接线 + 验收

```
node workspace/scripts/compress-webm.mjs <pubResDir>/cover-bg.mp4
# → cover-bg.webm（VP9 + Opus 音频, crf 30），校验 ≤ 50% mp4
```

更新 `manifest.json` 对应字段：
- 封面：`background_img` = `"cover-bg.png"` / `background_video` = `"cover-bg.webm"`
- 头像：`npcs[].avatar` = `"characters/{id}_avatar.webp"`
- 聊天背景：`npcs[].chat_bg` = `"characters/{id}_chat_bg.webp"`

```
node workspace/scripts/validate-pub-res.mjs <slug>   # 必须无 error
```

### 🚪 人工抽查
验证通过后提示用户亲自看图。AI 无法代劳视觉判断。

---

## 基础设施速查

| 用途 | 路径 |
|------|------|
| 定位实例 | `workspace/scripts/lib/discover-targets.mjs` — `findTarget()` |
| 图片生成管线 | `workspace/scripts/lib/instory-image.mjs` — `generateImage()`（InStory + R2 ref_image_url + poll + CDN 直连） |
| 封面视频 | ArtClaw `POST /api/v1/generate/video`（seedance ✅，可灵 ❌） |
| webm 压缩 | `workspace/scripts/compress-webm.mjs`（VP9 + Opus 音频） |
| 校验 | `workspace/scripts/validate-pub-res.mjs <slug>` |

## 视频模型取值

可灵 `kling-v3-omni` ｜ seedance `doubao-seedance-2-0-260128`（默认）/ `doubao-seedance-2-0-fast-260128`（快速）
其他：`dreamina-seedance-2-0[-fast]-260128`、`doubao-seedance-1-5-pro-251215`、`viduq3-pro`、`happyhorse-1.0`
