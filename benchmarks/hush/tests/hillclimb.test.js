'use strict';

// runner/hillclimb.js turns a finished run into the per-variant files that
// /claude-api hillclimb reads. Every case here works on a synthetic run in a
// temporary folder; nothing starts a session.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-hillclimb-data-'));
const FLOW = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-hillclimb-flow-'));
process.env.BENCH_DATA_DIR = DATA; // read by paths.js when the suite loads

const hc = require('../../hillclimb.js');
const suite = require('../runner/hillclimb.js');
const { workspaceName } = require('../runner/provenance.js');
const { runCheck, checkTask } = require('../runner/metrics.js');

const ROOT = path.resolve(__dirname, '..');
const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));
const TAG = 'hc-test';
const BATCH = `hc-test-${process.pid}`;
const SERVED = 'claude-served-by-api';
const line = (o) => JSON.stringify(o);

function transcript(final, { result = true } = {}) {
  return [
    line({ type: 'system', subtype: 'init', model: 'sonnet' }),
    line({ type: 'assistant', message: { id: 'm1', model: SERVED, content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'app.log' } }] } }),
    line({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ECONNREFUSED 6379' }] } }),
    line({ type: 'assistant', message: { id: 'm2', model: SERVED, content: [{ type: 'text', text: final }] } }),
    ...(result ? [line({ type: 'result', subtype: 'success', result: final, duration_ms: 4200, total_cost_usd: 0.01,
      usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 300, cache_creation_input_tokens: 40 } })] : []),
  ].join('\n');
}

const out = path.join(DATA, 'hush', 'results', TAG);
const workDirs = [];
function addRun(task, arm, rep, record, text) {
  const key = `${task}__${arm}__r${rep}`;
  fs.mkdirSync(path.join(out, 'runs'), { recursive: true });
  fs.mkdirSync(path.join(out, 'transcripts'), { recursive: true });
  fs.writeFileSync(path.join(out, 'runs', `${key}.json`), JSON.stringify({ key, batchId: BATCH, task, arm, rep, model: 'sonnet', segment: 'noisy-output', ...record }));
  fs.writeFileSync(path.join(out, 'transcripts', `${key}.jsonl`), text);
  return key;
}

const ANSWER = 'Redis refused connections (ECONNREFUSED on 6379) and the retries became a storm.';
addRun('log-triage', 'hush', 1, { check: { pass: true, score: 1 }, finalText: ANSWER }, transcript(ANSWER));
addRun('log-triage', 'hush', 2, { error: 'Error: rate limited: You\'ve hit your session limit' },
  transcript('You\'ve hit your session limit · resets 5pm'));
addRun('log-triage', 'baseline', 1, { check: { pass: true, score: 1 }, finalText: ANSWER }, transcript(ANSWER));
// A tests task whose session left the planted bug in place: the stored
// workspace is the untouched fixture without its held-out grader, so a regrade
// brings the grader from the fixture and fails it again.
const failingKey = addRun('failing-suite', 'hush', 1, { check: { pass: false, score: 0 }, finalText: 'Done.' }, transcript('Done.'));
const failingWs = path.join(os.tmpdir(), 'work', workspaceName(BATCH, failingKey));
fs.cpSync(path.join(ROOT, 'fixtures', 'failing-suite'), failingWs, { recursive: true });
fs.rmSync(path.join(failingWs, 'verify.js'));
workDirs.push(failingWs);
// A session killed before its result event.
addRun('repo-sweep', 'hush', 1, { error: 'Error: zero-cost call' }, transcript('Working on it', { result: false }));

after(() => {
  for (const d of [DATA, FLOW, ...workDirs]) fs.rmSync(d, { recursive: true, force: true });
});

const read = (f) => fs.readFileSync(path.join(FLOW, 'baseline', f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

test('one call per variant writes graded rows, traces and an errors sidecar', async () => {
  assert.strictEqual(await hc.main(suite, ['--variant', 'baseline', '--from', TAG, '--flow', FLOW]), 0);
  const rows = read('results.jsonl');
  assert.deepStrictEqual(rows.map((r) => `${r.prompt_id}_rep${r.rep}`), ['failing-suite_rep0', 'log-triage_rep0']);
  for (const r of rows) {
    for (const k of ['prompt_id', 'rep', 'prompt', 'tags', 'grade', 'model', 'usage', 'latency_s']) assert.ok(k in r, `${k} missing`);
    assert.strictEqual(r.model, SERVED, 'model comes from the response, not the requested alias');
    assert.deepStrictEqual(r.usage, { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 300, cache_creation_input_tokens: 40 });
    assert.strictEqual(r.latency_s, 4.2);
    const trace = JSON.parse(fs.readFileSync(path.join(FLOW, 'baseline', 'traces', `${r.prompt_id}_rep${r.rep}.json`), 'utf8'));
    assert.deepStrictEqual(trace.map((t) => t.role), ['user', 'tool_call', 'tool_result', 'assistant']);
    assert.strictEqual(trace[0].content, r.prompt);
  }
  assert.deepStrictEqual(rows.find((r) => r.prompt_id === 'log-triage').grade, { pass: 1, score: 1 });
  const errors = read('errors.jsonl');
  assert.deepStrictEqual(errors.map((e) => [e.prompt_id, e.rep, e.failure_class]),
    [['log-triage', 1, 'rate_limited'], ['repo-sweep', 0, 'no_result']]);
});

test('regrade grades stored output twice and lists a flipped verdict', async () => {
  const flow = ['--variant', 'baseline', '--flow', FLOW];
  assert.strictEqual(await hc.main(suite, [...flow, '--regrade']), 0);
  const file = path.join(FLOW, 'baseline', 'results.jsonl');
  const rows = read('results.jsonl');
  rows.find((r) => r.prompt_id === 'failing-suite').grade.pass = 1; // a verdict the grader does not reproduce
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r) + '\n').join(''));
  const r = await hc.regrade(FLOW, 'baseline', suite.gradeStored);
  assert.deepStrictEqual(r.flips, [{ at: 'failing-suite_rep0', metric: 'pass', recorded: 1, first: 0, second: 0 }]);
  assert.strictEqual(r.graded, 2);
  assert.strictEqual(await hc.main(suite, [...flow, '--regrade']), 1);
});

test('a keyword task that reads files is not regraded without its workspace', () => {
  const run = path.join(out, 'runs', `${addRun('release-digest', 'hush', 1, { check: { pass: true, score: 1 }, finalText: 'See digest.md.' }, '')}.json`);
  assert.throws(() => suite.gradeStored({ task: 'release-digest', run, workDir: path.join(FLOW, 'gone') }), /is gone/);
});

test('the oracle passes and the null fails on every task', async () => {
  const cases = await suite.smoke();
  assert.deepStrictEqual(cases.filter((c) => c.kind === 'oracle').map((c) => c.id).sort(), ['crash-origin', 'locale-gaps', 'log-triage', 'rate-import', 'style-forge']);
  assert.strictEqual(cases.filter((c) => c.kind === 'null').length, TASKS.length);
  for (const c of cases) assert.strictEqual(c.pass, c.kind === 'oracle' ? 1 : 0, `${c.kind} ${c.id}`);
});

test('no fixture a session works in holds a reference answer', () => {
  const golds = fs.readdirSync(path.join(ROOT, 'anchors'))
    .map((d) => path.join(ROOT, 'anchors', d, 'gold.md')).filter((f) => fs.existsSync(f))
    .map((f) => fs.readFileSync(f, 'utf8').trim());
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) { walk(f); continue; }
      const text = fs.readFileSync(f, 'utf8');
      for (const g of golds) assert.ok(!text.includes(g), `${f} holds a reference answer`);
    }
  })(path.join(ROOT, 'fixtures'));
});

test('a malformed call stops before any run starts', async () => {
  const guarded = { ...suite, live: () => { throw new Error('live() reached: a paid run would start'); } };
  for (const argv of [
    ['--variant', 'v1', '--dry-run'],
    ['--variant', 'v1-better'],
    ['--variant', 'v1', '--from'],
    ['--variant', 'v1', '--from', '', '--flow', FLOW],
    ['--variant', 'v1', '--from', '--flow', FLOW],
    ['--variant', 'v1', 'hc-test'],
    ['--variant', '--flow', FLOW],
    ['--variant', 'v1', '--flow'],
    ['--smoke', 'extra'],
  ]) assert.strictEqual(await hc.main(guarded, argv), 2, argv.join(' '));
  // Runner flags after -- are not checked here, and --from still starts nothing.
  assert.strictEqual(await hc.main(guarded, ['--variant', 'v9', '--flow', FLOW, '--from', TAG, '--', 'stray']), 0);
});

test('a held-out grader runs from the fixture in a private copy, never in the workspace', () => {
  const task = TASKS.find((t) => t.id === 'failing-suite');
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-hillclimb-ws-'));
  workDirs.push(ws);
  fs.cpSync(path.join(ROOT, 'fixtures', task.fixture), ws, { recursive: true });
  fs.rmSync(path.join(ws, 'verify.js'));
  assert.strictEqual(checkTask(task, '', ws).pass, false, 'the planted bug fails the fixture grader');
  assert.ok(!fs.existsSync(path.join(ws, 'verify.js')), 'scoring left the grader in the workspace');
  // A grader the session wrote itself is neither run nor touched.
  fs.writeFileSync(path.join(ws, 'verify.js'), 'process.exit(0);\n');
  assert.strictEqual(runCheck(task.check, '', ws).pass, true);
  assert.strictEqual(checkTask(task, '', ws).pass, false);
  assert.strictEqual(fs.readFileSync(path.join(ws, 'verify.js'), 'utf8'), 'process.exit(0);\n');
});

test('a multi-prompt task is held to the calls its run sent, and a limit outranks a missing result', () => {
  const multi = path.join(DATA, 'hush', 'results', 'hc-test-multi');
  fs.mkdirSync(path.join(multi, 'runs'), { recursive: true });
  fs.mkdirSync(path.join(multi, 'transcripts'), { recursive: true });
  const add = (rep, record, text) => {
    const key = `feature-drift__hush__r${rep}`;
    fs.writeFileSync(path.join(multi, 'runs', `${key}.json`), JSON.stringify({ key, batchId: BATCH, task: 'feature-drift', arm: 'hush', rep, ...record }));
    fs.writeFileSync(path.join(multi, 'transcripts', `${key}.jsonl`), text);
  };
  const graded = { check: { pass: true, score: 1 }, finalText: 'Done.' };
  const sent = TASKS.find((t) => t.id === 'feature-drift').prompts.length;
  assert.ok(sent > 1);
  add(1, { ...graded, turnsRun: sent }, transcript('Done.')); // later calls wrote nothing
  add(2, { ...graded, turnsRun: 1 }, transcript('Done.')); // a run from before tasks.json gained prompts
  add(3, { error: 'Error: rate limited' }, [transcript('You\'ve hit your session limit · resets 5pm'),
    line({ type: 'system', subtype: 'init', model: 'sonnet' })].join('\n'));
  assert.deepStrictEqual(suite.adapt('hc-test-multi', 'hush').map((a) => [a.rep, a.stream.failure]),
    [[0, 'no_result'], [1, null], [2, 'rate_limited']]);
});

test('a turn-capped call is truncated, not scored', () => {
  const s = hc.readStream([
    line({ type: 'assistant', message: { model: SERVED, content: [{ type: 'text', text: 'still going' }] } }),
    line({ type: 'result', subtype: 'error_max_turns', is_error: true, usage: { output_tokens: 5 } }),
  ].join('\n'), ['go']);
  assert.strictEqual(s.failure, null);
  assert.strictEqual(s.status, 'truncated');
});
