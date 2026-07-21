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

import { readFileSync, existsSync } from "fs";
import { resolve, dirname, extname, relative } from "path";

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

// ====== 依赖分析 ======

/** 从文件内容中提取 import 的目标路径（相对路径部分） */
function extractImports(filePath, content) {
  const deps = [];
  // import { x } from './foo' | import x from '../bar' | import type { x } from './foo'
  // export { x } from './foo'
  // import('./foo')
  // require('./foo')
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|[\w$]+|\*\s+as\s+[\w$]+)\s+from\s+['"]([^'"]+)['"]/g,
    /(?:import|export)\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      deps.push(match[1]);
    }
  }
  return deps;
}

// ====== 路径别名解析 ======
const PROJECT_ROOT = process.cwd();

/** 从 tsconfig.json 读取 paths 别名 */
let _pathAliases = null;
function getPathAliases() {
  if (_pathAliases !== null) return _pathAliases;
  _pathAliases = {};
  try {
    const tsconfig = JSON.parse(readFileSync(resolve(PROJECT_ROOT, "tsconfig.json"), "utf-8"));
    const paths = tsconfig.compilerOptions?.paths || {};
    const baseUrl = tsconfig.compilerOptions?.baseUrl || ".";
    const baseDir = resolve(PROJECT_ROOT, baseUrl);
    for (const [alias, targets] of Object.entries(paths)) {
      // 只取第一个 target，去掉通配符
      const aliasKey = alias.replace(/\/\*$/, "/");
      const target = Array.isArray(targets) ? targets[0].replace(/\/\*$/, "/") : targets.replace(/\/\*$/, "/");
      _pathAliases[aliasKey] = resolve(baseDir, target);
    }
  } catch {
    // tsconfig 不存在或解析失败
  }
  return _pathAliases;
}

/** 解析 import 路径为项目内的绝对文件路径 */
function resolveImportPath(fromFile, importPath) {
  let resolved = null;

  // 1. 相对路径
  if (importPath.startsWith(".")) {
    const fromDir = dirname(fromFile);
    resolved = resolve(fromDir, importPath);
  }

  // 2. 路径别名 (如 @/, ~/)
  if (!resolved) {
    const aliases = getPathAliases();
    for (const [aliasKey, aliasTarget] of Object.entries(aliases)) {
      if (importPath.startsWith(aliasKey)) {
        const relativePart = importPath.slice(aliasKey.length);
        resolved = resolve(aliasTarget, relativePart);
        break;
      }
    }
  }

  if (!resolved) return null;

  // 尝试补全扩展名
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
  for (const ext of extensions) {
    const candidate = resolved + ext;
    if (existsSync(candidate)) {
      // 转回项目相对路径，统一用 / 分隔
      return relative(PROJECT_ROOT, candidate).replace(/\\/g, "/");
    }
  }
  return null;
}

/**
 * 构建依赖图
 * 返回 Map<filePath, Set<importedFile>>
 * 只保留双方都在 changedFiles 里的边（只关心改动文件间的依赖）
 */
function analyzeDependencies(files) {
  const fileSet = new Set(files.map((f) => f.replace(/\\/g, "/")));
  const graph = new Map(); // file → Set<file it imports>

  for (const file of files) {
    const normalizedPath = file.replace(/\\/g, "/");

    // 只分析有 import/require 语法的文件
    const ext = extname(file).toLowerCase();
    if (![".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ".mjs", ".cjs"].includes(ext)) continue;

    let content;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue; // 文件不可读，跳过
    }

    const rawImports = extractImports(file, content);
    const resolved = new Set();

    for (const imp of rawImports) {
      const target = resolveImportPath(normalizedPath, imp);
      if (target && fileSet.has(target)) {
        resolved.add(target);
      }
    }

    if (resolved.size > 0) {
      graph.set(normalizedPath, resolved);
    }
  }

  return graph;
}

/**
 * 根据依赖图合并分桶
 * 规则：如果文件 A 引用了文件 B（且两者都在改动中），
 * 将 B 从原桶移到 A 所在桶（按更高优先级桶为准）
 * 同时用 BFS 传播：A→B 且 B→C → A、B、C 合入同一桶
 */
function mergeDependentBuckets(buckets, depGraph) {
  if (depGraph.size === 0) return;

  // 1. 构建文件 → 所在桶的映射
  const fileToBucket = {};
  for (const [bucketName, fileList] of Object.entries(buckets)) {
    for (const f of fileList) {
      fileToBucket[f.replace(/\\/g, "/")] = bucketName;
    }
  }

  // 2. 构建双向边，找连通分量
  const neighbors = new Map(); // file → Set<neighbor>
  for (const [file, imports] of depGraph) {
    if (!neighbors.has(file)) neighbors.set(file, new Set());
    for (const target of imports) {
      neighbors.get(file).add(target);
      // 双向：target 也被连到 file
      if (!neighbors.has(target)) neighbors.set(target, new Set());
      neighbors.get(target).add(file);
    }
  }

  // 3. BFS 找连通分量
  const visited = new Set();
  const components = [];

  for (const file of neighbors.keys()) {
    if (visited.has(file)) continue;
    const component = [];
    const queue = [file];
    visited.add(file);

    while (queue.length > 0) {
      const current = queue.shift();
      component.push(current);
      for (const neighbor of neighbors.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (component.length > 1) {
      components.push(component);
    }
  }

  if (components.length === 0) return;

  console.error(`[split-diff] 依赖分析: 发现 ${components.length} 个连通分量需要合并`);
  for (const comp of components) {
    console.error(`  - ${comp.join(", ")}`);
  }

  // 4. 对每个连通分量，找最高优先级桶，把分量内所有文件移过去
  const priorityMap = {};
  for (const rule of BUCKET_RULES) {
    priorityMap[rule.name] = rule.priority;
  }

  for (const component of components) {
    // 找分量内所有文件当前所在桶
    const bucketNames = component.map((f) => fileToBucket[f]).filter(Boolean);
    if (bucketNames.length <= 1) continue; // 已经在同一桶

    // 选最高优先级桶（数字最小）→ 排序后的第一个
    bucketNames.sort((a, b) => (priorityMap[a] || 99) - (priorityMap[b] || 99));
    const targetBucket = bucketNames[0];

    // 把其他桶的文件移到目标桶
    for (const file of component) {
      const currentBucket = fileToBucket[file];
      if (currentBucket && currentBucket !== targetBucket) {
        // 从原桶移除
        const oldList = buckets[currentBucket];
        const idx = oldList.findIndex((f) => f.replace(/\\/g, "/") === file);
        if (idx >= 0) oldList.splice(idx, 1);

        // 加入目标桶
        if (!buckets[targetBucket]) buckets[targetBucket] = [];
        buckets[targetBucket].push(file.replace(/\//g, "/"));
        fileToBucket[file] = targetBucket;
      }
    }
  }

  // 5. 清理空桶
  for (const key of Object.keys(buckets)) {
    if (buckets[key].length === 0) delete buckets[key];
  }
}
async function main() {
  const files = parseInput();
  if (files.length === 0) {
    console.log(JSON.stringify({ error: "未检测到变更文件" }, null, 2));
    process.exit(0);
  }

  // 1. 分类文件到桶
  const buckets = bucketFiles(files);

  // 1.5 依赖分析：有 import 关系的文件合并到同一桶
  const depGraph = analyzeDependencies(files);
  mergeDependentBuckets(buckets, depGraph);

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
