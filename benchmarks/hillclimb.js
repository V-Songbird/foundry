'use strict';

// The per-variant contract that /claude-api build-eval and /claude-api
// hillclimb read, written from each suite's own run output:
//
//   <flow>/<variant>/results.jsonl         one graded row per (case, rep)
//   <flow>/<variant>/traces/<id>_rep<k>.json  that attempt's conversation
//   <flow>/<variant>/errors.jsonl          attempts with no scorable output
//
// A suite supplies four functions and this module does the rest:
//   adapt(source, arm)  -> attempts   read a finished run (a tag or a run folder)
//   live(tag, arm, extra) -> source   start that run with the suite's own runner
//   gradeStored(meta)   -> grade      grade one stored attempt again, offline
//   smoke()             -> cases      oracle and null outputs through the grader
//
// Split, noise floor, headroom and the report belong to the native commands;
// nothing here computes them.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FOUNDRY = path.resolve(__dirname, '..');
const VARIANT = /^(baseline|v\d+)$/;
const USAGE_KEYS = ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'];
const VALUE_FLAGS = ['variant', 'flow', 'arm', 'from'];
const SWITCHES = ['regrade', 'smoke'];
const USAGE = 'usage: hillclimb.js --smoke\n'
  + '       hillclimb.js --variant <baseline|vN> [--flow <dir>] --regrade\n'
  + '       hillclimb.js --variant <baseline|vN> [--flow <dir>] [--arm <name>] [--from <source> | -- <runner flags>]';

function toolText(content) {
  if (typeof content === 'string') return content;
  return (Array.isArray(content) ? content : [])
    .map((p) => (p.type === 'text' ? p.text : `<[${p.type}]>`)).join('\n');
}

// One attempt's `claude -p --output-format stream-json` output, which may hold
// several calls in a row (each starts with a system/init event). `prompts` are
// the user messages in call order: stream-json never echoes them. `sent` is how
// many calls the run made, when its record says so; it defaults to the prompts.
function readStream(jsonl, prompts, sent = prompts.length) {
  const trace = [{ role: 'user', content: prompts[0] ?? '' }];
  const usage = Object.fromEntries(USAGE_KEYS.map((k) => [k, 0]));
  const models = new Map();
  const results = [];
  let initModel = null;
  let calls = 0;
  let toolCalls = 0;
  let thinking = null;
  for (const line of String(jsonl || '').split('\n')) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; } // blank, or cut off by a kill
    if (ev.type === 'system' && ev.subtype === 'init') {
      initModel = initModel || ev.model || null;
      if (calls++ > 0 && prompts[calls - 1] != null) trace.push({ role: 'user', content: prompts[calls - 1] });
    } else if (ev.type === 'assistant' && ev.message) {
      // The API response's own model field; `<synthetic>` marks text the CLI wrote itself.
      const m = ev.message.model;
      if (m && m !== '<synthetic>') models.set(m, (models.get(m) || 0) + 1);
      for (const c of ev.message.content || []) {
        const extra = thinking ? { thinking } : {};
        if (c.type === 'thinking' && c.thinking) { thinking = c.thinking; continue; }
        if (c.type === 'text' && c.text) trace.push({ role: 'assistant', content: c.text, ...extra });
        else if (c.type === 'tool_use') {
          toolCalls++;
          trace.push({ role: 'tool_call', name: c.name, content: JSON.stringify(c.input ?? {}, null, 2), ...extra });
        } else continue;
        thinking = null;
      }
    } else if (ev.type === 'user' && Array.isArray(ev.message?.content)) {
      for (const c of ev.message.content) {
        if (c.type === 'tool_result') trace.push({ role: 'tool_result', content: toolText(c.content) });
      }
    } else if (ev.type === 'result') {
      results.push(ev);
      for (const k of USAGE_KEYS) usage[k] += ev.usage?.[k] || 0;
    }
  }
  const model = [...models].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const subtypes = results.map((r) => r.subtype);
  const finalText = String(results.at(-1)?.result ?? '');
  // An attempt the harness killed, the API refused or the plan limit stopped
  // has no output to score; a turn-capped one does, but it is not comparable.
  // A conversation that stopped before its last prompt is unscored too, even
  // when the dead call wrote nothing at all; a limit or an API error comes
  // first, since it is usually why a later call wrote nothing.
  let failure = null;
  if (/you\s*['’]?ve hit your (session|usage|weekly) limit/i.test(finalText)) failure = 'rate_limited';
  else if (results.some((r) => r.subtype !== 'error_max_turns' && (r.is_error || /^error/.test(r.subtype || '')))) failure = 'serving_error';
  else if (results.length < Math.max(1, calls, sent)) failure = 'no_result';
  else if (!model) failure = 'no_model';
  return {
    trace, usage, model, initModel, toolCalls, failure,
    status: subtypes.includes('error_max_turns') ? 'truncated' : 'ok',
    stop_reason: subtypes.at(-1) || null,
    latency_s: results.length ? results.reduce((n, r) => n + (r.duration_ms || 0), 0) / 1000 : null,
  };
}

// attempts: [{ prompt_id, rep, prompt, tags, grade, stream, meta, error }]
// `grade` is null when the suite could not score the attempt.
function writeVariant(flowDir, variant, attempts) {
  if (!VARIANT.test(String(variant))) throw new Error(`--variant must be baseline or v<N>, got ${variant}`);
  const dir = path.join(flowDir, variant);
  // Nothing to write (a wrong --arm, say) leaves an earlier call's files as they were.
  if (!attempts.length) return { dir, rows: 0, errors: 0 };
  // A trace left by an earlier call would outlive the row it belonged to.
  fs.rmSync(path.join(dir, 'traces'), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'traces'), { recursive: true });
  const rows = [];
  const errors = [];
  for (const a of attempts) {
    if (!/^[\w.-]+$/.test(a.prompt_id)) throw new Error(`prompt_id is not path-safe: ${a.prompt_id}`);
    const s = a.stream;
    const failure = s.failure || (a.grade ? null : s.status === 'truncated' ? 'turn_cap' : 'harness_error');
    if (failure) {
      errors.push({
        prompt_id: a.prompt_id, rep: a.rep, failure_class: failure, error: a.error || failure,
        model: s.model, usage: s.usage, latency_s: s.latency_s,
      });
      continue;
    }
    rows.push({
      prompt_id: a.prompt_id, rep: a.rep, prompt: a.prompt, tags: a.tags, grade: a.grade,
      model: s.model, usage: s.usage, latency_s: s.latency_s,
      stop_reason: s.stop_reason, status: s.status, tool_calls: s.toolCalls, meta: a.meta,
    });
    fs.writeFileSync(path.join(dir, 'traces', `${a.prompt_id}_rep${a.rep}.json`), JSON.stringify(s.trace, null, 2));
  }
  const order = (x, y) => x.prompt_id.localeCompare(y.prompt_id) || x.rep - y.rep;
  const jsonl = (list) => list.sort(order).map((r) => JSON.stringify(r) + '\n').join('');
  fs.writeFileSync(path.join(dir, 'results.jsonl'), jsonl(rows));
  fs.writeFileSync(path.join(dir, 'errors.jsonl'), jsonl(errors));
  // Every field is optional; the loop's change.md supplies the description.
  if (!fs.existsSync(path.join(dir, 'summary.json'))) fs.writeFileSync(path.join(dir, 'summary.json'), '{}\n');
  return { dir, rows: rows.length, errors: errors.length };
}

// A throwaway copy of a stored workspace, so a grader that writes (held-back
// tests, build output) never changes what the session left behind.
function scratchCopy(dir) {
  if (!dir || !fs.existsSync(dir)) return null;
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'hillclimb-regrade-'));
  fs.cpSync(dir, copy, { recursive: true });
  return copy;
}

// Grades every stored row twice and lists each metric whose verdict differs
// between the two passes or from the grade the row carries.
async function regrade(flowDir, variant, gradeStored) {
  const file = path.join(flowDir, variant, 'results.jsonl');
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const flips = [];
  const skipped = [];
  for (const row of rows) {
    const at = `${row.prompt_id}_rep${row.rep}`;
    let a, b;
    try {
      a = await gradeStored(row.meta);
      b = await gradeStored(row.meta);
    } catch (err) {
      skipped.push({ at, reason: err.message });
      continue;
    }
    for (const k of Object.keys(row.grade)) {
      const seen = [row.grade[k], a[k], b[k]];
      if (new Set(seen.map(String)).size > 1) flips.push({ at, metric: k, recorded: seen[0], first: seen[1], second: seen[2] });
    }
  }
  return { graded: rows.length - skipped.length, flips, skipped };
}

async function main(suite, argv = process.argv.slice(2)) {
  const sep = argv.indexOf('--');
  const own = sep < 0 ? argv : argv.slice(0, sep);
  const extra = sep < 0 ? [] : argv.slice(sep + 1);
  // Every argument is checked before anything runs: a malformed call must
  // never fall through to a suite's live(), which starts paid sessions.
  const opts = {};
  for (let i = 0; i < own.length; i++) {
    const name = own[i].startsWith('--') ? own[i].slice(2) : null;
    let problem = null;
    if (SWITCHES.includes(name)) opts[name] = true;
    else if (VALUE_FLAGS.includes(name)) {
      const v = own[++i];
      if (!v || v.startsWith('--')) problem = `--${name} needs a value`;
      else opts[name] = v;
    } else problem = name ? `unknown flag ${own[i]}; pass the suite runner's own flags after --` : `unexpected argument ${own[i]}`;
    if (problem) {
      console.error(`${problem}\n${USAGE}`);
      return 2;
    }
  }
  const flag = (n) => opts[n] ?? null;

  if (opts.smoke) {
    const cases = await suite.smoke();
    const wrong = cases.filter((c) => (c.kind === 'oracle') !== (c.pass === 1));
    for (const c of cases) console.log(`${wrong.includes(c) ? 'WRONG' : 'ok   '} ${c.kind.padEnd(6)} ${c.id}  pass=${c.pass}`);
    const share = (kind) => { const k = cases.filter((c) => c.kind === kind); return `${k.filter((c) => c.pass === 1).length}/${k.length}`; };
    console.log(`oracle ${share('oracle')} pass (want all), null ${share('null')} pass (want none)`);
    return wrong.length ? 1 : 0;
  }

  const variant = flag('variant');
  if (!VARIANT.test(String(variant))) {
    console.error('--variant must be baseline or v<N>');
    return 2;
  }
  const flow = path.resolve(flag('flow') || path.join(FOUNDRY, '.claude', 'hillclimb', suite.name));

  if (opts.regrade) {
    const r = await regrade(flow, variant, suite.gradeStored);
    for (const f of r.flips) console.log(`FLIP ${f.at} ${f.metric}: recorded ${f.recorded}, then ${f.first}, then ${f.second}`);
    for (const s of r.skipped) console.log(`SKIP ${s.at}: ${s.reason}`);
    console.log(`regraded ${r.graded} rows twice: ${r.flips.length} flipped verdicts, ${r.skipped.length} not regradable`);
    return r.flips.length || !r.graded ? 1 : 0;
  }

  const arm = flag('arm') || suite.arm;
  const source = 'from' in opts ? opts.from : await suite.live(`hc-${path.basename(flow)}-${variant}`, arm, extra);
  const out = writeVariant(flow, variant, await suite.adapt(source, arm));
  console.log(`${suite.name} ${variant}: ${out.rows} rows, ${out.errors} errors -> ${out.dir}`);
  return out.rows ? 0 : 1;
}

module.exports = { readStream, writeVariant, scratchCopy, regrade, main, FOUNDRY };
