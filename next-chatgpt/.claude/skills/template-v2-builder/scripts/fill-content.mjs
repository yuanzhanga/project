#!/usr/bin/env node
/**
 * Fill an instance's content into a template's prebuilt shell, for `vite preview`.
 *
 * `vite preview` serves the static `dist_template/` as-is — the dev-only
 * `devContentPlugin` (apply: 'serve') does NOT run in preview mode, so the
 * skeleton `content/` (empty-string i18n, empty resources/) would render blank.
 * This copies a real instance's three-slot content into `dist_template/content/`
 * so the built shell can be previewed exactly as it ships.
 *
 * Wipes dist_template/content/ first, then copies the instance content verbatim,
 * so locales the instance doesn't provide fall back to en at runtime (404-tolerant)
 * instead of rendering the skeleton's empty strings.
 *
 * This is a PREVIEW-ONLY mutation. `pack-template.mjs` resets the shell back to
 * skeleton before zipping, so a filled shell is never shipped by accident.
 *
 * Usage:
 *   node .claude/skills/template-v2-builder/scripts/fill-content.mjs <template-id> [instance-name]
 *   node .claude/skills/template-v2-builder/scripts/fill-content.mjs duo-chat sample
 *   # then:  cd workspace/templates_v2/<id>/template && npx vite preview
 *
 * If [instance-name] is omitted and the template has exactly one instance, it is used;
 * otherwise the available instances are listed and you must pick one.
 * Optional 3rd arg = repo root (defaults to git toplevel, then cwd-walk).
 */

import { existsSync, rmSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'

const TEMPLATE_ID = process.argv[2]
const INSTANCE_ARG = process.argv[3] && !process.argv[3].startsWith('/') ? process.argv[3] : undefined
if (!TEMPLATE_ID) {
  console.error('✗ Usage: fill-content.mjs <template-id> [instance-name] [repo-root]')
  console.error('  e.g. node .claude/skills/template-v2-builder/scripts/fill-content.mjs duo-chat sample')
  process.exit(1)
}

// ── Resolve repo root ────────────────────────────────────────────────────────
function findRepoRoot() {
  const explicit = process.argv.find((a, i) => i >= 3 && a.startsWith('/'))
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
const INSTANCES_DIR = resolve(TEMPLATE_ROOT, 'instances')
const DIST_CONTENT = resolve(TEMPLATE_ROOT, 'template', 'dist_template', 'content')
const DIST_INDEX = resolve(TEMPLATE_ROOT, 'template', 'dist_template', 'index.html')

// ── Validate shell is built ──────────────────────────────────────────────────
if (!existsSync(DIST_INDEX)) {
  console.error(`✗ dist_template/index.html missing — build the shell first:`)
  console.error(`    cd workspace/templates_v2/${TEMPLATE_ID}/template && npx vite build && node scripts/build-skeleton.mjs`)
  process.exit(1)
}

// ── Resolve the instance ─────────────────────────────────────────────────────
function listInstances() {
  if (!existsSync(INSTANCES_DIR)) return []
  return readdirSync(INSTANCES_DIR).filter(
    (n) => !n.startsWith('.') && statSync(resolve(INSTANCES_DIR, n)).isDirectory(),
  )
}

const available = listInstances()
if (available.length === 0) {
  console.error(`✗ No instances found at ${INSTANCES_DIR}`)
  console.error(`  Create a v2 three-slot instance (content/{config.json,i18n,resources}) there first.`)
  process.exit(1)
}

let instance = INSTANCE_ARG
if (!instance) {
  if (available.length === 1) {
    instance = available[0]
  } else {
    console.error(`✗ Multiple instances — pass one explicitly:`)
    for (const n of available) console.error(`    ${n}`)
    process.exit(1)
  }
}
if (!available.includes(instance)) {
  console.error(`✗ Instance "${instance}" not found. Available: ${available.join(', ')}`)
  process.exit(1)
}

const SRC_CONTENT = resolve(INSTANCES_DIR, instance, 'content')
if (!existsSync(resolve(SRC_CONTENT, 'config.json'))) {
  console.error(`✗ ${SRC_CONTENT}/config.json missing — not a valid v2 instance.`)
  process.exit(1)
}

// ── Wipe skeleton content/, copy instance content/ ───────────────────────────
console.log(`▸ Filling ${TEMPLATE_ID} ← instance "${instance}"`)
rmSync(DIST_CONTENT, { recursive: true, force: true })
mkdirSync(dirname(DIST_CONTENT), { recursive: true })
cpSync(SRC_CONTENT, DIST_CONTENT, { recursive: true })

console.log(`  ✓ ${SRC_CONTENT}`)
console.log(`  → ${DIST_CONTENT}`)
console.log('▸ Preview the built shell:')
console.log(`    cd workspace/templates_v2/${TEMPLATE_ID}/template && npx vite preview`)
console.log('▸ When done, pack-template.mjs resets content/ to skeleton before zipping.')
