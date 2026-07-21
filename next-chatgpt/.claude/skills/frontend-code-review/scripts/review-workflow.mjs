export const meta = {
  name: 'frontend-code-review-workflow',
  description: '并发审查前端代码：接收分批计划 → 每批一个独立 Agent 并行审查 → 合并去重 → 输出结构化报告',
  phases: [
    { title: '并发审查', detail: '每批一个 Agent 并行按 9 维度审查' },
    { title: '合并去重', detail: '去重、归类、生成总结报告' },
  ],
}

// Agent 输出的结构化 schema
const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'warning', 'suggestion'] },
          dimension: { type: 'string' },
          line: { type: ['integer', 'null'] },
          message: { type: 'string' },
          suggestion: { type: 'string' },
          filePath: { type: 'string' },
        },
        required: ['severity', 'dimension', 'message', 'filePath'],
        additionalProperties: false,
      },
    },
  },
  required: ['findings'],
  additionalProperties: false,
}

// 审查维度（精简版，给 Agent 用）
const REVIEW_DIMENSIONS = `审查维度：
1. React/框架正确性：Hook 调用规则、useEffect 清理、依赖数组、useCallback/useMemo 必要性、Key 属性、条件 Hook、派生状态
2. 性能：不必要重渲染、缺失 memo、JSX 内联对象、虚拟化、包体积、图片优化、渲染中昂贵计算
3. 状态管理：直接修改 state、闭包陷阱、State 过度提升、缺少 loading/error 状态、竞态条件、Ref 滥用
4. 无障碍 WCAG 2.1 AA：语义化 HTML、颜色对比度、仅靠颜色传达信息、键盘导航、焦点管理、ARIA 标签、屏幕阅读器、表单
5. CSS/样式架构：响应式设计、Tailwind 滥用、CSS-in-JS 性能、动画性能、布局偏移 CLS
6. SSR/Next.js："use client" 边界、注水不匹配、数据获取、动态导入、Metadata
7. 前端安全：XSS(dangerouslySetInnerHTML)、原型污染、客户端敏感数据、开放重定向
8. 代码质量：组件体积 >200 行、魔法数字、错误边界、类型安全、注释质量、死代码
9. 测试：新增 Hook/组件无测试、复杂逻辑无覆盖、测试实现细节而非行为、异步测试不完整、快照滥用`

const RED_FLAGS = `红线（必须报告）：
- dangerouslySetInnerHTML 未消毒
- useEffect 缺失依赖数组或用[]但用了props/state
- 直接操作DOM（document.querySelector, element.appendChild）
- setTimeout/setInterval 无清理
- 用户输入的 JSON.parse 无 try-catch
- 直接修改 state（.push()、原地.sort()、obj.x=y）
- 客户端含 API Key/密钥
- new Date()/Math.random() 在 render 函数体中（非useEffect/事件处理）
- 新增 Hook 无测试、新增组件无测试`

// ====== Workflow Body ======

const batches = args.batches
const projectContext = args.projectContext || {}

if (!batches || batches.length === 0) {
  log('无审查批次，退出')
  return { summary: { totalFiles: 0, totalBatches: 0, findings: [] }, findings: [] }
}

log(`项目: ${projectContext.packageName || 'unknown'} | React ${projectContext.react || '?'} Next.js ${projectContext.next || '?'} TypeScript ${projectContext.typescript || '?'} ${projectContext.styling || ''}`)
log(`审查策略: ${args.strategy || 'manual'} | ${batches.length} 批并发，每批最多 ${args.maxFilesPerBatch || 5} 个文件`)

// ====== Phase 1: 并发审查 ======
phase('并发审查')

const reviewTasks = batches.map((batch, index) => () => {
  const fileList = batch.files.map(f => `- ${f.path}${f.truncated ? ' [已截断]' : ''}`).join('\n')
  const diffBlock = batch.files.map(f =>
    `### ${f.path}${f.truncated ? ' [已截断]' : ''}\n\`\`\`diff\n${f.diff || '(无 diff)'}\n\`\`\``
  ).join('\n\n')

  return agent(
    `你是前端代码审查专家。请审查以下代码变更。

## 项目上下文
- React: ${projectContext.react || '未知'}
- Next.js: ${projectContext.next || '未知'}
- TypeScript: ${projectContext.typescript || '未知'}
- 样式方案: ${projectContext.styling || '未知'}

## 当前批次审查重点
${batch.focus}

## 待审查文件
${fileList}

## Diff 内容
${diffBlock}

${REVIEW_DIMENSIONS}

${RED_FLAGS}

## 输出要求
- 只对实际存在问题的地方输出发现，没问题的文件不输出
- 每条发现的 message 和 suggestion 用中文
- line 为问题所在行号（整数），无法确定则填 null
- 输出 JSON: { "findings": [...] }`,
    {
      label: `review:${batch.bucket || `batch-${index + 1}`}`,
      phase: '并发审查',
      schema: FINDINGS_SCHEMA,
      agentType: 'general-purpose',
      effort: 'medium',
    }
  )
})

const results = await parallel(reviewTasks)

// ====== Phase 2: 合并去重 ======
phase('合并去重')

const allFindings = results
  .filter(Boolean)
  .flatMap(r => r.findings || [])
log(`原始发现: ${allFindings.length} 条`)

// 去重：同一文件同一维度同一行 → 保留一条
const dedupKey = f => `${f.filePath}::${f.dimension}::${f.line ?? 'null'}::${f.severity}`
const seen = new Set()
const deduped = []
for (const f of allFindings) {
  const key = dedupKey(f)
  if (!seen.has(key)) {
    seen.add(key)
    deduped.push(f)
  }
}
log(`去重后: ${deduped.length} 条 (移除 ${allFindings.length - deduped.length} 条重复)`)

// 按严重度排序: critical > warning > suggestion
const severityOrder = { critical: 0, warning: 1, suggestion: 2 }
deduped.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

// 按维度分组统计
const byDimension = {}
const bySeverity = { critical: 0, warning: 0, suggestion: 0 }
for (const f of deduped) {
  const dim = f.dimension || '其他'
  byDimension[dim] = (byDimension[dim] || 0) + 1
  bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1
}

// 按文件分组
const byFile = {}
for (const f of deduped) {
  if (!byFile[f.filePath]) byFile[f.filePath] = []
  byFile[f.filePath].push(f)
}

const summary = {
  totalFiles: batches.reduce((sum, b) => sum + b.files.length, 0),
  totalBatches: batches.length,
  totalFindings: deduped.length,
  bySeverity,
  byDimension,
  byFile,
}

log(`最终报告: ${summary.totalFindings} 个发现 (${bySeverity.critical}🔴 ${bySeverity.warning}🟡 ${bySeverity.suggestion}🔵)`)

return {
  summary,
  findings: deduped,
  projectContext,
}
