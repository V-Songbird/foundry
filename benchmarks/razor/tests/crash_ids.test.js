'use strict';

// A cell whose scoring threw, or whose runCell threw, used to return only
// { task, arm, model, error }, so the note tally named it without its run index.
// Both crash records now carry the same id fields as a scored cell. The driver
// runs under a fake claude on an otherwise empty PATH with no BENCH_CONFIG_DIR,
// so no model session can start from this test.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { keylessEnv } = require('../../test-env.js');

const RUN = path.resolve(__dirname, '../runner/run.js');

test('cellId reads the run index from the folder name and the calls sent from _sent.json', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-ids-'));
  try {
    const { cellId } = require(RUN);
    const ws = path.join(fixture, 'note-drift__razor__sonnet__4');
    fs.mkdirSync(ws);
    assert.deepEqual(cellId('note-drift', 'razor', 'sonnet', ws),
      { task: 'note-drift', arm: 'razor', model: 'sonnet', repetition: 4, turn_count: null });
    fs.writeFileSync(path.join(ws, '_sent.json'), '3');
    assert.equal(cellId('note-drift', 'razor', 'sonnet', ws).turn_count, 3);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a cell whose scorer threw keeps its run index and calls sent', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-crash-'));
  const bin = path.join(fixture, 'bin');
  const ws = path.join(fixture, 'note-once__baseline__sonnet__2');
  fs.mkdirSync(bin);
  fs.mkdirSync(ws);
  const fake = path.join(bin, 'fake-claude.js');
  fs.writeFileSync(fake, `process.stdout.write(${JSON.stringify(JSON.stringify({
    type: 'result', session_id: 's1', result: 'ok', total_cost_usd: 0.25, num_turns: 1, duration_ms: 1,
    usage: { input_tokens: 1, output_tokens: 1 },
  }) + '\n')});\n`);
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
  } else {
    fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`, { mode: 0o755 });
  }
  const driver = `const { runCell } = require(${JSON.stringify(RUN)});\n`
    + `const { RAZOR_TASKS } = require(${JSON.stringify(path.resolve(__dirname, '../runner/tasks.js'))});\n`
    + `RAZOR_TASKS['note-once'].score = async () => { throw new Error('scorer broke'); };\n`
    + `runCell('note-once', 'baseline', 'sonnet', ${JSON.stringify(ws)}).then((r) => console.log(JSON.stringify(r)));`;
  try {
    const env = keylessEnv({ PATH: bin });
    const run = spawnSync(process.execPath, ['-e', driver], { encoding: 'utf8', timeout: 60000, env });
    assert.ifError(run.error);
    assert.equal(run.status, 0, run.stderr);
    const cell = JSON.parse(run.stdout.trim().split('\n').pop());
    assert.match(cell.error, /scorer broke/);
    const prompts = 1 + (require('../runner/tasks.js').RAZOR_TASKS['note-once'].followups || []).length;
    assert.equal(cell.cost, 0.25 * prompts);
    assert.deepEqual([cell.repetition, cell.turn_count], [2, prompts]);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
