'use strict';
// Build a hush variant plugin dir whose OUTPUT STYLE NAME is itself the thing
// under test. mkarm.js rewrites `name:` to the capitalized arm name, which makes
// it useless for probing the name channel — the harness interpolates the style
// name into a per-turn system reminder ("<name> output style is active. …",
// cap 256 chars, verified live 2026-08-29), so the name is a live instruction
// slot and mkarm.js was silently overwriting it on every arm it ever built.
//
//   node mknamearm.js <armName> <edits.json|-> "<style name>"
//
// edits.json follows mkarm.js's format; pass "-" for no edits.
const fs = require('node:fs'), path = require('node:path');
const SRC = 'D:/Projects/Personal/SoftwareDevelopment/claude-plugins/hush';
const OUT_ROOT = 'X:/Temp/hush-arms';
const [arm, editsFile, styleName] = process.argv.slice(2);
if (!arm || !editsFile || !styleName) throw new Error('usage: mknamearm.js <arm> <edits.json|-> "<style name>"');
if (styleName.length + arm.length + 1 > 256) throw new Error(`plugin:name is ${styleName.length + arm.length + 1} chars, over the 256 cap that suppresses the per-turn reminder`);

const dest = path.join(OUT_ROOT, arm);
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(SRC, dest, { recursive: true });

const man = path.join(dest, '.claude-plugin/plugin.json');
const m = JSON.parse(fs.readFileSync(man, 'utf8'));
m.name = arm;
fs.writeFileSync(man, JSON.stringify(m, null, 2) + '\n');

if (editsFile !== '-') {
  for (const e of JSON.parse(fs.readFileSync(editsFile, 'utf8'))) {
    const f = path.join(dest, e.file || 'output-styles/hush.md');
    const s = fs.readFileSync(f, 'utf8');
    const n = s.split(e.find).length - 1;
    if (n !== 1) throw new Error(`${arm}: anchor matched ${n}x in ${e.file || 'style'}: ${JSON.stringify(e.find.slice(0, 60))}`);
    fs.writeFileSync(f, s.replace(e.find, e.replace));
  }
}

const stylePath = path.join(dest, 'output-styles/hush.md');
const s = fs.readFileSync(stylePath, 'utf8').replace(/^name: Hush$/m, `name: ${styleName}`);
fs.rmSync(stylePath);
fs.writeFileSync(path.join(dest, `output-styles/${arm}.md`), s);

const settings = path.join(OUT_ROOT, `settings-${arm}.json`);
fs.writeFileSync(settings, JSON.stringify({ outputStyle: `${arm}:${styleName}` }, null, 2) + '\n');
console.log(`${arm}  ->  ${dest}   style "${arm}:${styleName}"  (${arm.length + styleName.length + 1} chars)`);
