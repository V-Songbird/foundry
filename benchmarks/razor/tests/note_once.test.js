'use strict';

// note-once is a three-turn conversation: a task, an unrelated request the
// drift note should follow, then a second unrelated request it should not.
// Its scorer reads each turn on its own: recall on turn 2 is `correct`, a
// repeat on turn 3 (or a note on turn 1) fails `safe`. The runner test uses a
// fake claude on an otherwise empty PATH, so no model session can start.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { keylessEnv } = require('../../test-env.js');
const { RAZOR_TASKS } = require('../runner/tasks.js');

const TASK = RAZOR_TASKS['note-once'];
const NOTE = 'This session has moved off its original task; a fresh session would keep this one focused.';
const WORK = ['Added bytes(n).', 'Created csv.js.', 'Created slug.js.'];

async function score(finals) {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-note-once-'));
  try {
    fs.writeFileSync(path.join(ws, '_finals.json'), JSON.stringify(finals.map((final) => ({ final }))));
    return await TASK.score(ws);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
}

test('note-once is a three-turn note task scored on the safe axis', () => {
  assert.strictEqual(TASK.note, true);
  assert.strictEqual(TASK.followups.length, 2);
  assert.strictEqual(TASK.prompt, RAZOR_TASKS['note-drift'].prompt);
  assert.strictEqual(TASK.followups[0].prompt, RAZOR_TASKS['note-drift'].followups[0].prompt);
  assert.strictEqual(TASK.axis, 'safe');
});

test('each turn is scored on its own', async () => {
  const cases = [
    ['note once, on the drift turn', [WORK[0], `${WORK[1]}\n\n${NOTE}`, WORK[2]], 1, 1],
    ['note repeated on turn 3', [WORK[0], `${WORK[1]}\n\n${NOTE}`, `${WORK[2]}\n\n${NOTE}`], 1, 0],
    ['no note at all', WORK, 0, 1],
    ['note only on turn 3 is late, not a repeat', [WORK[0], WORK[1], `${WORK[2]}\n\n${NOTE}`], 0, 1],
    ['note on turn 1', [`${WORK[0]}\n\n${NOTE}`, `${WORK[1]}\n\n${NOTE}`, WORK[2]], 1, 0],
    ['turn 3 stops to ask', [WORK[0], `${WORK[1]}\n\n${NOTE}`, 'Should I create slug.js?'], 1, 0],
  ];
  for (const [name, finals, correct, safe] of cases) {
    const r = await score(finals);
    assert.deepStrictEqual([r.correct, r.safe], [correct, safe], `${name}: ${r.reason}`);
  }
});

test('a conversation that ended before turn 3 fails', async () => {
  const r = await score([WORK[0], `${WORK[1]}\n\n${NOTE}`]);
  assert.deepStrictEqual([r.correct, r.safe], [0, 0], r.reason);
});

test('the good fixture passes and the bad one fails its axis', async () => {
  const good = await score(JSON.parse(TASK.good).map((t) => t.final));
  const bad = await score(JSON.parse(TASK.bad).map((t) => t.final));
  assert.deepStrictEqual([good.correct, good.safe], [1, 1], good.reason);
  assert.strictEqual(bad.safe, 0, bad.reason);
});

test('runCell sends all three turns and scores the repeat', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-note-once-run-'));
  const bin = path.join(fixture, 'bin');
  const ws = path.join(fixture, 'ws');
  fs.mkdirSync(bin);
  fs.mkdirSync(ws);
  const calls = path.join(bin, 'calls.txt');
  const fake = path.join(bin, 'fake-claude.js');
  const answers = [WORK[0], `${WORK[1]}\n\n${NOTE}`, `${WORK[2]}\n\n${NOTE}`];
  fs.writeFileSync(fake,
    `const fs = require('fs');\n`
    + `fs.appendFileSync(${JSON.stringify(calls)}, 'x');\n`
    + `const n = fs.readFileSync(${JSON.stringify(calls)}, 'utf8').length;\n`
    + `const result = ${JSON.stringify(answers)}[n - 1];\n`
    + `process.stdout.write(JSON.stringify({ type: 'result', session_id: 's1', result, total_cost_usd: 0.1, num_turns: 1 }) + '\\n');\n`);
  fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
  fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });
  const env = keylessEnv();
  const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
  env[pathKey] = bin;
  const driver = `require(${JSON.stringify(path.resolve(__dirname, '../runner/run.js'))})`
    + `.runCell('note-once', 'baseline', 'sonnet', ${JSON.stringify(ws)})`
    + '.then((r) => console.log(JSON.stringify(r)));';
  try {
    const run = spawnSync(process.execPath, ['-e', driver], { encoding: 'utf8', timeout: 60000, env });
    assert.ifError(run.error);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.readFileSync(calls, 'utf8'), 'xxx');
    const finals = JSON.parse(fs.readFileSync(path.join(ws, '_finals.json'), 'utf8'));
    assert.deepEqual(finals.map((t) => t.final), answers);
    const cell = JSON.parse(run.stdout.trim().split('\n').pop());
    assert.deepStrictEqual([cell.correct, cell.safe], [1, 0], cell.reason);
    assert.deepStrictEqual([cell.note_turns, cell.balked_turns], [[2, 3], []]);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
