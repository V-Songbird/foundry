'use strict';
// Build a hush variant plugin dir for one benchmark arm.
// Unique plugin name + unique style name: an arm whose plugin name collides
// with a globally-enabled plugin silently fails to resolve its output style.
//   node mkarm.js <armName> <edits.json>
// edits.json: [{ "file": "hooks/x.js", "find": "...", "replace": "..." }, ...]
// "file" defaults to output-styles/hush.md. Every anchor must match exactly once.
const fs = require('node:fs'), path = require('node:path');
const SRC = 'D:/Projects/Personal/SoftwareDevelopment/claude-plugins/hush';
const OUT_ROOT = 'X:/Temp/hush-arms';
const [arm, editsFile] = process.argv.slice(2);
const dest = path.join(OUT_ROOT, arm);

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(SRC, dest, { recursive: true });

const cap = arm[0].toUpperCase() + arm.slice(1);
const man = path.join(dest, '.claude-plugin/plugin.json');
const m = JSON.parse(fs.readFileSync(man, 'utf8'));
m.name = arm;
fs.writeFileSync(man, JSON.stringify(m, null, 2) + '\n');

for (const e of JSON.parse(fs.readFileSync(editsFile, 'utf8'))) {
  const f = path.join(dest, e.file || 'output-styles/hush.md');
  let s = fs.readFileSync(f, 'utf8');
  const n = s.split(e.find).length - 1;
  if (n !== 1) throw new Error(`${arm}: anchor matched ${n}x in ${e.file || 'style'}: ${JSON.stringify(e.find.slice(0, 60))}`);
  fs.writeFileSync(f, s.replace(e.find, e.replace));
}

const stylePath = path.join(dest, 'output-styles/hush.md');
let s = fs.readFileSync(stylePath, 'utf8').replace(/^name: Hush$/m, `name: ${cap}`);
fs.rmSync(stylePath);
fs.writeFileSync(path.join(dest, `output-styles/${arm}.md`), s);

const settings = path.join(OUT_ROOT, `settings-${arm}.json`);
fs.writeFileSync(settings, JSON.stringify({ outputStyle: `${arm}:${cap}` }, null, 2) + '\n');
console.log(`${arm}  ->  ${dest}   style ${arm}:${cap}`);
