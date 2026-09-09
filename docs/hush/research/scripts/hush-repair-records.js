#!/usr/bin/env node
'use strict';
// A rate-limited run retains an ERROR stub. records/ is write-once, so a later
// --resume repairs results/ and leaves the stub behind (the runner prints
// RETAIN-SKIP and moves on). This replaces those stubs with the real runs that
// results/ now holds, the way records.js says to: delete the file by hand, then
// write the run. Every stub is copied to the backup dir before it is removed.
//
//   node repair-records.js <tag> <recordDirName> [--apply]
const fs = require('node:fs');
const path = require('node:path');
const ROOT = 'D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/hush';
const { writeRecord } = require(path.join(ROOT, 'runner/records.js'));

const [tag, batchDir] = process.argv.slice(2);
const apply = process.argv.includes('--apply');
const runsDir = path.join(ROOT, 'results', tag, 'runs');
const recDir = path.join(ROOT, 'records', batchDir);
const backup = `D:/Projects/Personal/Backups/claude-plugins/2026-08-19_hush-record-stubs/${batchDir}`;

const stubs = fs.readdirSync(recDir).filter((f) => {
  if (!f.endsWith('.json') || f === 'batch.json') return false;
  return !!JSON.parse(fs.readFileSync(path.join(recDir, f), 'utf8')).error;
});

let fixed = 0, orphan = 0;
for (const f of stubs) {
  const src = path.join(runsDir, f);
  if (!fs.existsSync(src)) { console.log(`ORPHAN  ${f} — no run in results/, left alone`); orphan++; continue; }
  const real = JSON.parse(fs.readFileSync(src, 'utf8'));
  if (real.error) { console.log(`STILL-ERR ${f} — results/ run is also an error, left alone`); orphan++; continue; }
  if (!apply) { console.log(`WOULD-FIX ${f}`); fixed++; continue; }
  fs.mkdirSync(backup, { recursive: true });
  fs.copyFileSync(path.join(recDir, f), path.join(backup, f));
  fs.chmodSync(path.join(recDir, f), 0o666);
  fs.unlinkSync(path.join(recDir, f));
  writeRecord(recDir, f.replace(/\.json$/, ''), real);
  console.log(`FIXED   ${f}`);
  fixed++;
}
console.log(`${apply ? 'repaired' : 'would repair'} ${fixed}, left alone ${orphan}, of ${stubs.length} stubs in ${batchDir}`);
