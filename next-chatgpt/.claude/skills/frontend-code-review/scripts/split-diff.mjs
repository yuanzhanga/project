#!/usr/bin/env node
/**
 * 前端 Code Review 分批脚本
 *
 * 输入：git diff --name-only（或 --stat）输出，或手动文件列表
 * 输出：JSON 分批计划，供 SKILL Agent 按计划执行审查
 *
 * 用法：
 *   git diff --name-only origin/main...HEAD | node scripts/split-diff.mjs
 *   git diff --name-only HEAD~3..HEAD | node scripts/split-diff.mjs
 *   node scripts/split-diff.mjs --files "src/a.ts,src/b.tsx,..."
 */

import { readFileSync } from "fs";

// ====== 配置（与 SKILL.md 中的阈值对齐） ======
const MAX_FILES_FULL_REVIEW = 5;      // ≤5 文件全量审查
const MAX_FILES_BATCHED = 15;         // 6-15 分批
const MAX_FILES_CONCURRENT = 30;      // 16-30 并发+精简
// >30 或 >3000行 → 降级
const MAX_DIFF_LINES = 3000;
const MAX_FILES_PER_BATCH = 5;
const MAX_LINES_PER_BATCH = 800;

// ====== 分桶规则 ======
const BUCKET_RULES = [
  {
    name: "组件/页面",
    priority: 1,
    match: (f) => /\.(tsx|jsx|vue|svelte)$/i.test(f) && !/\.(test|spec)\./i.test(f),
    focus: "Hook规则、状态管理、无障碍、CSS、组件体积",
  },
  {
    name: "Hook/逻辑",
    priority: 2,
    match: (f) => /\buse[A-Z]\w*\.(ts|tsx|js|jsx)$/i.test(f) || /\/hooks\//i.test(f),
    focus: "清理函数、依赖数组、闭包陷阱、竞态条件",
  },
  {
    name: "工具/类型",
    priority: 3,
    match: (f) => /\/(utils?|lib|types?|helpers?|services?)\//i.test(f),
    focus: "类型安全、边界处理、纯函数正确性",
  },
  {
    name: "样式",
    priority: 4,
    match: (f) => /\.(css|scss|less|styl)$/i.test(f),
    focus: "响应式、动画性能、CSS架构",
  },
  {
    name: "测试",
    priority: 5,
    match: (f) => /\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(f) || /\/__tests__\//i.test(f),
    focus: "测试覆盖、异步测试完整性、实现细节断言",
  },
];

// ====== 高危模式检测 ======
const HIGH_RISK_PATTERNS = [
  "dangerouslySetInnerHTML",
  "localStorage",
  "sessionStorage",
  "document.cookie",
  "router.push",
  "router.replace",
  "eval(",
  "innerHTML",
];

// ====== 主流程 ======
async function main() {
  const files = parseInput();
  if (files.length === 0) {
    console.log(JSON.stringify({ error: "未检测到变更文件" }, null, 2));
    process.exit(0);
  }

  // 1. 分类文件到桶
  const buckets = bucketFiles(files);

  // 2. 计算 diff 行数（尝试从 git diff --stat 读取；不可用时标记 unknown）
  const fileStats = estimateDiffSizes(files);

  // 3. 决定策略
  const totalFiles = files.length;
  const totalLines = fileStats.reduce((sum, f) => sum + (f.lines ?? 50), 0);
  const strategy = determineStrategy(totalFiles, totalLines);

  // 4. 按策略生成批次
  const batches = generateBatches(buckets, fileStats, strategy);

  // 5. 识别高风险文件
  const highRiskFiles = identifyHighRisk(files);

  // 6. 输出计划
  const plan = {
    strategy,
    summary: {
      totalFiles,
      totalLines,
      buckets: Object.fromEntries(
        Object.entries(buckets).map(([k, v]) => [k, v.length])
      ),
    },
    highRiskFiles,
    batches: batches.map((b, i) => ({
      batchId: i + 1,
      bucket: b.bucket,
      files: b.files.map((f) => ({
        path: f,
        estimatedLines: fileStats.find((s) => s.path === f)?.lines ?? null,
        truncated: (fileStats.find((s) => s.path === f)?.lines ?? 0) > 500,
      })),
      estimatedTotalLines: b.files.reduce(
        (sum, f) => sum + (fileStats.find((s) => s.path === f)?.lines ?? 50),
        0
      ),
      focus: b.focus,
    })),
    batchCount: batches.length,
    recommendedConcurrency: strategy === "concurrent" ? Math.min(3, batches.length) : 1,
  };

  console.log(JSON.stringify(plan, null, 2));
}

// ====== 输入解析 ======
function parseInput() {
  // --files 参数（优先级最高）
  const filesArgIdx = process.argv.findIndex((a) => a.startsWith("--files="));
  if (filesArgIdx >= 0) {
    const raw = process.argv[filesArgIdx].replace("--files=", "");
    return raw.split(/[,;\n]/).map((f) => f.trim()).filter(Boolean);
  }

  // 从 stdin 读取（管道输入）
  if (!process.stdin.isTTY) {
    try {
      return readFileSync(0, "utf-8")
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => !l.startsWith(" "));
    } catch {
      return [];
    }
  }

  return [];
}

// ====== 分桶 ======
function bucketFiles(files) {
  const buckets = {};
  for (const rule of BUCKET_RULES) {
    buckets[rule.name] = [];
  }

  for (const file of files) {
    let placed = false;
    for (const rule of BUCKET_RULES) {
      if (rule.match(file)) {
        buckets[rule.name].push(file);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // 默认归入 "工具/类型"
      if (!buckets["其他"]) buckets["其他"] = [];
      buckets["其他"].push(file);
    }
  }

  // 移除空桶
  for (const key of Object.keys(buckets)) {
    if (buckets[key].length === 0) delete buckets[key];
  }

  return buckets;
}

// ====== 估算 diff 大小 ======
function estimateDiffSizes(files) {
  // 尝试从管道中读取 git diff --stat 格式的输入
  // 格式：src/file.ts | 15 ++++++++-------
  try {
    const input = readFileSync(0, "utf-8").trim();
    const lines = input.split("\n");

    // 检测是否为 --stat 格式
    if (lines.some((l) => l.includes("|") && /\d+/.test(l))) {
      return files.map((f) => {
        const statLine = lines.find((l) => l.startsWith(f));
        if (!statLine) return { path: f, lines: null };
        const match = statLine.match(/\|\s*(\d+)/);
        return { path: f, lines: match ? parseInt(match[1]) : null };
      });
    }
  } catch {
    // stdin 已消耗或不可用，忽略
  }

  return files.map((f) => ({ path: f, lines: null }));
}

// ====== 策略决策 ======
function determineStrategy(totalFiles, totalLines) {
  if (totalFiles > 30 || totalLines > MAX_DIFF_LINES) return "degraded";
  if (totalFiles > MAX_FILES_CONCURRENT) return "degraded";
  if (totalFiles > MAX_FILES_BATCHED) return "concurrent";
  if (totalFiles > MAX_FILES_FULL_REVIEW) return "batched";
  return "full";
}

// ====== 生成批次 ======
function generateBatches(buckets, fileStats, strategy) {
  const batches = [];

  if (strategy === "full") {
    // 全量：所有文件一个批次
    const allFiles = Object.values(buckets).flat();
    batches.push({
      bucket: "全部",
      files: allFiles,
      focus: "全维度审查",
    });
    return batches;
  }

  if (strategy === "degraded") {
    // 降级：只审高风险文件
    const priorityFiles = [];
    for (const rule of BUCKET_RULES) {
      const bucket = buckets[rule.name] || [];
      if (rule.priority <= 2) {
        // 只取组件/页面 + Hook/逻辑
        priorityFiles.push(...bucket);
      }
    }
    // 再按行数分包
    return splitIntoBatches(priorityFiles, "核心文件", "重点维度 + 红线检查", fileStats);
  }

  // batched / concurrent：按桶生成批次
  for (const rule of BUCKET_RULES) {
    const bucket = buckets[rule.name];
    if (!bucket || bucket.length === 0) continue;

    const subBatches = splitIntoBatches(bucket, rule.name, rule.focus, fileStats);
    batches.push(...subBatches);
  }

  return batches;
}

// ====== 按行数分包 ======
function splitIntoBatches(files, bucketName, focus, fileStats) {
  const batches = [];
  let currentBatch = [];
  let currentLines = 0;

  for (const file of files) {
    const stat = fileStats.find((s) => s.path === file);
    const fileLines = stat?.lines ?? 50;

    if (
      currentBatch.length >= MAX_FILES_PER_BATCH ||
      (currentLines + fileLines > MAX_LINES_PER_BATCH && currentBatch.length > 0)
    ) {
      batches.push({ bucket: bucketName, files: [...currentBatch], focus });
      currentBatch = [];
      currentLines = 0;
    }

    currentBatch.push(file);
    currentLines += Math.min(fileLines, 500); // 单文件最大计 500 行
  }

  if (currentBatch.length > 0) {
    batches.push({ bucket: bucketName, files: [...currentBatch], focus });
  }

  return batches;
}

// ====== 高危文件识别 ======
function identifyHighRisk(files) {
  // 简单规则：文件名含高危关键词
  const risky = files.filter((f) => {
    const name = f.toLowerCase();
    return (
      name.includes("auth") ||
      name.includes("login") ||
      name.includes("token") ||
      name.includes("password") ||
      name.includes("api") ||
      name.includes("webhook") ||
      name.includes("payment")
    );
  });
  return risky;
}

main().catch((err) => {
  console.error("分批脚本出错:", err.message);
  process.exit(1);
});
