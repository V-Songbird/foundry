#!/usr/bin/env node
"use strict";

// Theme-color check for Claude Code mods (JSX hooks modules). The rules it enforces are in
// docs/knowledge/mod-native-look.md.
// Rule: a painting prop takes a ThemeKey, which follows the person's theme. A raw color
// (hex, rgb(), hsl() or a CSS color name) in a mod's source is a violation unless the
// exceptions file lists that file and value with the owner's approval and its date.
// ThemeKey is read from the engine's own types file, never from a copy kept here.
// Usage: node scripts/check-mod-colors.js --types <claude-code.d.ts> [--exceptions <json>] [--json <out>] <mod dir>...
// Exit 0: no violations. 1: violations, unapproved or stale exceptions. 2: bad arguments.
const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
let types = null, exceptionsFile = null, jsonOut = null
const mods = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--types') types = args[++i]
  else if (args[i] === '--exceptions') exceptionsFile = args[++i]
  else if (args[i] === '--json') jsonOut = args[++i]
  else mods.push(args[i])
}
if (!types || !mods.length) { console.error('usage: --types <d.ts> [--exceptions <json>] <mod dir>...'); process.exit(2) }
const union = fs.readFileSync(types, 'utf8').match(/export type ThemeKey\s*=\s*([^;]+);/)
if (!union) { console.error(`no ThemeKey union in ${types}`); process.exit(2) }
const THEME = new Set([...union[1].matchAll(/'([^']+)'/g)].map(m => m[1]))
const exceptions = exceptionsFile ? JSON.parse(fs.readFileSync(exceptionsFile, 'utf8')).exceptions ?? [] : []
const CSS_NAMES = new Set('black white red green blue yellow cyan magenta gray grey orange purple pink brown silver gold navy teal maroon olive lime aqua fuchsia transparent'.split(' '))

function files(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) { if (!/^(node_modules|types|\.claude-plugin)$/.test(e.name)) files(p, out) }
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

const findings = []
const used = new Set()
for (const mod of mods) {
  const root = path.resolve(mod)
  for (const f of files(root)) {
    const relf = path.relative(root, f).split(path.sep).join('/')
    const modName = path.basename(root)
    fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return
      const at = { mod: modName, file: relf, line: i + 1 }
      // A painting prop given a literal string.
      for (const m of line.matchAll(/\b(color|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor)\s*=\s*\{?\s*["'`]([^"'`]+)["'`]/g)) {
        const v = m[2]
        if (THEME.has(v)) continue
        if (/^#|^rgb|^hsl/.test(v)) continue // the literal rule below reports it once
        const ex = exceptions.find(e => e.mod === modName && e.file === relf && (e.values ?? []).includes(v) && e.approvedBy && e.approvedOn)
        if (ex) { used.add(ex); continue }
        if (CSS_NAMES.has(v.toLowerCase())) findings.push({ ...at, rule: 'raw-color-prop', value: v, status: 'violation' })
        else findings.push({ ...at, rule: 'unknown-theme-key', value: v, status: 'violation' })
      }
      // Raw color literals anywhere in source.
      for (const m of line.matchAll(/["'`](#[0-9a-fA-F]{3,8})["'`]|\b(rgba?|hsla?)\(/g)) {
        const v = m[1] ?? m[2]
        const ex = exceptions.find(e => e.mod === modName && e.file === relf && (e.values ?? []).includes(v))
        if (ex) { used.add(ex); if (ex.approvedBy && ex.approvedOn) continue; findings.push({ ...at, rule: 'raw-color-literal', value: v, status: 'exception-pending-approval', reason: ex.reason }); continue }
        findings.push({ ...at, rule: 'raw-color-literal', value: v, status: 'violation' })
      }
    })
  }
}
const stale = exceptions.filter(e => !used.has(e) && mods.some(m => path.basename(path.resolve(m)) === e.mod))
for (const e of stale) findings.push({ mod: e.mod, file: e.file, line: 0, rule: 'stale-exception', value: (e.values ?? []).join(','), status: 'violation' })
const count = s => findings.filter(f => f.status === s).length
const summary = { mods: mods.length, themeKeys: THEME.size, violations: count('violation'), pending: count('exception-pending-approval') }
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ summary, findings }, null, 2))
console.log(JSON.stringify(summary))
const groups = {}
for (const f of findings) { const k = `${f.status} ${f.rule} ${f.mod}/${f.file}`; (groups[k] ??= []).push(`${f.line}:${f.value}`) }
for (const [k, v] of Object.entries(groups)) console.log(`${k} (${v.length}): ${v.slice(0, 6).join(' ')}${v.length > 6 ? ' ...' : ''}`)
process.exit(summary.violations || summary.pending ? 1 : 0)
