import fs from "fs";
import path from "path";
import type { ToolDefinition, ToolMeta } from "@/lib/tools/types";

const SKILLS_DIR = path.join(process.cwd(), "src", "skills");

let cache: ToolDefinition[] | null = null;

/** 读取 src/skills 下各技能的 SKILL.md，生成工具定义（函数 schema + meta） */
export function loadToolDefinitions(): ToolDefinition[] {
  if (cache) return cache;

  if (!fs.existsSync(SKILLS_DIR)) {
    cache = [];
    return cache;
  }

  const defs: ToolDefinition[] = [];
  const dirs = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of dirs) {
    const skillFile = path.join(SKILLS_DIR, dir, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;
    const parsed = parseSkill(fs.readFileSync(skillFile, "utf-8"));
    if (parsed) defs.push(parsed);
  }

  cache = defs;
  return defs;
}

export function getSkillDefinition(
  name: string
): ToolDefinition | undefined {
  return loadToolDefinitions().find((d) => d.function.name === name);
}

function parseSkill(raw: string): ToolDefinition | null {
  const data = parseFrontmatter(raw);
  if (!data || !data.name) return null;

  const fallbackParameters: ToolDefinition["function"]["parameters"] = {
    type: "object",
    properties: {},
  };
  const parameters: ToolDefinition["function"]["parameters"] =
    typeof data.parameters === "object" && data.parameters
      ? (data.parameters as ToolDefinition["function"]["parameters"])
      : fallbackParameters;

  const description = String(data.description || "");
  const body = String(data.body || "").trim();
  // 把技能正文也塞进 description，模型在函数调用时能看到更完整的用法
  const fullDescription = body ? `${description}\n\n${body}` : description;

  const meta: ToolMeta = {
    autoExecute: !!data.autoExecute,
    displayName: String(data.displayName || data.name),
    icon: String(data.icon || "🔧"),
    risk: (data.risk as ToolMeta["risk"]) || "safe",
  };

  return {
    type: "function",
    function: {
      name: String(data.name),
      description: fullDescription,
      parameters,
    },
    meta,
  };
}

/** 极简 frontmatter 解析：key: value，支持 JSON 对象/数组 */
function parseFrontmatter(raw: string): Record<string, unknown> | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;

  const fm = match[1];
  const body = raw.slice(match[0].length);
  const data: Record<string, unknown> = {};

  for (const line of fm.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = parseValue(value);
  }
  data.body = body;
  return data;
}

function parseValue(raw: string): unknown {
  const v = raw.trim();
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^[0-9]+(?:\.[0-9]+)?$/.test(v)) return Number(v);
  if (v.startsWith("{")) {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  if (v.startsWith("[")) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1).split(",").map((s) => s.trim());
    }
  }
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}
