'use strict';

// The note tally: run.js records the turns that carried a drift note (and the
// turns that stopped to ask) per note cell, and report.js counts them per task
// and arm. Synthetic results only; no model session.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { keylessEnv } = require('../../test-env.js');
const { RAZOR_TASKS, noteTurns } = require('../runner/tasks.js');
const { noteTally } = require('../runner/report.js');

const NOTE = 'This session has moved off its original task; a fresh session would keep this one focused.';

test('noteTurns lists the 1-based turns with a note and with a balk', () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-note-tally-'));
  try {
    assert.deepStrictEqual(noteTurns(ws), {});
    fs.writeFileSync(path.join(ws, '_finals.json'), JSON.stringify([
      { final: 'Added bytes(n).' }, { final: 'Should I create csv.js?' }, { final: `Created slug.js.\n\n${NOTE}` },
    ]));
    assert.deepStrictEqual(noteTurns(ws), { note_turns: [3], balked_turns: [2] });
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

test('every drift task names its first drift turn; note-steady has none', () => {
  assert.deepStrictEqual(
    ['note-drift', 'note-steady', 'note-once', 'note-late'].map((t) => RAZOR_TASKS[t].drift),
    [2, undefined, 2, 4]);
});

test('the tally counts recall per drift turn, late, repeat, EARLY and balked per arm', () => {
  const cell = (task, arm, note_turns, balked_turns = []) => ({ task, arm, model: 'sonnet', note_turns, balked_turns });
  const md = noteTally([
    cell('note-once', 'razor', [2]),
    cell('note-once', 'razor', [2, 3]),
    cell('note-once', 'razor', [3]),
    cell('note-once', 'razor-start', [1, 2], [3]),
    cell('note-steady', 'razor', [2]),
    cell('note-steady', 'razor', []),
    cell('note-late', 'razor', [3]),
    { task: 'note-drift', arm: 'razor', model: 'sonnet', correct: 1, safe: 1 }, // older cell, no note_turns
    cell('dep-slug', 'razor', [1]), // not a note task
  ]);
  const rows = md.filter((l) => l.startsWith('| note-'));
  assert.deepStrictEqual(rows, [
    '| note-late | razor | 1 | t4 0/1 | 0 | 0 | 1 | 0 |',
    '| note-once | razor | 3 | t2 2/3 · t3 2/3 | 1 | 1 | 0 | 0 |',
    '| note-once | razor-start | 1 | t2 1/1 · t3 0/1 | 0 | 0 | 1 | 1 |',
    '| note-steady | razor | 2 | – | 0 | 0 | 1 | 0 |',
  ]);
});

test('a cell whose last turn died (null duration_ms) is left out of the counts and named', () => {
  const cell = (note_turns, duration_ms) => ({ task: 'note-once', arm: 'razor', model: 'sonnet', note_turns, balked_turns: [], duration_ms });
  const md = noteTally([cell([2], 100), cell([2], null)]);
  assert.deepStrictEqual(md.filter((l) => l.startsWith('| note-')), ['| note-once | razor | 1 | t2 1/1 · t3 0/1 | 0 | 0 | 0 | 0 |']);
  assert.match(md[md.length - 1], /1 cell\(s\): note-once \/ razor/);
  const only = noteTally([cell([2], null)]);
  assert.strictEqual(only.filter((l) => l.startsWith('| note-')).length, 0);
  assert.match(only[only.length - 1], /1 cell\(s\)/);
});

test('a cell with fewer replies than prompts, an error or a failed Codex status is left out and named by run index', () => {
  const cell = (replies, repetition, extra = {}) => ({ task: 'note-once', arm: 'razor', model: 'sonnet', note_turns: [2], balked_turns: [], replies, repetition, ...extra });
  const md = noteTally([
    cell(3, 0),
    cell(2, 1, { duration_ms: 100 }), // dead last turn, figures not nulled
    cell(1, 2, { note_turns: undefined, error: 'api_error null: Login expired' }), // lost login
    cell(2, 3, { turn_count: 2, status: 'completed' }), // Codex record cut short
    cell(3, 4, { error: 'api_error null: Login expired' }), // login lost on the last turn
    cell(3, 5, { turn_count: 3, status: 'runtime_failed' }), // Codex record that failed
  ]);
  assert.deepStrictEqual(md.filter((l) => l.startsWith('| note-')), ['| note-once | razor | 1 | t2 1/1 · t3 0/1 | 0 | 0 | 0 | 0 |']);
  assert.match(md[md.length - 1], /5 cell\(s\): note-once \/ razor #1, note-once \/ razor #2, note-once \/ razor #3, note-once \/ razor #4, note-once \/ razor #5\./);
});

test('a Codex note cell records its replies and note turns for the tally', async () => {
  const { scoreCell } = require('../runner/codex-metrics.js');
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-note-codex-'));
  try {
    const done = (lastMessage) => ({ lastMessage, completedTurns: 1 });
    const full = await scoreCell('note-once', ws, [done('Added bytes(n).'), done(`Created csv.js.\n\n${NOTE}`), done('Created slug.js.')]);
    assert.deepStrictEqual([full.replies, full.note_turns, full.balked_turns], [3, [2], []]);
    const short = await scoreCell('note-once', ws, [done('Added bytes(n).'), { lastMessage: null, completedTurns: 0 }]);
    assert.strictEqual(short.replies, 1);
    const md = noteTally([{ task: 'note-once', arm: 'razor', repetition: 0, ...full }, { task: 'note-once', arm: 'razor', repetition: 1, ...short }]);
    assert.deepStrictEqual(md.filter((l) => l.startsWith('| note-')), ['| note-once | razor | 1 | t2 1/1 · t3 0/1 | 0 | 0 | 0 | 0 |']);
    assert.match(md[md.length - 1], /1 cell\(s\): note-once \/ razor #1\./);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});

for (const lostOn of [1, 2]) {
  test(`a login lost on call ${lostOn} records the run index, the calls sent and the replies, and the tally names it`, () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-note-login-'));
    const bin = path.join(fixture, 'bin');
    const ws = path.join(fixture, 'note-drift__baseline__sonnet__1');
    fs.mkdirSync(bin);
    fs.mkdirSync(ws);
    const lost = { type: 'result', is_error: true, result: 'Login expired · Run /login to sign in again', total_cost_usd: 0, num_turns: 1, duration_ms: 50, session_id: 's1' };
    const ok = { type: 'result', result: 'Added bytes(n).', total_cost_usd: 0, num_turns: 1, duration_ms: 50, session_id: 's1' };
    const counter = path.join(fixture, 'calls.txt');
    const fake = path.join(bin, 'fake-claude.js');
    fs.writeFileSync(fake, `const fs = require('fs'); const f = ${JSON.stringify(counter)};\n`
      + `const n = (fs.existsSync(f) ? Number(fs.readFileSync(f, 'utf8')) : 0) + 1; fs.writeFileSync(f, String(n));\n`
      + `process.stdout.write(JSON.stringify(n >= ${lostOn} ? ${JSON.stringify(lost)} : ${JSON.stringify(ok)}) + '\\n');\n`);
    fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
    fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });
    const env = keylessEnv();
    for (const k of Object.keys(env)) if (k.toUpperCase() === 'PATH') delete env[k];
    env.PATH = bin;
    const driver = `require(${JSON.stringify(path.resolve(__dirname, '../runner/run.js'))})`
      + `.runCell('note-drift', 'baseline', 'sonnet', ${JSON.stringify(ws)})`
      + '.then((r) => console.log(JSON.stringify(r)));';
    try {
      const run = spawnSync(process.execPath, ['-e', driver], { encoding: 'utf8', timeout: 60000, env });
      assert.ifError(run.error);
      assert.strictEqual(run.status, 0, run.stderr);
      const cell = JSON.parse(run.stdout.trim().split('\n').pop());
      assert.match(cell.error, /Login expired/);
      assert.deepStrictEqual([cell.repetition, cell.turn_count, cell.replies], [1, lostOn, lostOn]);
      const md = noteTally([cell]);
      assert.match(md[md.length - 1], /1 cell\(s\): note-drift \/ baseline #1\./);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
}

test('no note cells, no tally section', () => {
  assert.deepStrictEqual(noteTally([{ task: 'dep-slug', arm: 'razor', correct: 1, safe: 1 }]), []);
});
