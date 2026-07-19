---
name: npc-voice-material
description: |
  为单个/全部 NPC 生成语音通话配置（voice_settings：L3 端到端 + L2 级联两档）。
  按门禁式流程：读人设 → 起草 bot_name/system_role/speaking_style/opening/voice →
  用户确认 → 接线 manifest.npcs[].voice_settings → 校验。
  触发词：配语音、打语音配置、语音通话配置、voice_settings、给X配电话、语聊配置。
---

# NPC Voice Material · 语音通话配置生成

为**单个 NPC**（或一个实例的全部 NPC）生成 `voice_settings` 配置。这是
`instance-image-material` 门禁哲学的复用：**创意内容起草自动、但必须人工确认**，
生成后走脚本校验。跟图片物料不同，这里没有外部生成 API 可调——`voice_settings`
的内容（system_role / speaking_style / opening）是从已有人设**改写**出来的文本，
不是简单拼接，需要 AI 起草 + 人工过一遍。

## 前置检查（每次进入必做）

1. 目标 NPC 所在实例的 `content/pub_res/manifest.json` 存在且该 NPC 已有 `bot_slug` / `name` / `speaker` / `system_prompt`。
2. 目标 NPC 的人设文件 `content/personas/<bot_slug>.en.md` 存在——**这是硬前置依赖**。若不存在：报错并提示"该 NPC 尚无 inplay 人设文件，需先补人设（`restructure-bot-system-prompts` 那批只覆盖 8 个模板类型的 52 个 NPC，不是全量 88 个），本 skill 不负责生成人设本身"，终止流程。
3. `workspace/scripts/lib/discover-targets.mjs` 存在（定位实例）。
4. `workspace/scripts/validate-pub-res.mjs` 存在（生成后校验）。

## 背景：voice_settings 是什么、怎么生效

`manifest.npcs[].voice_settings` 是一个数组，数组里每个 entry 描述一种语音通话接入方式（provider）。这个字段**不需要额外的"提交后台"步骤**——只要写进 manifest.json，走现有发布流程（`publish-cli.mjs` 打包 → 上传发布包）时，后端 `h5_manifest.py::_parse_npcs()` 会把整个 NPC 原始 dict（含 `voice_settings`）透传给 `AgentPlatformClient`，自动完成中台注册/更新。**本 skill 只负责生成正确的内容，写进 manifest 即完成。**

### schema 与校验规则（对齐后端 `platform.py::validate_voice_settings()`，逐字段解释见下方 Phase 1）

- 每个 entry：`id`（数组内唯一非空字符串）、`provider`（必填非空字符串）
- 可选：`pitch` ∈ [-12, 12]、`speed` ∈ [0.5, 2]、`emotion`（字符串，可留空）
- `default: true` 的 entry **必须** `enabled: true`
- 非空数组**必须恰好一个** `default: true` 的 entry
- 空数组 `[]` 合法（显式清空语义，本 skill 一般不会生成空数组）

### 两个 provider 档位的语义差异（关键，决定 system_role 怎么写）

| provider | 含义 | system_role 该放什么 |
|---|---|---|
| `l3_doubao` | 端到端语音大模型，低延迟 | **人设全量**——平台的 system_prompt_template/hooks 不参与这一档，system_role 必须自包含完整人设 |
| `l2_cascaded_doubao` | STT+LLM+TTS 级联管线 | **短补充**——追加在平台自己的 system_prompt_template 渲染结果**之后**，只写语音场景专属的行为提示，不是完整人设 |

### L3 音色目录是独立的、只有 2 个女声（不是 npc.speaker 那套）——且要求跟 npc.speaker 完全一致才能用

`ship.md`「音色选择 (Speaker)」章节末尾新增的「L3 端到端语音音色」小节记录了这两个音色：`zh_female_vv_jupiter_bigtts`、`saturn_zh_female_aojiaonvyou_tob`。**这套目录与 `npc.speaker` 用的 TTS 目录完全独立**，不要混用、不要以为音色名字相似就能通用。

**硬性规则（不是提醒，是准入条件）**：L3 档位只有在该 NPC 的 `manifest.npc.speaker` **精确等于**这两个音色 id 之一时才生成。理由：同一个角色如果日常 TTS（`npc.speaker`）用一个声音、打电话（L3）用另一个声音，是听感上能察觉的人设割裂，不能靠"选个人设关键词最接近的"来将就——**不一致就不给 L3，只给 L2**（L2 的 `voice` 本来就复用 `npc.speaker`，天然一致）。

**已知现状**：目前全库没有任何 NPC 的 `npc.speaker` 恰好等于这两个 id（已核实），也就是说**当前几乎所有 NPC（不分男女）都只会生成 L2 一条**。只有未来某个 NPC 的 `npc.speaker` 恰好被指定为这两个音色之一（无论是巧合，还是 `ship.md` 选音色时刻意为将来开语音通话预留），才会同时拿到 L3 档位。

---

## 门禁式流程总览

```
Phase 0  定位 + 读素材 + 判断 L3 是否可用
   findTarget(name) → pubResDir → manifest.json 该 npc 条目
   读 content/personas/<bot_slug>.en.md（不存在则终止，见前置检查②）
   L3_VOICES = { zh_female_vv_jupiter_bigtts, saturn_zh_female_aojiaonvyou_tob }
   判断：manifest.npc.speaker ∈ L3_VOICES → L3 可用分支；否则 → 仅 L2 分支
   🚪 确认目标 NPC + 判定结果正确
        │
        ▼
Phase 1  起草 voice_settings（自动起草，非直接照抄）
   L3 可用分支 → 起草 default(L3) + cascaded(L2) 两条，两条 voice 相同（都等于 npc.speaker）
   仅 L2 分支   → 只起草 cascaded(L2) 一条，且该条扶正为 default:true
   🚪 用户看草稿，确认/微调文案后才进入下一步
        │
        ▼
Phase 2  接线
   写入 manifest.json → npcs[i].voice_settings = [...]（新字段，不影响 system_prompt/speaker）
        │
        ▼
Phase 3  校验
   node workspace/scripts/validate-pub-res.mjs <slug>
   🚪 人工抽查：system_role 语义是否贴合角色、bot_name 是否正确
```

支持两种操作模式：

| 模式 | 触发意图 | 行为 |
|------|---------|------|
| **单个 NPC** | "给 X 配语音" | 只处理指定 NPC，走 Phase 0-3 |
| **实例全部 NPC** | "给 X 全部 NPC 配语音" | 该实例 `manifest.npcs[]` 逐个走 Phase 0-3，各自判断 L3 是否可用，跳过没有人设文件的 NPC 并汇总报告 |

---

## Phase 0 — 定位 + 读素材 + 判断 L3 是否可用

```
① findTarget(name) → target.pubResDir（等价于读 manifest.json 路径 <pubResDir>/manifest.json）
② 从 manifest.npcs[] 找到目标 NPC，取 bot_slug / name / speaker / system_prompt
③ 读 <instDir>/content/personas/<bot_slug>.en.md
   —— 不存在 → 终止，报错提示需先补人设
④ 判断 L3 是否可用（精确匹配，不是关键词匹配）：
   manifest.npc.speaker === "zh_female_vv_jupiter_bigtts" 或 "saturn_zh_female_aojiaonvyou_tob"
     → L3 可用
   其余任何值（包括所有 _male_ 音色、以及不在这两个 id 里的所有 _female_/日语音色）
     → L3 不可用，仅 L2
```

### 🚪 门禁
向用户复述：目标实例、目标 NPC（bot_slug + name + speaker）、L3 是否可用（若不可用，明确说明原因是"该 NPC 的 speaker 不在 L3 支持的 2 个音色内"，而不是笼统的"性别不符"）、该 NPC 是否已有旧的 `voice_settings`（若有，本次是覆盖更新）。**用 `AskUserQuestion` 工具**让用户确认（选项如"确认，继续起草" / "目标不对，重新定位"），不要只写一段话就结束当前轮次等回复。

---

## Phase 1 — 起草 voice_settings

### L3 可用分支：起草两条

**`default`（L3 端到端，`provider: l3_doubao`，`default: true`，`enabled: true`）**

```
bot_name       ← 解析该 NPC 的英文显示名：
                 读 <instDir>/content/i18n/en.json，依次尝试
                 entities.<id>.name → character.<id>.name → character.name
                 （id = bot_slug 最后一段，如 companion_chat_zhongli_genshin_zhongli → zhongli）
                 取到的值若含 CJK 字符则视为无效，改用下一优先级；
                 全部失败则退化正则匹配 persona 文件里的 "You are **X**"，
                 仍失败则用 manifest.npc.name。
                 （逻辑镜像 workspace/scripts/build-bot-prompts.mjs 的 resolveName()，
                 但不需要真的调用那份脚本——本 skill 是交互式起草，直接照此算法读文件即可）

system_role    ← 英文，从 persona 的 # Core Persona / # Backstory / # Speech Signature
                 三段提炼成一段自包含的口语化人设描述。要点：
                 - 保留：核心性格张力、背景关键信息、说话语气特征（Baseline tone）
                 - 去掉：markdown 标题层级（不写 "# Role" 这类标题，写成连续段落）
                 - 去掉：JSON 输出契约提示（"only output {...}" 这类，语音场景不适用）
                 - 去掉：affinity 数值系统（§2/§4 关系区间、好感度阈值）——
                   voice_settings 没有承载状态的字段，语音场景视为无状态基线人设
                 - 去掉："仅输出台词禁止动作描写"这类文字聊天专属规则
                 - 长度：一段到两段，明显短于原 system_prompt（延迟敏感场景，不要照搬全文）

speaking_style ← 英文，1-2 句，从 persona 的 # Speech Signature → Baseline tone
                 提炼说话方式的直接描述（语速/句长/语气倾向）

opening        ← 英文，1 句电话接通问候语。参考 # Schedule & Time 段落判断"此刻角色在做什么"，
                 但只能写成"能被说出口的一句话"——不能用文字聊天骨架的"环境细节渗透"技巧
                 （那是给文字消息用的，电话开场是真实语音，必须直接自然）

voice          ← 直接取 manifest.npc.speaker 的值（Phase 0 已确认它 ∈ L3_VOICES，原样填入，
                 不重新挑选、不按人设关键词二次匹配——L3 可用的前提就是它已经等于 npc.speaker）

pitch/speed    ← 省略（不程序化推导，草稿阶段留给用户在确认时按需调整）
emotion        ← ""（留空）
```

**`cascaded`（L2 级联，`provider: l2_cascaded_doubao`，`default: false`，`enabled: true`）**

```
bot_name       ← 同上
system_role    ← 英文短模板 + 一句语气提示：
                 "You are having a voice call. Keep replies brief and conversational."
                 + 从 persona 的 Speech Signature 提炼一句语气锚点
                 （因为这一档追加在平台自己的 system_prompt_template 之后，不是全量人设）
speaking_style ← 英文，比 default 档更简短（如 "Casual spoken style, short sentences."）
opening        ← 同 default 档（或按需简化为更短版本）
voice          ← 直接复用该 NPC 现有 manifest.npc.speaker 的值（原样字符串，不重新挑选）
pitch/speed    ← 省略
emotion        ← ""（留空）
```

### 仅 L2 分支：只起草一条

```
cascaded（provider: l2_cascaded_doubao，default: true ← 唯一一条，被迫扶正，enabled: true）
```

字段生成方式与 L3 可用分支的 `cascaded` 档完全一致（system_role/speaking_style/opening/voice 都复用 npc.speaker），唯一区别是 `default` 字段值——因为是数组里唯一的 entry，必须为 `true`（校验规则要求非空数组恰好一个 default:true）。

**不生成 `default`（L3）条目**——不是因为性别，是因为该 NPC 的 `npc.speaker` 不等于 L3 支持的 2 个音色之一，生成 L3 会导致同一角色语音不一致，这是当前已知产品缺口（见 ship.md 记录），不是本 skill 的 bug，也不能靠"选个相近的凑合"绕过。

### 🚪 门禁

把起草好的完整 `voice_settings` JSON 展示给用户，逐字段过一遍（尤其 `system_role`/`opening` 这些创意内容）。**用 `AskUserQuestion` 工具**明确询问，例如选项"确认，写入 manifest" / "需要微调"——不要只在文字里问"是否合适"然后结束轮次干等：那样用户的自由回复不受约束，容易变成含糊的"还行"而不是明确的确认或具体的修改意见。若用户选择"需要微调"，用工具自带的 Other 输入框收集具体修改点，改完再走一次同样的确认。确认后才进入 Phase 2。

---

## Phase 2 — 接线

把确认后的 `voice_settings` 数组写入 manifest.json 对应 npc 对象：

```json
{
  "npcs": [
    {
      "bot_slug": "...",
      "name": "...",
      "speaker": "...",
      "system_prompt": "...",
      "voice_settings": [ /* Phase 1 确认的内容 */ ]
    }
  ]
}
```

不改动该 npc 已有的 `system_prompt` / `speaker` / `avatar` / `chat_bg` 等字段。

---

## Phase 3 — 校验

```
node workspace/scripts/validate-pub-res.mjs <slug>   # 必须无 error
```

校验脚本会检查 `voice_settings` 的结构合法性（id 唯一非空、provider 必填、pitch/speed 范围、default+enabled 一致性、恰好一个 default）——这是后端 `validate_voice_settings()` 的本地镜像实现，能在发布前拦住格式错误。

### 🚪 人工抽查
校验通过后，**用 `AskUserQuestion` 工具**请用户确认 `system_role`/`opening` 文案是否贴合角色（选项如"没问题" / "需要回去改"）——AI 起草的语音场景改写文本，语义准确性需要人工判断，不要只是提示一句就默认结束。

---

## 基础设施速查

| 用途 | 路径 |
|------|------|
| 定位实例 | `workspace/scripts/lib/discover-targets.mjs` — `findTarget()` |
| 人设源 | `<instDir>/content/personas/<bot_slug>.en.md` |
| 英文名索引 | `<instDir>/content/i18n/en.json` |
| L3 音色目录 + 缺口记录 | `.claude/commands/production/ship.md`「L3 端到端语音音色」小节 |
| L2 音色（复用） | 该 NPC 现有 `manifest.npc.speaker` |
| 校验 | `workspace/scripts/validate-pub-res.mjs <slug>` |

## 已知限制

- L3 档位要求 `npc.speaker` 精确等于 L3 支持的 2 个音色之一，否则一律不生成 L3（只生成 L2）——不允许"选个相近的音色凑合"，因为这会导致同一角色语音不一致。目前全库没有 NPC 满足这个条件，所以现状是**几乎所有 NPC 都只有 L2 档位**，不分男女（详见 ship.md 的缺口记录）。
- 目标 NPC 必须已有 `content/personas/<bot_slug>.en.md`；本 skill 不负责生成人设本身。
- `pitch`/`speed` 不做人设到数值的程序化映射，草稿阶段留空，如需调整由人工在确认环节指定。
- 若想让某个新 NPC 未来能同时拥有 L3+L2，需要在该 NPC 首次挑选 `npc.speaker`（走 `ship.md` 的音色选择流程）时，就直接把 `speaker` 定为 L3 支持的 2 个音色之一——这是目前唯一能让 L3 生效的路径。
