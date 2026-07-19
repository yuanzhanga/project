#!/usr/bin/env node
/**
 * Package a templates_v2 template's prebuilt shell into a zip for delivery.
 *
 * Zips the CONTENTS of `workspace/templates_v2/<id>/template/dist_template/`
 * (index.html + assets/ + content/ + meta/ + manifest.json + … at the zip root,
 * so unzip yields the deployable shell directly — content/ stays sibling of
 * index.html as the runtime fetch contract requires), names the archive after
 * the template id, and drops it in ~/Downloads.
 *
 * Run AFTER the shell is built (`npx vite build && node scripts/build-skeleton.mjs`),
 * so dist_template/index.html + assets/ are real compiled artifacts.
 *
 * By default the shell is RESET TO SKELETON before zipping: the template's own
 * `scripts/build-skeleton.mjs` is re-run, which wipes & regenerates content/
 * (empty-string i18n, default config, empty resources/). This strips any
 * instance content left over from a `fill-content.mjs` + `vite preview` session,
 * so the shipped zip is always the clean skeleton. Pass `--keep-content` to skip
 * the reset and zip content/ as-is (e.g. to ship a filled instance package).
 *
 * Usage:
 *   node .claude/skills/template-v2-builder/scripts/pack-template.mjs <template-id> [--keep-content]
 *   node .claude/skills/template-v2-builder/scripts/pack-template.mjs romance-battle
 *
 * Optional trailing arg = repo root (defaults to `git rev-parse --show-toplevel`,
 * then falls back to walking up from cwd to find workspace/templates_v2).
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { homedir } from 'node:os'
import { execFileSync } from 'node:child_process'

const ARGS = process.argv.slice(2)
const KEEP_CONTENT = ARGS.includes('--keep-content')
const POSITIONAL = ARGS.filter((a) => !a.startsWith('--'))
const TEMPLATE_ID = POSITIONAL[0]
if (!TEMPLATE_ID) {
  console.error('✗ Usage: pack-template.mjs <template-id> [--keep-content] [repo-root]')
  console.error('  e.g. node .claude/skills/template-v2-builder/scripts/pack-template.mjs romance-battle')
  process.exit(1)
}

// ── Resolve repo root ────────────────────────────────────────────────────────
function findRepoRoot() {
  if (POSITIONAL[1]) return resolve(POSITIONAL[1])
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  } catch {
    // Fall back: walk up from cwd looking for workspace/templates_v2
    let dir = process.cwd()
    while (dir !== dirname(dir)) {
      if (existsSync(resolve(dir, 'workspace', 'templates_v2'))) return dir
      dir = dirname(dir)
    }
    console.error('✗ Could not locate repo root. Pass it explicitly as the 2nd arg.')
    process.exit(1)
  }
}

const REPO_ROOT = findRepoRoot()
const DIST = resolve(REPO_ROOT, 'workspace', 'templates_v2', TEMPLATE_ID, 'template', 'dist_template')

// ── Validate the shell is built ──────────────────────────────────────────────
if (!existsSync(DIST)) {
  console.error(`✗ dist_template/ not found: ${DIST}`)
  console.error('  Build the shell first: cd into the template and run')
  console.error('    npx vite build && node scripts/build-skeleton.mjs')
  process.exit(1)
}
if (!existsSync(resolve(DIST, 'index.html'))) {
  console.error(`✗ ${DIST}/index.html missing — shell is not built.`)
  console.error('  Run `npx vite build && node scripts/build-skeleton.mjs` in the template first.')
  process.exit(1)
}

// ── Reset content/ to skeleton (strip any preview fill) ──────────────────────
const TEMPLATE_DIR = resolve(REPO_ROOT, 'workspace', 'templates_v2', TEMPLATE_ID, 'template')
if (KEEP_CONTENT) {
  console.log('▸ --keep-content: zipping content/ as-is (skeleton NOT regenerated)')
} else {
  const buildSkeleton = resolve(TEMPLATE_DIR, 'scripts', 'build-skeleton.mjs')
  if (!existsSync(buildSkeleton)) {
    console.error(`✗ Cannot reset to skeleton: ${buildSkeleton} not found.`)
    console.error('  Re-run `node scripts/build-skeleton.mjs` manually, or pass --keep-content to skip the reset.')
    process.exit(1)
  }
  console.log('▸ Resetting content/ to skeleton (build-skeleton.mjs)…')
  execFileSync('node', ['scripts/build-skeleton.mjs'], { cwd: TEMPLATE_DIR, stdio: 'inherit' })
}

// ── Zip dist_template/ contents into ~/Downloads/<id>.zip ────────────────────
const OUT_DIR = resolve(homedir(), 'Downloads')
mkdirSync(OUT_DIR, { recursive: true })
const OUT = resolve(OUT_DIR, `${TEMPLATE_ID}.zip`)

rmSync(OUT, { force: true }) // clean rebuild, never append to a stale archive

console.log(`▸ Packaging ${TEMPLATE_ID}…`)
console.log(`  src: ${DIST}`)
// `zip -r <out> .` from inside DIST puts contents at the archive root.
execFileSync('zip', ['-rq', OUT, '.', '-x', '*.DS_Store', '-x', '__MACOSX/*'], {
  cwd: DIST,
  stdio: 'inherit',
})

const listing = execFileSync('zip', ['-sf', OUT], { encoding: 'utf8' })
const entryCount = listing.split('\n').filter((l) => l.trim() && !l.includes('Archive contains') && !l.includes('Total')).length

console.log(`  ✓ ${OUT}`)
console.log(`  ✓ ${entryCount} entries`)
