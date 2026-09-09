#!/usr/bin/env node
'use strict';
// razor judge probe — is razor's code actually EASIER TO REVIEW, or only shorter?
//
// Why this exists: razor writes ~38% less production code on Opus. That is
// measured. "Easier to review" is the claim we keep making off the back of it,
// and it has never been tested. Shorter and easier-to-review are not the same
// thing — dense one-liners are shorter AND harder, explicit defensive code is
// longer AND easier. This probe separates them.
//
// It runs NO new coding sessions. The answers already exist on disk from two
// finished benchmark runs, so the only spend is the judge's own tokens.
//
// Two instruments:
//
//   (a) structural — free, offline, immune to judge bias. Per session, over the
//       files that session's agent actually authored: exported symbols, function
//       and class declarations, distinct files, comment vs code lines, maximum
//       nesting depth, branch count and distinct identifiers. Every count is
//       ALSO reported per 100 lines of code, because a previous pass found
//       max-nesting ~74% correlated with diff length — a nesting "win" can be
//       the length win wearing a hat. The probe prints that correlation from
//       this corpus so the reader can see the trap rather than take it on faith.
//
//   (b) judged — an order-balanced blind pairwise judge (~$3). Same task, same
//       model, same rep: vanilla Claude Code vs razor, presented anonymised as
//       "Implementation A" and "Implementation B" under the original task
//       prompt. Every pair is judged TWICE with the positions swapped, so
//       position bias cancels; a pair counts only if both orderings agree, and
//       the disagreement rate is reported on its own because a high one means
//       the judge is guessing.
//
// WIN  = razor preferred in >= 60% of order-consistent pairs AND lower median
//        nesting and branch count PER LINE.
// LOSE = the judge prefers vanilla. That is an entirely plausible outcome and
//        the prompt is deliberately written so it is as easy to reach as a win.
//
// An LLM judge is not a human reviewer. It is a cheap, order-balanced, blinded
// proxy for one, and nothing more.
//
//   node razor-judge-probe.js [out-dir] [--selftest] [--dry-run]
//        [--runs <dir,dir>] [--reps 3] [--pairs N] [--models sonnet,opus]
//        [--arms baseline,razor] [--judge-model sonnet] [--seed N] [--max-usd N]
//
//   --selftest    proves every scorer against hand-written good/bad references
//                 with zero API spend. Run it before you spend anything.
//   --dry-run     prints the full cell list, the grid and a cost estimate, and
//                 exits without spawning `claude`.
//   --pairs 0     structural half only, no spend at all.
//   --max-usd N   abort the run the moment the running total reaches N.
//
// Spend safety: one call per cell and NO retry anywhere (a retry bills the
// killed attempt and its replacement), a running total after every cell, and
// judge-rows.json rewritten after every cell so a Ctrl-C keeps what it paid for.
//
// Outputs: sessions.json (every replayed session, per-session), judge-rows.json
// (every judge call), pairs.json (folded pairs), dropped-pairs.json (candidate
// pairs that could NOT be judged, with the reason — a lopsided drop count is
// itself a result and is never silently swallowed).

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// ---------------------------------------------------------------------------
// constants
// ---------------------------------------------------------------------------

// Deliberately OUTSIDE os.tmpdir() (X:\Temp here) and outside every git tree.
// razor/hooks/file-meter.js:50 exempts anything under the temp dir as scratch,
// so every benchmark that ever ran there could not fire the new-file check.
const DEFAULT_OUT = 'D:/razor-probe-runs/judge';

const TASKS_JS = path.resolve(__dirname, "..", "..", "..", "..", "razor", "benchmarks", "runner", "tasks.js");

const DEFAULT_RUNS = [
  'X:/Temp/razor-bench/20260819-003203',
  'X:/Temp/razor-bench/20260820-235147',
];

// Sonnet and Opus only — Haiku is retired as a test model by house rule.
const MODELS = { sonnet: 'claude-sonnet-5', opus: 'claude-opus-5' };

// The third arm is a third-party rival. Its directory name is banned in every
// output string; it is `rival` everywhere the probe speaks.
const RIVAL_DIR = 'pony' + 'tail';
const ARM_LABEL = { baseline: 'baseline', razor: 'razor', [RIVAL_DIR]: 'rival' };

// No code is produced by these two, so there is nothing to review.
const SKIP_TASKS = new Set(['oh-question', 'oh-typo']);

const SRC_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx']);
const MAX_IMPL_CHARS = 12000;
const TURN_TIMEOUT_MS = 180000;

// The judge reads text. It touches nothing.
const NO_TOOLS = [
  'Bash', 'PowerShell', 'Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit',
  'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'Agent', 'TodoWrite',
  'SlashCommand', 'Skill', 'BashOutput', 'KillShell', 'ListMcpResources',
  'ReadMcpResource', 'SendMessage', 'ListAgents', 'ToolSearch', 'Artifact',
  'SendUserFile', 'Monitor', 'ScheduleWakeup', 'CronCreate', 'RemoteTrigger',
];

// claude-sonnet-5 list price, $/MTok. Used ONLY for the --dry-run estimate;
// every reported number comes from the CLI's own total_cost_usd.
const PRICE_IN = 2.00;
const PRICE_OUT = 10.00;
// Claude Code's headless system prompt + tool schemas, charged on every call.
// Measured, not guessed: a fresh no-plugin headless session in this corpus
// created 8,244 cache tokens before it read a single byte of the task. After
// the first call that prefix is a cache READ, which bills at a fraction, so a
// full-price estimate at this size is an upper bound.
const OVERHEAD_TOKENS = 8500;
const EST_OUT_TOKENS = 140; // REASON line + VERDICT line
// What one comparable single-turn, no-tool headless call actually cost in this
// corpus, cold. Printed as the empirical ceiling next to the token math.
const EMPIRICAL_COLD_CALL_USD = 0.073;

const JS_KEYWORDS = new Set(('await break case catch class const continue debugger default delete do else '
  + 'enum export extends false finally for function if implements import in instanceof interface let new '
  + 'null package private protected public return static super switch this throw true try typeof var void '
  + 'while with yield async of get set from as').split(' '));

// A `/` right after one of these starts a regex literal, not a division.
const REGEX_WORDS = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void',
  'instanceof', 'new', 'do', 'else', 'yield', 'await', 'throw']);

// ---------------------------------------------------------------------------
// (a) structural instrument
// ---------------------------------------------------------------------------

// Replace comments, string bodies and regex literals with inert placeholders so
// that branch/identifier/nesting counts see code and nothing else. Line breaks
// are preserved so line numbers and leading indentation still line up.
// Returns { code, commentLines } where commentLines is how many source lines
// carried comment text.
function stripCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let line = 0;
  const commented = new Set();
  let prevChar = '';
  let prevWord = '';

  const regexPosition = () => {
    if (prevChar === '') return true;
    if (/[A-Za-z0-9_$)\]]/.test(prevChar)) return REGEX_WORDS.has(prevWord);
    return true;
  };

  while (i < n) {
    const c = src[i];
    const d = src[i + 1];

    if (c === '/' && d === '/') {
      commented.add(line);
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && d === '*') {
      commented.add(line);
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') { out += '\n'; line++; commented.add(line); }
        i++;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') { i++; if (src[i] === '\n') { out += '\n'; line++; } i++; continue; }
        if (src[i] === '\n') { out += '\n'; line++; }
        i++;
      }
      i++;
      out += '""';
      prevChar = '"'; prevWord = '';
      continue;
    }
    if (c === '/' && regexPosition()) {
      i++;
      let inClass = false;
      while (i < n && src[i] !== '\n') {
        const e = src[i];
        if (e === '\\') { i += 2; continue; }
        if (e === '[') inClass = true;
        else if (e === ']') inClass = false;
        else if (e === '/' && !inClass) { i++; break; }
        i++;
      }
      while (i < n && /[gimsuyvd]/.test(src[i])) i++;
      out += '0';
      prevChar = '0'; prevWord = '';
      continue;
    }

    out += c;
    if (c === '\n') { line++; prevChar = ''; prevWord = ''; }
    else if (/\S/.test(c)) {
      if (/[A-Za-z0-9_$]/.test(c)) prevWord = /[A-Za-z0-9_$]/.test(prevChar) ? prevWord + c : c;
      else prevWord = '';
      prevChar = c;
    }
    i++;
  }
  return { code: out, commentLines: commented.size };
}

function countAll(re, s) {
  const m = s.match(re);
  return m ? m.length : 0;
}

// Exported symbols: CommonJS and ESM, counted as distinct names where the
// source names them and as 1 where it does not.
function countExports(code) {
  let total = 0;
  let objForms = 0;
  for (const m of code.matchAll(/module\.exports\s*=\s*\{([^}]*)\}/g)) {
    objForms++;
    total += m[1].split(',').map((s) => s.trim()).filter(Boolean).length;
  }
  // Every other `module.exports = <something>` counts as one export.
  total += Math.max(0, countAll(/module\.exports\s*=/g, code) - objForms);
  total += countAll(/(?:module\.)?exports\.[A-Za-z_$][\w$]*\s*=/g, code);
  total += countAll(/\bexport\s+(?:default|async\s+function|function|const|let|var|class)\b/g, code);
  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    total += m[1].split(',').map((s) => s.trim()).filter(Boolean).length;
  }
  return total;
}

function countBranches(code) {
  return countAll(/\bif\b/g, code)
    + countAll(/\belse\b/g, code)
    + countAll(/\bfor\b/g, code)
    + countAll(/\bwhile\b/g, code)
    + countAll(/\bcase\b/g, code)
    + countAll(/\bcatch\b/g, code)
    + countAll(/(?<![?.])\?(?![.?])/g, code) // ternary, not ?. and not ??
    + countAll(/&&/g, code)
    + countAll(/\|\|/g, code);
}

function identifiers(code) {
  const set = new Set();
  for (const m of code.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (!JS_KEYWORDS.has(m[0])) set.add(m[0]);
  }
  return set;
}

// Max nesting via leading-whitespace levels, on the STRIPPED source so that
// comment-only lines cannot contribute. The indent unit is detected per file
// (2-space and 4-space files must not score differently for the same shape).
// This is a proxy: a wrapped continuation line reads as one level deeper than
// it is. The error is the same for both arms.
function maxNesting(code) {
  const lines = code.replace(/\t/g, '  ').split('\n').filter((l) => l.trim() !== '');
  const indents = lines.map((l) => l.length - l.trimStart().length);
  const positives = indents.filter((x) => x > 0);
  const unit = positives.length ? Math.min(...positives) : 2;
  return indents.reduce((mx, x) => Math.max(mx, Math.floor(x / unit)), 0);
}

// One session's structural profile, over the files its agent authored.
function structure(files) {
  const src = files.filter((f) => SRC_EXT.has(path.extname(f.name).toLowerCase()));
  let codeLines = 0; let commentLines = 0; let exportsN = 0;
  let functions = 0; let classes = 0; let branches = 0; let nest = 0;
  const ids = new Set();
  for (const f of src) {
    const { code, commentLines: cl } = stripCode(f.text);
    commentLines += cl;
    codeLines += code.split('\n').filter((l) => l.trim() !== '').length;
    exportsN += countExports(code);
    functions += countAll(/\bfunction\b/g, code) + countAll(/=>/g, code);
    classes += countAll(/\bclass\s+[A-Za-z_$]/g, code);
    branches += countBranches(code);
    nest = Math.max(nest, maxNesting(code));
    for (const id of identifiers(code)) ids.add(id);
  }
  return {
    files: src.length,
    loc: codeLines,
    commentLines,
    exports: exportsN,
    functions,
    classes,
    branches,
    maxNest: nest,
    identifiers: ids.size,
  };
}

// ---------------------------------------------------------------------------
// session discovery
// ---------------------------------------------------------------------------

function walk(dir, base, acc) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name.startsWith('_') || e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) walk(full, rel, acc);
    else acc.push({ rel, full });
  }
  return acc;
}

// The files this session's agent actually wrote: everything that is not part of
// the task's seed, plus any seeded file whose bytes changed. package.json is
// included only when the agent changed it (a changed manifest is squarely a
// review concern) but is excluded from the code metrics by structure().
function agentFiles(dir, seed) {
  const out = [];
  for (const f of walk(dir, '', [])) {
    const ext = path.extname(f.rel).toLowerCase();
    if (!SRC_EXT.has(ext) && f.rel !== 'package.json') continue;
    let text;
    try { text = fs.readFileSync(f.full, 'utf8'); } catch { continue; }
    if (Object.prototype.hasOwnProperty.call(seed, f.rel) && seed[f.rel] === text) continue;
    out.push({ name: path.basename(f.rel), text });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// The archived result event from the original benchmark session — free, and it
// carries cost / num_turns / wall ms / permission_denials without re-running
// anything.
function archived(dir) {
  let j = {};
  try { j = JSON.parse(fs.readFileSync(path.join(dir, '_claude.json'), 'utf8')); } catch { /* absent */ }
  let razorText = false;
  try { razorText = /razor: /.test(fs.readFileSync(path.join(dir, '_claude.stream.jsonl'), 'utf8')); }
  catch { /* absent */ }
  return {
    cost: j.total_cost_usd || 0,
    numTurns: j.num_turns || 0,
    wallMs: j.duration_ms || 0,
    denials: Array.isArray(j.permission_denials) ? j.permission_denials.length : 0,
    razorText,
  };
}

function collectSessions(runs, tasks) {
  const out = [];
  for (const root of runs) {
    const runLabel = path.basename(root);
    let names = [];
    try { names = fs.readdirSync(root); } catch { continue; }
    for (const name of names) {
      const parts = name.split('__');
      if (parts.length !== 4) continue;
      const [task, armDir, model, rep] = parts;
      if (!tasks[task] || SKIP_TASKS.has(task)) continue;
      if (!ARM_LABEL[armDir] || !MODELS[model]) continue;
      const dir = path.join(root, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      const files = agentFiles(dir, tasks[task].seed || {});
      out.push({
        run: runLabel, task, arm: ARM_LABEL[armDir], model, rep: Number(rep),
        repKey: runLabel + ':' + rep, dir, files,
        struct: structure(files), ...archived(dir),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// (b) judge instrument
// ---------------------------------------------------------------------------

// Written so it is exactly as comfortable choosing the longer implementation as
// the shorter one. No mention of size, leanness, minimalism or dependencies.
function judgePrompt(taskPrompt, implA, implB) {
  return 'Two developers were each given the same task, independently, and each wrote'
    + ' their own implementation. You are about to review one of them.\n\n'
    + '=== THE TASK THEY WERE BOTH GIVEN ===\n' + taskPrompt + '\n\n'
    + '=== IMPLEMENTATION A ===\n' + implA + '\n\n'
    + '=== IMPLEMENTATION B ===\n' + implB + '\n\n'
    + '=== YOUR QUESTION ===\n'
    + 'Which of these would you rather be handed to review, and what would you have to'
    + ' check to believe it is correct?\n\n'
    + 'Judge review burden only. Length is neither a virtue nor a fault here: a longer'
    + ' implementation can be easier to review because every case is spelled out, and a'
    + ' shorter one can be harder because a lot is happening per line. Either can be the'
    + ' better answer. Both may be correct, or neither. Pick one — no ties.\n\n'
    + 'Reply with exactly two lines and nothing else:\n'
    + 'REASON: <one sentence naming what you would have to check to believe your choice is correct>\n'
    + 'VERDICT: A\n'
    + '(or VERDICT: B)\n';
}

// Returns { text, truncated }. `truncated` matters: the longer arm is the one
// that gets cut, the cut leaves a visible marker, and a marker that appears on
// one side systematically is both a blinding break and a handicap. The run
// counts truncations per arm and refuses to stay quiet about them.
function renderImpl(files) {
  if (!files.length) return { text: '(no files)', truncated: false };
  let s = files.map((f) => '--- ' + f.name + ' ---\n' + f.text.replace(/\s+$/, '')).join('\n\n');
  if (s.length > MAX_IMPL_CHARS) return { text: s.slice(0, MAX_IMPL_CHARS) + '\n... [truncated]', truncated: true };
  return { text: s, truncated: false };
}

// Nothing that names an arm, a run directory or a filesystem path may reach the
// judge. Returns { text, leaks } — leaks is what had to be scrubbed.
function scrub(text, runs) {
  const banned = ['razor', 'baseline', RIVAL_DIR, 'rival', 'razor-bench', ...runs];
  const leaks = [];
  let out = text;
  for (const b of banned) {
    const re = new RegExp(b.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'gi');
    if (re.test(out)) { leaks.push(b); out = out.replace(re, 'REDACTED'); }
  }
  return { text: out, leaks };
}

// Strict verdict parse. Anything that is not a final A or B is a null verdict,
// which is reported rather than guessed at.
function parseVerdict(text) {
  const s = String(text || '');
  let v = null;
  for (const m of s.matchAll(/^\s*VERDICT\s*:\s*([AB])\s*$/gim)) v = m[1].toUpperCase();
  if (!v) {
    for (const m of s.matchAll(/VERDICT\s*:\s*([AB])\b/gi)) v = m[1].toUpperCase();
  }
  const r = s.match(/REASON\s*:\s*(.+)/i);
  return { verdict: v, reason: r ? r[1].trim().slice(0, 300) : '' };
}

// Fold the two orderings of one pair into a single arm-level outcome.
// `first` is the verdict when razor sat in slot A; `second` when razor sat in
// slot B. They agree only if both point at the same arm.
// `armB` is whichever arm ordering 0 put in slot A (razor by default); `armA` is
// the other one. Taking both names as arguments rather than hard-coding them is
// not decoration: with `--arms baseline,rival` a hard-coded 'razor' would never
// equal armB, so every consistent pair would fold to a non-existent arm and the
// summary would print 0% with a straight face.
function foldPair(first, second, armA, armB) {
  // `unparsed` is kept separate from `disagreed` on purpose: a pair the judge
  // answered inconsistently means the judge is guessing, a pair where a call
  // failed means the harness broke. Folding both into one "disagreement rate"
  // would let an outage masquerade as judge noise, or the reverse.
  if (!first.verdict || !second.verdict) {
    return { winner: null, consistent: false, unparsed: true, picks: [], reason: 'unparsed' };
  }
  const a = first.verdict === 'A' ? armB : armA;
  const b = second.verdict === 'B' ? armB : armA;
  return { winner: a === b ? a : null, consistent: a === b, unparsed: false, picks: [a, b] };
}

// Assemble one judge cell. The task text and each implementation are scrubbed
// SEPARATELY so that a redaction landing on only one side is visible as such —
// a scrub is a mutilation, and a mutilation of one arm only is a thumb on the
// scale, not a safety measure.
function buildCell(taskPrompt, slotAFiles, slotBFiles, runs) {
  const A = renderImpl(slotAFiles);
  const B = renderImpl(slotBFiles);
  const sp = scrub(taskPrompt, runs);
  const sa = scrub(A.text, runs);
  const sb = scrub(B.text, runs);
  return {
    prompt: judgePrompt(sp.text, sa.text, sb.text),
    leaks: { task: sp.leaks, slotA: sa.leaks, slotB: sb.leaks },
    truncated: { slotA: A.truncated, slotB: B.truncated },
  };
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

function median(xs) {
  const s = xs.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx; const dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

// mulberry32 — small, seeded, replayable.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// CLI plumbing (same shape as razor-gate-probe.js)
// ---------------------------------------------------------------------------

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

// One judge call. No plugin dir, no tools, an empty scratch cwd.
function judgeTurn({ ws, model, prompt, streamPath }) {
  const args = ['-p', '--model', model,
    '--permission-mode', 'bypassPermissions',
    '--output-format', 'stream-json', '--verbose',
    '--setting-sources', 'project,local', '--strict-mcp-config',
    '--disallowedTools', NO_TOOLS.join(',')];
  const t0 = Date.now();
  // One cell is spawned exactly once. There is deliberately NO retry anywhere in
  // this file: a retry on a timeout would bill the killed call and its
  // replacement, and a silent double-bill is worse than a null verdict.
  return new Promise((resolve) => {
    let settled = false;
    const done = (extra) => {
      if (settled) return;
      settled = true;
      resolve({ result: null, raw: '', wallMs: Date.now() - t0, ...extra });
    };
    let out;
    let child;
    try {
      out = fs.createWriteStream(streamPath);
      child = NEEDS_SHELL
        ? spawn([CLAUDE || 'claude', ...args].map(quoteArg).join(' '), { cwd: ws, env: cellEnv(), shell: true })
        : spawn(CLAUDE || 'claude', args, { cwd: ws, env: cellEnv(), shell: false });
    } catch (e) { done({ error: 'spawn: ' + e.message }); return; }

    let timedOut = false;
    const killer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch { /* gone */ }
    }, TURN_TIMEOUT_MS);

    // Without this the first spawn failure is an unhandled 'error' event and the
    // whole run dies mid-queue.
    child.on('error', (e) => { clearTimeout(killer); done({ error: 'child: ' + e.message }); });
    child.stdout.on('data', (d) => { try { out.write(d); } catch { /* closed */ } });
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});
    try { child.stdin.write(prompt); child.stdin.end(); } catch { /* child already gone */ }

    child.on('close', () => {
      clearTimeout(killer);
      out.end();
      // A throw inside this handler used to leave the promise pending forever,
      // which hangs the entire queue with no output and no way to tell why.
      const finish = () => {
        if (settled) return;
        let raw = '';
        try { raw = fs.readFileSync(streamPath, 'utf8'); } catch { /* nothing written */ }
        let result = null;
        for (const line of raw.split('\n')) {
          const t = line.trim();
          if (!t) continue;
          try { const ev = JSON.parse(t); if (ev.type === 'result') result = ev; } catch { /* partial */ }
        }
        settled = true;
        resolve({ result, raw, wallMs: Date.now() - t0, error: timedOut ? 'timeout' : (result ? '' : 'no result event') });
      };
      out.on('finish', finish);
      out.on('error', finish);
    });
  });
}

// ---------------------------------------------------------------------------
// selftest — every instrument, zero API spend
// ---------------------------------------------------------------------------

const GOOD_IMPL = [
  'function slugify(title) {',
  '  return String(title)',
  '    .toLowerCase()',
  '    .replace(/[^a-z0-9]+/g, "-")',
  '    .replace(/^-|-$/g, "");',
  '}',
  'module.exports = { slugify };',
  '',
].join('\n');

const BAD_IMPL = [
  '// A slug builder.',
  '/* It handles',
  '   several cases. */',
  'class SlugOptions {',
  '  constructor(sep) {',
  '    this.sep = sep;',
  '  }',
  '}',
  'function slugify(title, options) {',
  '  const opts = options || new SlugOptions("-");',
  '  if (title === null || title === undefined) {',
  '    if (opts.strictMode) {',
  '      for (const guard of []) {',
  '        while (guard) {',
  '          throw new Error("bad");',
  '        }',
  '      }',
  '    }',
  '    return "";',
  '  }',
  '  let acc = "";',
  '  for (const chunk of String(title).split(" ")) {',
  '    const cleaned = chunk ? chunk.toLowerCase() : "";',
  '    acc = acc && cleaned ? acc + opts.sep + cleaned : acc + cleaned;',
  '  }',
  '  return acc;',
  '}',
  'const trim = (s) => s.trim();',
  'function slugifyAll(list) { return list.map(slugify).map(trim); }',
  'module.exports = { slugify, slugifyAll, SlugOptions };',
  '',
].join('\n');

function assert(cond, msg) {
  if (!cond) { console.error('SELFTEST FAILED: ' + msg); process.exitCode = 1; return false; }
  return true;
}

function selftest(out) {
  let ok = true;
  const check = (c, m) => { ok = assert(c, m) && ok; };

  // 1. stripCode — comments out, string bodies out, regex literals not mistaken
  //    for comments, line count preserved.
  const tricky = [
    'const re = /a\\/\\/b/;   // trailing comment',
    'const s = "// not a comment";',
    '/* block',
    '   spans */ const kept = 1;',
    'const div = total / count / 2;',
  ].join('\n');
  const st = stripCode(tricky);
  check(!/trailing comment/.test(st.code), 'stripCode left a line comment behind');
  check(!/not a comment/.test(st.code), 'stripCode left a string body behind');
  check(!/spans/.test(st.code), 'stripCode left a block comment behind');
  check(/kept/.test(st.code), 'stripCode ate code after a block comment');
  check(/div/.test(st.code) && /total/.test(st.code) && /count/.test(st.code),
    'stripCode mistook division for a regex literal and ate the line');
  check(st.code.split('\n').length === tricky.split('\n').length, 'stripCode changed the line count');
  check(st.commentLines === 3, 'stripCode counted ' + st.commentLines + ' comment lines, expected 3');

  // 2. structure — the hand-written GOOD answer must beat the hand-written BAD
  //    one on every burden metric the claim rests on.
  const g = structure([{ name: 'slug.js', text: GOOD_IMPL }]);
  const b = structure([{ name: 'slug.js', text: BAD_IMPL }]);
  check(g.loc > 0 && b.loc > g.loc, 'structure: BAD should have more code lines');
  check(b.maxNest > g.maxNest, `structure: nesting ${b.maxNest} !> ${g.maxNest}`);
  check(b.branches > g.branches, `structure: branches ${b.branches} !> ${g.branches}`);
  check(b.exports === 3 && g.exports === 1, `structure: exports ${b.exports}/${g.exports}, expected 3/1`);
  check(b.classes === 1 && g.classes === 0, `structure: classes ${b.classes}/${g.classes}, expected 1/0`);
  check(b.identifiers > g.identifiers, 'structure: BAD should carry more distinct identifiers');
  check(b.commentLines === 3 && g.commentLines === 0,
    `structure: commentLines ${b.commentLines}/${g.commentLines}, expected 3/0`);
  // 2 `function` keywords + 1 arrow in BAD, 1 `function` in GOOD.
  check(b.functions === 3 && g.functions === 1,
    `structure: functions ${b.functions}/${g.functions}, expected 3/1 (arrow counting)`);
  // and the per-line control must still separate them
  check(b.branches / b.loc > g.branches / g.loc, 'structure: per-line branch density did not separate');

  // 3. agentFiles — seeds ignored, changed seeds kept, new files kept, noise dropped.
  const fx = path.join(out, '_selftest', 'session');
  fs.rmSync(path.join(out, '_selftest'), { recursive: true, force: true });
  fs.mkdirSync(path.join(fx, '_shims'), { recursive: true });
  fs.mkdirSync(path.join(fx, '.git'), { recursive: true });
  fs.mkdirSync(path.join(fx, 'node_modules', 'x'), { recursive: true });
  const seed = { 'keep.js': 'const untouched = 1;\n', 'edit.js': 'const before = 1;\n', 'package.json': '{"a":1}' };
  fs.writeFileSync(path.join(fx, 'keep.js'), seed['keep.js']);
  fs.writeFileSync(path.join(fx, 'edit.js'), 'const after = 2;\n');
  fs.writeFileSync(path.join(fx, 'package.json'), '{"a":1}');
  fs.writeFileSync(path.join(fx, 'new.js'), 'const fresh = 3;\n');
  fs.writeFileSync(path.join(fx, '_claude.json'), '{}');
  fs.writeFileSync(path.join(fx, '_shims', 'npm.js'), 'x');
  fs.writeFileSync(path.join(fx, '.git', 'HEAD'), 'ref');
  fs.writeFileSync(path.join(fx, 'node_modules', 'x', 'index.js'), 'x');
  fs.writeFileSync(path.join(fx, 'notes.md'), 'x');
  const got = agentFiles(fx, seed).map((f) => f.name).join(',');
  check(got === 'edit.js,new.js', `agentFiles returned "${got}", expected "edit.js,new.js"`);
  // ...and a genuinely changed manifest must survive
  fs.writeFileSync(path.join(fx, 'package.json'), '{"a":1,"dependencies":{"axios":"^1"}}');
  const got2 = agentFiles(fx, seed).map((f) => f.name).join(',');
  check(got2 === 'edit.js,new.js,package.json', `agentFiles with changed manifest returned "${got2}"`);

  // 4. parseVerdict — good replies parse, bad replies return null rather than a guess.
  const vGood = [
    ['REASON: it is explicit.\nVERDICT: A', 'A'],
    ['REASON: fewer moving parts.\nVERDICT: B', 'B'],
    ['reason: whatever\nverdict: b', 'B'],
    ['REASON: x\nVERDICT: A\nVERDICT: B', 'B'],
  ];
  for (const [txt, want] of vGood) {
    check(parseVerdict(txt).verdict === want, `parseVerdict(${JSON.stringify(txt)}) != ${want}`);
  }
  for (const txt of ['I would prefer A, obviously.', 'VERDICT: C', '', 'A or B, hard to say']) {
    check(parseVerdict(txt).verdict === null, `parseVerdict(${JSON.stringify(txt)}) should be null`);
  }
  check(parseVerdict('REASON: the loop is easier to follow.\nVERDICT: A').reason
    === 'the loop is easier to follow.', 'parseVerdict lost the reason');

  // 5. foldPair — the position swap must be undone correctly, and disagreement
  //    must be reported rather than resolved. Ordering 0 puts armB in slot A.
  check(foldPair({ verdict: 'A' }, { verdict: 'B' }, 'baseline', 'razor').winner === 'razor',
    'foldPair: razor win not folded');
  check(foldPair({ verdict: 'B' }, { verdict: 'A' }, 'baseline', 'razor').winner === 'baseline',
    'foldPair: baseline win not folded');
  check(foldPair({ verdict: 'A' }, { verdict: 'A' }, 'baseline', 'razor').consistent === false,
    'foldPair: position-biased pair reported as consistent');
  check(foldPair({ verdict: 'B' }, { verdict: 'B' }, 'baseline', 'razor').consistent === false,
    'foldPair: position-biased pair reported as consistent');
  check(foldPair({ verdict: null }, { verdict: 'A' }, 'baseline', 'razor').consistent === false,
    'foldPair: null verdict counted');
  check(foldPair({ verdict: 'A' }, { verdict: null }, 'baseline', 'razor').consistent === false,
    'foldPair: null second verdict counted');
  // A failed CALL and a judge that CONTRADICTS itself are different findings.
  check(foldPair({ verdict: null }, { verdict: 'A' }, 'baseline', 'razor').unparsed === true,
    'foldPair: a failed call was not marked unparsed — it would inflate the disagreement rate');
  check(foldPair({ verdict: 'A' }, { verdict: 'A' }, 'baseline', 'razor').unparsed === false,
    'foldPair: a real position-biased disagreement was mislabelled as a harness failure');
  // ...and it must fold to the arm names it was GIVEN. A hard-coded 'razor'
  // passes every test above and still reports 0% under `--arms baseline,rival`.
  check(foldPair({ verdict: 'A' }, { verdict: 'B' }, 'baseline', 'rival').winner === 'rival',
    'foldPair ignored the arm names it was passed — a non-default --arms would report 0%');
  check(foldPair({ verdict: 'B' }, { verdict: 'A' }, 'rival', 'baseline').winner === 'rival',
    'foldPair ignored the arm names in the swapped position');

  // 5b. renderImpl — the truncation flag must be FALSE for a short answer and
  //     TRUE for one over the cap, because an unreported truncation falls on the
  //     longer arm and un-blinds the pair.
  const rShort = renderImpl([{ name: 'a.js', text: GOOD_IMPL }]);
  check(rShort.truncated === false && /slugify/.test(rShort.text), 'renderImpl flagged a short impl as truncated');
  const rLong = renderImpl([{ name: 'a.js', text: 'x'.repeat(MAX_IMPL_CHARS + 500) }]);
  check(rLong.truncated === true && /\[truncated\]/.test(rLong.text)
    && rLong.text.length < MAX_IMPL_CHARS + 100, 'renderImpl did not flag/cut an over-cap impl');
  check(renderImpl([]).text === '(no files)' && renderImpl([]).truncated === false,
    'renderImpl mishandled an empty file list');

  // 5c. buildCell — the two implementations must land in the slots they were
  //     given, and a leak in ONE implementation must be attributed to that slot
  //     alone (an asymmetric redaction is a thumb on the scale).
  const bc = buildCell('do the thing', [{ name: 'a.js', text: 'const clean = 1;\n' }],
    [{ name: 'b.js', text: 'const razorEdge = 2;\n' }], DEFAULT_RUNS);
  check(/IMPLEMENTATION A ===\s*\n--- a\.js/.test(bc.prompt), 'buildCell put the wrong files in slot A');
  check(/IMPLEMENTATION B ===\s*\n--- b\.js/.test(bc.prompt), 'buildCell put the wrong files in slot B');
  check(bc.leaks.slotA.length === 0 && bc.leaks.slotB.length === 1,
    'buildCell did not attribute a one-sided leak to the slot it came from');
  check(!/razor/i.test(bc.prompt), 'buildCell let an identifying token through to the prompt');

  // 6. stats
  check(median([3, 1, 2]) === 2 && median([4, 1, 2, 3]) === 2.5 && median([]) === 0, 'median is wrong');
  check(Math.abs(pearson([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-9, 'pearson: perfect correlation not 1');
  check(Math.abs(pearson([1, 2, 3, 4], [8, 6, 4, 2]) + 1) < 1e-9, 'pearson: perfect anti-correlation not -1');
  check(pearson([1, 1, 1, 1], [1, 2, 3, 4]) === 0, 'pearson: zero-variance input must be 0, not NaN');
  check(pearson([1], [1]) === 0, 'pearson: n<2 must be 0');
  // The shuffle must be a permutation, not a sample, and must replay from a seed.
  const src10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const sh1 = shuffle(src10, rng(7));
  check(sh1.slice().sort((x, y) => x - y).join() === src10.join(), 'shuffle lost or duplicated a cell');
  check(sh1.join() === shuffle(src10, rng(7)).join(), 'shuffle is not replayable from its seed');
  check(sh1.join() !== shuffle(src10, rng(8)).join(), 'shuffle ignores its seed');

  // 6b. countBranches — `??` and `?.` are not ternaries. Counting them would
  //     inflate one arm's branch score for writing modern JS.
  check(countBranches('const x = a ?? b;') === 0, 'countBranches counted ?? as a branch');
  check(countBranches('const x = a?.b;') === 0, 'countBranches counted ?. as a branch');
  check(countBranches('const x = a ? b : c;') === 1, 'countBranches missed a real ternary');
  check(countBranches('if (a && b) { } else { }') === 3, 'countBranches miscounted if/else/&&');

  // 6b2. maxNesting must be indent-WIDTH blind. This is one of the two legs of
  //     the stated bar, so if a 4-space file scored deeper than a 2-space file of
  //     the identical shape, an arm would win or lose leg 2 on code style alone.
  const shape2 = 'function a() {\n  if (x) {\n    while (y) {\n      z();\n    }\n  }\n}\n';
  const shape4 = shape2.replace(/^( +)/gm, (m) => ' '.repeat(m.length * 2));
  check(maxNesting(shape2) === maxNesting(shape4),
    'maxNesting is indent-width sensitive: 2-space ' + maxNesting(shape2)
    + ' vs the same shape at 4-space ' + maxNesting(shape4));
  check(maxNesting(shape2) === 3, 'maxNesting misread a known 3-deep shape: ' + maxNesting(shape2));
  check(maxNesting('const a = 1;\nconst b = 2;\n') === 0, 'maxNesting found depth in a flat file');
  // ...and tabs must read as indentation, not as depth 0.
  check(maxNesting('function a() {\n\tif (x) {\n\t\tz();\n\t}\n}\n') === 2,
    'maxNesting did not normalise tabs');

  // 6b3. identifiers() must exclude language keywords. Counting them would score
  //     an arm for writing `const`/`return`, not for introducing names.
  const idset = identifiers(stripCode('const x = function y() { return typeof z; }').code);
  for (const kw of ['const', 'function', 'return', 'typeof']) {
    check(!idset.has(kw), 'identifiers() kept the keyword "' + kw + '"');
  }
  for (const name of ['x', 'y', 'z']) {
    check(idset.has(name), 'identifiers() dropped the real identifier "' + name + '"');
  }

  // 6c. structure must ignore a non-source file even when agentFiles hands it
  //     one — package.json is shown to the judge but is not code.
  const withPkg = structure([{ name: 'package.json', text: '{"dependencies":{"axios":"^1"}}' }]);
  check(withPkg.loc === 0 && withPkg.files === 0, 'structure counted package.json as code');
  // ...and a template literal's interior is deliberately invisible to the
  // metrics, because stripCode blanks string bodies whole. Asserted through the
  // REAL pipeline (strip, then count) so nobody later reads a branch count as
  // exhaustive — the blind spot is equal for both arms, but it is a blind spot.
  check(countBranches(stripCode('const s = `${a ? b : c}`;').code) === 0,
    'documented limitation changed: template-literal interiors are meant to be stripped');
  check(countBranches(stripCode('if (a) { return `${x}`; }').code) === 1,
    'stripping a template literal ate a real branch around it');

  // 6d. archived() must survive a directory with no archived result at all
  //     rather than throwing mid-collection.
  const emptyDir = path.join(out, '_selftest', 'empty');
  fs.mkdirSync(emptyDir, { recursive: true });
  const arEmpty = archived(emptyDir);
  check(arEmpty.cost === 0 && arEmpty.numTurns === 0 && arEmpty.denials === 0
    && arEmpty.razorText === false, 'archived() did not zero-fill a session with no _claude.json');
  fs.writeFileSync(path.join(emptyDir, '_claude.json'),
    JSON.stringify({ total_cost_usd: 0.5, num_turns: 4, duration_ms: 900, permission_denials: [1, 2] }));
  fs.writeFileSync(path.join(emptyDir, '_claude.stream.jsonl'), 'noise razor: denied noise\n');
  const arFull = archived(emptyDir);
  check(arFull.cost === 0.5 && arFull.numTurns === 4 && arFull.wallMs === 900
    && arFull.denials === 2 && arFull.razorText === true,
  'archived() misread a real result event or missed the "razor: " gate marker');

  // 7. anonymisation — no arm name, rival name or run path may survive into a
  //    judge prompt, and the guard must actually catch one when planted.
  const dirty = 'written by the razor arm at ' + DEFAULT_RUNS[0] + '/x__' + RIVAL_DIR + '__opus__0';
  const s = scrub(dirty, DEFAULT_RUNS);
  check(s.leaks.length > 0, 'scrub found no leak in a deliberately dirty string');
  check(!/razor/i.test(s.text) && !new RegExp(RIVAL_DIR, 'i').test(s.text)
    && !/razor-bench/i.test(s.text), 'scrub left an identifying token behind');
  const p = judgePrompt('do the thing', renderImpl([{ name: 'a.js', text: GOOD_IMPL }]).text,
    renderImpl([{ name: 'a.js', text: BAD_IMPL }]).text);
  check(!/\[object Object\]/.test(p), 'judgePrompt was handed an object instead of rendered text');
  check(scrub(p, DEFAULT_RUNS).leaks.length === 0, 'a clean judge prompt tripped the leak guard');
  // scrub must be case-insensitive and must reach into a code body, not just
  // the surrounding prose.
  const inCode = scrub('function makeRazorEdge() { return "RAZOR"; }', DEFAULT_RUNS);
  check(inCode.leaks.length === 1 && !/razor/i.test(inCode.text),
    'scrub missed an identifying token inside a code body or in mixed case');
  check(scrub('nothing to see here', DEFAULT_RUNS).leaks.length === 0, 'scrub false-positived on clean text');
  // The prompt must not tilt: no size vocabulary at all.
  check(!/\b(lean|leaner|minimal|concise|brief|terse|smaller|fewer lines|simpler is better)\b/i.test(p),
    'judge prompt carries size vocabulary — it would tilt the verdict');
  check(/no ties/i.test(p) && /VERDICT: A/.test(p), 'judge prompt lost its forced verdict');

  // 8. the rival name must never be constructible from a label
  check(!Object.values(ARM_LABEL).includes(RIVAL_DIR), 'the rival directory name leaked into a label');

  fs.rmSync(path.join(out, '_selftest'), { recursive: true, force: true });
  if (ok) console.log('all instruments valid');
  else console.error('INSTRUMENTS INVALID — do not spend money on this run');
  return ok;
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const OUT = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : path.resolve(DEFAULT_OUT);
function flag(name, dflt) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
}
const RUNS = flag('runs', DEFAULT_RUNS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const models = flag('models', 'sonnet,opus').split(',').map((s) => s.trim()).filter(Boolean);
const arms = flag('arms', 'baseline,razor').split(',').map((s) => s.trim()).filter(Boolean);
const repsWanted = Number(flag('reps', 3));
const pairCap = flag('pairs', '') === '' ? null : Number(flag('pairs', ''));
const rawJudgeModel = flag('judge-model', 'sonnet');
const judgeModel = MODELS[rawJudgeModel] || rawJudgeModel;
const seed = Number(flag('seed', '20260829'));
const maxUsd = flag('max-usd', '') === '' ? null : Number(flag('max-usd', ''));
const dry = argv.includes('--dry-run');
const isSelftest = argv.includes('--selftest');

// Every one of these, left unchecked, buys a queue of full-price calls that
// answers the wrong question or no question at all.
function validateArgs() {
  const bad = [];
  for (const m of models) if (!MODELS[m]) bad.push('unknown model "' + m + '" (allowed: ' + Object.keys(MODELS).join(', ') + '; Haiku is retired as a test model)');
  if (arms.length !== 2) bad.push('--arms needs exactly two arm labels, got ' + arms.length);
  if (arms[0] === arms[1]) bad.push('--arms names the same arm twice — that would bill the whole queue comparing an implementation with itself');
  for (const a of arms) if (!Object.values(ARM_LABEL).includes(a)) bad.push('unknown arm "' + a + '" (allowed: ' + Object.values(ARM_LABEL).join(', ') + ')');
  if (!Number.isInteger(repsWanted) || repsWanted < 1) bad.push('--reps must be a positive integer, got "' + flag('reps', 3) + '"');
  if (pairCap !== null && (!Number.isInteger(pairCap) || pairCap < 0)) bad.push('--pairs must be a non-negative integer, got "' + flag('pairs', '') + '"');
  if (!Number.isFinite(seed)) bad.push('--seed must be a number, got "' + flag('seed', '') + '"');
  if (maxUsd !== null && (!Number.isFinite(maxUsd) || maxUsd <= 0)) bad.push('--max-usd must be a positive number, got "' + flag('max-usd', '') + '"');
  if (/haiku/i.test(judgeModel)) bad.push('Haiku is retired as a test model by house rule; pick sonnet or opus for --judge-model');
  if (bad.length) { for (const b of bad) console.error('argument error: ' + b); process.exit(1); }
}

function table(rows, headers) {
  const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(w[i])).join('  ');
  console.log(line(headers));
  console.log(w.map((x) => '-'.repeat(x)).join('  '));
  for (const r of rows) console.log(line(r));
}

function structuralReport(sessions) {
  console.log('\n=== (a) structural metrics — offline, no API spend ===');
  console.log('Agent-authored files only (seeds and unchanged manifests excluded). Medians'
    + ' across sessions.\nCounts are RAW; the per-100-LOC block below is the same metrics'
    + ' controlled for length.\n');

  const allArms = [...new Set(sessions.map((s) => s.arm))].sort();
  const rows = [];
  for (const m of models) {
    for (const a of allArms) {
      const c = sessions.filter((s) => s.model === m && s.arm === a);
      if (!c.length) continue;
      const pick = (f) => median(c.map((s) => f(s.struct)));
      rows.push([m, a, c.length,
        pick((x) => x.files), pick((x) => x.loc), pick((x) => x.commentLines),
        pick((x) => x.exports), pick((x) => x.functions), pick((x) => x.classes),
        pick((x) => x.maxNest), pick((x) => x.branches), pick((x) => x.identifiers)]);
    }
  }
  table(rows, ['model', 'arm', 'n', 'files', 'loc', 'cmt', 'exp', 'fn', 'cls', 'nest', 'br', 'ids']);

  console.log('\n--- the same metrics per 100 lines of code (length controlled) ---');
  const rows2 = [];
  for (const m of models) {
    for (const a of allArms) {
      const c = sessions.filter((s) => s.model === m && s.arm === a && s.struct.loc > 0);
      if (!c.length) continue;
      const per = (f) => median(c.map((s) => (f(s.struct) / s.struct.loc) * 100)).toFixed(2);
      rows2.push([m, a, c.length,
        per((x) => x.commentLines), per((x) => x.exports), per((x) => x.functions),
        per((x) => x.maxNest), per((x) => x.branches), per((x) => x.identifiers)]);
    }
  }
  table(rows2, ['model', 'arm', 'n', 'cmt/100', 'exp/100', 'fn/100', 'nest/100', 'br/100', 'ids/100']);

  const coded = sessions.filter((s) => s.struct.loc > 0);
  const rNest = pearson(coded.map((s) => s.struct.loc), coded.map((s) => s.struct.maxNest));
  const rBr = pearson(coded.map((s) => s.struct.loc), coded.map((s) => s.struct.branches));
  console.log('\nKNOWN TRAP: max nesting correlates with length. Across these ' + coded.length
    + ' sessions, r(loc, maxNest) = ' + rNest.toFixed(2) + ' and r(loc, branches) = ' + rBr.toFixed(2) + '.');
  console.log('A raw nesting or branch win at a high r is the LENGTH win restated. Only the'
    + ' per-100-LOC rows above are evidence that the shape changed as well as the size.');
  console.log('maxNest is a depth, not a count — its per-100-LOC column is a crude control,'
    + ' shown for completeness, and the raw column is the one to read alongside r.');

  // The stated WIN bar has TWO legs. Leg 2 is decided entirely by the free half,
  // so it is scored HERE, out loud, before a dollar is spent — otherwise the
  // reader is left to derive a failing leg from a table, and a leg nobody
  // derives is a leg that never fails.
  const [armA, armB] = arms;
  console.log('\n--- leg 2 of the stated bar, scored now (free half) ---');
  const legRows = [];
  let legPass = 0; let legTotal = 0;
  for (const m of models) {
    const ca = sessions.filter((s) => s.model === m && s.arm === armA && s.struct.loc > 0);
    const cb = sessions.filter((s) => s.model === m && s.arm === armB && s.struct.loc > 0);
    if (!ca.length || !cb.length) continue;
    const per = (c, f) => median(c.map((s) => (f(s.struct) / s.struct.loc) * 100));
    const nA = per(ca, (x) => x.maxNest); const nB = per(cb, (x) => x.maxNest);
    const bA = per(ca, (x) => x.branches); const bB = per(cb, (x) => x.branches);
    const pass = nB < nA && bB < bA;
    legTotal++; if (pass) legPass++;
    legRows.push([m, nA.toFixed(2), nB.toFixed(2), nB < nA ? 'pass' : 'FAIL',
      bA.toFixed(2), bB.toFixed(2), bB < bA ? 'pass' : 'FAIL', pass ? 'PASS' : 'FAIL']);
  }
  table(legRows, ['model', 'nest/100 ' + armA, 'nest/100 ' + armB, 'nest',
    'br/100 ' + armA, 'br/100 ' + armB, 'br', 'leg 2']);
  console.log('leg 2 (' + armB + ' lower median nesting AND branches PER LINE): '
    + legPass + '/' + legTotal + ' models pass.');
  if (legPass < legTotal) {
    console.log('=> LEG 2 IS ALREADY FAILING on ' + (legTotal - legPass) + ' of ' + legTotal
      + ' model(s). The stated WIN needs BOTH legs, so no judged percentage can rescue it.'
      + ' Read this as a partial LOSE and say so, whatever the judge returns.');
  }
  return { legPass, legTotal };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (isSelftest) { process.exit(selftest(OUT) ? 0 : 1); }
  validateArgs();

  let tasks;
  try { ({ RAZOR_TASKS: tasks } = require(TASKS_JS)); }
  catch (e) { console.error('cannot load task definitions at ' + TASKS_JS + ': ' + e.message); process.exit(1); }

  const sessions = collectSessions(RUNS, tasks);
  if (!sessions.length) { console.error('no sessions found under ' + RUNS.join(', ')); process.exit(1); }
  console.log(sessions.length + ' replayed sessions from ' + RUNS.length + ' run(s): '
    + RUNS.map((r) => path.basename(r)).join(', '));

  // Every replayed session on disk, with the per-session fields the brief asks
  // for. structuralReport() only prints medians; without this the raw rows the
  // medians came from would never leave memory and nothing could be re-checked.
  const sessionsPath = path.join(OUT, 'sessions.json');
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions.map((s) => ({
    run: s.run, task: s.task, arm: s.arm, model: s.model, rep: s.rep, repKey: s.repKey,
    cost: s.cost, numTurns: s.numTurns, wallMs: s.wallMs, denials: s.denials,
    razorText: s.razorText, fileCount: s.files.length,
    fileNames: s.files.map((f) => f.name), struct: s.struct, dir: s.dir,
  })), null, 2));
  console.log('per-session rows written to ' + sessionsPath);

  const leg2 = structuralReport(sessions);

  // --- build the pair list -------------------------------------------------
  const byKey = new Map();
  for (const s of sessions) byKey.set([s.task, s.arm, s.model, s.repKey].join('|'), s);
  const taskNames = [...new Set(sessions.map((s) => s.task))].sort();
  const [armA, armB] = arms; // by default baseline vs razor

  const pairs = [];
  // A pair that cannot be judged is DATA, not noise. "The agent produced no
  // files" is one of razor's plausible losing modes — it talked instead of
  // coding — and dropping those rows in silence would compute the judged
  // percentage over a subset that has already excluded the failures.
  const dropped = [];
  let repsAvailable = 0;
  for (const task of taskNames) {
    for (const model of models) {
      const allKeys = [...new Set(sessions.filter((s) => s.task === task && s.model === model)
        .map((s) => s.repKey))]
        .sort((x, y) => {
          const [rx, nx] = x.split(':'); const [ry, ny] = y.split(':');
          return RUNS.findIndex((r) => path.basename(r) === rx) - RUNS.findIndex((r) => path.basename(r) === ry)
            || Number(nx) - Number(ny);
        });
      repsAvailable = Math.max(repsAvailable, allKeys.length);
      for (const repKey of allKeys.slice(0, repsWanted)) {
        const a = byKey.get([task, armA, model, repKey].join('|'));
        const b = byKey.get([task, armB, model, repKey].join('|'));
        const why = [];
        if (!a) why.push('no ' + armA + ' session');
        if (!b) why.push('no ' + armB + ' session');
        if (a && !a.files.length) why.push(armA + ' authored no files');
        if (b && !b.files.length) why.push(armB + ' authored no files');
        if (why.length) { dropped.push({ task, model, repKey, why }); continue; }
        pairs.push({ task, model, repKey, [armA]: a, [armB]: b });
      }
    }
  }

  // Each pair is judged twice. Ordering 0 puts razor in slot A, ordering 1 puts
  // it in slot B. Shuffling the queue keeps the two orderings from clustering,
  // so neither position eats more of the cold-start / cache-warm cost.
  const rand = rng(seed);
  let cells = shuffle(pairs.flatMap((p, i) => [
    { pair: i, ordering: 0 }, { pair: i, ordering: 1 },
  ]), rand);
  let usePairs = pairs;
  if (pairCap !== null && pairCap < pairs.length) {
    const keep = new Set(shuffle(pairs.map((_, i) => i), rng(seed)).slice(0, pairCap));
    usePairs = pairs;
    cells = cells.filter((c) => keep.has(c.pair));
  }

  // --- the grid and the estimate ------------------------------------------
  console.log('\n=== (b) blind judge — the paid half ===');
  console.log('grid: ' + taskNames.length + ' code tasks x ' + models.length + ' models x '
    + repsWanted + ' of ' + repsAvailable + ' reps on disk = ' + pairs.length + ' pairs built; '
    + (cells.length / 2) + ' pairs selected x 2 orderings = ' + cells.length + ' judge calls');
  console.log('arms compared: ' + armA + ' vs ' + armB + ' | judge model: ' + judgeModel
    + ' | seed: ' + seed + ' (pass --seed ' + seed + ' to replay this exact queue)');
  console.log('skipped tasks (no code produced): ' + [...SKIP_TASKS].join(', '));
  if (repsAvailable > repsWanted) {
    console.log('note: ' + (repsAvailable - repsWanted) + ' further rep(s) exist on disk and are'
      + ' NOT being judged (--reps ' + repsAvailable + ' would use them).');
  }

  // Dropped pairs, named. If this list is long and lopsided, the judged
  // percentage below is computed on a survivor set, not on the grid.
  fs.writeFileSync(path.join(OUT, 'dropped-pairs.json'), JSON.stringify(dropped, null, 2));
  if (dropped.length) {
    const byWhy = {};
    for (const d of dropped) for (const w of d.why) byWhy[w] = (byWhy[w] || 0) + 1;
    console.log('DROPPED ' + dropped.length + ' of ' + (dropped.length + pairs.length)
      + ' candidate pairs — these are NOT judged and NOT in any percentage below:');
    for (const [w, n] of Object.entries(byWhy).sort((x, y) => y[1] - x[1])) {
      console.log('    ' + String(n).padStart(4) + '  ' + w);
    }
    console.log('    a lopsided count here is itself a result: one arm failing to produce code'
      + ' is a LOSS for that arm, not a missing datum. Full list in dropped-pairs.json.');
  } else {
    console.log('dropped pairs: 0 — every candidate pair had code from both arms.');
  }

  const built = cells.map((c) => {
    const p = usePairs[c.pair];
    const slotAFiles = (c.ordering === 0 ? p[armB] : p[armA]).files;
    const slotBFiles = (c.ordering === 0 ? p[armA] : p[armB]).files;
    const cell = buildCell(tasks[p.task].prompt, slotAFiles, slotBFiles, RUNS);
    const armOf = (slot) => (c.ordering === 0 ? (slot === 'slotA' ? armB : armA) : (slot === 'slotA' ? armA : armB));
    return {
      ...c,
      prompt: cell.prompt,
      leaks: cell.leaks,
      // Re-keyed from slot to ARM, because "slot A was truncated" is meaningless
      // once the positions are swapped and "razor was truncated" is not.
      truncatedArms: ['slotA', 'slotB'].filter((s) => cell.truncated[s]).map(armOf),
      leakArms: ['slotA', 'slotB'].filter((s) => cell.leaks[s].length).map(armOf),
      taskLeaks: cell.leaks.task,
    };
  });

  // Truncation is not cosmetic. MAX_IMPL_CHARS cuts the LONGER implementation,
  // the longer one is systematically the same arm, and the cut leaves a visible
  // "[truncated]" marker — which both un-blinds the pair and makes that arm look
  // unfinished. If this is not zero, the judged half is compromised.
  const truncCount = {};
  for (const c of built) for (const a of c.truncatedArms) truncCount[a] = (truncCount[a] || 0) + 1;
  if (Object.keys(truncCount).length) {
    console.log('WARNING: implementations hit the ' + MAX_IMPL_CHARS + '-char cap and were'
      + ' truncated, by arm: ' + Object.entries(truncCount).map(([a, n]) => a + '=' + n).join(', '));
    console.log('    the cut leaves a visible marker and falls on the longer arm — treat any'
      + ' judged result on these cells as un-blinded. Raise MAX_IMPL_CHARS or exclude them.');
  } else {
    console.log('truncation: 0 implementations hit the ' + MAX_IMPL_CHARS + '-char cap.');
  }

  const chars = built.reduce((n, c) => n + c.prompt.length, 0);
  const inTok = Math.round(chars / 3.7) + OVERHEAD_TOKENS * built.length;
  const est = (inTok / 1e6) * PRICE_IN + (EST_OUT_TOKENS * built.length / 1e6) * PRICE_OUT;
  console.log('estimate: ' + chars.toLocaleString() + ' prompt chars ~ ' + inTok.toLocaleString()
    + ' input tokens (incl. ' + OVERHEAD_TOKENS + ' tok/call harness overhead) + ~'
    + (EST_OUT_TOKENS * built.length).toLocaleString() + ' output tokens');
  console.log('estimate: $' + est.toFixed(2) + ' at $' + PRICE_IN.toFixed(2) + '/$'
    + PRICE_OUT.toFixed(2) + ' per MTok, every token billed at full price.');
  console.log('empirical ceiling: $' + (EMPIRICAL_COLD_CALL_USD * built.length).toFixed(2)
    + ' if every call paid the cold-start price a comparable single-turn no-tool headless'
    + ' call cost in this corpus ($' + EMPIRICAL_COLD_CALL_USD.toFixed(3) + '). Expect to land'
    + ' between the two: the harness prefix caches after the first call. Actuals come from'
    + ' total_cost_usd and print after every cell — stop the run if they surprise you.');
  if (maxUsd !== null) {
    console.log('budget stop: the run aborts once the running total reaches $' + maxUsd.toFixed(2)
      + ' (--max-usd). Remaining cells are left unjudged and reported as such.');
  } else {
    console.log('budget stop: none set. Pass --max-usd N to make the run abort itself, or'
      + ' Ctrl-C — judge-rows.json is rewritten after every cell, so a kill keeps its data.');
  }

  // A redaction that lands on ONE arm mutilates that arm's code and nobody
  // else's, so the count is reported by arm rather than by prompt.
  const leakByArm = {};
  for (const c of built) for (const a of c.leakArms) leakByArm[a] = (leakByArm[a] || 0) + 1;
  const taskLeaky = built.filter((c) => c.taskLeaks.length).length;
  if (Object.keys(leakByArm).length || taskLeaky) {
    console.log('WARNING: identifying tokens were scrubbed to REDACTED.'
      + ' In implementations, by arm: ' + (Object.keys(leakByArm).length
        ? Object.entries(leakByArm).map(([a, n]) => a + '=' + n).join(', ') : 'none')
      + '; in task text: ' + taskLeaky + ' cell(s).');
    console.log('    a count that is nonzero for one arm only is an ASYMMETRIC edit of the'
      + ' evidence — inspect those cells before trusting their verdicts.');
  } else {
    console.log('anonymisation: 0 of ' + built.length + ' prompts contained an identifying token.');
  }

  if (dry) {
    console.log('\n--- cell list ---');
    built.forEach((c, i) => {
      const p = usePairs[c.pair];
      console.log('  ' + String(i).padStart(3) + '  ' + p.task + ' / ' + p.model + ' / ' + p.repKey
        + '  A=' + (c.ordering === 0 ? armB : armA) + ' B=' + (c.ordering === 0 ? armA : armB));
    });
    console.log('\n--dry-run: nothing spawned, nothing spent.');
    return;
  }

  if (!built.length) { console.log('\nno judge cells selected — structural half only.'); return; }
  if (!CLAUDE) { console.error('claude CLI not found on PATH'); process.exit(1); }
  runJudge(built, usePairs, armA, armB, taskNames, leg2);
}

async function runJudge(built, pairs, armA, armB, taskNames, leg2) {
  const ws = path.join(OUT, '_judge');
  fs.rmSync(ws, { recursive: true, force: true });
  fs.mkdirSync(ws, { recursive: true });
  fs.mkdirSync(path.join(OUT, '_streams'), { recursive: true });

  const rowsPath = path.join(OUT, 'judge-rows.json');
  const rows = [];
  let total = 0;

  let stoppedAt = -1;
  let errors = 0;
  for (let i = 0; i < built.length; i++) {
    if (maxUsd !== null && total >= maxUsd) {
      stoppedAt = i;
      console.log('\nBUDGET STOP: running total $' + total.toFixed(2) + ' reached --max-usd $'
        + maxUsd.toFixed(2) + '. ' + (built.length - i) + ' of ' + built.length
        + ' cells left unjudged; every number below is over the cells that DID run.');
      break;
    }
    const c = built[i];
    const p = pairs[c.pair];
    const tag = [p.task, p.model, p.repKey.replace(':', '-'), 'ord' + c.ordering].join('__');
    // Exactly one call per cell, no retry: a retry would bill both attempts.
    const t = await judgeTurn({
      ws, model: judgeModel, prompt: c.prompt,
      streamPath: path.join(OUT, '_streams', tag + '.stream.jsonl'),
    });
    const final = (t.result && String(t.result.result || '')) || '';
    const { verdict, reason } = parseVerdict(final);
    const cost = (t.result && t.result.total_cost_usd) || 0;
    total += cost;
    if (t.error) errors++;

    const row = {
      kind: 'judge', task: p.task, model: p.model, repKey: p.repKey,
      ordering: c.ordering,
      slotA: c.ordering === 0 ? armB : armA,
      slotB: c.ordering === 0 ? armA : armB,
      judgeModel, verdict, reason, final,
      cost, numTurns: (t.result && t.result.num_turns) || 0, wallMs: t.wallMs,
      denials: (t.result && (t.result.permission_denials || []).length) || 0,
      razorText: /razor: /.test(t.raw || ''),
      error: t.error || '',
      scrubbed: c.leaks, truncatedArms: c.truncatedArms, leakArms: c.leakArms,
    };
    rows.push(row);
    // Rewritten after EVERY cell, so a Ctrl-C or a crash keeps everything paid for.
    fs.writeFileSync(rowsPath, JSON.stringify(rows, null, 2));
    console.log('  ' + String(i + 1).padStart(3) + '/' + built.length + '  ' + p.task
      + ' / ' + p.model + ' / ' + p.repKey + ' ord' + c.ordering
      + '  verdict=' + (verdict || '??') + ' -> ' + (verdict ? (verdict === 'A' ? row.slotA : row.slotB) : 'unparsed')
      + '  $' + cost.toFixed(4) + '  running $' + total.toFixed(2)
      + (t.error ? '  [' + t.error + ']' : ''));
  }
  if (errors) {
    console.log('\nWARNING: ' + errors + ' of ' + rows.length + ' cells returned an error or no'
      + ' result event (see the `error` field in judge-rows.json). They are NOT retried and NOT'
      + ' counted as a verdict for either arm.');
  }

  // --- fold the orderings --------------------------------------------------
  const folded = [];
  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    const first = rows.find((r) => r.task === p.task && r.model === p.model
      && r.repKey === p.repKey && r.ordering === 0);
    const second = rows.find((r) => r.task === p.task && r.model === p.model
      && r.repKey === p.repKey && r.ordering === 1);
    if (!first || !second) continue;
    folded.push({ task: p.task, model: p.model, repKey: p.repKey, ...foldPair(first, second, armA, armB) });
  }
  fs.writeFileSync(path.join(OUT, 'pairs.json'), JSON.stringify(folded, null, 2));

  console.log('\n=== judged summary ===');
  const consistent = folded.filter((f) => f.consistent);
  const unparsedPairs = folded.filter((f) => f.unparsed);
  const disagree = folded.filter((f) => !f.consistent && !f.unparsed).length;
  const rzWins = consistent.filter((f) => f.winner === armB).length;
  const pct = consistent.length ? (100 * rzWins / consistent.length) : 0;
  const rowsOut = [];
  for (const m of [...new Set(folded.map((f) => f.model))].sort()) {
    const all = folded.filter((f) => f.model === m);
    const c = all.filter((f) => f.consistent);
    const u = all.filter((f) => f.unparsed).length;
    rowsOut.push([m, all.length, c.length, all.length - c.length - u, u,
      c.filter((f) => f.winner === armB).length,
      c.filter((f) => f.winner === armA).length,
      c.length ? (100 * c.filter((f) => f.winner === armB).length / c.length).toFixed(0) + '%' : '-']);
  }
  table(rowsOut, ['model', 'pairs', 'consistent', 'disagreed', 'unparsed',
    armB + ' pref', armA + ' pref', armB + ' %']);
  const judged = folded.length - unparsedPairs.length;
  console.log('\norder-consistent pairs: ' + consistent.length + '/' + judged
    + ' judged  (disagreement rate ' + (judged ? (100 * disagree / judged).toFixed(0) : '0')
    + '% — a high rate means the judge is guessing and the verdict column is noise)');
  if (unparsedPairs.length) {
    console.log(unparsedPairs.length + ' further pair(s) had a call that returned no verdict at'
      + ' all — a HARNESS failure, not judge noise, and excluded from both rates above.');
  }
  console.log(armB + ' preferred in ' + rzWins + '/' + consistent.length + ' = ' + pct.toFixed(0)
    + '% of order-consistent pairs, and ' + armA + ' in '
    + consistent.filter((f) => f.winner === armA).length + '/' + consistent.length + '.');
  const unparsed = rows.filter((r) => !r.verdict).length;
  if (unparsed) console.log('WARNING: ' + unparsed + ' judge call(s) returned no parseable VERDICT line.');
  const noisy = rows.filter((r) => r.razorText).length;
  if (noisy) console.log('WARNING: ' + noisy + ' judge transcript(s) contain "razor: " — check for a leak.');

  // Score the stated bar out loud, in both directions. A probe that only has a
  // sentence for the win is not evidence.
  const leg1 = consistent.length > 0 && pct >= 60;
  const legs2ok = leg2 && leg2.legTotal > 0 && leg2.legPass === leg2.legTotal;
  console.log('\n=== verdict against the stated bar ===');
  console.log('  leg 1  judged preference for ' + armB + ' >= 60%: '
    + (consistent.length ? (leg1 ? 'PASS' : 'FAIL') : 'NO DATA') + ' (' + pct.toFixed(0) + '%)');
  console.log('  leg 2  ' + armB + ' lower median nest AND branches per line: '
    + (leg2 && leg2.legTotal ? (legs2ok ? 'PASS' : 'FAIL') + ' (' + leg2.legPass + '/' + leg2.legTotal + ' models)' : 'NO DATA'));
  if (leg1 && legs2ok) {
    console.log('  => WIN. Both legs cleared.');
  } else if (!leg1 && consistent.length && pct <= 40) {
    console.log('  => LOSE. The judge prefers ' + armA + '. Report that, in those words.');
  } else {
    console.log('  => NOT A WIN. At least one leg failed; "easier to review" is not established'
      + ' by this run, and the honest summary says so rather than quoting the leg that passed.');
  }

  console.log('\ntotal $' + total.toFixed(2) + ' over ' + rows.length + ' judge calls'
    + (stoppedAt >= 0 ? ' (BUDGET-STOPPED after ' + stoppedAt + ' of ' + built.length + ')' : '')
    + '  (' + taskNames.length + ' tasks)');
  console.log('rows in ' + rowsPath + ', folded pairs in ' + path.join(OUT, 'pairs.json'));
  console.log('\nAn LLM judge is NOT a human reviewer. This is a blinded, order-balanced,'
    + ' cheap proxy for one. Read the reason strings in judge-rows.json before quoting'
    + ' any percentage — a verdict count is evidence, not proof.');
}

main();
