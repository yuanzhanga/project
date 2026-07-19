#!/usr/bin/env node
/**
 * PreToolUse hook — scan repo conventions before an MR / push goes out.
 *
 * Fires on Bash commands that publish work outward (git push, glab mr create,
 * gh pr create). Runs check-repo-conventions.mjs --fix on the MR diff:
 *   - auto-fixes rule 1 (zh-Hans → zh-CN) in place, then BLOCKS so the human
 *     can review + commit the fix before the push;
 *   - BLOCKS on rule 2/3 violations (structural leaks, invalid pub_res),
 *     feeding the report back to Claude to resolve.
 *
 * A clean diff is allowed through silently.
 *
 * Hook contract: reads the tool-call JSON on stdin, emits a PreToolUse
 * permission decision on stdout. Registered in .claude/settings.json.
 */

import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..') // .claude/hooks/ → repo root
const CHECKER = path.join(REPO_ROOT, 'workspace', 'scripts', 'check-repo-conventions.mjs')

// Commands that send work outward and should be gated. Anchor the verb to a
// real command position (start, or after a shell separator) so it is not
// matched inside quoted text — e.g. a commit message that mentions "git push".
const MR_COMMAND = /(?:^|&&|\|\||[;\n])\s*(?:sudo\s+)?(?:git\s+push|glab\s+mr\s+create|gh\s+pr\s+create)\b/

function allow() {
  process.exit(0) // no output = no objection
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }))
  process.exit(0)
}

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'))
  } catch {
    return null
  }
}

function main() {
  const input = readStdin()
  if (!input) allow()

  const tool = input.tool_name || input.toolName
  const command = input.tool_input?.command || input.toolInput?.command || ''
  if (tool !== 'Bash' || !MR_COMMAND.test(command)) allow()

  // Run the checker with --fix; it exits 1 (throws) when errors remain.
  let raw
  try {
    raw = execFileSync('node', [CHECKER, '--fix', '--json'], { cwd: REPO_ROOT, encoding: 'utf8' })
  } catch (e) {
    raw = e.stdout || '' // non-zero exit still wrote JSON to stdout
  }

  let result
  try {
    result = JSON.parse(raw.trim().split('\n').pop())
  } catch {
    allow() // checker produced no parseable verdict — don't block on tooling failure
  }

  const fixLines = (result.fixes || []).map((f) => `  • ${f}`).join('\n')
  const errLines = (result.errors || []).map((e) => `  • ${e}`).join('\n')

  if (result.hasErrors) {
    let reason = `素材约定校验未通过，已阻止本次提交/推送。\n\n违例（需手动处理，不会自动改动代码/资源）：\n${errLines}`
    if (result.hasFixes) reason += `\n\n已自动修复（请一并检查并提交）：\n${fixLines}`
    reason += `\n\n请修正后重新提交。规则参考 workspace/scripts/check-repo-conventions.mjs。`
    deny(reason)
  }

  if (result.hasFixes) {
    deny(
      `已自动把不合约定的内容修正（zh-Hans → zh-CN 等）：\n${fixLines}\n\n` +
        `这些改动尚未提交。请检查 diff、git add 后再提交，然后重新执行推送/建 MR。`
    )
  }

  allow()
}

main()
