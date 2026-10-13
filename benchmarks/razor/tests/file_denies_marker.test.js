'use strict';

// razor's file-meter says "razor: new production file #N" by default and
// "razor: new file #N" only when RAZOR_FILE_BUDGET is set. The runner counted
// only the second form, so razor_file_denies read 0 while the check spoke.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scoreCell } = require('../runner/run.js');

const deny = (text) => JSON.stringify({
  type: 'user',
  message: { content: [{ type: 'tool_result', is_error: true, content: text }] },
});

test('razor_file_denies counts both file-meter message forms', async () => {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-file-denies-'));
  try {
    fs.writeFileSync(path.join(ws, '_claude.stream.jsonl'), [
      deny('razor: new production file #2 this turn (budget 1). '),
      deny('razor: new file #3 this turn (budget 2). '),
    ].join('\n') + '\n');
    const cell = await scoreCell('oh-typo', 'razor', 'sonnet', ws);
    assert.strictEqual(cell.razor_file_denies, 2);
  } finally {
    fs.rmSync(ws, { recursive: true, force: true });
  }
});
