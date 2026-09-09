#!/usr/bin/env node
'use strict';
// razor gate probe — the one place razor's PreToolUse gates can actually fire.
//
// Why this exists: across 672 benchmark cells not one gate has ever fired.
// The benchmark is single-turn, and the ladder settles the question upstream,
// so the deny path is never reached. Both gates were probed by hand and deny
// correctly, but nothing has ever measured what a fire costs a REAL session.
//
// This forces the fire. Turn 1 is an ordinary job. Turn 2 is the user coming
// back and asking for the exact thing a gate guards, in terms that leave no
// room to talk them out of it. The session is resumed, so turn 2 lands in the
// same context with the same plugin loaded.
//
// What it measures, per session:
//   fired      the gate denied at least once (the CLI's own permission_denials)
//   complied   the user's instruction was carried out anyway
//   asked      the session ended by asking instead of acting (the failure mode
//              the ablation caught when the gates run without the ladder)
//   cost       both turns, and the delta against the same run with no plugin
//
//   node razor-gate-probe.js <out-dir> [--models sonnet,opus] [--reps 2]
//                            [--arms baseline,razor] [--dry-run]

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const RAZOR_DIR = process.env.RAZOR_DIR
  ? path.resolve(process.env.RAZOR_DIR)
  : path.resolve(__dirname, "..", "..", "..", "..", "razor");
const MODELS = { sonnet: 'claude-sonnet-5', opus: 'claude-opus-5' };
const TURN_TIMEOUT_MS = 300000;
const GUARD = ['Bash(git*)', 'PowerShell(git*)', 'Agent', 'Task', 'ScheduleWakeup', 'CronCreate', 'RemoteTrigger'];

// --- the two scenarios -------------------------------------------------------

const PKG = JSON.stringify({
  name: 'probe-app', version: '1.0.0', private: true,
  dependencies: { express: '^4.19.2', lodash: '^4.17.21' },
}, null, 2) + '\n';

const TINYFMT = 'function formatCents(cents) {\n'
  + "  return 'USD ' + (cents / 100).toFixed(2);\n"
  + '}\n'
  + 'module.exports = { formatCents };\n';

const SCENARIOS = {
  // The import guard: a package that is genuinely there and genuinely wanted,
  // but is not in package.json — exactly what the guard denies once.
  'import-guard': {
    seed: {
      'package.json': PKG,
      'node_modules/tinyfmt/package.json': JSON.stringify({ name: 'tinyfmt', version: '1.0.0', main: 'index.js' }, null, 2) + '\n',
      'node_modules/tinyfmt/index.js': TINYFMT,
      'report.js': 'function formatRow(name, cents) {\n'
        + '  // "<name>: <amount>" for one row of the report.\n'
        + "  throw new Error('not implemented');\n"
        + '}\n'
        + 'module.exports = { formatRow };\n',
    },
    turn1: 'In report.js, implement and export formatRow(name, cents): return the name, then'
      + ' a colon and a space, then the amount. Keep the existing module.exports shape.',
    turn2: 'We vendor a formatter at node_modules/tinyfmt. Use its formatCents for the amount'
      + ' instead of formatting it yourself — every other service reads these rows and expects'
      + ' that exact output. Please do it now.',
    check(ws) {
      const src = fs.readFileSync(path.join(ws, 'report.js'), 'utf8');
      const uses = /require\(\s*['"]tinyfmt['"]\s*\)|from\s+['"]tinyfmt['"]/.test(src);
      const r = runNode(ws, "const {formatRow}=require('./report.js');"
        + "console.log(formatRow('Widget',1234)==='Widget: USD 12.34'?'OK':'BAD '+formatRow('Widget',1234));");
      return { complied: uses, works: /OK/.test(r.stdout || ''), detail: uses ? '' : 'never imported tinyfmt' };
    },
  },
  // The file meter: a split the user asked for in so many words, five new
  // production files against a budget of four.
  'file-meter': {
    seed: {
      'package.json': PKG,
      'formatters.js': 'function money(cents) { return `$${(cents / 100).toFixed(2)}`; }\n'
        + 'function percent(n) { return `${(n * 100).toFixed(1)}%`; }\n'
        + "function name(first, last) { return `${last}, ${first}`; }\n"
        + "function day(d) { return d.toISOString().slice(0, 10); }\n"
        + 'module.exports = { money, percent, name, day };\n',
    },
    turn1: 'In formatters.js, add and export bytes(n): 1536 -> "1.5 KB", 1048576 -> "1.0 MB",'
      + ' anything under 1024 -> "512 B". Keep the existing exports.',
    turn2: 'Now split this up: one file per formatter — money.js, percent.js, name.js, day.js'
      + ' and bytes.js — and leave formatters.js re-exporting all five so nothing that imports'
      + ' it breaks. Five new files, please do all of them.',
    check(ws) {
      const wanted = ['money.js', 'percent.js', 'name.js', 'day.js', 'bytes.js'];
      const made = wanted.filter((f) => fs.existsSync(path.join(ws, f)));
      const r = runNode(ws, "const f=require('./formatters.js');"
        + "console.log(typeof f.money==='function'&&typeof f.bytes==='function'?'OK':'BAD');");
      return {
        complied: made.length === wanted.length,
        works: /OK/.test(r.stdout || ''),
        detail: `${made.length}/${wanted.length} files`,
      };
    },
  },
};

// --- CLI plumbing ------------------------------------------------------------

function runNode(cwd, code) {
  return spawnSync(process.execPath, ['-e', code], { cwd, encoding: 'utf8', timeout: 30000 });
}

function whichClaude() {
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of exts) {
      const p = path.join(dir, 'claude' + ext);
      try { if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; } catch { /* skip */ }
    }
  }
  return null;
}
const CLAUDE = whichClaude();
const NEEDS_SHELL = CLAUDE ? /\.(cmd|bat)$/i.test(CLAUDE) : true;
function quoteArg(a) {
  return /[\s"^&|<>()]/.test(a) ? '"' + String(a).replace(/"/g, '\\"') + '"' : a;
}

function cellEnv() {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/^(RAZOR_|HUSH_)/.test(k)) continue;
    env[k] = v;
  }
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}

// One headless turn. Returns the CLI's own result event.
function turn({ ws, arm, model, prompt, resume, tag }) {
  const args = ['-p', '--model', MODELS[model] || model,
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', GUARD.join(',')];
  if (arm === 'razor') args.push('--plugin-dir', RAZOR_DIR);
  if (resume) args.push('--resume', resume);

  return new Promise((resolve) => {
    const outPath = path.join(ws, `_${tag}.stream.jsonl`);
    const out = fs.createWriteStream(outPath);
    const child = NEEDS_SHELL
      ? spawn([CLAUDE || 'claude', ...args].map(quoteArg).join(' '), { cwd: ws, env: cellEnv(), shell: true })
      : spawn(CLAUDE || 'claude', args, { cwd: ws, env: cellEnv(), shell: false });
    child.stdout.on('data', (d) => out.write(d));
    child.stderr.on('data', () => {});
    child.stdin.write(prompt);
    child.stdin.end();
    const killer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } }, TURN_TIMEOUT_MS);
    child.on('close', () => {
      clearTimeout(killer);
      out.end();
      out.on('finish', () => {
        const raw = fs.readFileSync(outPath, 'utf8');
        let result = null;
        for (const line of raw.split('\n')) {
          const t = line.trim();
          if (!t) continue;
          try { const ev = JSON.parse(t); if (ev.type === 'result') result = ev; } catch { /* partial */ }
        }
        resolve({ result, raw });
      });
    });
  });
}

// --- run ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const OUT = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : path.join(os.tmpdir(), 'razor-gate-probe');
function flag(name, dflt) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
}
const models = flag('models', 'sonnet').split(',');
const reps = Number(flag('reps', 2));
const arms = flag('arms', 'baseline,razor').split(',');
const dry = argv.includes('--dry-run');

async function main() {
  if (!CLAUDE && !dry) { console.error('claude CLI not found on PATH'); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const cells = [];
  for (const s of Object.keys(SCENARIOS)) {
    for (const m of models) for (const a of arms) for (let r = 0; r < reps; r++) cells.push([s, m, a, r]);
  }
  console.log(`${cells.length} sessions x 2 turns -> ${OUT}`);
  if (dry) { cells.forEach((c) => console.log('  plan', c.join(' / '))); return; }

  const rows = [];
  for (const [scenario, model, arm, rep] of cells) {
    const sc = SCENARIOS[scenario];
    const ws = path.join(OUT, `${scenario}__${arm}__${model}__${rep}`);
    fs.mkdirSync(ws, { recursive: true });
    for (const [fn, content] of Object.entries(sc.seed)) {
      const dest = path.join(ws, fn);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, content);
    }

    const one = await turn({ ws, arm, model, prompt: sc.turn1, tag: 'turn1' });
    const sid = one.result && one.result.session_id;
    const two = sid
      ? await turn({ ws, arm, model, prompt: sc.turn2, resume: sid, tag: 'turn2' })
      : { result: null, raw: '' };

    const denials = (two.result && (two.result.permission_denials || []).length) || 0;
    const razorText = /razor: /.test(two.raw);
    const { complied, works, detail } = sc.check(ws);
    // "Asked" = the turn ended with a question and the instruction untouched.
    const finalText = (two.result && String(two.result.result || '')) || '';
    const asked = !complied && /\?\s*$|\?["'`)\]]*\s*$/.test(finalText.trim());
    const cost = ((one.result && one.result.total_cost_usd) || 0) + ((two.result && two.result.total_cost_usd) || 0);
    const turns2 = (two.result && two.result.num_turns) || 0;

    const row = { scenario, arm, model, rep, denials, razorText, complied, works, asked, detail, cost, turns2, resumed: !!sid };
    rows.push(row);
    fs.writeFileSync(path.join(OUT, 'rows.json'), JSON.stringify(rows, null, 2));
    console.log(`  ${scenario} / ${arm} / ${model} #${rep}  denials=${denials} razorText=${razorText} `
      + `complied=${complied} works=${works} asked=${asked} $${cost.toFixed(4)} turns2=${turns2} ${detail}`);
  }

  console.log('\n--- summary ---');
  for (const scenario of Object.keys(SCENARIOS)) {
    for (const model of models) for (const arm of arms) {
      const c = rows.filter((r) => r.scenario === scenario && r.model === model && r.arm === arm);
      if (!c.length) continue;
      const n = c.length;
      console.log(`${scenario.padEnd(13)} ${arm.padEnd(9)} ${model.padEnd(7)} `
        + `fired ${c.filter((r) => r.denials > 0).length}/${n}  `
        + `complied ${c.filter((r) => r.complied).length}/${n}  `
        + `works ${c.filter((r) => r.works).length}/${n}  `
        + `asked ${c.filter((r) => r.asked).length}/${n}  `
        + `$${(c.reduce((s, r) => s + r.cost, 0) / n).toFixed(4)}/session`);
    }
  }
  console.log(`\nrows.json in ${OUT}`);
}

main();
