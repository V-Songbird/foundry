#!/usr/bin/env node
'use strict';
// Pick-flow eval on the Claude API: Foreman's Fast pick, from "what's next"
// to the destination question, in a simulated Claude Code session (sim.js).
// The `prose` arm reads today's skill files; the `p1` arm swaps pick.md for
// arms/p1/pick.md, whose `roadmap.js step pick` returns action codes. The
// `real` arm reads and runs a whole Foreman checkout with the real step
// (PICKFLOW_REAL_DIR, default the root's .private/foreman-step-pick).
//
//   node pickflow/run.js                       # plan only: cases and cost bounds, no network
//   node pickflow/run.js --smoke               # oracle and null replies through sim and grader
//   node --env-file=<key file> pickflow/run.js --go --max-usd 3 --tag p1-a
//
// Billing guards, as in ../../batch-judge.js: the key comes only from
// ANTHROPIC_API_KEY, loaded for one command with --env-file; the endpoint is
// fixed; --go and --max-usd are required to send; before every round the
// worst case (every reply at max_tokens, no cache) is checked against the cap.

const fs = require('node:fs');
const path = require('node:path');
const sim = require('./sim.js');
const hc = require('../../hillclimb.js');
const { modelId, PRICES } = require('../../batch-judge.js');
const { dataDir } = require('../../paths.js');

const API = 'https://api.anthropic.com/v1';
const HEADERS = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' };
// Cache writes bill 1.25x input and reads 0.1x (prompt-caching docs).
const CACHE_WRITE = 1.25;
const CACHE_READ = 0.1;
const CHARS_PER_TOKEN = 3; // over-counts, so worst cases err high

function parseArgs(argv) {
  const v = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
  return {
    tag: v('tag', 'dev'),
    model: modelId(v('model', 'opus')),
    api: v('api', 'batches'),
    arms: v('arms', 'prose,p1').split(','),
    scenarios: v('scenarios', null)?.split(',') ?? null,
    reps: Number(v('reps', 3)),
    maxRounds: Number(v('max-rounds', 14)),
    maxTokens: Number(v('max-tokens', 8192)),
    maxUsd: v('max-usd', null) === null ? null : Number(v('max-usd')),
    go: argv.includes('--go'),
    smoke: argv.includes('--smoke'),
  };
}

function makeCases(o) {
  const scenarios = o.scenarios ? sim.SCENARIOS.filter((s) => o.scenarios.includes(s.id)) : sim.SCENARIOS;
  if (o.scenarios && scenarios.length !== o.scenarios.length) throw new Error(`unknown scenario in ${o.scenarios.join(',')}`);
  const cases = [];
  for (const s of scenarios) for (const arm of o.arms) for (let rep = 0; rep < o.reps; rep++) {
    cases.push({ key: `c${cases.length}`, arm, rep, scenario: s, st: sim.newCase(s, arm), messages: [sim.firstMessage(s, arm)],
      usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      costUsd: 0, rounds: 0, toolCalls: 0, stop: null, error: null, model: null, latencyMs: 0 });
  }
  return cases;
}

// Only the last block of the conversation carries a breakpoint, so each round
// reads the previous round's prefix from the cache and writes its own.
function request(c, o) {
  const last = c.messages.length - 1;
  const messages = c.messages.map((m, i) => {
    if (i !== last) return m;
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
    return { ...m, content: blocks.map((b, j) => (j === blocks.length - 1 ? { ...b, cache_control: { type: 'ephemeral' } } : b)) };
  });
  return {
    model: o.model, max_tokens: o.maxTokens, tools: sim.TOOLS,
    system: [{ type: 'text', text: sim.SYSTEM, cache_control: { type: 'ephemeral' } }],
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

async function runCases(cases, send, o, log = console.log) {
  let spent = 0;
  for (let round = 1; round <= o.maxRounds; round++) {
    const active = cases.filter((c) => !c.stop);
    if (!active.length) break;
    const reqs = active.map((c) => ({ id: c.key, params: request(c, o) }));
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
      for (const b of msg.content) if (b.type === 'text') sim.noteText(c.st, b.text);
      if (msg.stop_reason === 'max_tokens') { c.stop = 'error'; c.error = 'stop_reason max_tokens'; continue; }
      const uses = msg.content.filter((b) => b.type === 'tool_use');
      if (msg.stop_reason !== 'tool_use' || !uses.length) { c.stop = 'end_turn'; continue; }
      const results = [];
      for (const u of uses) {
        c.toolCalls++;
        const t = sim.handleTool(c.st, u);
        results.push({ type: 'tool_result', tool_use_id: u.id, content: t.content || '(no output)' });
        if (t.stop) { c.stop = t.stop; break; }
      }
      c.messages.push({ role: 'user', content: results });
    }
  }
  for (const c of cases) if (!c.stop) c.stop = 'round_cap';
  return spent;
}

// --- offline replies ------------------------------------------------------------

const toolUse = (name, input, n) => ({ type: 'tool_use', id: `toolu_${n}`, name, input });
const reply = (content) => ({ message: { model: 'offline', content, stop_reason: content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn', usage: { input_tokens: 0, output_tokens: 0 } } });

function checksOf(entry) {
  const n = (String(entry.what).match(/`npm [^`]+`/g) || []).length;
  return { n, sliced: n >= 2 };
}

function lastResult(c) {
  const m = c.messages.at(-1);
  const r = Array.isArray(m.content) ? m.content.filter((b) => b.type === 'tool_result').at(-1) : null;
  try { return JSON.parse(String(r?.content).split('\n')[0]); } catch { return null; }
}

// What a model that follows each arm's skill exactly would send next.
function oracleTurn(c) {
  const s = c.scenario;
  const st = c.st;
  const n = c.rounds;
  const ask = (question, options) => toolUse('AskUserQuestion', { questions: [{ question, header: 'Foreman', multiSelect: false, options }] }, n);
  const bash = (command) => toolUse('Bash', { command }, n);
  const R = sim.ROOT;
  if (n === 0) return [toolUse('Skill', { skill: 'foreman:roadmap', args: s.request }, n)];
  if (c.arm === 'p1' || c.arm === 'real') {
    if (n === 1) return [toolUse('Read', { file_path: `${R}/skills/roadmap/pick.md` }, n)];
    if (n === 2) return [bash(s.expected.q1 === null && s.request.includes(s.choose) ? `node ${R}/scripts/roadmap.js step pick --chose ${s.choose}` : `node ${R}/scripts/roadmap.js step pick`)];
    const r = lastResult(c);
    if (r?.next === 'ask_q1') return [ask(r.question, r.options.map((o) => ({ label: o.label, description: `In short: ${o.why} ${o.reason}.` })))];
    if (!r && st.q1s.length) return [bash(`node ${R}/scripts/roadmap.js step pick --chose ${s.choose} --after q1`)];
    if (r?.next === 'gather_checks') {
      const k = checksOf(r.entry);
      const high = c.arm === 'real' && s.contextHigh ? ' --context-high' : '';
      const sliced = !k.sliced ? '' : c.arm === 'real' ? ` --slices ${k.n - 1}` : ' --sliced';
      return [bash(r.then.replace('<n>', String(k.n)) + sliced + high)];
    }
    if (r?.next === 'ask_q2') {
      const q = r.intro ? `${r.intro.title} (${r.intro.id}): ${r.intro.why} ${r.question}` : r.question;
      return [ask(q, r.options.map((o) => ({ label: o.label, description: o.description })))];
    }
    return [{ type: 'text', text: 'Stuck.' }];
  }
  // prose: the fixed sequence pick.md and destination-question.md describe
  const plan = [
    () => [toolUse('Read', { file_path: `${R}/skills/foreman/runtime.md` }, n), toolUse('Read', { file_path: `${R}/skills/roadmap/pick.md` }, `${n}b`)],
    () => [bash(`node ${R}/scripts/roadmap.js next-candidates --menu`)],
  ];
  if (s.expected.q1 !== null) {
    plan.push(() => [ask('Which task next?', sim.q1Options(st.menu).map((o) => ({ label: o.label, description: `In short: ${o.r.why} ${o.reason}.` })))]);
    plan.push(() => {
      const opts = sim.q1Options(st.menu);
      const at = opts.findIndex((o) => o.r.id === s.choose);
      const ev = opts[at].label.endsWith('(Recommended)') ? `pick_accepted '{"rank":${at + 1}}'` : `pick_overridden '{"chosen_rank":${at + 1}}'`;
      return [bash(`node ${R}/scripts/trial-log.js question_asked '{"flow":"pick"}' && node ${R}/scripts/trial-log.js ${ev}`)];
    });
  }
  plan.push(() => [bash(`node ${R}/scripts/roadmap.js list --ids ${s.choose}`)]);
  plan.push(() => [toolUse('Read', { file_path: `${R}/skills/roadmap/destination-question.md` }, n), bash(`node ${R}/scripts/safe-commit.js begin`)]);
  plan.push(() => {
    const cand = st.menu.candidates.find((x) => x.id === s.choose);
    const full = sim.entryRow(st, s.choose);
    const k = checksOf(full);
    const opts = sim.q2Options({ inProgressOther: (st.menu.in_progress || []).some((r) => r.id !== s.choose), collision: cand?.collision,
      dirty: s.dirty, checks: k.n, sliced: k.sliced, contextHigh: s.contextHigh });
    const q = s.expected.q2NamesEntry ? `${full.title} (${s.choose}): ${full.why} How do you want to run this?` : 'How do you want to run this?';
    return [ask(q, opts.map((o) => ({ label: o.label, description: o.description })))];
  });
  return (plan[n - 1] || (() => [{ type: 'text', text: 'Done.' }]))();
}

const offlineSender = (kind) => async (reqs, round, active) => new Map(active.map((c) => [c.key, kind === 'null' ? reply([{ type: 'text', text: 'I cannot help with that.' }]) : reply(oracleTurn(c))]));

// --- records and report ---------------------------------------------------------

function traceOf(messages) {
  const trace = [];
  let thinking = null;
  for (const m of messages) {
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
    for (const b of blocks) {
      const extra = thinking && m.role === 'assistant' ? { thinking } : {};
      if (b.type === 'thinking') { thinking = b.thinking; continue; }
      if (b.type === 'text') trace.push({ role: m.role, content: b.text, ...extra });
      else if (b.type === 'tool_use') trace.push({ role: 'tool_call', name: b.name, content: JSON.stringify(b.input ?? {}, null, 2), ...extra });
      else if (b.type === 'tool_result') trace.push({ role: 'tool_result', content: String(b.content) });
      else continue;
      if (m.role === 'assistant') thinking = null;
    }
  }
  return trace;
}

function record(c) {
  return {
    key: c.key, arm: c.arm, scenario: c.scenario.id, rep: c.rep, model: c.model, stop: c.stop, error: c.error,
    grade: c.stop === 'error' || c.stop === 'cap' ? null : sim.grade(c.st),
    usage: c.usage, costUsd: c.costUsd, rounds: c.rounds, toolCalls: c.toolCalls,
    events: c.st.events, violations: c.st.violations, readFiles: c.st.readFiles,
    q1: c.st.q1s, q2: c.st.q2,
  };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const inputOf = (u) => u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens;

function report(records, o) {
  const arms = [...new Set(records.map((r) => r.arm))];
  let md = `# Pick-flow eval \`${o.tag}\`\n\nModel ${o.model}, ${o.api} API, ${o.reps} reps per scenario. Input counts every token sent, cached or not.\n\n`;
  md += '| Arm | Graded | Pass | Q1 | Q2 | Events | Clean | Mean input tok | Cached share | Mean output tok | Mean tool calls | Mean rounds | Cost USD |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  for (const arm of arms) {
    const rs = records.filter((r) => r.arm === arm);
    const g = rs.filter((r) => r.grade);
    const rate = (k) => `${g.filter((r) => r.grade[k]).length}/${g.length}`;
    const inTok = mean(rs.map((r) => inputOf(r.usage)));
    const cached = mean(rs.map((r) => (inputOf(r.usage) ? r.usage.cache_read_input_tokens / inputOf(r.usage) : 0)));
    md += `| ${arm} | ${g.length}/${rs.length} | ${rate('pass')} | ${rate('q1')} | ${rate('q2')} | ${rate('events')} | ${rate('clean')} | ${Math.round(inTok)} | ${(cached * 100).toFixed(0)} % | ${Math.round(mean(rs.map((r) => r.usage.output_tokens)))} | ${mean(rs.map((r) => r.toolCalls)).toFixed(1)} | ${mean(rs.map((r) => r.rounds)).toFixed(1)} | ${rs.reduce((n, r) => n + r.costUsd, 0).toFixed(3)} |\n`;
  }
  md += '\n| Scenario | ' + arms.join(' pass | ') + ' pass |\n|---|' + arms.map(() => '---|').join('') + '\n';
  for (const s of [...new Set(records.map((r) => r.scenario))]) {
    md += `| ${s} | ` + arms.map((a) => { const rs = records.filter((r) => r.arm === a && r.scenario === s && r.grade); return `${rs.filter((r) => r.grade.pass).length}/${rs.length}`; }).join(' | ') + ' |\n';
  }
  const bad = records.filter((r) => r.error || r.violations.length);
  if (bad.length) md += '\n' + bad.map((r) => `- ${r.arm} ${r.scenario} rep ${r.rep}: ${[r.error, ...r.violations].filter(Boolean).join('; ')}`).join('\n') + '\n';
  return md;
}

function writeVariants(cases, o) {
  const flow = path.join(hc.FOUNDRY, '.claude', 'hillclimb', 'foreman-pickflow');
  const VARIANT = { prose: 'baseline', p1: 'v1', real: 'v2' };
  for (const arm of new Set(cases.map((c) => c.arm))) {
    const attempts = cases.filter((c) => c.arm === arm).map((c) => {
      const rec = record(c);
      return {
        prompt_id: c.scenario.id, rep: c.rep, prompt: c.scenario.request, tags: [c.scenario.id, arm], grade: rec.grade, error: c.error,
        stream: { trace: traceOf(c.messages), usage: c.usage, model: c.model, toolCalls: c.toolCalls,
          failure: c.stop === 'error' ? 'serving_error' : c.stop === 'cap' ? 'no_result' : null,
          status: c.stop === 'round_cap' ? 'truncated' : 'ok', stop_reason: c.stop, latency_s: c.latencyMs / 1000 || null },
        meta: { arm, stop: c.stop, violations: rec.violations, events: rec.events, cost_usd: c.costUsd, rounds: c.rounds },
      };
    });
    const out = hc.writeVariant(flow, VARIANT[arm], attempts);
    console.log(`hill-climb ${VARIANT[arm]} (${arm}): ${out.rows} rows, ${out.errors} errors -> ${out.dir}`);
  }
}

async function smoke(o) {
  let wrong = 0;
  for (const kind of ['oracle', 'null']) {
    const cases = makeCases({ ...o, reps: 1 });
    await runCases(cases, offlineSender(kind), { ...o, maxUsd: null }, () => {});
    for (const c of cases) {
      const g = sim.grade(c.st);
      const ok = kind === 'oracle' ? g.pass === 1 : g.pass === 0;
      if (!ok) wrong++;
      console.log(`${ok ? 'ok   ' : 'WRONG'} ${kind.padEnd(6)} ${c.arm.padEnd(5)} ${c.scenario.id.padEnd(12)} ${JSON.stringify(g)}${c.st.violations.length ? ` ${c.st.violations.join('; ')}` : ''}`);
    }
  }
  return wrong ? 1 : 0;
}

async function main(argv = process.argv.slice(2)) {
  const o = parseArgs(argv);
  for (const a of o.arms) if (!sim.ARMS[a]) { console.error(`unknown arm ${a}; valid: ${Object.keys(sim.ARMS).join(', ')}`); return 2; }
  if (!['batches', 'messages'].includes(o.api)) { console.error('--api must be batches or messages'); return 2; }
  if (!fs.existsSync(path.join(sim.FOREMAN, 'scripts', 'roadmap.js'))) { console.error(`no Foreman checkout at ${sim.FOREMAN}; set FOREMAN_DIR`); return 2; }
  if (o.smoke) return smoke(o);

  const cases = makeCases(o);
  const round1 = worstUsd(cases.map((c) => request(c, o)), o);
  // The oracle path: the fewest rounds a case can take, its context uncached.
  const probe = makeCases({ ...o, reps: 1 });
  let oracleIn = 0;
  const lastChars = new Map();
  await runCases(probe, async (reqs, round, active) => {
    for (const r of reqs) oracleIn += JSON.stringify(r.params).length / CHARS_PER_TOKEN;
    for (const c of active) lastChars.set(c, JSON.stringify(request(c, o).messages).length);
    return offlineSender('oracle')(reqs, round, active);
  }, { ...o, maxUsd: null }, () => {});
  for (const arm of o.arms) {
    const cs = probe.filter((c) => c.arm === arm);
    console.log(`oracle path, ${arm}: ${mean(cs.map((c) => c.rounds)).toFixed(1)} rounds, about ${Math.round(mean(cs.map((c) => lastChars.get(c))) / 4)} tokens of conversation at the destination question (chars / 4)`);
  }
  const [pin, pout] = price(o.model);
  const oracleUsd = (oracleIn * o.reps * pin + cases.length * 8 * 1500 * pout) / 1e6 * discount(o);
  console.log(`${cases.length} cases: ${o.arms.join(', ')} x ${new Set(cases.map((c) => c.scenario.id)).size} scenarios x ${o.reps} reps, ${o.model}, ${o.api} API, up to ${o.maxRounds} rounds`);
  console.log(`round 1 worst case $${round1.toFixed(2)}; oracle-path estimate without cache, 1500 output tokens a round: $${oracleUsd.toFixed(2)}`);
  if (!o.go) {
    console.log('plan only: nothing was sent. Add --go and --max-usd <usd>, with the key loaded through node --env-file.');
    return 0;
  }
  if (!(o.maxUsd > 0)) { console.error('--max-usd is required with --go'); return 2; }
  apiKey();

  const outDir = path.join(dataDir('foreman'), 'pickflow', o.tag);
  if (fs.existsSync(path.join(outDir, 'records.json'))) { console.error(`${outDir} already holds a run; pick another --tag`); return 2; }
  fs.mkdirSync(path.join(outDir, 'rounds'), { recursive: true });
  const send = o.api === 'batches' ? batchSender(outDir, console.log) : messagesSender(outDir, console.log);
  const spent = await runCases(cases, send, o);
  const records = cases.map(record);
  fs.writeFileSync(path.join(outDir, 'records.json'), JSON.stringify(records, null, 2));
  fs.writeFileSync(path.join(outDir, 'report.md'), report(records, o));
  writeVariants(cases, o);
  console.log(`spent about $${spent.toFixed(3)}; report: ${path.join(outDir, 'report.md')}`);
  return 0;
}

module.exports = { parseArgs, makeCases, request, costOf, worstUsd, runCases, oracleTurn, offlineSender, traceOf, record, report };
if (require.main === module) main().then((code) => { process.exitCode = code; }, (err) => { console.error(err.message); process.exitCode = 1; });
