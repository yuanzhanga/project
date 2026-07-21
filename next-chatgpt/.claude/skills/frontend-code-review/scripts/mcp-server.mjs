#!/usr/bin/env node
/**
 * 前端 Code Review MCP Server (stdio transport)
 *
 * 被 Claude Code 自动拉起，暴露两个工具：
 * - read_project_context: 读取项目框架/工具链信息
 * - review_code: 获取本地 git diff → 分桶分批 → 返回结构化数据
 *
 * Claude 拿到数据后按 SKILL.md 的 9 维度执行智能审查。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const SPLIT_SCRIPT = resolve(__dirname, "split-diff.mjs");

// ====== Helpers ======

/** 执行 shell 命令，返回 stdout 字符串；失败返回空字符串 */
function sh(cmd) {
  try {
    return execSync(cmd, { cwd: PROJECT_ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
}

/** 从 package.json 提取框架信息 */
function readProjectContext() {
  const ctx = {};

  const pkgPath = resolve(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // 解析 React 版本
    if (deps.react) ctx.react = deps.react.replace(/[\^~]/, "");
    else if (deps["@angular/core"]) ctx.framework = `Angular ${deps["@angular/core"].replace(/[\^~]/, "")}`;
    else if (deps.vue) ctx.framework = `Vue ${deps.vue.replace(/[\^~]/, "")}`;

    // Next.js
    if (deps.next) ctx.next = deps.next.replace(/[\^~]/, "");

    // TypeScript
    const tsconfigPath = resolve(PROJECT_ROOT, "tsconfig.json");
    if (existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
      ctx.typescript = tsconfig.compilerOptions?.strict ? "strict" : "loose";
    }

    // 样式方案
    if (deps.tailwindcss) ctx.styling = `Tailwind CSS ${deps.tailwindcss.replace(/[\^~]/, "")}`;
    else if (deps["styled-components"]) ctx.styling = "styled-components";
    else if (deps.sass) ctx.styling = "Sass/SCSS";

    ctx.packageName = pkg.name || "unknown";
  }

  return ctx;
}

/** 获取 git diff 文件列表 */
function getGitDiffFiles(target) {
  if (target) {
    return sh(`git diff --name-only ${target}`)
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  }
  // 默认：获取 unstaged + staged changes
  const unstaged = sh("git diff --name-only").split("\n").map((f) => f.trim()).filter(Boolean);
  const staged = sh("git diff --name-only --cached").split("\n").map((f) => f.trim()).filter(Boolean);
  return [...new Set([...unstaged, ...staged])];
}

/** 获取单文件 diff */
function getFileDiff(target, filePath) {
  let cmd;
  if (target) {
    cmd = `git diff ${target} -- "${filePath}"`;
  } else {
    // 合并 unstaged + staged diff
    const unstaged = sh(`git diff -- "${filePath}"`);
    const staged = sh(`git diff --cached -- "${filePath}"`);
    if (unstaged && staged) return staged + "\n" + unstaged;
    return unstaged || staged;
  }
  return sh(cmd) || `(new file or binary: ${filePath})`;
}

/** 调用 split-diff.mjs 获取分批计划 */
function runSplitScript(fileList, maxFilesPerBatch = 5) {
  const input = fileList.join("\n");
  try {
    const result = execSync(`node "${SPLIT_SCRIPT}"`, {
      cwd: PROJECT_ROOT,
      input,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
    const plan = JSON.parse(result.trim());
    return plan;
  } catch (err) {
    // 脚本失败时回退：所有文件一个批次
    console.error("[mcp-server] split-diff.mjs 执行失败:", err.message);
    return {
      strategy: "full",
      batches: [{
        batchId: 1,
        bucket: "全部",
        files: fileList.map((f) => ({ path: f, estimatedLines: null, truncated: false })),
        focus: "全维度审查",
      }],
      batchCount: 1,
      recommendedConcurrency: 1,
    };
  }
}

// ====== MCP Server ======

const server = new McpServer({
  name: "frontend-code-review",
  version: "1.0.0",
});

// ---- Tool 1: read_project_context ----
server.registerTool(
  "read_project_context",
  {
    description:
      "读取当前项目的 package.json 和 tsconfig.json，返回框架版本、TypeScript 配置、样式方案等上下文信息。在审查代码前必须先调用此工具，确保审查判断基于实际项目配置而非猜测。",
  },
  async () => {
    const ctx = readProjectContext();
    return {
      content: [{ type: "text", text: JSON.stringify(ctx, null, 2) }],
    };
  },
);

// ---- Tool 2: review_code ----
server.registerTool(
  "review_code",
  {
    description:
      "获取本地 git diff 并按文件类型分桶、按行数分批，返回结构化的审查数据。返回结果包含分批计划、每批文件的 diff 内容、审查侧重点。Claude 拿到数据后应按 SKILL.md 的 9 个审查维度逐批审查。",
    inputSchema: {
      target: z
        .string()
        .optional()
        .describe("git diff 目标，例如 'main...HEAD'、'HEAD~5..HEAD'。不传则默认获取所有未提交改动（unstaged + staged）"),
      files: z
        .array(z.string())
        .optional()
        .describe("手动指定要审查的文件列表。提供后跳过 git diff 文件发现，直接对这些文件分批"),
      maxFilesPerBatch: z
        .number()
        .optional()
        .default(5)
        .describe("每批最多包含的文件数，默认 5"),
    },
  },
  async ({ target, files, maxFilesPerBatch }) => {
    // 1. 获取文件列表
    const fileList = files || getGitDiffFiles(target);

    if (fileList.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: "未检测到变更文件",
                hint: target
                  ? `git diff --name-only ${target} 返回为空`
                  : "当前工作区无未提交改动。请指定 target 参数或先进行代码修改",
              },
              null, 2,
            ),
          },
        ],
      };
    }

    // 2. 调用 split-diff.mjs 分批
    const plan = runSplitScript(fileList, maxFilesPerBatch);

    // 3. 获取项目上下文
    const projectContext = readProjectContext();

    // 4. 逐批填充 diff 内容
    for (const batch of plan.batches) {
      for (const file of batch.files) {
        file.diff = getFileDiff(target, file.path);
        // 超过 3000 字符截断
        if (file.diff.length > 3000) {
          file.diff = file.diff.slice(0, 3000) + "\n...(diff 过长，已截断，完整文件请手动审查)";
          file.truncated = true;
        } else {
          file.truncated = false;
        }
      }
    }

    // 5. 返回结构化数据
    const result = {
      projectContext,
      strategy: plan.strategy,
      batches: plan.batches.map((b) => ({
        batchId: b.batchId,
        bucket: b.bucket,
        focus: b.focus,
        files: b.files.map((f) => ({
          path: f.path,
          diff: f.diff,
          truncated: f.truncated,
        })),
      })),
      summary: {
        totalFiles: fileList.length,
        totalBatches: plan.batches.length,
        strategy: plan.strategy,
        recommendedConcurrency: plan.recommendedConcurrency,
      },
    };

    console.error(`[mcp-server] review_code 完成: ${fileList.length} 个文件 → ${plan.batches.length} 批 (策略: ${plan.strategy})`);

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// ====== 启动 ======
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[mcp-server] 前端 Code Review MCP Server 已启动 (stdio)");
