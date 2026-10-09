'use strict';

// runner/hillclimb.js turns a finished run into the per-variant files that
// /claude-api hillclimb reads. Every case here works on synthetic cell
// workspaces in a temporary folder; nothing starts a session.

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const hc = require('../../hillclimb.js');
const suite = require('../runner/hillclimb.js');
const { RAZOR_TASKS } = require('../runner/tasks.js');

const RUN = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-hillclimb-run-'));
const FLOW = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-hillclimb-flow-'));
after(() => { for (const d of [RUN, FLOW]) fs.rmSync(d, { recursive: true, force: true }); });

const SERVED = 'claude-served-by-api';
const line = (o) => JSON.stringify(o);
const task = RAZOR_TASKS['oh-typo'];

function cell(name, { fixed, result = true }) {
  const ws = path.join(RUN, name);
  fs.mkdirSync(ws, { recursive: true });
  fs.writeFileSync(path.join(ws, 'main.js'), fixed ? task.good : task.bad);
  fs.writeFileSync(path.join(ws, '_claude.stream.jsonl'), [
    line({ type: 'system', subtype: 'init', model: 'claude-sonnet-5' }),
    line({ type: 'assistant', message: { model: SERVED, content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'main.js' } }] } }),
    line({ type: 'user', message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: 'ok' }] }] } }),
    line({ type: 'assistant', message: { model: SERVED, content: [{ type: 'text', text: 'Fixed.' }] } }),
    ...(result ? [line({ type: 'result', subtype: 'success', result: 'Fixed.', duration_ms: 1500, total_cost_usd: 0.02,
      usage: { input_tokens: 3, output_tokens: 7, cache_read_input_tokens: 90, cache_creation_input_tokens: 11 } })] : []),
  ].join('\n'));
}

cell('oh-typo__razor__sonnet__0', { fixed: true });
cell('oh-typo__razor__sonnet__1', { fixed: false });
cell('oh-typo__razor__sonnet__2', { fixed: true, result: false }); // killed before its result event
cell('oh-typo__baseline__sonnet__0', { fixed: true });

const read = (f) => fs.readFileSync(path.join(FLOW, 'v1', f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

test('one call per variant writes graded rows, traces and an errors sidecar', async () => {
  assert.strictEqual(await hc.main(suite, ['--variant', 'v1', '--from', RUN, '--flow', FLOW]), 0);
  const rows = read('results.jsonl');
  assert.deepStrictEqual(rows.map((r) => [r.prompt_id, r.rep, r.grade.pass]), [['oh-typo', 0, 1], ['oh-typo', 1, 0]]);
  for (const r of rows) {
    for (const k of ['prompt_id', 'rep', 'prompt', 'tags', 'grade', 'model', 'usage', 'latency_s']) assert.ok(k in r, `${k} missing`);
    assert.strictEqual(r.model, SERVED, 'model comes from the response, not the --models alias');
    assert.deepStrictEqual(r.usage, { input_tokens: 3, output_tokens: 7, cache_read_input_tokens: 90, cache_creation_input_tokens: 11 });
    assert.strictEqual(r.prompt, task.prompt);
    assert.ok(fs.existsSync(path.join(FLOW, 'v1', 'traces', `oh-typo_rep${r.rep}.json`)));
  }
  assert.deepStrictEqual(read('errors.jsonl').map((e) => [e.prompt_id, e.rep, e.failure_class]), [['oh-typo', 2, 'no_result']]);
});

test('regrade grades stored output twice and lists a flipped verdict', async () => {
  const before = fs.readFileSync(path.join(RUN, 'oh-typo__razor__sonnet__1', 'main.js'), 'utf8');
  assert.strictEqual(await hc.main(suite, ['--variant', 'v1', '--flow', FLOW, '--regrade']), 0);
  assert.strictEqual(fs.readFileSync(path.join(RUN, 'oh-typo__razor__sonnet__1', 'main.js'), 'utf8'), before);
  const rows = read('results.jsonl');
  rows[1].grade.correct = 1;
  fs.writeFileSync(path.join(FLOW, 'v1', 'results.jsonl'), rows.map((r) => JSON.stringify(r) + '\n').join(''));
  const r = await hc.regrade(FLOW, 'v1', suite.gradeStored);
  assert.deepStrictEqual(r.flips, [{ at: 'oh-typo_rep1', metric: 'correct', recorded: 1, first: 0, second: 0 }]);
});

test('the oracle passes and the null fails on every task', async () => {
  const cases = await suite.smoke();
  assert.strictEqual(cases.length, 2 * Object.keys(RAZOR_TASKS).length);
  for (const c of cases) assert.strictEqual(c.pass, c.kind === 'oracle' ? 1 : 0, `${c.kind} ${c.id}`);
});

test('scoring leaves no test input or test-run data in the cell', async () => {
  for (const [id, t] of Object.entries(RAZOR_TASKS)) {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-hillclimb-cell-'));
    try {
      for (const [fn, content] of Object.entries(t.seed || {})) {
        fs.mkdirSync(path.dirname(path.join(ws, fn)), { recursive: true });
        fs.writeFileSync(path.join(ws, fn), content);
      }
      fs.writeFileSync(path.join(ws, t.file), t.good);
      const before = fs.readdirSync(ws, { recursive: true }).sort();
      await t.score(ws);
      assert.deepStrictEqual(fs.readdirSync(ws, { recursive: true }).sort(), before, id);
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  }
});

test('no seeded workspace holds a reference answer', () => {
  for (const [id, t] of Object.entries(RAZOR_TASKS)) {
    for (const [file, content] of Object.entries(t.seed || {})) {
      assert.ok(!content.includes(t.good.trim()), `${id}: seed ${file} holds the reference answer`);
    }
  }
});

test('a followups task whose second call wrote nothing has no result to score', async () => {
  const run = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-hillclimb-followups-'));
  try {
    const ws = path.join(run, 'note-drift__razor__sonnet__0');
    fs.mkdirSync(ws);
    fs.writeFileSync(path.join(ws, '_claude.stream.jsonl'), [
      line({ type: 'system', subtype: 'init', model: 'claude-sonnet-5' }),
      line({ type: 'assistant', message: { model: SERVED, content: [{ type: 'text', text: 'Done.' }] } }),
      line({ type: 'result', subtype: 'success', result: 'Done.', usage: { output_tokens: 5 } }),
    ].join('\n'));
    assert.ok(RAZOR_TASKS['note-drift'].followups.length > 0);
    assert.deepStrictEqual((await suite.adapt(run, 'razor')).map((a) => a.stream.failure), ['no_result']);
  } finally {
    fs.rmSync(run, { recursive: true, force: true });
  }
});

test('a cell checks its results against the calls it sent, and an older cell against the current followups', async () => {
  const run = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-hillclimb-sent-'));
  try {
    for (const [rep, sent] of [[0, null], [1, 1]]) {
      const ws = path.join(run, `note-drift__razor__sonnet__${rep}`);
      fs.mkdirSync(ws);
      fs.writeFileSync(path.join(ws, '_claude.stream.jsonl'), [
        line({ type: 'system', subtype: 'init', model: 'claude-sonnet-5' }),
        line({ type: 'assistant', message: { model: SERVED, content: [{ type: 'text', text: 'Done.' }] } }),
        line({ type: 'result', subtype: 'success', result: 'Done.', usage: { output_tokens: 5 } }),
      ].join('\n'));
      if (sent !== null) fs.writeFileSync(path.join(ws, '_sent.json'), JSON.stringify(sent));
    }
    // Rep 1 ran before a followup was added: it sent one call and got one result.
    assert.deepStrictEqual((await suite.adapt(run, 'razor')).map((a) => a.stream.failure), ['no_result', null]);
  } finally {
    fs.rmSync(run, { recursive: true, force: true });
  }
});

test('a conversation whose later turn wrote nothing has no result to score', () => {
  const turn1 = [
    line({ type: 'system', subtype: 'init', model: 'sonnet' }),
    line({ type: 'assistant', message: { model: SERVED, content: [{ type: 'text', text: 'done' }] } }),
    line({ type: 'result', subtype: 'success', result: 'done', usage: { output_tokens: 5 } }),
  ].join('\n');
  assert.strictEqual(hc.readStream(turn1, ['first']).failure, null);
  assert.strictEqual(hc.readStream(turn1, ['first', 'second']).failure, 'no_result');
});
