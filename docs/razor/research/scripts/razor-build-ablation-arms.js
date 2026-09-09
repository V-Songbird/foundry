'use strict';
// Build the three cut-down razor builds the ablation needs.
//
//   guidance   the ladder only. The model reads it; no gate ever fires.
//   deps       the package gates only (dep, manifest, import). No ladder.
//   structure  the file meter plus the end-of-session ledger. No ladder.
//
// Each build is a copy of the real plugin with hooks/hooks.json trimmed and,
// where two mechanisms share one entry point, that entry point's gate list
// trimmed with it. Nothing else is touched, so an arm differs from the full
// product only in which of razor's own mechanisms can fire.
//
//   node build-arms.js <razor-dir> <out-dir>

const fs = require('node:fs');
const path = require('node:path');

const [, , SRC, OUT] = process.argv;
if (!SRC || !OUT) { console.error('usage: node build-arms.js <razor-dir> <out-dir>'); process.exit(1); }

const SKIP = new Set(['.git', 'benchmarks', 'tests', 'assets', 'docs']);

function copyPlugin(dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(SRC, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(SRC, src);
      if (!rel) return true;
      return !SKIP.has(rel.split(path.sep)[0]);
    },
  });
}

function trimHooks(dest, keep) {
  const p = path.join(dest, 'hooks', 'hooks.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const event of Object.keys(j.hooks)) {
    if (!keep.includes(event)) delete j.hooks[event];
  }
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  return Object.keys(j.hooks);
}

function setGates(dest, gates) {
  const p = path.join(dest, 'hooks', 'pre-tool-use.js');
  const s = fs.readFileSync(p, 'utf8');
  const from = "const GATES = [\n  require('./dep-guard'),\n  require('./manifest-guard'),\n  require('./import-guard'),\n  require('./file-meter'),\n];";
  if (!s.includes(from)) throw new Error('GATES block not found in pre-tool-use.js');
  const to = 'const GATES = [\n' + gates.map((g) => `  require('./${g}'),`).join('\n') + '\n];';
  fs.writeFileSync(p, s.replace(from, to));
}

function muteLadder(dest) {
  const p = path.join(dest, 'hooks', 'session-start.js');
  const s = fs.readFileSync(p, 'utf8');
  const from = "  emitContext('SessionStart', RULESET);\n";
  if (!s.includes(from)) throw new Error('injection line not found in session-start.js');
  // The ledger baseline is written here too, so the file stays — only the
  // injection goes, leaving the structural half intact.
  fs.writeFileSync(p, s.replace(from, '  // ablation: ladder muted, ledger baseline kept\n'));
}

const builds = {
  guidance: (d) => {
    const kept = trimHooks(d, ['SessionStart', 'SubagentStart', 'UserPromptSubmit']);
    return kept;
  },
  deps: (d) => {
    const kept = trimHooks(d, ['PreToolUse', 'UserPromptSubmit']);
    setGates(d, ['dep-guard', 'manifest-guard', 'import-guard']);
    return kept;
  },
  structure: (d) => {
    const kept = trimHooks(d, ['SessionStart', 'PreToolUse', 'Stop', 'UserPromptSubmit']);
    setGates(d, ['file-meter']);
    muteLadder(d);
    return kept;
  },
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, apply] of Object.entries(builds)) {
  const dest = path.join(OUT, `razor-${name}`);
  copyPlugin(dest);
  const kept = apply(dest);
  const ok = fs.existsSync(path.join(dest, '.claude-plugin', 'plugin.json'));
  console.log(`${ok ? 'ok ' : 'XX '} ${name.padEnd(10)} events: ${kept.join(', ')}`);
  console.log(`   ${dest}`);
}
