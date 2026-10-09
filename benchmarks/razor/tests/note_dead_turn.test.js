'use strict';

// Every turn of a note conversation appends to one _claude.stream.jsonl. When a
// later turn wrote no result event, the runner used to find the earlier turn's
// result in that file, record it again in _finals.json and bill its cost twice,
// and the scorer reported that earlier turn's duration and tokens as the last
// turn's; now the conversation stops there and those figures are null.
// A fake claude on an otherwise empty PATH answers the first turn and writes
// nothing for the second, so no model session can start from this test.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const RESULT = {
  type: 'result', session_id: 's1', result: 'turn one', total_cost_usd: 0.5, num_turns: 1,
  duration_ms: 1234, usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 30 },
};

test('a dead second turn ends the conversation without repeating the first result', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-dead-'));
  const bin = path.join(fixture, 'bin');
  const ws = path.join(fixture, 'ws');
  fs.mkdirSync(bin);
  fs.mkdirSync(ws);
  const fake = path.join(bin, 'fake-claude.js');
  const calls = path.join(bin, 'calls.txt');
  fs.writeFileSync(fake,
    `const fs = require('fs');\n`
    + `fs.appendFileSync(${JSON.stringify(calls)}, 'x');\n`
    + `if (fs.readFileSync(${JSON.stringify(calls)}, 'utf8').length === 1) {\n`
    + `  process.stdout.write(${JSON.stringify(JSON.stringify(RESULT) + '\n')});\n`
    + `}\n`);
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(bin, 'claude.cmd'), `@"${process.execPath}" "${fake}" %*\r\n`);
  } else {
    fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${fake}" "$@"\n`);
    fs.chmodSync(path.join(bin, 'claude'), 0o755);
  }
  const driver = `require(${JSON.stringify(path.resolve(__dirname, '../runner/run.js'))})`
    + `.runCell('note-drift', 'baseline', 'sonnet', ${JSON.stringify(ws)})`
    + '.then((r) => console.log(JSON.stringify(r)));';
  try {
    const run = spawnSync(process.execPath, ['-e', driver], {
      encoding: 'utf8', timeout: 60000, env: { ...process.env, PATH: bin },
    });
    assert.ifError(run.error);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(fs.readFileSync(calls, 'utf8'), 'xx');
    const finals = JSON.parse(fs.readFileSync(path.join(ws, '_finals.json'), 'utf8'));
    assert.deepEqual(finals, [{ final: 'turn one', cost: 0.5, turns: 1 }]);
    const cell = JSON.parse(run.stdout.trim().split('\n').pop());
    assert.equal(cell.cost, 0.5);
    // The last turn wrote no result, so its duration and tokens are unknown,
    // not turn one's figures.
    for (const key of ['duration_ms', 'in_tokens', 'out_tokens', 'cache_tokens']) {
      assert.equal(cell[key], null, key);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test('a cell whose task later gained a followup keeps its last turn figures', async () => {
  const { scoreCell } = require('../runner/run.js');
  const { RAZOR_TASKS } = require('../runner/tasks.js');
  const task = RAZOR_TASKS['note-drift'];
  const followups = task.followups;
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-bench-sent-'));
  try {
    // Both of its calls answered when it ran; the task has one more followup now.
    const sent = 1 + followups.length;
    fs.writeFileSync(path.join(ws, '_claude.json'), JSON.stringify(RESULT));
    fs.writeFileSync(path.join(ws, '_finals.json'),
      JSON.stringify(Array.from({ length: sent }, () => ({ final: 'turn', cost: 0.5, turns: 1 }))));
    fs.writeFileSync(path.join(ws, '_sent.json'), JSON.stringify(sent));
    task.followups = [...followups, { prompt: 'one more' }];
    const cell = await scoreCell('note-drift', 'baseline', 'sonnet', ws);
    assert.equal(cell.cost, 0.5 * sent);
    assert.equal(cell.duration_ms, 1234);
    assert.equal(cell.out_tokens, 20);
  } finally {
    task.followups = followups;
    fs.rmSync(ws, { recursive: true, force: true });
  }
});
