#!/usr/bin/env node
'use strict';
// The Hush 2.0 readiness gate: are one batch's figures ready to publish?
//
//   node scripts/readiness-gate.js --records <batch folder> --previous <batch folder>
//
// Each <batch folder> is one batch under .private/benchmarks/hush/records/: its
// run records, its batch.json manifest, and the published/claims.md that
// runner/publish.js wrote there. --records names the batch to publish;
// --previous names the retained batch of the hush release before it, which
// points 6, 7 and 8 compare against. The contract comes from the hush checkout
// under BENCH_PLUGINS_DIR: its output style, its manifest version, its README
// and its Git history. Nothing is run; the gate only reads.
//
// Each point below is a promise Hush 2.0 makes, in output-styles/hush.md or in
// README.md, beside the record field or harness function that proves it. A
// point reports MET or NOT MET and names what it read. One unmet point exits 1.
// A check that throws fails closed. tests/benchmark_readiness.test.js breaks
// each point on purpose and asserts the gate names it.
//
// Comparative points (6, 7, 8) ask that hush does at least as well as the
// no-plugin arm of the same batch, and no worse than the hush arm of the
// previous release's batch on the same model. The previous release is the
// highest version below the checkout's in the Git history of its
// .claude-plugin/plugin.json, and that batch must have measured exactly it,
// with the same model alias and resolved model ids. Both batches are scored with the
// checkout's caps. The style's caps are absolute, but the published figures
// compare arms and releases, so those are the bars a figure needs to clear.
//
// Not proven by a batch's records, so not gated here:
//   - HUSH_WRAP=1 on every arm: runner/run.js always sets it, and no record
//     field holds it.
//   - Compression never hides a failure, and the real exit code reaches the
//     model: hush's own tests/compress_tool_output.test.js,
//     tests/preserve_exit_code.test.js and tests/transform_properties.test.js.
//   - One fact per sentence beyond the punctuation proxy of point 8, no dashes,
//     every file as a link, the reply in the user's language, and no stock
//     block labels: nothing gates these yet.
//   - Which statistic, arm or segment a README dollar figure names, and every
//     README figure that is not a dollar amount, such as pass counts, word
//     counts and percentages: point 11 only finds each dollar figure outside
//     code among the batch's costs.
//   - Which model a README sentence or table row names, and the host and date
//     the README states: point 11 only finds each model id the batch's records
//     carry somewhere in the README.
//   - That the previous release's batch ran the same tasks and repetitions:
//     points 6, 7 and 8 check only its version, its model, its model ids and
//     its hashes.

const fs = require('node:fs');
const path = require('node:path');
const { readRecords } = require('../runner/records.js');
const { buildClaims, assertOneBatch, assertBatchComplete } = require('../runner/publish.js');
const { readCaps, capReport } = require('../runner/caps.js');
const { analyzeMessage: readability } = require('../runner/readability.js');
const { METRICS, quantile } = require('../runner/stats.js');
const { pluginProvenance } = require('../runner/provenance.js');
const { pluginDir: pluginDirOf } = require('../../paths.js');
const { flagOr } = require('../../flags.js');
const { execFileSync } = require('node:child_process');

const HUSH = 'hush';
const BASELINE = 'baseline';
const VOICE = 'hush:Hush';
const NOISY = 'noisy-output';
const CLAIMS = 'published/claims.md';

const met = (evidence) => ({ met: true, evidence, missing: null });
const unmet = (evidence, missing) => ({ met: false, evidence, missing });
const verdict = (evidence, gaps) => (gaps.length ? unmet(evidence, gaps.join('; ')) : met(evidence));
const someOf = (list, n = 4) => (list.length > n ? `${list.slice(0, n).join(', ')} and ${list.length - n} more` : list.join(', '));
const pct = (num, den) => (den ? `${((100 * num) / den).toFixed(1)}%` : 'n/a');

/** The usable runs of the batch; throws when the records could not be read. */
function runsOf(ctx) {
  if (ctx.loadError) throw new Error(`records cannot be read: ${ctx.loadError}`);
  return ctx.runs.filter((r) => !r.error);
}

function hushRuns(ctx) {
  const runs = runsOf(ctx).filter((r) => r.arm === HUSH);
  if (!runs.length) throw new Error('the batch has no usable hush runs');
  return runs;
}

/** Every hush run must hold `ok`; the failures are named by record key. */
function everyHushRun(ctx, ok, what) {
  const runs = hushRuns(ctx);
  const bad = runs.filter((r) => !ok(r)).map((r) => r.key);
  return verdict([`${runs.length - bad.length} of ${runs.length} hush runs ${what}`],
    bad.length ? [`${bad.length} hush run(s) do not: ${someOf(bad)}`] : []);
}

/** -1, 0 or 1 as x.y.z version `a` sorts before, with or after `b`. */
function compareVersions(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

/**
 * The release before `version`: the highest x.y.z version below it that the
 * checkout's .claude-plugin/plugin.json ever held, or null when there is none
 * or the history cannot be read.
 */
function releaseBefore(dir, version) {
  const log = gitIn(dir, ['log', '-p', '--no-ext-diff', '--no-textconv', '--format=', '--', '.claude-plugin/plugin.json']);
  const versions = [...(log || '').matchAll(/"version"\s*:\s*"(\d+\.\d+\.\d+)"/g)].map((m) => m[1]);
  return versions.filter((v) => compareVersions(v, version) < 0).sort(compareVersions).pop() || null;
}

/** The sorted model ids of a batch's usable hush runs, or null when one run records none. */
function hushModelIds(runs) {
  const ids = runs.filter((r) => r.arm === HUSH && !r.error).map((r) => r.modelId || null);
  return ids.includes(null) ? null : [...new Set(ids)].sort().join(', ');
}

/** The previous release's hush arm, scored with the checkout's caps, or the reason it cannot be compared. */
function previousRelease(ctx) {
  if (!ctx.previousDir) return { error: 'no previous release batch to compare: pass --previous <batch folder>' };
  if (ctx.previousError) return { error: `the previous release batch cannot be read: ${ctx.previousError}` };
  const expected = releaseBefore(ctx.pluginDir, ctx.version);
  if (!expected) return { error: `the hush checkout's manifest history names no release before ${ctx.version}` };
  const m = ctx.previous.manifest;
  const version = m.hush && m.hush.version;
  if (version !== expected) return { error: `the previous batch measured hush ${version}, not ${expected}, the release before ${ctx.version}` };
  const model = ctx.manifest && ctx.manifest.model;
  if (m.model !== model) return { error: `the previous batch ran on ${m.model}, this batch on ${model}` };
  const runs = ctx.previous.runs.filter((r) => !r.error);
  const arm = capReport(runs, ctx.caps).arms[HUSH];
  if (!arm) return { error: 'the previous release batch has no usable hush runs' };
  const theirs = hushModelIds(runs);
  const mine = hushModelIds(runsOf(ctx));
  if (!theirs || !mine) return { error: `${theirs ? 'this' : 'the previous'} batch has hush runs with no model id` };
  if (theirs !== mine) return { error: `the previous batch's hush runs used ${theirs}, this batch's ${mine}` };
  return { version, arm };
}

/** hush's rate of `num` per `den` must exceed neither the no-plugin arm's nor the previous release's. */
function noWorse(ctx, num, den, label) {
  const arms = capReport(runsOf(ctx), ctx.caps).arms;
  const h = arms[HUSH];
  const b = arms[BASELINE];
  if (!h || !b) return unmet([], `the batch needs a ${HUSH} and a ${BASELINE} arm to compare`);
  const rate = (a) => (den(a) ? num(a) / den(a) : 0);
  const line = (name, a) => `${name}: ${num(a)} ${label} in ${den(a)} (${pct(num(a), den(a))})`;
  const evidence = [line(HUSH, h), line(BASELINE, b)];
  const gaps = [];
  if (rate(h) > rate(b)) gaps.push(`${HUSH} has a higher share than ${BASELINE}`);
  const prev = previousRelease(ctx);
  if (prev.error) gaps.push(prev.error);
  else {
    evidence.push(line(`${HUSH} ${prev.version}, the previous release`, prev.arm));
    if (rate(h) > rate(prev.arm)) gaps.push(`${HUSH} ${ctx.version} has a higher share than the previous release ${prev.version}`);
  }
  return verdict(evidence, gaps);
}

const POINTS = [
  {
    n: 1,
    point: 'The batch is complete and auditable.',
    proof: 'runner/records.js hash check; runner/publish.js one-batch and completeness checks; record stamps',
    check(ctx) {
      if (ctx.loadError) return unmet([], `records cannot be read: ${ctx.loadError}`);
      const gaps = [];
      const evidence = [`${ctx.runs.length} hash-verified run records, ${ctx.batches.length} batch manifest(s)`];
      if (ctx.batches.length !== 1) gaps.push(`expected one batch.json, found ${ctx.batches.length}`);
      // assertBatchComplete refuses a missing or empty order and names it. It
      // runs only on the one matching batch.json, so a cause reported here is
      // not reported again in its words.
      try {
        const id = assertOneBatch(ctx.runs);
        if (ctx.manifest && ctx.manifest.batchId !== id) gaps.push(`batch.json names ${ctx.manifest.batchId}, the records name ${id}`);
        else if (ctx.batches.length === 1) assertBatchComplete(ctx.runs, ctx.batches, id);
      } catch (err) {
        gaps.push(err.message);
      }
      const errored = ctx.runs.filter((r) => r.error).map((r) => r.key);
      if (errored.length) gaps.push(`${errored.length} run(s) errored with no scored output: ${someOf(errored)}`);
      const unstamped = ctx.runs.filter((r) => !r.error && (!r.batchId || r.seed == null || !r.segment || !r.modelId)).map((r) => r.key);
      if (unstamped.length) gaps.push(`${unstamped.length} record(s) carry no batch, seed, segment or model id: ${someOf(unstamped)}`);
      const arms = [...new Set(ctx.runs.map((r) => r.arm))];
      for (const arm of [BASELINE, HUSH]) if (!arms.includes(arm)) gaps.push(`the batch has no ${arm} arm`);
      return verdict(evidence, gaps);
    },
  },
  {
    n: 2,
    point: 'The batch measured one clean hush build, and the checkout being published ships that build\'s code.',
    proof: 'batch.json hush field from runner/provenance.js; the checkout\'s .claude-plugin/plugin.json; git diff from the measured commit to the checkout\'s HEAD; git status of the checkout',
    check(ctx) {
      runsOf(ctx);
      const build = ctx.manifest && ctx.manifest.hush;
      if (!build) return unmet([], 'batch.json records no hush build');
      const evidence = [`batch.json: head ${build.head}, dirty ${build.dirty}, version ${build.version}`,
        `checkout: head ${ctx.checkout.head}, dirty ${ctx.checkout.dirty}, version ${ctx.version}`];
      const gaps = [];
      const commit = /^[0-9a-f]{40}$/.test(String(build.head));
      if (!commit) {
        gaps.push(build.head === '<redacted-secret>'
          ? 'batch.json lost the hush commit to the record sanitizer, so the batch predates the runner keeping it'
          : 'batch.json names no hush commit');
      }
      if (build.dirty !== false) gaps.push('the hush checkout had uncommitted changes, or its state was unknown');
      if (build.version !== ctx.version) gaps.push(`the batch measured hush ${build.version}, the checkout is ${ctx.version}`);
      if (!ctx.checkout.head) gaps.push('the hush checkout is not its own Git checkout, so the measured commit cannot be tied to it');
      else if (ctx.checkout.dirty !== false) gaps.push('the hush checkout has uncommitted or untracked changes, so its HEAD is not what would ship');
      if (ctx.checkout.head && commit) {
        const changed = changedSince(ctx.pluginDir, build.head);
        if (changed === null) gaps.push(`the hush checkout does not hold the measured commit ${build.head}`);
        else {
          const code = changed.filter((f) => !PRESENTATION.test(f));
          evidence.push(`${changed.length} file(s) changed from the measured commit to HEAD, ${code.length} outside README.md, docs/ and assets/`);
          if (code.length) gaps.push(`hush changed ${someOf(code)} after the measured commit`);
        }
      }
      return verdict(evidence, gaps);
    },
  },
  {
    n: 3,
    point: 'The hush voice was active in every hush session.',
    proof: 'record outputStyle, read from the session\'s init event by runner/metrics.js',
    check: (ctx) => everyHushRun(ctx, (r) => r.outputStyle === VOICE, `ran with output style ${VOICE}`),
  },
  {
    n: 4,
    point: 'Correctness comes before silence: every hush job passes its check.',
    proof: 'record check.pass, from the task\'s ground-truth check in runner/metrics.js',
    check: (ctx) => everyHushRun(ctx, (r) => r.check && r.check.pass === true, 'pass their task check'),
  },
  {
    n: 5,
    point: 'Quiet while it works: no hush session breaks in more than once before the answer.',
    proof: 'runner/stats.js METRICS.interruptions over record narrationTexts',
    check: (ctx) => everyHushRun(ctx, (r) => METRICS.interruptions(r) <= 1, 'break in at most once'),
  },
  {
    n: 6,
    point: 'The sentence cap holds at least as well as without a plugin and as in the previous release.',
    proof: 'runner/caps.js analyzeMessage over both batches; the cap is read from output-styles/hush.md',
    check: (ctx) => noWorse(ctx, (a) => a.overWordCap, (a) => a.units, `sentences over ${ctx.caps.wordCap} words`),
  },
  {
    n: 7,
    point: 'The block cap holds at least as well as without a plugin and as in the previous release.',
    proof: 'runner/caps.js analyzeMessage over both batches; the cap is read from output-styles/hush.md',
    check: (ctx) => noWorse(ctx, (a) => a.overBlockCap, (a) => a.blocks, `blocks over ${ctx.caps.blockCap} words`),
  },
  {
    n: 8,
    point: 'One fact per sentence: no more semicolons and asides than without a plugin or in the previous release.',
    proof: 'runner/caps.js analyzeMessage semicolons and parenthetical units over both batches',
    check: (ctx) => noWorse(ctx, (a) => a.semicolons + a.parenUnits, (a) => a.units, 'semicolons and asides'),
  },
  {
    n: 9,
    point: 'The result comes first: no hush answer opens with a preamble.',
    proof: 'runner/readability.js analyzeMessage answerFirst over record finalText',
    check: (ctx) => everyHushRun(ctx, (r) => readability(r.finalText).answerFirst, 'open with the result'),
  },
  {
    n: 10,
    point: 'The compression hook trims noisy output: hush carries less tool output per call on noisy jobs.',
    proof: `runner/stats.js METRICS.toolCharsPerCall medians on the ${NOISY} segment`,
    check(ctx) {
      const noisy = runsOf(ctx).filter((r) => r.segment === NOISY);
      const median = (arm) => quantile(noisy.filter((r) => r.arm === arm).map(METRICS.toolCharsPerCall), 0.5);
      const h = median(HUSH);
      const b = median(BASELINE);
      if (!Number.isFinite(h) || !Number.isFinite(b)) {
        return unmet([], `the batch has no ${HUSH} and ${BASELINE} runs on the ${NOISY} segment to compare`);
      }
      const evidence = [`${NOISY} median tool characters per call: ${HUSH} ${Math.round(h)}, ${BASELINE} ${Math.round(b)}`];
      return h < b ? met(evidence) : unmet(evidence, `${HUSH} does not carry less tool output per call than ${BASELINE}`);
    },
  },
  {
    n: 11,
    point: 'The published claims regenerate from the records, the README names this batch and its model ids, and each README dollar figure equals one of its costs.',
    proof: `runner/publish.js buildClaims against ${CLAIMS}; record modelId and dollar figures outside code in the checkout's README.md`,
    check(ctx) {
      runsOf(ctx);
      let claims;
      try {
        claims = buildClaims(ctx.runs, ctx.batches);
      } catch (err) {
        return unmet([], `the records do not regenerate a claim set: ${err.message}`);
      }
      const evidence = [`runner/publish.js regenerated ${claims.segments.length} segment table(s) from batch ${claims.batchId}`];
      const gaps = [];
      let published = null;
      try { published = fs.readFileSync(path.join(ctx.recordsDir, CLAIMS), 'utf8'); } catch { /* reported below */ }
      if (published === null) gaps.push(`${CLAIMS} was never generated: run runner/publish.js --records on this batch`);
      else if (published.trim() !== claims.markdown.trim()) gaps.push(`${CLAIMS} is stale: it does not match what the records regenerate`);
      else evidence.push(`${CLAIMS} matches the regenerated claims`);

      if (!ctx.readme.includes(claims.batchId)) {
        gaps.push(`README.md does not name batch ${claims.batchId}, so its figures cannot be traced to this batch`);
      } else {
        const ids = [...new Set(runsOf(ctx).map((r) => r.modelId).filter(Boolean))].sort();
        const unnamed = ids.filter((id) => !new RegExp(`(?<![\\w.-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-]|\\.\\w)`).test(ctx.readme));
        const prose = proseOf(ctx.readme);
        const figures = [...new Set(prose.match(/\$\d+(?:,\d{3})*(?:\.\d+)?/g) || [])];
        const untraced = figures.filter((f) => !figureIsGenerated(f, claims.costs));
        evidence.push(`README.md names batch ${claims.batchId}, model id(s) ${ids.join(', ')}, and prints ${figures.length} dollar figure(s) outside code`);
        if (unnamed.length) gaps.push(`README.md does not name model id(s) ${unnamed.join(', ')} that the batch's records carry`);
        if (untraced.length) gaps.push(`${untraced.length} README figure(s) no record produces: ${someOf(untraced)}`);
      }
      return verdict(evidence, gaps);
    },
  },
];

// Files a release may change after the measurement without changing what ran.
const PRESENTATION = /^(README\.md$|docs\/|assets\/)/;

// A `$1` in an awk or sed example is no price, so point 11 drops only what is
// certainly code and counts the rest as prose: a false gap is acceptable, a
// hidden figure is not. Code is a fence that opens at column 0 on three or more
// backticks with no backtick after them, or on three or more tildes, and whose
// closer, the first later line of at least that run of the same character
// indented at most three spaces, sits at column 0; and a span whose backtick
// runs of equal length open and close on one line, outside a backslash escape.
// A fence closed by an indented line counts as prose up to that line. A fence
// run indented 1-3 spaces may open a fence that a column-0 run closes, or sit
// in a list item, so no fence after it is stripped. Nothing at all is stripped
// from a line that opens with an HTML tag onward, a leading BOM aside, since
// a ``` line or a span inside an HTML block such as <details> is raw HTML, not
// code. An unclosed fence, a fence
// in a list or quote, indented code and a span that wraps lines all count as
// prose, and so does every line after a backtick run left open, up to the next
// blank line, since that run may close on a later line.
const FENCE = /^( {0,3})(?:(`{3,})[^`]*|(~{3,}).*)$/;
const HTML = /^ {0,3}<[A-Za-z/!?]/;
const SPAN = /\\[\s\S]|(`+)(?:.*?(?<!`)\1(?!`))?/g;

function proseOf(markdown) {
  const lines = markdown.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let open = false;
  let fences = true;
  let html = false;
  for (let i = 0; i < lines.length; i++) {
    if (HTML.test(lines[i])) html = true;
    if (html) { out.push(lines[i]); continue; }
    const fence = fences && FENCE.exec(lines[i]);
    if (fence && fence[1]) fences = false;
    else if (fence) {
      const run = fence[2] || fence[3];
      const close = new RegExp(`^ {0,3}${run[0]}{${run.length},}[ \\t]*$`);
      const end = lines.findIndex((line, j) => j > i && close.test(line));
      if (end > 0) {
        if (lines[end][0] === ' ') out.push(...lines.slice(i, end + 1));
        i = end;
        continue;
      }
    }
    if (/^[ \t]*$/.test(lines[i])) open = false;
    if (open) { out.push(lines[i]); continue; }
    out.push(lines[i].replace(SPAN, (m, run) => {
      if (m === run) open = true;
      return run && m !== run ? '' : m;
    }));
  }
  return out.join('\n');
}

/**
 * Git's output in `dir`, or null when the command fails. GIT_* variables are
 * dropped, as in runner/provenance.js, so an inherited GIT_DIR cannot point at
 * another repo.
 */
function gitIn(dir, args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  try {
    return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
}

/**
 * Files that differ between `commit` and the checkout's HEAD, or null when the
 * checkout does not hold that commit. Point 2 checks uncommitted changes
 * separately, through the checkout's dirty flag.
 */
function changedSince(dir, commit) {
  // -z keeps a non-ASCII path such as docs/guía.md unquoted.
  const out = gitIn(dir, ['diff', '-z', '--name-only', '--no-renames', commit, 'HEAD', '--']);
  return out === null ? null : out.split('\0').filter(Boolean);
}

/** True when a dollar figure, such as $3 or $1,204.50, equals one of the batch's costs at the figure's own precision. */
function figureIsGenerated(figure, costs) {
  const want = Number(figure.slice(1).replace(/,/g, ''));
  const digits = (figure.split('.')[1] || '').length;
  return costs.some((c) => Number(c.toFixed(digits)) === want);
}

function load(recordsDir, pluginDir, previousDir) {
  const ctx = { recordsDir, pluginDir, previousDir, runs: [], batches: [], manifest: null, loadError: null, previous: null, previousError: null };
  const missing = (dir, err) => (err.code === 'ENOENT' ? `${dir} does not exist` : err.message);
  try {
    Object.assign(ctx, readRecords(recordsDir));
    ctx.manifest = ctx.batches[0] || null;
  } catch (err) {
    ctx.loadError = missing(recordsDir, err);
  }
  if (previousDir) {
    try {
      const { runs, batches } = readRecords(previousDir);
      if (batches.length !== 1) ctx.previousError = `expected one batch.json, found ${batches.length}`;
      else ctx.previous = { runs, manifest: batches[0] };
    } catch (err) {
      ctx.previousError = missing(previousDir, err);
    }
  }
  const read = (rel) => fs.readFileSync(path.join(pluginDir, rel), 'utf8');
  ctx.caps = readCaps(read(path.join('output-styles', 'hush.md')));
  ctx.version = JSON.parse(read(path.join('.claude-plugin', 'plugin.json'))).version;
  ctx.readme = read('README.md');
  ctx.checkout = pluginProvenance(pluginDir);
  return ctx;
}

function runGate({ recordsDir, previousDir = null, pluginDir = pluginDirOf('hush'), points = POINTS }) {
  let ctx;
  let loadFailure = null;
  try { ctx = load(recordsDir, pluginDir, previousDir); } catch (err) { loadFailure = `the hush checkout cannot be read: ${err.message}`; }
  const results = points.map((p) => {
    try {
      if (loadFailure) throw new Error(loadFailure);
      return { n: p.n, point: p.point, proof: p.proof, ...p.check(ctx) };
    } catch (err) {
      return { n: p.n, point: p.point, proof: p.proof, met: false, evidence: [], missing: `the check itself failed: ${err.message}` };
    }
  });
  return { recordsDir, previousDir, pluginDir, results, ok: results.every((r) => r.met) };
}

function render(report) {
  const out = [`hush readiness gate: ${report.results.length} points`, `records:  ${report.recordsDir}`,
    `previous: ${report.previousDir}`, `plugin:   ${report.pluginDir}`, ''];
  for (const r of report.results) {
    out.push(`${r.met ? '[MET]    ' : '[NOT MET]'} ${r.n}. ${r.point}`);
    out.push(`          proven by:  ${r.proof}`);
    for (const e of r.evidence) out.push(`          evidence:   ${e}`);
    if (!r.met) out.push(`          MISSING:    ${r.missing}`);
  }
  const failed = report.results.filter((r) => !r.met);
  out.push('', failed.length
    ? `NOT READY TO PUBLISH: point(s) ${failed.map((r) => r.n).join(', ')} unmet.`
    : 'READY TO PUBLISH: every point met.');
  return out.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const records = flagOr(argv, '--records', null);
  const previous = flagOr(argv, '--previous', null);
  if (!records || !previous || argv.length !== 4) {
    console.error('Usage: node scripts/readiness-gate.js --records <batch folder> --previous <batch folder>');
    process.exit(2);
  }
  const report = runGate({ recordsDir: path.resolve(records), previousDir: path.resolve(previous) });
  console.log(render(report));
  process.exit(report.ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = { runGate, render, POINTS, figureIsGenerated };
