'use strict';
// The Claude API path the simulated-session evals share: pickflow, closeflow
// and discoveryflow. A flow names its system prompt, its tools and its tool
// handler; this module sends each round of every live case as one Message
// Batch (or as plain Messages calls), prices it and keeps it under the cap.
//
// Billing guards, as in ../../batch-judge.js: the key comes only from
// ANTHROPIC_API_KEY, loaded for one command with --env-file; the endpoint is
// fixed; --go and --max-usd are required to send; before every round the
// worst case (every reply at max_tokens, no cache) is checked against the cap.

const fs = require('node:fs');
const path = require('node:path');
const { modelId, PRICES } = require('../../batch-judge.js');
const { dataDir } = require('../../paths.js');
const { flagOr, wholeNumberUsage, usdCapValueUsage } = require('../../flags.js');

const API = 'https://api.anthropic.com/v1';
const HEADERS = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' };
// Cache writes bill 1.25x input and reads 0.1x (prompt-caching docs).
const CACHE_WRITE = 1.25;
const CACHE_READ = 0.1;
const CHARS_PER_TOKEN = 3; // over-counts, so worst cases err high

// A reader for a flow's value flags that never exits: a flag with no value, or another
// flag as its value, reads as its default and leaves the first usage line in `o.usage`,
// which the flow's main prints before it plans or sends anything.
// Pass allowEmpty false to refuse an empty value too.
function flagReader(argv, o) {
  return (n, d, allowEmpty = true) => flagOr(argv, n, d, (message) => { o.usage ??= message; return d; }, allowEmpty);
}

// The flags every live flow reads, with its own defaults.
function apiArgs(argv, { reps = 1, maxRounds = 20, maxTokens = 8192 } = {}) {
  const o = { usage: null };
  const v = flagReader(argv, o);
  // The count flags and the cap are read as typed, so countUsage and capUsage print what the user typed.
  const typed = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  const raw = { reps: typed('reps', reps), 'max-rounds': typed('max-rounds', maxRounds), 'max-tokens': typed('max-tokens', maxTokens), 'max-usd': typed('max-usd') };
  return Object.assign(o, {
    tag: v('tag', 'dev', false),
    model: modelId(v('model', 'opus')),
    api: v('api', 'batches'),
    reps: Number(raw.reps),
    maxRounds: Number(raw['max-rounds']),
    maxTokens: Number(raw['max-tokens']),
    raw,
    maxUsd: typed('max-usd', null) === null ? null : Number(raw['max-usd']),
    go: argv.includes('--go'),
    smoke: argv.includes('--smoke'),
  });
}

// A usage line for a text flag with no value, or for a count flag that is not a whole number
// of at least 1, or null, by the rule the judge scripts share (flags.js), with the value
// as typed. A NaN --max-tokens would turn the round guard off; Infinity would never end a loop.
function countUsage(o) {
  if (o.usage) return o.usage;
  for (const flag of ['reps', 'max-rounds', 'max-tokens']) {
    const bad = wholeNumberUsage(flag, o.raw[flag]);
    if (bad) return bad;
  }
  return null;
}

// The usage line for a --go without a finite --max-usd above 0, or null, by the same rule.
function capUsage(o) {
  return usdCapValueUsage('--max-usd', o.raw['max-usd']);
}

// The cost fields a live case carries beside its flow's own.
const meter = () => ({ usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }, costUsd: 0, model: null, latencyMs: 0 });

// Only the last block of the conversation carries a breakpoint, so each round
// reads the previous round's prefix from the cache and writes its own.
function request(c, o, flow) {
  const last = c.messages.length - 1;
  const messages = c.messages.map((m, i) => {
    if (i !== last) return m;
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
    return { ...m, content: blocks.map((b, j) => (j === blocks.length - 1 ? { ...b, cache_control: { type: 'ephemeral' } } : b)) };
  });
  return {
    model: o.model, max_tokens: o.maxTokens, tools: flow.TOOLS,
    system: [{ type: 'text', text: flow.SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages,
  };
}

function price(model) {
  const p = PRICES[model];
  if (!p) throw new Error(`no price for ${model}; add it to PRICES in batch-judge.js`);
  return p;
}
const discount = (o) => (o.api === 'batches' ? 0.5 : 1);

function costOf(u, o) {
  const [pin, pout] = price(o.model);
  return ((u.input_tokens || 0) * pin + (u.cache_creation_input_tokens || 0) * pin * CACHE_WRITE
    + (u.cache_read_input_tokens || 0) * pin * CACHE_READ + (u.output_tokens || 0) * pout) / 1e6 * discount(o);
}

function worstUsd(params, o) {
  const [pin, pout] = price(o.model);
  return params.reduce((n, p) => n + (JSON.stringify(p).length / CHARS_PER_TOKEN * pin + o.maxTokens * pout) / 1e6, 0) * discount(o);
}

// --- senders: requests [{id, params}] -> Map(id -> {message} | {error}) -------

async function call(url, key, init = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { ...HEADERS, 'x-api-key': key } });
    const body = await res.text();
    if (res.ok) return body;
    if (attempt < 4 && [429, 500, 529].includes(res.status)) {
      await new Promise((r) => setTimeout(r, 15000 * attempt));
      continue;
    }
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
}

function apiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set; run with node --env-file=<file>');
  return key;
}

function batchSender(outDir, log) {
  return async (reqs, round) => {
    const key = apiKey();
    const created = JSON.parse(await call(`${API}/messages/batches`, key, {
      method: 'POST', body: JSON.stringify({ requests: reqs.map((r) => ({ custom_id: r.id, params: r.params })) }),
    }));
    log(`round ${round}: batch ${created.id}, ${reqs.length} requests`);
    let batch = created;
    while (batch.processing_status !== 'ended') {
      await new Promise((r) => setTimeout(r, 20000));
      batch = JSON.parse(await call(`${API}/messages/batches/${created.id}`, key));
    }
    const jsonl = await call(`${API}/messages/batches/${created.id}/results`, key);
    fs.writeFileSync(path.join(outDir, 'rounds', `round-${round}.jsonl`), jsonl);
    const out = new Map();
    for (const line of jsonl.split('\n').filter((l) => l.trim())) {
      const row = JSON.parse(line);
      const r = row.result || {};
      out.set(row.custom_id, r.type === 'succeeded' ? { message: r.message } : { error: `${r.type}: ${JSON.stringify(r.error || {}).slice(0, 200)}` });
    }
    return out;
  };
}

function messagesSender(outDir, log) {
  return async (reqs, round) => {
    const key = apiKey();
    const out = new Map();
    const rows = [];
    let next = 0;
    async function worker() {
      while (next < reqs.length) {
        const r = reqs[next++];
        const started = Date.now();
        try {
          const message = JSON.parse(await call(`${API}/messages`, key, { method: 'POST', body: JSON.stringify(r.params) }));
          out.set(r.id, { message, latencyMs: Date.now() - started });
          rows.push(JSON.stringify({ custom_id: r.id, message }));
        } catch (err) {
          out.set(r.id, { error: String(err.message) });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(4, reqs.length) }, worker));
    fs.writeFileSync(path.join(outDir, 'rounds', `round-${round}.jsonl`), rows.join('\n') + '\n');
    log(`round ${round}: ${reqs.length} messages`);
    return out;
  };
}

// --- the loop -----------------------------------------------------------------

// send(requests, round, activeCases) -> Map(key -> {message} | {error}).
// flow.handle(st, block) -> {content, stop}; a stop ends the case after this
// round, and with flow.stopAtFirst the round's later calls are not run.
async function runCases(cases, send, o, flow, log = console.log) {
  let spent = 0;
  for (let round = 1; round <= o.maxRounds; round++) {
    const active = cases.filter((c) => !c.stop);
    if (!active.length) break;
    const reqs = active.map((c) => ({ id: c.key, params: request(c, o, flow) }));
    const worst = worstUsd(reqs.map((r) => r.params), o);
    if (o.maxUsd != null && spent + worst > o.maxUsd) {
      for (const c of active) { c.stop = 'cap'; c.error = `round ${round} worst case $${worst.toFixed(2)} would pass --max-usd ${o.maxUsd}`; }
      log(`stopped before round ${round}: spent $${spent.toFixed(2)}, worst case $${worst.toFixed(2)}, cap $${o.maxUsd}`);
      break;
    }
    const replies = await send(reqs, round, active);
    for (const c of active) {
      const r = replies.get(c.key);
      c.rounds++;
      if (!r || r.error) { c.stop = 'error'; c.error = r?.error || 'no result'; continue; }
      const msg = r.message;
      for (const k of Object.keys(c.usage)) c.usage[k] += msg.usage?.[k] || 0;
      const cost = costOf(msg.usage || {}, o);
      c.costUsd += cost;
      spent += cost;
      c.model = msg.model || c.model;
      c.latencyMs += r.latencyMs || 0;
      c.messages.push({ role: 'assistant', content: msg.content });
      if (flow.noteText) for (const b of msg.content) if (b.type === 'text') flow.noteText(c.st, b.text);
      if (msg.stop_reason === 'max_tokens') { c.stop = 'error'; c.error = 'stop_reason max_tokens'; continue; }
      const uses = msg.content.filter((b) => b.type === 'tool_use');
      if (msg.stop_reason !== 'tool_use' || !uses.length) { c.stop = 'end_turn'; continue; }
      const results = [];
      let stop = null;
      for (const u of uses) {
        c.toolCalls++;
        const t = flow.handle(c.st, u);
        results.push({ type: 'tool_result', tool_use_id: u.id, content: t.content || '(no output)' });
        stop = stop || t.stop || null;
        if (stop && flow.stopAtFirst) break;
      }
      c.messages.push({ role: 'user', content: results });
      if (stop) c.stop = stop;
    }
  }
  for (const c of cases) if (!c.stop) c.stop = 'round_cap';
  return spent;
}

// --- plan, live run and report for closeflow and discoveryflow -------------------

// From one rep of fresh cases: round 1's worst case, and the oracle path's
// cost, its requests uncached and 1500 output tokens a round; both for o.reps.
async function costPlan(probe, oracle, o, flow) {
  const round1 = worstUsd(probe.map((c) => request(c, o, flow)), o) * o.reps;
  let chars = 0;
  let calls = 0;
  await runCases(probe, async (reqs, round, active) => {
    for (const r of reqs) chars += JSON.stringify(r.params).length;
    calls += reqs.length;
    return oracle(reqs, round, active);
  }, { ...o, maxUsd: null }, flow, () => {});
  const [pin, pout] = price(o.model);
  const oracleUsd = (chars / CHARS_PER_TOKEN * pin + calls * 1500 * pout) / 1e6 * discount(o) * o.reps;
  return { round1, oracleUsd };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const inputOf = (u) => u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens;

function record(c, grade) {
  return {
    key: c.key, arm: c.arm, scenario: c.scenario.id, rep: c.rep, model: c.model, stop: c.stop, error: c.error,
    grade: c.stop === 'error' || c.stop === 'cap' ? null : grade(c.st),
    usage: c.usage, costUsd: c.costUsd, rounds: c.rounds, toolCalls: c.toolCalls,
    events: c.st.events, violations: c.st.violations,
  };
}

function report(records, o, title) {
  const arms = [...new Set(records.map((r) => r.arm))];
  const dims = Object.keys(records.find((r) => r.grade)?.grade || { pass: 0 });
  let md = `# ${title} \`${o.tag}\`\n\nModel ${o.model}, ${o.api} API, ${o.reps} reps per scenario. Input counts every token sent, cached or not.\n\n`;
  md += `| Arm | Graded | ${dims.join(' | ')} | Mean input tok | Mean output tok | Mean tool calls | Mean rounds | Cost USD |\n|---|---|${dims.map(() => '---|').join('')}---|---|---|---|---|\n`;
  for (const arm of arms) {
    const rs = records.filter((r) => r.arm === arm);
    const g = rs.filter((r) => r.grade);
    md += `| ${arm} | ${g.length}/${rs.length} | ${dims.map((d) => `${g.filter((r) => r.grade[d]).length}/${g.length}`).join(' | ')} | ${Math.round(mean(rs.map((r) => inputOf(r.usage))))} | ${Math.round(mean(rs.map((r) => r.usage.output_tokens)))} | ${mean(rs.map((r) => r.toolCalls)).toFixed(1)} | ${mean(rs.map((r) => r.rounds)).toFixed(1)} | ${rs.reduce((n, r) => n + r.costUsd, 0).toFixed(3)} |\n`;
  }
  md += '\n| Scenario | ' + arms.join(' pass | ') + ' pass |\n|---|' + arms.map(() => '---|').join('') + '\n';
  for (const s of [...new Set(records.map((r) => r.scenario))]) {
    md += `| ${s} | ` + arms.map((a) => { const rs = records.filter((r) => r.arm === a && r.scenario === s && r.grade); return `${rs.filter((r) => r.grade.pass).length}/${rs.length}`; }).join(' | ') + ' |\n';
  }
  const bad = records.filter((r) => r.error || r.violations.length);
  if (bad.length) md += '\n' + bad.map((r) => `- ${r.arm} ${r.scenario} rep ${r.rep}: ${[r.error, ...r.violations].filter(Boolean).join('; ')}`).join('\n') + '\n';
  return md;
}

// After the plan: refuse without --go and --max-usd, then run every case on
// the API, grade it before cleanup, and write records.json and report.md.
// The output lands in <outRoot>/<name>/<tag>/.
async function live({ name, title, o, makeCases, flow, grade, cleanup, outRoot = dataDir('foreman'), log = console.log }) {
  if (!o.go) {
    log('plan only: nothing was sent. Add --go and --max-usd <usd>, with the key loaded through node --env-file.');
    return 0;
  }
  const badCap = capUsage(o);
  if (badCap) { log(badCap); return 2; }
  apiKey();
  const outDir = path.join(outRoot, name, o.tag);
  if (fs.existsSync(path.join(outDir, 'records.json'))) { log(`${outDir} already holds a run; pick another --tag`); return 2; }
  fs.mkdirSync(path.join(outDir, 'rounds'), { recursive: true });
  const cases = makeCases(o);
  let spent;
  let records;
  try {
    spent = await runCases(cases, o.api === 'batches' ? batchSender(outDir, log) : messagesSender(outDir, log), o, flow, log);
    records = cases.map((c) => record(c, grade));
  } finally {
    for (const c of cases) cleanup(c.st);
  }
  fs.writeFileSync(path.join(outDir, 'records.json'), JSON.stringify(records, null, 2));
  fs.writeFileSync(path.join(outDir, 'report.md'), report(records, o, title));
  log(`spent about $${spent.toFixed(3)}; report: ${path.join(outDir, 'report.md')}`);
  return 0;
}

module.exports = {
  apiArgs, flagReader, countUsage, capUsage, meter, request, price, costOf, worstUsd, apiKey, batchSender, messagesSender, runCases,
  costPlan, record, report, live,
};
