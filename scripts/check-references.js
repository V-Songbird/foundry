#!/usr/bin/env node
"use strict";

// Deterministic reference checker for a repository and its submodules, so a session with no
// context can follow every reference to something that exists.
// Hard findings (exit 1): Markdown links and anchors, frontmatter related_files, memory index
// pointers, SKILL.md references, manifest paths (plugin.json, marketplace.json, hooks.json,
// agents/openai.yaml), path case mismatches, and the clone view (a tracked public file pointing
// at a target that a fresh clone does not have). Soft findings (warn only): code-span paths in
// prose, `node <script>` commands, plugin slash commands, [[memory links]], unindexed memories.
// Usage: node scripts/check-references.js --root <repo> [--memory <dir>] [--extra <dir>]...
//   [--exclude <regex>]... [--allow <regex>]... [--json <out>]
// --exclude skips scanned files whose root-relative path matches; --allow accepts a target that
// is a documented example, such as a path inside a sample message. A --memory folder that does
// not exist, as in a fresh clone, is skipped and named.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const args = process.argv.slice(2)
const opt = { root: null, memory: null, extra: [], exclude: [], allow: [], json: null }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--root') opt.root = args[++i]
  else if (a === '--memory') opt.memory = args[++i]
  else if (a === '--extra') opt.extra.push(args[++i])
  else if (a === '--exclude') opt.exclude.push(new RegExp(args[++i]))
  else if (a === '--json') opt.json = args[++i]
  else if (a === '--allow') opt.allow.push(new RegExp(args[++i]))
  else { console.error(`unknown argument ${a}`); process.exit(2) }
}
if (!opt.root) { console.error('--root is required'); process.exit(2) }
const ROOT = path.resolve(opt.root)
const norm = p => p.split(path.sep).join('/')
const rel = p => norm(path.relative(ROOT, p))
const excluded = p => opt.exclude.some(r => r.test(rel(p)))

function git(cwd, ...a) {
  return execFileSync('git', ['-C', cwd, '-c', 'core.quotepath=off', ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
}

// Repositories: the root and each checked-out submodule.
const repos = [{ dir: ROOT, tracked: new Set(), dirs: new Set() }]
const gm = path.join(ROOT, '.gitmodules')
if (fs.existsSync(gm)) {
  for (const m of fs.readFileSync(gm, 'utf8').matchAll(/^\s*path\s*=\s*(.+)$/gm)) {
    const d = path.join(ROOT, m[1].trim())
    if (fs.existsSync(path.join(d, '.git'))) repos.push({ dir: d, tracked: new Set(), dirs: new Set() })
  }
}
for (const r of repos) {
  for (const f of git(r.dir, 'ls-files', '-z').split('\0').filter(Boolean)) {
    r.tracked.add(f)
    const parts = f.split('/')
    for (let i = 1; i < parts.length; i++) r.dirs.add(parts.slice(0, i).join('/'))
  }
}
const repoOf = p => {
  let best = null
  for (const r of repos) {
    const x = path.relative(r.dir, p)
    if (!x.startsWith('..') && !path.isAbsolute(x) && (!best || r.dir.length > best.dir.length)) best = r
  }
  return best
}
const isTracked = p => {
  const r = repoOf(p)
  if (!r) return false
  const x = norm(path.relative(r.dir, p))
  return x === '' || r.tracked.has(x) || r.dirs.has(x)
}
// In a clone: a tracked file, a directory holding tracked files, or a checked-out submodule.
const inClone = p => {
  const r = repoOf(p)
  if (!r) return false
  if (r.dir === p) return true
  return isTracked(p)
}

// Case-exact existence: Windows ignores case, a Linux clone does not.
const caseCache = new Map()
function caseExact(p) {
  const parts = norm(path.relative(ROOT, p)).split('/')
  if (parts[0] === '..') return true
  let cur = ROOT
  for (const seg of parts) {
    if (seg === '' || seg === '.') continue
    let names = caseCache.get(cur)
    if (!names) { try { names = new Set(fs.readdirSync(cur)) } catch { return true } caseCache.set(cur, names) }
    if (!names.has(seg)) return false
    cur = path.join(cur, seg)
  }
  return true
}

const findings = []
const stats = { files: 0, links: 0, anchors: 0, related: 0, memory: 0, skillRefs: 0, manifest: 0, codeSpans: 0, commands: 0, slash: 0, external: 0 }
function add(severity, kind, file, line, target, reason) {
  // --allow: a documented example target, such as a path inside a sample message.
  if (opt.allow.some(r => r.test(String(target)))) { stats.allowed = (stats.allowed ?? 0) + 1; return }
  findings.push({ severity, kind, file: rel(file), line, target, reason })
}

// Files to scan.
const scan = new Set()
for (const r of repos) for (const f of r.tracked) {
  const p = path.join(r.dir, f)
  if (/\.(md|json|ya?ml)$/i.test(f) && fs.existsSync(p) && fs.statSync(p).isFile()) scan.add(p)
}
function walk(d, out) {
  if (!fs.existsSync(d)) return
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (!/^(node_modules|\.git)$/.test(e.name)) walk(p, out) }
    else if (/\.(md|json|ya?ml)$/i.test(e.name)) out.add(p)
  }
}
for (const r of repos) walk(path.join(r.dir, 'docs'), scan) // ignored maintained docs too
for (const x of opt.extra) walk(path.resolve(ROOT, x), scan)
let MEM = opt.memory ? path.resolve(opt.memory) : null
if (MEM && !fs.existsSync(MEM)) { console.log(`memory folder ${opt.memory} not found; memory checks skipped`); MEM = null }
if (MEM) walk(MEM, scan)

const PRIVATE = /(^|\/)(\.private|docs\/tasks|docs\/decisions|docs\/knowledge\/private|docs\/apis\/private)(\/|$)/
const isPublic = p => isTracked(p) && !PRIVATE.test(norm(path.relative(repoOf(p)?.dir ?? ROOT, p)))

// GitHub-style heading anchors.
const slugCache = new Map()
function anchorsOf(file) {
  if (slugCache.has(file)) return slugCache.get(file)
  const set = new Set()
  const seen = new Map()
  let fence = null
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const f = line.match(/^\s*(```+|~~~+)/)
    if (f) { if (!fence) fence = f[1][0]; else if (f[1][0] === fence) fence = null; continue }
    if (fence) continue
    for (const m of line.matchAll(/<a\s+(?:id|name)=["']([^"']+)["']/g)) set.add(m[1])
    const h = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/)
    if (!h) continue
    const text = h[1].replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '')
    let s = text.trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '').replace(/ /g, '-')
    const n = seen.get(s) ?? 0
    seen.set(s, n + 1)
    set.add(n ? `${s}-${n}` : s)
  }
  slugCache.set(file, set)
  return set
}

function stripLineSuffix(t) {
  const m = t.match(/^(.*?):(\d+)(?:-\d+)?$/)
  return m && !/^[a-z]:$/i.test(m[1]) ? m[1] : t
}

// Check one resolved file reference; returns true when it exists.
function checkTarget(src, line, kind, raw, abs, { anchor = null, clone = true } = {}) {
  if (!fs.existsSync(abs)) { add('hard', kind, src, line, raw, 'target does not exist'); return false }
  if (!caseExact(abs)) { add('hard', kind, src, line, raw, 'case differs from the file on disk; breaks on case-sensitive clones'); return false }
  if (clone && isPublic(src) && !inClone(abs)) {
    add('hard', 'clone-view', src, line, raw, 'public tracked file points at an untracked or ignored target, absent from every clone')
  }
  if (anchor && !/^L\d/.test(anchor) && !anchor.includes('/')) {
    stats.anchors++
    if (fs.statSync(abs).isFile() && /\.md$/i.test(abs) && !anchorsOf(abs).has(decodeURIComponent(anchor).toLowerCase())) {
      add('hard', 'anchor', src, line, raw, `no heading or id "${anchor}" in ${rel(abs)}`)
    }
  }
  return true
}

// Skill names a plugin exposes: skills/<n>/SKILL.md or commands/<n>.md.
function pluginHas(plugin, name) {
  const d = path.join(ROOT, plugin)
  return fs.existsSync(path.join(d, 'skills', name, 'SKILL.md')) || fs.existsSync(path.join(d, 'commands', `${name}.md`))
}
const LOCAL_PLUGINS = new Set(fs.readdirSync(ROOT).filter(n => fs.existsSync(path.join(ROOT, n, '.claude-plugin', 'plugin.json'))))

const memNames = new Set()
const memIndexed = new Set()
if (MEM) for (const f of fs.readdirSync(MEM)) {
  if (!f.endsWith('.md') || f === 'MEMORY.md') continue
  const m = fs.readFileSync(path.join(MEM, f), 'utf8').match(/^name:\s*(.+)$/m)
  if (m) memNames.add(m[1].trim().replace(/^["']|["']$/g, ''))
}

function scanMarkdown(file) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  const repo = repoOf(file)
  const repoDir = repo ? repo.dir : ROOT
  const isSkill = path.basename(file) === 'SKILL.md'
  const isMemIndex = MEM && path.resolve(file) === path.join(MEM, 'MEMORY.md')
  const inMem = MEM && path.dirname(path.resolve(file)) === MEM
  // Frontmatter related_files.
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fm) {
    const body = fm[1]
    const fmLines = body.split(/\r?\n/)
    for (let i = 0; i < fmLines.length; i++) {
      const m = fmLines[i].match(/^related_files:\s*(.*)$/)
      if (!m) continue
      const items = []
      if (m[1].trim().startsWith('[')) {
        let s = m[1]; let j = i
        while (!s.includes(']') && j + 1 < fmLines.length) s += ' ' + fmLines[++j]
        for (const it of s.replace(/^\s*\[|\]\s*$/g, '').split(',')) if (it.trim()) items.push([it.trim(), i + 2])
      } else {
        for (let j = i + 1; j < fmLines.length && /^\s+-\s|^-\s/.test(fmLines[j]); j++) items.push([fmLines[j].replace(/^\s*-\s*/, '').trim(), j + 2])
      }
      for (let [it, ln] of items) {
        it = it.replace(/^["']|["']$/g, '').replace(/#.*$/, '')
        if (!it) continue
        stats.related++
        const t = stripLineSuffix(it)
        if (/[*?]/.test(t)) {
          const base = t.split(/[*?]/)[0].replace(/[^/]*$/, '')
          if (!fs.existsSync(path.join(repoDir, base))) add('soft', 'related_files', file, ln, it, 'glob base does not exist')
          continue
        }
        const cands = [path.join(repoDir, t), path.join(ROOT, t), path.resolve(path.dirname(file), t)]
        const hit = cands.find(c => fs.existsSync(c))
        if (!hit) add('hard', 'related_files', file, ln, it, 'path does not exist from the repository root, Foundry root or the file')
        else if (!caseExact(hit)) add('hard', 'related_files', file, ln, it, 'case differs from the file on disk')
      }
    }
  }
  let fence = null
  lines.forEach((line, idx) => {
    const ln = idx + 1
    const f = line.match(/^\s*(```+|~~~+)/)
    const inFenceBefore = fence !== null
    if (f) { if (!fence) fence = f[1][0]; else if (f[1][0] === fence) fence = null }
    // `node <script>` commands, in fences or prose.
    for (const m of line.matchAll(/(?:^|[\s`(])node\s+(?:--test\s+)?["']?((?:\.{0,2}\/)?[\w./@-]+\.(?:c|m)?js)\b/g)) {
      stats.commands++
      const s = m[1]
      if (s.includes('*') || /^<|plugin root/.test(s)) continue
      const tries = [path.resolve(path.dirname(file), s), path.join(repoDir, s), path.join(ROOT, s), path.join(ROOT, 'benchmarks', s), ...repos.map(r => path.join(r.dir, s))]
      if (!tries.some(t => fs.existsSync(t))) add('soft', 'command', file, ln, `node ${s}`, 'script not found from the file, its repository, Foundry root or benchmarks/')
    }
    if (f || inFenceBefore) return
    const prose = line.replace(/`[^`]*`/g, m => ' '.repeat(m.length))
    // Markdown links and images: any "](target)".
    for (const m of prose.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g)) handleLink(file, ln, m[1], { isMemIndex })
    const def = prose.match(/^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/)
    if (def) handleLink(file, ln, def[1], { isMemIndex })
    // [[memory links]].
    if (inMem) for (const m of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
      stats.memory++
      if (!memNames.has(m[1].trim())) add('soft', 'memory-wikilink', file, ln, `[[${m[1]}]]`, 'no memory has this name (allowed by the memory convention: marks a memory worth writing)')
    }
    // Plugin slash commands in prose and code spans.
    for (const m of line.matchAll(/(?:^|[\s`(*"'])[\/$]([a-z][\w-]*):([a-z][\w-]*)\b/g)) {
      stats.slash++
      if (!LOCAL_PLUGINS.has(m[1])) { stats.external++; continue }
      if (!pluginHas(m[1], m[2])) add('soft', 'slash-command', file, ln, `/${m[1]}:${m[2]}`, `no skills/${m[2]}/SKILL.md or commands/${m[2]}.md in ${m[1]}/`)
    }
    // Code-span paths.
    for (const m of line.matchAll(/`([^`\s]+)`/g)) {
      let s = m[1]
      if (!/\//.test(s) || /^[a-z][a-z0-9+.-]*:\/\//i.test(s) || /[<>{}$*|=]|\.\.\.|…/.test(s) || s.startsWith('/') || s.startsWith('~') || /^[A-Za-z]:/.test(s) || s.startsWith('-')) continue
      if (!/^[\w.@-]+(\/[\w.@ -]*)+$/.test(s)) continue
      stats.codeSpans++
      s = stripLineSuffix(s.replace(/[),.;:]+$/, ''))
      const skillDir = isSkill ? path.dirname(file) : null
      if (isSkill && /^(references|scripts|assets|agents)\//.test(s)) {
        stats.skillRefs++
        const own = path.join(skillDir, s)
        // A skill may also name a repository-level script; only a path found nowhere is hard.
        const elsewhere = [path.join(repoDir, s), path.join(ROOT, s), ...repos.map(r => path.join(r.dir, s))].find(t => fs.existsSync(t))
        if (fs.existsSync(own) || !elsewhere) checkTarget(file, ln, 'skill-ref', s, own, { clone: true })
        continue
      }
      const tries = [path.resolve(path.dirname(file), s), path.join(repoDir, s), path.join(ROOT, s), ...repos.map(r => path.join(r.dir, s))]
      if (!tries.some(t => fs.existsSync(t))) add('soft', 'code-span-path', file, ln, s, 'not found from the file, its repository or any checkout root')
    }
  })
}

function handleLink(file, ln, rawTarget, { isMemIndex }) {
  let t = rawTarget.trim()
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^[a-z]:[\\/]/i.test(t)) return // URL schemes
  stats.links++
  let anchor = null
  const hash = t.indexOf('#')
  if (hash >= 0) { anchor = t.slice(hash + 1); t = t.slice(0, hash) }
  if (t === '') {
    if (anchor && !anchor.includes('/') && !/^L\d/.test(anchor)) {
      stats.anchors++
      if (!anchorsOf(file).has(decodeURIComponent(anchor).toLowerCase())) add('hard', 'anchor', file, ln, `#${anchor}`, 'no such heading in this file')
    }
    return
  }
  try { t = decodeURIComponent(t) } catch {}
  t = stripLineSuffix(t)
  const repo = repoOf(file)
  const abs = /^[a-z]:[\\/]/i.test(t) ? t : t.startsWith('/') ? path.join(repo ? repo.dir : ROOT, t) : path.resolve(path.dirname(file), t)
  if (/^[a-z]:[\\/]/i.test(t) && isPublic(file)) add('hard', 'clone-view', file, ln, rawTarget, 'absolute host path in a public file')
  const kind = isMemIndex ? 'memory-index' : 'link'
  if (isMemIndex) { stats.memory++; memIndexed.add(path.basename(abs)) }
  checkTarget(file, ln, kind, rawTarget, abs, { anchor })
}

// Manifest paths.
function walkJson(v, cb, key = '') {
  if (typeof v === 'string') cb(v, key)
  else if (Array.isArray(v)) v.forEach(x => walkJson(x, cb, key))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkJson(x, cb, k)
}
function lineOf(text, needle) {
  const i = text.indexOf(needle)
  return i < 0 ? 1 : text.slice(0, i).split('\n').length
}
function scanJson(file) {
  const name = path.basename(file)
  const dir = path.dirname(file)
  const isPluginJson = name === 'plugin.json'
  const isMarket = name === 'marketplace.json'
  const isHooks = name === 'hooks.json'
  if (!isPluginJson && !isMarket && !isHooks) return
  const text = fs.readFileSync(file, 'utf8')
  let j
  try { j = JSON.parse(text) } catch (e) { add('hard', 'manifest', file, 1, name, `invalid JSON: ${e.message}`); return }
  const inPluginDir = /^\.(claude|codex)-plugin$/.test(path.basename(dir))
  const pluginRoot = inPluginDir ? path.dirname(dir) : isHooks && path.basename(dir) === 'hooks' ? path.dirname(dir) : dir
  const marketRoot = isMarket ? (path.basename(dir) === '.claude-plugin' ? path.dirname(dir) : path.resolve(dir, '..', '..')) : null
  walkJson(j, (s, key) => {
    if (/^(https?|git|ssh):/.test(s)) return
    for (const m of s.matchAll(/\$\{(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)\}[\\/]([^"'\s]+)/g)) {
      stats.manifest++
      checkTarget(file, lineOf(text, m[0]), 'manifest', m[0], path.join(pluginRoot, m[1]), { clone: true })
    }
    if (!/^\.{1,2}\//.test(s)) return
    stats.manifest++
    const base = isHooks && key === 'modules' ? dir : isMarket ? marketRoot : pluginRoot
    checkTarget(file, lineOf(text, `"${s}"`), 'manifest', s, path.resolve(base, s), { clone: true })
  })
  if (isMarket && Array.isArray(j.plugins)) for (const p of j.plugins) {
    if (p && typeof p.source === 'object' && p.name) {
      stats.manifest++
      const d = path.join(marketRoot, p.name)
      if (!fs.existsSync(d)) add('hard', 'manifest', file, lineOf(text, `"${p.name}"`), p.name, 'catalog entry names no checkout at the root')
    }
  }
}
function scanYaml(file) {
  if (path.basename(file) !== 'openai.yaml') return
  const skillDir = path.resolve(path.dirname(file), '..')
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    const m = line.match(/:\s*["']?(\.{0,2}\/?(?:assets|references|scripts)\/[^"'\s]+|\.{1,2}\/[^"'\s]+)/)
    if (!m) return
    stats.manifest++
    checkTarget(file, i + 1, 'manifest', m[1], path.resolve(skillDir, m[1]), { clone: true })
  })
}

for (const f of [...scan].sort()) {
  if (excluded(f)) continue
  stats.files++
  try {
    if (/\.md$/i.test(f)) scanMarkdown(f)
    else if (/\.json$/i.test(f)) scanJson(f)
    else scanYaml(f)
  } catch (e) { add('hard', 'scan-error', f, 1, '', e.message) }
}
if (MEM) for (const f of fs.readdirSync(MEM)) {
  if (f.endsWith('.md') && f !== 'MEMORY.md' && !memIndexed.has(f)) add('soft', 'memory-unindexed', path.join(MEM, f), 1, f, 'memory file has no pointer in MEMORY.md')
}

const hard = findings.filter(f => f.severity === 'hard')
const soft = findings.filter(f => f.severity === 'soft')
const byKind = {}
for (const f of findings) byKind[`${f.severity}:${f.kind}`] = (byKind[`${f.severity}:${f.kind}`] ?? 0) + 1
const report = { root: ROOT, repos: repos.map(r => rel(r.dir) || '.'), stats, counts: { hard: hard.length, soft: soft.length, byKind }, findings }
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(report, null, 2))
console.log(`scanned ${stats.files} files in ${repos.length} repositories; links ${stats.links}, anchors ${stats.anchors}, related_files ${stats.related}, memory ${stats.memory}, skill refs ${stats.skillRefs}, manifest paths ${stats.manifest}, code-span paths ${stats.codeSpans}, node commands ${stats.commands}, slash commands ${stats.slash} (${stats.external} external, not checked)`)
console.log(`hard ${hard.length}, soft ${soft.length}: ${JSON.stringify(byKind)}`)
for (const f of hard) console.log(`HARD ${f.kind} ${f.file}:${f.line} -> ${f.target} (${f.reason})`)
process.exit(hard.length ? 1 : 0)
