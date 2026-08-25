import { loadToolDefinitions } from "@/lib/skills/loader";

/** 工具定义来自 src/skills 下各技能的 SKILL.md（服务端读取） */
export const toolDefinitions = loadToolDefinitions();

export { getSkillDefinition } from "@/lib/skills/loader";
