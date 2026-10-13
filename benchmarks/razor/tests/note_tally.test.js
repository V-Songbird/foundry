'use strict';

// The note tally: run.js records the turns that carried a drift note (and the
// turns that stopped to ask) per note cell, and report.js counts them per task
// and arm. Synthetic results only; no model session.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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

test('no note cells, no tally section', () => {
  assert.deepStrictEqual(noteTally([{ task: 'dep-slug', arm: 'razor', correct: 1, safe: 1 }]), []);
});
