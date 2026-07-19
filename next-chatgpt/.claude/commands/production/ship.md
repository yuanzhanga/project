# Phase 5：i18n + 发布 (Ship)

**目标**：第一步 — 提取翻译内容生成 i18n 文件。第二步 — 发布物料生成，构建分发包。
**前提**：Phase 4 复查通过。
**结果**：`workspace/dist_zip/<name>.zip` 生产分发包。

---

## 工作流总览

```
Phase 5：
  ├── Part A: i18n（翻译）
  │     ├── Step 1: 提取 content keys
  │     ├── Step 2: 生成 zh-CN.json + en.json（最少要求）
  │     └── Step 3: 可选扩展至 12 语言
  │
  └── Part B: 发布（publish）
        ├── Step 4: 确认 publish 配置 + tags 验证
        ├── Step 5: 生成发布资源（publish-cli --gen-only）
        ├── Step 6: 人工检查
        └── Step 7: 全流程构建（gen → build → zip）
```

---

## Part A: i18n

### 为什么 Phase 5 才做 i18n

- 故事和 UI 在 Phase 3-4 已完全定稿，不会反复修改
- 三层 fallback（target locale → zh-CN → story-data.ts 原文）保证 Phase 3-4 开发期间无 i18n 文件也能正常运行
- 此时提取翻译不会干扰创作流程

### Step 1：提取 Content Keys

扫描 instance 的内容文件，提取所有可翻译的 key：

```bash
# 对于 TypeScript 内容文件（story-data.ts）
# AI 需要遍历所有对象字段，生成 flat key 清单

# 对于 JSON 内容文件（data.json）
# AI 需要遍历所有嵌套 value，生成 flat key 清单
```

提取的 key 示例：
```
game_meta.title
game_meta.description
character.0.name
character.0.description
prologue.text
chapter.0.title
chapter.0.scene.0.text
strings.start_button
strings.back_button
```

### Step 2：生成最少 i18n（zh-CN + en）

> **最少要求**：`content/i18n/zh-CN.json` + `content/i18n/en.json`

**zh-CN.json**（规范语言原文，fallback 根）：
```json
{
  "game_meta": {
    "ip_name": "恐怖密室逃脱",
    "title": "废弃医院"
  },
  "character": {
    "0": {
      "name": "玩家",
      "description": "被困在废弃医院的探险者"
    }
  },
  "strings": {
    "start_button": "开始游戏",
    "back_button": "返回"
  }
}
```

**en.json**（英文翻译）：
```json
{
  "game_meta": {
    "ip_name": "Horror Escape Room",
    "title": "Abandoned Hospital"
  },
  "character": {
    "0": {
      "name": "Player",
      "description": "An explorer trapped in an abandoned hospital"
    }
  },
  "strings": {
    "start_button": "Start Game",
    "back_button": "Back"
  }
}
```

**规范**：
- 使用 flat key 命名（`game_meta.ip_name` / `character.0.name`）
- `strings.*` 前缀用于 instance UI 覆盖 key
- 如果规范语言是 English，则 `en.json` 放原文，`zh-CN.json` 放中文翻译

### Step 3：可选扩展至 12 语言

最少生成 zh-CN + en 后，询问用户是否需要扩展到其他语言：

| 代码 | 语言 |
|------|------|
| `zh-TW` | 繁体中文 |
| `ja` | 日本語 |
| `ko` | 한국어 |
| `es` | Español |
| `pt` | Português |
| `id` | Bahasa Indonesia |
| `th` | ไทย |
| `de` | Deutsch |
| `fr` | Français |
| `ru` | Русский |

**不需要一次性全部翻译**。按需逐步扩展。

---

## Part B: 发布

### Step 4：确认 manifest 配置 + Tags 验证

发布配置的唯一来源是实例的 `content/pub_res/manifest.json`（不再使用 `package.json` 的 `publish` 字段）。manifest 顶层是发布产物字段，`source` 块是重生成输入：

```json
{
  "id": "horror_escape",
  "title": "horror_escape_title",
  "description": "horror_escape_description",
  "background_img": "cover-bg.png",
  "drama_tag": ["horror", "suspense", "modern_city"],
  "type": "horror-exploration",
  "source": {
    "cover_image": "content/resources/images/cover-bg.png",
    "npcs_source": "content/npcs.json"
  },
  "i18n": {
    "horror_escape_title": { "zh-CN": "废弃医院", "en": "Abandoned Hospital" },
    "horror_escape_description": { "zh-CN": "...", "en": "..." }
  }
}
```

**字段说明**：
- 顶层 `id`/`title`/`description`/`drama_tag`/`i18n`/`type` 为发布产物；`title`/`description` 存的是 i18n key。
- `source` 为重生成输入（`cover_image`/`cover_video`/`npcs_source`/`cover_video_prompt`/`ip_name`/`locale`），对外消费可忽略。
- 简体中文 locale 码统一为 `zh-CN`（不再用 `zh-Hans`）。

**Tags 验证**：
- [ ] 若存在 `workspace/pub_res/tags.json`，`drama_tag` 须在其中注册；该注册表为可选——缺失时跳过校验
- [ ] `drama_tag` 数组不能为空
- [ ] `i18n` 必须包含 `title`/`description` 对应 key 的所有语言翻译
- [ ] NPC `name` 字段必须英文（拉丁字母），严禁中文
- [ ] NPC 名称 i18n 按语言正确翻译（zh-CN/zh-TW 用中文译名，其余用英文原名）

### Step 5：生成发布资源（--gen-only）

```bash
# 列出所有可发布目标
node workspace/scripts/publish-cli.mjs --list

# 仅生成 pub_res（不构建）
node workspace/scripts/publish-cli.mjs <name> --gen-only
```

`--gen-only` 执行内容（输出到实例自身的 `content/pub_res/`，即 `instances/<ip>/content/pub_res/`；模板不是发布目标，不持有 pub_res）：
1. 验证 manifest 配置合法性
2. 复制封面图 → `<target>/content/pub_res/cover-bg.png`
3. 复制封面视频（如源文件存在）→ `<target>/content/pub_res/cover-bg.mp4`；否则提交 ArtClaw 异步任务
4. 提取 NPC（如配置了 `npcs_source`）→ 写入 manifest
5. 生成 NPC 图片（头像 512×512 + 聊天背景 1080×1920）通过 ai_server `/image`，优先使用参考图
6. 生成 `manifest.json` 写入 `<target>/content/pub_res/`
7. manifest 完整性校验（自动）

### Step 6：人工检查

> **AI 不能打开图片看质量、不能判断人物形象是否一致。以下项目必须人工确认。**

- [ ] `manifest.json` 中所有 i18n key 都有完整的语言翻译
- [ ] NPC `name` 字段无中文（必须英文拉丁字母）
- [ ] NPC 名称 i18n 正确（非中文语言写英文原名）
- [ ] NPC `speaker` 字段有效（在音色列表中）
- [ ] `tags` 全部在 `pub_res/tags.json` 中注册
- [ ] 封面图 `cover-bg.png` 清晰度足够（建议 ≥ 500KB）
- [ ] 封面视频 `cover-bg.mp4`（如有）可正常播放
- [ ] NPC 头像：人物形象与 IP 设定一致，无明显 AI 畸形
- [ ] NPC 聊天背景：环境风格与 IP 世界观匹配

### Step 7：全流程构建

```bash
# 完整管线（gen → build → zip）
node workspace/scripts/publish-cli.mjs <name>

# 分布执行
node workspace/scripts/publish-cli.mjs <name> --gen-only    # 仅步骤 5
node workspace/scripts/publish-cli.mjs <name> --build-only  # 仅步骤 7
```

构建内容：

| 步骤 | 操作 |
|------|------|
| Vite 构建 | 在目标目录执行 `npm run build`，产出 → `workspace/dist/<name>/` |
| 图片优化 | sharp mozjpeg/png 压缩，转为 WebP，替换引用 |
| meta 复制 | `<target>/content/pub_res/` → `workspace/dist/<name>/meta/` |
| Zip 打包 | `workspace/dist/<name>/` → `workspace/dist_zip/<name>.zip` |

环境变量：
```bash
SKIP_COMPRESS=1 node workspace/scripts/publish-cli.mjs <name>  # 跳过图片优化
```

---

## 产物目录结构

```
standard_templates/<type>/
  instances/<ip>/content/pub_res/    ← 发布资源（仅实例；模板非发布目标）
    manifest.json                    ← 统一元数据 + i18n + NPC 列表
    cover-bg.png                     ← 封面图（1080×1920）
    cover-bg.mp4                     ← 封面视频（可选）
    characters/                      ← NPC 图片（可选）
      <npc_id>_avatar.png            ← 512×512 头像
      <npc_id>_chat_bg.png           ← 1080×1920 聊天背景

workspace/
  pub_res/tags.json                  ← 共享标签注册表（中央，所有目标引用）
  dist/<name>/                       ← 构建产物
    index.html + assets/             ← Vite 输出
    meta/                            ← content/pub_res 副本
  dist_zip/<name>.zip                ← 生产分发包
```

---

## CLI 命令速查

```bash
# 列出所有可发布目标
node workspace/scripts/publish-cli.mjs --list

# 仅提取发布资源（不构建）
node workspace/scripts/publish-cli.mjs <name> --gen-only

# 仅构建打包
node workspace/scripts/publish-cli.mjs <name> --build-only

# 完整管线
node workspace/scripts/publish-cli.mjs <name>

# 跳过图片压缩
SKIP_COMPRESS=1 node workspace/scripts/publish-cli.mjs <name>

# 仅验证 publish 配置
node workspace/scripts/publish-cli.mjs <name> --validate
```

## 图片规格速查

| 类型 | 尺寸 | 格式 | 生成方式 |
|------|------|------|---------|
| 封面图 | 1080×1920 | PNG | 从源文件复制 |
| 封面视频 | 1080×1920 | MP4 | 从源文件复制，或 ArtClaw 异步生成（9:16, 1080p, 10s） |
| NPC 头像 | 512×512 | PNG | ai_server `/image`（基于 `personality_desc` + 参考图） |
| NPC 聊天背景 | 1080×1920 | PNG | ai_server `/image`（基于 `environment_desc` + 参考图） |
| WebP（构建时） | 原尺寸 | WebP | sharp 转换 |

---

## NPC 物料生成

### 是否需要 NPC

**不是所有 IP 都需要 NPC。** 根据 IP 核心玩法判断（Phase 2c 已确定，此处确认）：
- **需要 NPC**：角色互动是核心玩法（恋爱攻略、小镇模拟、AI 对话悬疑、生存冒险）
- **不需要 NPC**：纯剧情/纯推理/策略模拟

### NPC 命名规则
- `id` 和 `bot_slug` 必须英文（小写字母 + 下划线）
- `name` 字段必须英文（拉丁字母），严禁中文
- NPC 名称 i18n：`zh-Hans`/`zh-TW` 用中文译名，其余语言用英文原名
- `speaker` 字段必填，从音色列表按人设匹配

### 音色选择 (Speaker)

每个 NPC 必须在 `npcs.json` 中配置 `speaker` 字段，值为 `voice_type` 标识符。

> 模型标识：🟢 Uranus 2.0（情感变化/指令遵循/ASMR）｜🔵 Saturn Tob（指令遵循/COT/QA）

#### 女声精选 14

| # | 音色名称 | voice_type | 人设关键词 | 模型 |
|---|---|---|---|---|
| 1 | 撒娇学妹 2.0 | `zh_female_sajiaoxuemei_uranus_bigtts` | 甜美、撒娇、学妹、软萌 | 🟢 |
| 2 | 邻家女孩 2.0 | `zh_female_linjianvhai_uranus_bigtts` | 邻家、清新、亲切、自然 | 🟢 |
| 3 | 俏皮女声 2.0 | `zh_female_qiaopinv_uranus_bigtts` | 俏皮、活泼、古灵精怪 | 🟢 |
| 4 | 爽快思思 2.0 | `zh_female_shuangkuaisisi_uranus_bigtts` | 爽朗、直率、元气 | 🟢 |
| 5 | 知性灿灿 2.0 | `zh_female_cancan_uranus_bigtts` | 知性、温柔、姐姐、书卷气 | 🟢 |
| 6 | 温柔淑女 2.0 | `zh_female_wenroushunv_uranus_bigtts` | 温柔、淑女、端庄、大家闺秀 | 🟢 |
| 7 | 魅力女友 2.0 | `zh_female_meilinvyou_uranus_bigtts` | 魅力、女友感、迷人 | 🟢 |
| 8 | 高冷御姐 2.0 | `zh_female_gaolengyujie_uranus_bigtts` | 高冷、御姐、冰山、疏离 | 🟢 |
| 9 | 古风少御 2.0 | `zh_female_gufengshaoyu_uranus_bigtts` | 古风、少御、古典美人 | 🟢 |
| 10 | 成熟姐姐 2.0 | `saturn_zh_female_chengshujiejie_tob` | 成熟、姐姐、知性、从容 | 🔵 |
| 11 | 傲娇女友 2.0 | `saturn_zh_female_aojiaonvyou_tob` | 傲娇、口是心非、大小姐 | 🔵 |
| 12 | 病娇姐姐 2.0 | `saturn_zh_female_bingjiaojiejie_tob` | 病娇、偏执、占有欲、危险 | 🔵 |
| 13 | 温柔妈妈 2.0 | `zh_female_wenroumama_uranus_bigtts` | 温柔、母亲、慈爱、长辈 | 🟢 |
| 14 | 武则天 2.0 | `zh_female_wuzetian_uranus_bigtts` | 女帝、霸气、强势、上位者 | 🟢 |

#### 男声精选 14

| # | 音色名称 | voice_type | 人设关键词 | 模型 |
|---|---|---|---|---|
| 1 | 少年梓辛/Brayan 2.0 | `zh_male_shaonianzixin_uranus_bigtts` | 少年、清爽、弟弟、朝气 | 🟢 |
| 2 | 阳光青年 2.0 | `zh_male_yangguangqingnian_uranus_bigtts` | 阳光、温暖、青年、正能量 | 🟢 |
| 3 | 爽朗少年 | `saturn_zh_male_shuanglangshaonian_tob` | 爽朗、少年、直率、运动系 | 🔵 |
| 4 | 儒雅青年 2.0 | `zh_male_ruyaqingnian_uranus_bigtts` | 儒雅、温柔、书生、君子 | 🟢 |
| 5 | 温暖阿虎/Alvin 2.0 | `zh_male_wennuanahu_uranus_bigtts` | 温暖、可靠、暖男、男友力 | 🟢 |
| 6 | 傲娇霸总 2.0 | `zh_male_aojiaobazong_uranus_bigtts` | 霸总、强势、傲娇、CEO | 🟢 |
| 7 | 高冷沉稳 2.0 | `zh_male_gaolengchenwen_uranus_bigtts` | 高冷、沉稳、冰山、男神 | 🟢 |
| 8 | 霸道少爷 2.0 | `saturn_zh_male_badaoshaoye_tob` | 霸道、少爷、强势、贵族 | 🔵 |
| 9 | 傲娇公子 2.0 | `saturn_zh_male_aojiaogongzi_tob` | 傲娇、贵公子、口是心非 | 🔵 |
| 10 | 腹黑公子 2.0 | `saturn_zh_male_fuheigongzi_tob` | 腹黑、算计、城府、危险 | 🔵 |
| 11 | 病娇白莲 2.0 | `saturn_zh_male_bingjiaobailian_tob` | 病娇、偏执、白切黑 | 🔵 |
| 12 | 醋精男友 2.0 | `saturn_zh_male_cujingnanyou_tob` | 醋精、占有欲、吃醋、黏人 | 🔵 |
| 13 | 磁性男嗓 2.0 | `saturn_zh_male_cixingnansang_tob` | 磁性、低音炮、性感 | 🔵 |
| 14 | 霸气青叔 2.0 | `zh_male_baqiqingshu_uranus_bigtts` | 霸气、大叔、成熟、威严 | 🟢 |

#### 日语音色（Japanese）

> 日系题材实例（角色为日本人）的 NPC 优先从此表选音色，按人设关键词匹配，迁移参考「≈中文音色」列。

| # | 音色名称 | voice_type | 人设关键词 | ≈中文音色 |
|---|---|---|---|---|
| 1 | Aoi | `ja_female_bv521_uranus_bigtts` | 甜美、撒娇、学妹、软萌 | 撒娇学妹 |
| 2 | Hana | `ja_female_bv522_uranus_bigtts` | 知性、温柔、姐姐、书卷气 | 知性灿灿 |
| 3 | Bonnie | `ja_female_bv024_uranus_bigtts` | 成熟、姐姐、知性、从容 | 成熟姐姐 |
| 4 | Shirou | `ja_female_shirou_uranus_bigtts` | 俏皮、活泼、古灵精怪 | 俏皮女声 |
| 5 | Poppy | `ja_female_bv520_uranus_bigtts` | 俏皮、活泼、古灵精怪（与 Shirou 同质，优先用 Shirou） | 俏皮女声 |
| 6 | Lily | `ja_female_bv523_uranus_bigtts` | 少年、小孩、正太（恋爱题材少用） | — |
| 7 | Ken | `ja_male_bv524_uranus_bigtts` | 阳光、温暖、青年、正能量 | 阳光青年 |

> **已知缺口**：日语音色库目前 **6 女 1 男**。
> - 缺「高冷御姐 / 冰山」系日语女声 —— 该类人设用 `ja_female_bv024_uranus_bigtts`（Bonnie，成熟从容）**兜底近似**（牺牲高冷锐度、保成熟气质）。
> - 男声仅 Ken（阳光青年）一个，缺高冷 / 霸总 / 腹黑 / 磁性 —— 日系实例若出现非阳光系男性 bot，暂无合适日语男声，需先补音源（出现前不阻塞，可临时回退中文男声）。

#### voice_type 列表（直接复制给代码用）

**女声**：`zh_female_sajiaoxuemei_uranus_bigtts`, `zh_female_linjianvhai_uranus_bigtts`, `zh_female_qiaopinv_uranus_bigtts`, `zh_female_shuangkuaisisi_uranus_bigtts`, `zh_female_cancan_uranus_bigtts`, `zh_female_wenroushunv_uranus_bigtts`, `zh_female_meilinvyou_uranus_bigtts`, `zh_female_gaolengyujie_uranus_bigtts`, `zh_female_gufengshaoyu_uranus_bigtts`, `saturn_zh_female_chengshujiejie_tob`, `saturn_zh_female_aojiaonvyou_tob`, `saturn_zh_female_bingjiaojiejie_tob`, `zh_female_wenroumama_uranus_bigtts`, `zh_female_wuzetian_uranus_bigtts`

**男声**：`zh_male_shaonianzixin_uranus_bigtts`, `zh_male_yangguangqingnian_uranus_bigtts`, `saturn_zh_male_shuanglangshaonian_tob`, `zh_male_ruyaqingnian_uranus_bigtts`, `zh_male_wennuanahu_uranus_bigtts`, `zh_male_aojiaobazong_uranus_bigtts`, `zh_male_gaolengchenwen_uranus_bigtts`, `saturn_zh_male_badaoshaoye_tob`, `saturn_zh_male_aojiaogongzi_tob`, `saturn_zh_male_fuheigongzi_tob`, `saturn_zh_male_bingjiaobailian_tob`, `saturn_zh_male_cujingnanyou_tob`, `saturn_zh_male_cixingnansang_tob`, `zh_male_baqiqingshu_uranus_bigtts`

**日语**：`ja_female_bv521_uranus_bigtts`, `ja_female_bv522_uranus_bigtts`, `ja_female_bv024_uranus_bigtts`, `ja_female_shirou_uranus_bigtts`, `ja_female_bv520_uranus_bigtts`, `ja_female_bv523_uranus_bigtts`, `ja_male_bv524_uranus_bigtts`

> **选择原则**：
> 1. **先按实例题材定语种**：实例题材为**日系**（角色设定为日本人）时，NPC `speaker` 优先从「日语音色」表选；其余实例（含混合国际班底，如某些角色是日本人但实例整体非日系）维持中文音色表。判断单位是**实例题材**，不是单个角色出身——例如意大利度假村题材即便有 1 个日本角色，也整体走中文音色。该规则适用于所有日系题材模板实例（不限 ai-galgame，如 duo-chat 的动漫 IP 实例同样适用）。
> 2. **再按人设匹配音色**：根据 NPC 的 `personality_desc` 从选定语种的表中找对应音色。
> 3. **兜底**：无法确定时——中文女 → `zh_female_wenroushunv_uranus_bigtts`（温柔淑女），中文男 → `zh_male_yangguangqingnian_uranus_bigtts`（阳光青年）；日语女 → `ja_female_bv522_uranus_bigtts`（Hana），日语「高冷御姐」类无对应时 → `ja_female_bv024_uranus_bigtts`（Bonnie）近似；日语男仅 Ken，非阳光系男角暂回退中文男声并记录待补。

#### 日系实例音色映射记录

> 已落地 / 待落地的日系 ai-galgame 实例 NPC 音色，供发布时参照。

| 实例 | NPC | 人设 | speaker | 状态 |
|---|---|---|---|---|
| night-apartment | 神崎怜奈 | 知性投行 MD | `ja_female_bv522_uranus_bigtts` (Hana) | ✅ 已落地 |
| night-apartment | 白石美羽 | 自持演员 | `ja_female_bv521_uranus_bigtts` (Aoi) | ✅ 已落地 |
| night-apartment | 九条绫乃 | 高冷大小姐 | `ja_female_bv024_uranus_bigtts` (Bonnie 兜底) | ✅ 已落地 |
| lost-island | 綾瀬凛 | 高冷强势 CEO | `ja_female_bv024_uranus_bigtts` (Bonnie 兜底) | ⏳ 待发布抽取 |
| lost-island | 三枝亜美 | 精致活泼秘书 | `ja_female_shirou_uranus_bigtts` (Shirou) | ⏳ 待发布抽取 |
| lost-island | 橘柚 | 精明干练上司 | `ja_female_bv522_uranus_bigtts` (Hana) | ⏳ 待发布抽取 |
| duo-chat/quintuplets-confession（五等分） | 三玖 | 内向温柔料理担当 | `ja_female_bv522_uranus_bigtts` (Hana) | ✅ 已落地 |
| duo-chat/quintuplets-confession（五等分） | 五月 | 认真元气运动系 | `ja_female_shirou_uranus_bigtts` (Shirou) | ✅ 已落地 |
| ai-romance-drama/clannad | 藤林杏 | 泼辣直率大姐头 | `ja_female_shirou_uranus_bigtts` (Shirou) | ✅ 已落地 |
| companion-chat/makima-csm（电锯人） | 玛奇玛 | 高冷支配 | `ja_female_bv024_uranus_bigtts` (Bonnie 兜底) | ✅ 已落地 |

> `italian-resort`（意大利/国际题材）按原则 1 整体走中文音色，**不**因 Mia Kawano 是日本人而单独切日语。
> **含男角的日系实例暂不迁移**（如 `romance-battle/spy-family`、`companion-chat/gojo-jjk`、`duo-chat/jjk_offduty`/`bungou-rainy-night`/`genshin-night-watch`、`ai-mystery-dialogue/suspect-x-devotion` 等）：日语男声仅 Ken（阳光青年），无法覆盖高冷/霸总/腹黑/磁性等男性人设，待补日语男声音源后再迁移；在此之前这些实例的男角维持中文音色。

#### L3 端到端语音音色（voice_settings 专用，非 npc.speaker）

> 用于 `manifest.npcs[].voice_settings` 的 `provider: l3_doubao` 档位（实时语音通话，端到端低延迟），是与上方 TTS 音色表**完全独立**的目录——不要跟 `npc.speaker` 混用，也不要以为音色名字相似就能通用（后缀 `_jupiter_`/`_tob` 是端到端模型专属资产，跟 TTS 表的 `_uranus_bigtts` 系列不是一回事）。

| voice_type | 人设关键词 |
|---|---|
| `zh_female_vv_jupiter_bigtts` | 通用兜底（无特定人设倾向时默认选此项） |
| `saturn_zh_female_aojiaonvyou_tob` | 傲娇、口是心非、大小姐（同名 TTS 音色标签见上方"傲娇女友 2.0"条目，人设倾向一致） |

**准入规则（硬性）**：L3 与 L2 本质上共享同一个音色来源——`voice_settings` 两档的 `voice` 都等于 `npc.speaker`，不存在"各自挑选"。区别只在于 L3 这条通道存不存在：**只有当 `npc.speaker` 精确等于上表两个 id 之一时，才会同时生成 L3**；不满足则只生成 `l2_cascaded_doubao`（级联管线）一档，并扶正为 `default: true`。不接受"选个相近的凑合"——同一角色日常 TTS 和打电话用不同声音，是听感上能察觉的人设割裂，比"没有 L3"更糟。

**已知现状**：目前全库没有任何 NPC 的 `npc.speaker` 恰好等于这两个 id，所以**当前几乎所有 NPC（不分男女）都只有 L2 档位**。上表"人设关键词"这一列不是给 `npc-voice-material` skill 生成 `voice_settings` 时用的（它只会照抄已有的 `npc.speaker`，不做选择）——而是给**首次为某个新 NPC 选定 `npc.speaker`** 的人参考：想让某个角色未来能同时具备 L2+L3，就要在选 `speaker` 这一步直接从上表选，而不是走常规的 14+14+7 音色表——这意味着该角色的日常 TTS 也会用这个声音，是"提前为语音通话铺路"的产品决定，需要确认要不要这么做，不是随手就能定的事。生成/维护 `voice_settings` 走 `npc-voice-material` skill。

---

## 禁止行为

- ❌ 没有任何参考图，仅凭 `personality_desc` 一句话就生成角色头像
- ❌ 有角色立绘/设定图在项目中但未传入 `referenceImage`
- ❌ 用其他 IP 的参考图来生成当前 IP 的物料
- ❌ NPC `name` 字段写中文 — 必须使用英文拉丁字母
- ❌ NPC 名称 i18n 所有语言写同一个中文 — 非中文语言必须写英文原名
- ❌ NPC 不配置 `speaker` 字段 — 每个 NPC 必须指定有效音色
- ❌ 使用音色列表之外的 `voice_type`
- ❌ 日系题材实例（角色为日本人）的 NPC 在日语音色库有合适对应时仍用中文音色（「高冷御姐」等无日语对应、需 Bonnie 兜底的情况除外）
