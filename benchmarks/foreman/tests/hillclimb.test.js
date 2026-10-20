'use strict';

// runner/hillclimb.js turns a finished run into the per-variant files that
// /claude-api hillclimb reads. Every case here works on a synthetic run in a
// temporary folder; nothing starts a session.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'foreman-hillclimb-data-'));
const FLOW = fs.mkdtempSync(path.join(os.tmpdir(), 'foreman-hillclimb-flow-'));
process.env.BENCH_DATA_DIR = DATA; // read by paths.js when the suite loads

const hc = require('../../hillclimb.js');
const suite = require('../runner/hillclimb.js');
const { snapshotDir, scoreRun, textSha256 } = require('../runner/metrics.js');

const ROOT = path.resolve(__dirname, '..');
const TASKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks.json'), 'utf8'));
const TAG = `hc-test-${process.pid}`;
const WORK = path.join(os.tmpdir(), 'foreman-bench', TAG); // where run.js leaves workspaces
const SERVED = 'claude-served-by-api';
const PROMPT_FILE = 'fixtures/api-constraint/prompts/foreman-std.md';
const line = (o) => JSON.stringify(o);
after(() => { for (const d of [DATA, FLOW, WORK]) fs.rmSync(d, { recursive: true, force: true }); });

function transcript({ result = true } = {}) {
  return [
    line({ type: 'system', subtype: 'init', model: 'sonnet' }),
    line({ type: 'assistant', message: { model: SERVED, content: [
      { type: 'thinking', thinking: 'The option is dropped in limiter.js.' },
      { type: 'tool_use', name: 'Bash', input: { command: 'node --test' } }] } }),
    line({ type: 'user', message: { content: [{ type: 'tool_result', content: 'pass 4' }] } }),
    ...(result ? [line({ type: 'result', subtype: 'success', result: 'Fixed.', duration_ms: 9000, total_cost_usd: 0.1,
      usage: { input_tokens: 5, output_tokens: 50, cache_read_input_tokens: 500, cache_creation_input_tokens: 60 } })] : []),
  ].join('\n');
}

const out = path.join(DATA, 'foreman', 'results', TAG);
fs.mkdirSync(path.join(out, 'runs'), { recursive: true });
fs.mkdirSync(path.join(out, 'transcripts'), { recursive: true });
function addRun(arm, rep, record, text, solved) {
  const key = `api-constraint__${arm}__r${rep}`;
  fs.writeFileSync(path.join(out, 'runs', `${key}.json`), JSON.stringify({ key, task: 'api-constraint', arm, rep, model: 'sonnet', ...record }));
  fs.writeFileSync(path.join(out, 'transcripts', `${key}.jsonl`), text);
  const ws = path.join(WORK, key);
  fs.cpSync(path.join(ROOT, 'fixtures', 'api-constraint', 'app'), ws, { recursive: true });
  if (solved) fs.cpSync(path.join(ROOT, 'fixtures', 'api-constraint', 'solution'), ws, { recursive: true });
}
addRun('foreman-std', 1, { promptFile: PROMPT_FILE, check: { pass: true, testsPass: true, violations: [] } }, transcript(), true);
addRun('foreman-std', 2, { promptFile: PROMPT_FILE, check: { pass: false, testsPass: false, violations: ['tests: exit 1'] } }, transcript({ result: false }), false);
addRun('vibe', 1, { promptFile: 'fixtures/api-constraint/prompts/vibe.md', check: { pass: true, testsPass: true } }, transcript(), true);

const read = (f) => fs.readFileSync(path.join(FLOW, 'baseline', f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

test('one call per variant writes graded rows, traces and an errors sidecar', async () => {
  assert.strictEqual(await hc.main(suite, ['--variant', 'baseline', '--from', TAG, '--flow', FLOW]), 0);
  const [row, ...rest] = read('results.jsonl');
  assert.deepStrictEqual(rest, [], 'only the foreman-std arm, and not the killed attempt');
  for (const k of ['prompt_id', 'rep', 'prompt', 'tags', 'grade', 'model', 'usage', 'latency_s']) assert.ok(k in row, `${k} missing`);
  assert.deepStrictEqual([row.prompt_id, row.rep, row.grade], ['api-constraint', 0, { pass: 1, tests: 1 }]);
  assert.strictEqual(row.model, SERVED, 'model comes from the response, not the requested alias');
  assert.deepStrictEqual(row.usage, { input_tokens: 5, output_tokens: 50, cache_read_input_tokens: 500, cache_creation_input_tokens: 60 });
  assert.strictEqual(row.prompt, fs.readFileSync(path.join(ROOT, PROMPT_FILE), 'utf8'));
  const trace = JSON.parse(fs.readFileSync(path.join(FLOW, 'baseline', 'traces', 'api-constraint_rep0.json'), 'utf8'));
  assert.deepStrictEqual(trace.map((t) => t.role), ['user', 'tool_call', 'tool_result']);
  assert.strictEqual(trace[1].thinking, 'The option is dropped in limiter.js.');
  // The session died before its result: scoring its half-edited tree would
  // count a killed run as the model's answer.
  assert.deepStrictEqual(read('errors.jsonl').map((e) => [e.prompt_id, e.rep, e.failure_class]), [['api-constraint', 1, 'no_result']]);
});

test('regrade grades stored output twice and lists a flipped verdict', async () => {
  assert.strictEqual(await hc.main(suite, ['--variant', 'baseline', '--flow', FLOW, '--regrade']), 0);
  const rows = read('results.jsonl');
  rows[0].grade.pass = 0;
  fs.writeFileSync(path.join(FLOW, 'baseline', 'results.jsonl'), rows.map((r) => JSON.stringify(r) + '\n').join(''));
  const r = await hc.regrade(FLOW, 'baseline', suite.gradeStored);
  assert.deepStrictEqual(r.flips, [{ at: 'api-constraint_rep0', metric: 'pass', recorded: 0, first: 1, second: 1 }]);
});

test('regrade keeps the held-back tests out of the shipped-tests step', () => {
  // run.js leaves the held-back test in the workspace after scoring it.
  const ws = path.join(WORK, 'gamed-check__foreman-std__r1');
  const fixture = path.join(ROOT, 'fixtures', 'gamed-check');
  fs.cpSync(path.join(fixture, 'app'), ws, { recursive: true });
  const src = path.join(ws, 'src', 'discount.js');
  fs.writeFileSync(src, fs.readFileSync(src, 'utf8').replace('round2(total - percent)', 'round2(total * 0.9)'));
  fs.cpSync(path.join(fixture, 'hidden'), ws, { recursive: true });
  // Runs under node --test: scoreRun must not inherit NODE_TEST_CONTEXT, or
  // the grader's own `node --test` would exit 0 on failures.
  assert.deepStrictEqual(suite.gradeStored({ task: 'gamed-check', workDir: ws }), { pass: 0, tests: 1 });
});

test('scoring leaves no held-back test in the workspace a session worked in', () => {
  const task = TASKS.find((t) => t.id === 'gamed-check');
  const fixture = path.join(ROOT, 'fixtures', task.fixture);
  const ws = path.join(WORK, 'gamed-check__foreman-std__r2');
  fs.cpSync(path.join(fixture, 'app'), ws, { recursive: true });
  fs.cpSync(path.join(fixture, task.solutionDir || 'solution'), ws, { recursive: true });
  const before = snapshotDir(ws);
  const check = scoreRun(task, ws, snapshotDir(path.join(fixture, 'app')));
  assert.strictEqual(check.hiddenPass, true, 'the held-back tests did not run');
  assert.deepStrictEqual(snapshotDir(ws), before, 'scoring changed the stored workspace');
});

test('a variant never mixes runs', async () => {
  assert.throws(() => suite.live(TAG, 'foreman-std', []), /already holds records/);
  const stale = path.join(FLOW, 'baseline', 'traces', 'gone_rep0.json');
  fs.writeFileSync(stale, '[]');
  // A call that found nothing (a wrong --arm) leaves the earlier files alone.
  const results = fs.readFileSync(path.join(FLOW, 'baseline', 'results.jsonl'), 'utf8');
  assert.deepStrictEqual(hc.writeVariant(FLOW, 'baseline', []).rows, 0);
  assert.ok(fs.existsSync(stale));
  assert.strictEqual(fs.readFileSync(path.join(FLOW, 'baseline', 'results.jsonl'), 'utf8'), results);
  hc.writeVariant(FLOW, 'baseline', [{ prompt_id: 'x', rep: 0, grade: null, stream: hc.readStream('', ['p']) }]);
  assert.ok(!fs.existsSync(stale), 'a trace from an earlier call outlives its row');
  const mixed = path.join(DATA, 'foreman', 'results', `${TAG}-mixed`, 'runs');
  fs.mkdirSync(mixed, { recursive: true });
  for (const [rep, model] of [[1, 'sonnet'], [2, 'opus']]) {
    fs.writeFileSync(path.join(mixed, `r${rep}.json`), JSON.stringify({ key: `r${rep}`, task: 'api-constraint', arm: 'foreman-std', rep, model }));
  }
  assert.throws(() => suite.adapt(`${TAG}-mixed`, 'foreman-std'), /mixes models sonnet, opus/);
});

test('a row whose prompt file changed since the run is flagged', () => {
  const key = 'api-constraint__foreman-std__r1';
  const [a] = suite.adapt(TAG, 'foreman-std');
  assert.ok(!('prompt_changed' in a.meta));
  const rec = path.join(out, 'runs', `${key}.json`);
  const original = JSON.parse(fs.readFileSync(rec, 'utf8'));
  const prompt = fs.readFileSync(path.join(ROOT, PROMPT_FILE), 'utf8');
  const flagged = (fields) => {
    fs.writeFileSync(rec, JSON.stringify({ ...original, ...fields }));
    return suite.adapt(TAG, 'foreman-std')[0].meta.prompt_changed === true;
  };
  try {
    assert.strictEqual(flagged({ promptChars: 1 }), true, 'an older record is checked by length');
    assert.strictEqual(flagged({ promptChars: prompt.length, promptSha256: textSha256(prompt) }), false);
    // Same length, other text: only the hash sees it.
    const sameLength = prompt.slice(0, -1) + (prompt.endsWith('x') ? 'y' : 'x');
    assert.strictEqual(flagged({ promptChars: prompt.length, promptSha256: textSha256(sameLength) }), true);
  } finally {
    fs.writeFileSync(rec, JSON.stringify(original));
  }
});

test('a limit or an API error is classed before a later call that wrote nothing', () => {
  const init = line({ type: 'system', subtype: 'init', model: 'sonnet' });
  const stopped = (result) => hc.readStream([init, line({ type: 'result', ...result }), init].join('\n'), ['first', 'second']).failure;
  assert.strictEqual(stopped({ subtype: 'success', result: 'You\'ve hit your usage limit' }), 'rate_limited');
  assert.strictEqual(stopped({ subtype: 'error_during_execution', is_error: true, result: 'API Error: 529' }), 'serving_error');
  assert.strictEqual(stopped({ subtype: 'success', result: 'done' }), 'no_result');
});

test('the oracle passes and the null fails on every task', async () => {
  const cases = await suite.smoke();
  assert.strictEqual(cases.length, 2 * TASKS.length);
  for (const c of cases) assert.strictEqual(c.pass, c.kind === 'oracle' ? 1 : 0, `${c.kind} ${c.id}`);
});

test('the app a session works in holds no solution or held-back test', () => {
  for (const fixture of fs.readdirSync(path.join(ROOT, 'fixtures'))) {
    const dir = path.join(ROOT, 'fixtures', fixture);
    for (const keys of fs.readdirSync(dir).filter((d) => !['app', 'prompts'].includes(d))) {
      (function walk(rel) {
        for (const e of fs.readdirSync(path.join(dir, keys, rel), { withFileTypes: true })) {
          const f = path.join(rel, e.name);
          if (e.isDirectory()) { walk(f); continue; }
          const app = path.join(dir, 'app', f);
          const same = fs.existsSync(app) && fs.readFileSync(app, 'utf8') === fs.readFileSync(path.join(dir, keys, f), 'utf8');
          assert.ok(!same, `${fixture}/app/${f} already holds ${keys}/${f}`);
        }
      })('');
    }
  }
});

test('main refuses a missing or empty flag value before any suite code runs', async (t) => {
  const never = new Proxy({}, { get() { throw new Error('the suite ran'); } });
  const err = t.mock.method(console, 'error', () => {});
  for (const [argv, line] of [
    [['--variant'], 'usage: --variant needs a value but none was given'],
    [['--variant', '--smoke'], 'usage: --variant needs a value, got --smoke'],
    [['--variant', 'baseline', '--arm', ''], 'usage: --arm needs a value, got nothing'],
  ]) {
    err.mock.resetCalls();
    assert.strictEqual(await hc.main(never, argv), 2, argv.join(' '));
    assert.strictEqual(err.mock.calls[0].arguments[0].split('\n')[0], line);
  }
});
