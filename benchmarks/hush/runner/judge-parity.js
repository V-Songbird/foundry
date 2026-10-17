#!/usr/bin/env node
'use strict';
// Paired regrade: does the Batches judge agree with the claude -p judge?
//
// Reads one stored batch whose claude -p verdicts are on disk: answerable rows
// saved with --save, and retention verdicts in results/retention-cache.json.
// Sends both judges' unchanged prompts --reps times in ONE Message Batches
// job, then compares:
//
//   cli vs api   per item (answerable questions, retention claims) and per
//                arm (the figures a README quotes)
//   api vs api   the same between reps: the judge's own noise, which the
//                first number is read against
//
// COSTS MONEY with --go, billed to ANTHROPIC_API_KEY. Without --go it prints
// the plan and sends nothing.
//
//   node runner/judge-parity.js --records ../../.private/benchmarks/hush/records-archive/rm293-d516617d \
//     --answerable ../../.private/benchmarks/hush/results/rm293/answerable.jsonl
//   node --env-file=<key file> runner/judge-parity.js <same flags> --go --max-usd 6

const fs = require('node:fs');
const path = require('node:path');
const answerable = require('./answerable.js');
const retention = require('./retention.js');
const { runBatch } = require('../../batch-judge.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(require('../../paths.js').dataDir('hush'), 'results');
const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));
const KEYS = JSON.parse(fs.readFileSync(path.join(ROOT, 'retention-keys.json'), 'utf8')).tasks;

/** Share of positions where two lists of boolean lists agree. */
function agreement(a, b) {
  let agree = 0, total = 0;
  for (let i = 0; i < a.length; i++) {
    if (!a[i] || !b[i]) continue;
    for (let j = 0; j < a[i].length; j++) {
      total++;
      if (a[i][j] === b[i][j]) agree++;
    }
  }
  return { agree, total, pct: total ? (100 * agree) / total : null };
}

/** arm -> share of true values across that arm's lists. */
function armShares(records, lists) {
  const arms = {};
  records.forEach((r, i) => {
    if (!lists[i]) return;
    const a = (arms[r.arm] ||= { yes: 0, total: 0 });
    a.yes += lists[i].filter(Boolean).length;
    a.total += lists[i].length;
  });
  for (const a of Object.values(arms)) a.pct = a.total ? (100 * a.yes) / a.total : null;
  return arms;
}

function taskPromptOf(id) {
  const t = TASKS.find((x) => x.id === id);
  return t?.prompt || (t?.prompts || []).join('\n') || '(prompt unavailable)';
}

/** The stored claude -p verdicts, aligned with the records. Throws on any mismatch. */
function storedVerdicts(records, answerableRows, cache, cliModel) {
  if (answerableRows.length !== records.length) {
    throw new Error(`${answerableRows.length} answerable rows for ${records.length} records`);
  }
  const ans = records.map((r, i) => {
    const row = answerableRows[i];
    if (row.arm !== r.arm || row.task !== r.task) {
      throw new Error(`answerable row ${i} is ${row.task}__${row.arm}, record is ${r.task}__${r.arm}`);
    }
    return row.error ? null : row.perQuestion;
  });
  const ret = records.map((r) => {
    const items = KEYS[r.task];
    if (!items) return null;
    return cache[`${r.batchId}|${r.key}|${cliModel}|${retention.keysHash(items)}${retention.PROMPT_VERSION}`] || null;
  });
  return { ans, ret };
}

const n1 = (x) => (x == null ? '-' : x.toFixed(1));

async function main() {
  const argv = process.argv.slice(2);
  const at = (flag, dflt) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : dflt);
  const recordsArg = at('--records', null);
  const ansArg = at('--answerable', null);
  const model = at('--model', 'sonnet');
  const cliModel = at('--cli-model', 'sonnet');
  const reps = Number(at('--reps', 2));
  const maxUsd = Number(at('--max-usd', NaN));
  const go = argv.includes('--go');
  if (!recordsArg || !ansArg || !(reps >= 2)) {
    console.error('Usage: judge-parity.js --records <dir> --answerable <rows.jsonl> [--model sonnet] [--cli-model sonnet] [--reps 2] [--go --max-usd <usd>]');
    process.exit(2);
  }
  const dir = path.resolve(ROOT, recordsArg);
  // The same records, in the same order, that answerable.js judged and saved.
  const records = retention.readRecordsDir(dir).filter((r) => r && !r.error && r.finalText);
  const rows = fs.readFileSync(path.resolve(ROOT, ansArg), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(path.join(RESULTS, 'retention-cache.json'), 'utf8')); } catch { /* none */ }
  const cli = storedVerdicts(records, rows, cache, cliModel);
  const retCount = cli.ret.filter(Boolean).length;
  console.log(`judge parity — ${path.basename(dir)}: ${records.length} records, `
    + `${cli.ans.filter(Boolean).length} stored answerable verdicts, ${retCount} stored retention verdicts (${cliModel})`);
  if (!retCount) console.log('no stored retention verdicts match; the retention half compares api vs api only');

  const jobs = [];
  for (let rep = 0; rep < reps; rep++) {
    records.forEach((r, i) => {
      jobs.push({ kind: 'answerable', rep, i, prompt: answerable.judgePrompt(taskPromptOf(r.task), r.finalText) });
      if (KEYS[r.task]) {
        jobs.push({ kind: 'retention', rep, i, prompt: retention.judgePrompt(r.finalText, KEYS[r.task]),
          schema: retention.VERDICTS_SCHEMA });
      }
    });
  }
  const { plan } = await runBatch(jobs, { model });
  console.log(`${plan.requests} requests on ${plan.model} (${reps} reps), worst case $${plan.worstUsd.toFixed(2)}; cap --max-usd ${maxUsd || 'unset'}`);
  if (!go) {
    console.log('\nplan only — nothing was sent and nothing was billed. Re-run with --go to spend.');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(RESULTS, `judge-parity-${path.basename(dir)}-${stamp}`);
  fs.mkdirSync(RESULTS, { recursive: true });
  const out = await runBatch(jobs, { model, maxUsd, go: true, rawOut: `${base}.raw.jsonl` });

  const api = Array.from({ length: reps }, () => ({ ans: [], ret: [] }));
  let failed = 0;
  out.results.forEach((res, k) => {
    const { kind, rep, i } = jobs[k];
    try {
      if (res.error) throw new Error(res.error);
      if (kind === 'answerable') api[rep].ans[i] = answerable.scoreAnswers(answerable.parseAnswers(res.text)).perQuestion;
      else api[rep].ret[i] = retention.parseVerdicts(res.text, KEYS[records[i].task].length);
    } catch (err) {
      failed++;
      console.log(`ERR  ${kind} rep${rep} ${records[i].key}  ${err.message}`);
    }
  });

  const summary = {
    batch: path.basename(dir), model: plan.model, cliModel, reps, batchId: out.batchId, spentUsd: out.spentUsd, failed,
    answerable: {
      cliVsApi: api.map((a) => agreement(cli.ans, a.ans)),
      apiVsApi: agreement(api[0].ans, api[1].ans),
      arms: { cli: armShares(records, cli.ans), api: api.map((a) => armShares(records, a.ans)) },
    },
    retention: {
      cliVsApi: api.map((a) => agreement(cli.ret, a.ret)),
      apiVsApi: agreement(api[0].ret, api[1].ret),
      arms: { cli: armShares(records, cli.ret), api: api.map((a) => armShares(records, a.ret)) },
    },
  };
  fs.writeFileSync(`${base}.json`, JSON.stringify(summary, null, 2));

  for (const kind of ['answerable', 'retention']) {
    const s = summary[kind];
    console.log(`\n${kind}: agreement per item`);
    s.cliVsApi.forEach((x, r) => console.log(`  cli vs api rep${r}\t${n1(x.pct)}%\t(${x.agree}/${x.total})`));
    console.log(`  api rep0 vs rep1\t${n1(s.apiVsApi.pct)}%\t(${s.apiVsApi.agree}/${s.apiVsApi.total})`);
    console.log('  arm\tcli%\t' + api.map((_, r) => `api rep${r}%`).join('\t'));
    for (const arm of Object.keys(s.arms.cli).sort()) {
      console.log(`  ${arm}\t${n1(s.arms.cli[arm]?.pct)}\t${s.arms.api.map((a) => n1(a[arm]?.pct)).join('\t')}`);
    }
  }
  console.log(`\n$${out.spentUsd.toFixed(3)} spent, batch ${out.batchId}; summary ${base}.json`);
  if (failed) {
    console.log(`${failed} result(s) failed and were left out; rerun before trusting the numbers.`);
    process.exitCode = 1;
  }
}

if (require.main === module) main().catch((err) => { console.error(err.message); process.exit(1); });

module.exports = { agreement, armShares, storedVerdicts };
