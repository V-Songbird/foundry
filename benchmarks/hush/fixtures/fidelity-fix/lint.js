'use strict';

// A small lint: no `var`, no tabs, no trailing spaces in src/.
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, 'src');
const problems = [];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
for (const f of files) {
  fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => {
    const at = `src/${f}:${i + 1}`;
    if (/\bvar\s/.test(line)) problems.push(`${at}  use const or let, not var`);
    if (/\t/.test(line)) problems.push(`${at}  tab character`);
    if (/ +$/.test(line)) problems.push(`${at}  trailing space`);
  });
}
for (const p of problems) console.log(p);
console.log(`lint: ${files.length} file(s), ${problems.length} problem(s)`);
process.exitCode = problems.length ? 1 : 0;
