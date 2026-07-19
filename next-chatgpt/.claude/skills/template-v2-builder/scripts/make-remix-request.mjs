#!/usr/bin/env node
/**
 * Wrap a filled content_spec YAML into a remix_request JSON (the remix_job worker's
 * input envelope).
 *
 * The remix pipeline consumes a single JSON: { template_slug, content_spec_yaml }
 * where content_spec_yaml is the ENTIRE filled content_spec as a raw string (the
 * worker parses + validates it via remixgate/remixpipe). This tool does the
 * mechanical envelope step — it does NOT author or validate spec content.
 *
 * Pipeline (the "模版填充" capability):
 *   1. cp content_spec_template.yaml content_spec_<xxx>.yaml  → fill key fields
 *      from the template's instance resources (authoring — see SKILL.md Step 14)
 *   2-3. this tool:  content_spec_<xxx>.yaml → remix_request_<xxx>.json
 *
 * Usage:
 *   node .claude/skills/template-v2-builder/scripts/make-remix-request.mjs <template-id> <content_spec_xxx.yaml> [--out <file>] [repo-root]
 *   node .claude/skills/template-v2-builder/scripts/make-remix-request.mjs romance-battle content_spec_kaguya.yaml
 *
 * <template-id> becomes template_slug (no manual remix_request.json edit needed).
 * The yaml path is resolved relative to cwd, then to workspace/templates_v2/<id>/.
 * Output defaults to remix_request_<stem>.json beside the input yaml, where
 * <stem> = yaml basename with a leading "content_spec_" stripped and ".yaml" removed.
 */

import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import { execFileSync } from 'node:child_process'

const ARGS = process.argv.slice(2)
const POSITIONAL = ARGS.filter((a) => !a.startsWith('--'))
const outIdx = ARGS.indexOf('--out')
const OUT_ARG = outIdx >= 0 ? ARGS[outIdx + 1] : undefined

const TEMPLATE_ID = POSITIONAL[0]
const YAML_ARG = POSITIONAL[1]
if (!TEMPLATE_ID || !YAML_ARG) {
  console.error('✗ Usage: make-remix-request.mjs <template-id> <content_spec_xxx.yaml> [--out <file>] [repo-root]')
  console.error('  e.g. node .claude/skills/template-v2-builder/scripts/make-remix-request.mjs romance-battle content_spec_kaguya.yaml')
  process.exit(1)
}

// ── Resolve repo root ────────────────────────────────────────────────────────
function findRepoRoot() {
  const explicit = POSITIONAL[2]
  if (explicit) return resolve(explicit)
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  } catch {
    let dir = process.cwd()
    while (dir !== dirname(dir)) {
      if (existsSync(resolve(dir, 'workspace', 'templates_v2'))) return dir
      dir = dirname(dir)
    }
    console.error('✗ Could not locate repo root. Pass it explicitly as the last arg.')
    process.exit(1)
  }
}

const REPO_ROOT = findRepoRoot()
const TEMPLATE_ROOT = resolve(REPO_ROOT, 'workspace', 'templates_v2', TEMPLATE_ID)

// ── Validate template id (slug correctness) ──────────────────────────────────
if (!existsSync(TEMPLATE_ROOT)) {
  console.error(`✗ Template not found: ${TEMPLATE_ROOT}`)
  console.error('  <template-id> must be a directory under workspace/templates_v2/.')
  process.exit(1)
}

// ── Resolve the yaml: cwd-relative first, then template-root-relative ─────────
let yamlPath = resolve(process.cwd(), YAML_ARG)
if (!existsSync(yamlPath)) yamlPath = resolve(TEMPLATE_ROOT, YAML_ARG)
if (!existsSync(yamlPath)) {
  console.error(`✗ content_spec YAML not found: "${YAML_ARG}"`)
  console.error(`  Looked in cwd and in ${TEMPLATE_ROOT}`)
  process.exit(1)
}

const yaml = readFileSync(yamlPath, 'utf8')
if (!yaml.trim() || statSync(yamlPath).size === 0) {
  console.error(`✗ ${yamlPath} is empty — fill the content_spec before wrapping.`)
  process.exit(1)
}

// ── Derive output path ───────────────────────────────────────────────────────
const stem = basename(yamlPath)
  .replace(/^content_spec_/, '')
  .replace(/\.ya?ml$/i, '')
const outPath = OUT_ARG ? resolve(process.cwd(), OUT_ARG) : join(dirname(yamlPath), `remix_request_${stem}.json`)

// ── Write the remix_request envelope ─────────────────────────────────────────
const envelope = { template_slug: TEMPLATE_ID, content_spec_yaml: yaml }
writeFileSync(outPath, JSON.stringify(envelope, null, 2) + '\n')

console.log(`▸ Wrapped content_spec → remix_request`)
console.log(`  template_slug: ${TEMPLATE_ID}`)
console.log(`  src: ${yamlPath} (${yaml.length} chars)`)
console.log(`  ✓ ${outPath}`)
