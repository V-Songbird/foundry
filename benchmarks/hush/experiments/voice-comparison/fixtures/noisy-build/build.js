#!/usr/bin/env node
'use strict';

// Fake bundler. Deterministic ~900-line output with three planted warnings.
// No randomness, no timestamps — identical output on every run.

const MODULES = [];
const dirs = ['core', 'utils', 'legacy', 'net', 'ui', 'state', 'io', 'vendor'];
for (const d of dirs) {
  for (let i = 0; i < 22; i++) MODULES.push(`src/${d}/mod_${String(i).padStart(2, '0')}.js`);
}

const out = [];
out.push('fakepack 3.11.2');
out.push('entry: src/index.js  target: node18  mode: production');
out.push('');

let compiled = 0;
for (const m of MODULES) {
  compiled++;
  out.push(`[${String(compiled).padStart(3, ' ')}/${MODULES.length}] compile ${m} ... ok (${(m.length * 7) % 90 + 10}ms)`);
  if (compiled % 8 === 0) {
    out.push('note: tree-shaking pass deferred until link stage');
    out.push('note: tree-shaking pass deferred until link stage');
    out.push('note: tree-shaking pass deferred until link stage');
  }
  if (compiled % 25 === 0) {
    out.push(`progress: ${Math.round((compiled / MODULES.length) * 100)}% — memory 412MB — cache warm`);
  }
  if (compiled === 41) out.push('WARN W1042 deprecated-api: `crypto.createCipher` used in src/legacy/adapter.js — remove before v4');
  if (compiled === 97) out.push('WARN W2213 unused-export: `formatLegacyDate` exported but never imported, in src/utils/format.js');
  if (compiled === 154) out.push('WARN W3307 circular-import: src/core/graph.js <-> src/state/tracker.js, resolution order is undefined');
}

out.push('');
out.push('link stage: 176 modules, 3 chunks');
for (let i = 0; i < 340; i++) {
  out.push(`  dedupe: vendor chunk symbol ${i % 17} folded (pass ${Math.floor(i / 17) + 1})`);
}
out.push('');
out.push('emit: dist/bundle.js  1.44 MB');
out.push('emit: dist/bundle.js.map  3.02 MB');
out.push('build finished in 41.7s with 3 warnings, 0 errors');

process.stdout.write(out.join('\n') + '\n');
