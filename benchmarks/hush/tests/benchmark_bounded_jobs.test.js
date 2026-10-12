'use strict';

// locale-gaps and rate-import exist to measure the pass in hush's
// compress-tool-output hook that keeps a listing or a ranged print whole. That
// only shows when the printed output is long enough for an ordinary output of
// the same size to be trimmed, and short enough (CAP_FAIL lines) for the
// bounded pass to keep every line. Each case runs the smallest output the job
// invites through the hook from the hush checkout: a shrunk or grown fixture
// fails here before a paid batch measures nothing.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const hook = require(path.join(require('../../paths.js').pluginDir('hush'), 'hooks', 'compress-tool-output.js'));
const FIXTURES = path.join(__dirname, '..', 'fixtures');

// The paths `find . -type f` prints: the tersest listing of the folder.
function listing(dir) {
  const out = [];
  (function walk(rel) {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(r); else out.push(r);
    }
  })('.');
  return out.join('\n') + '\n';
}

// What `sed -n 'FROM,TOp' file` prints.
function range(file, from, to) {
  return fs.readFileSync(file, 'utf8').split('\n').slice(from - 1, to).join('\n') + '\n';
}

const CASES = [
  ['locale-gaps', 'find . -type f', () => listing(path.join(FIXTURES, 'locale-gaps'))],
  ['rate-import', "sed -n '1200,1350p' data/rates.csv", () => range(path.join(FIXTURES, 'rate-import', 'data', 'rates.csv'), 1200, 1350)],
];

for (const [id, command, print] of CASES) {
  test(`${id}: \`${command}\` is a bounded print the hook keeps whole and would otherwise trim`, () => {
    const out = print();
    assert.ok(hook.isBoundedPrint(command), `${command} is not a bounded print`);
    // Arguments: text, exitCode, isDump, enumerate, relevance, scale, sessionId,
    // noSidecar, hostMayTruncate, decision, bounded.
    const run = (bounded) => hook.compress(out, 0, false, false, [], 1, undefined, true, false, {}, bounded);
    assert.notStrictEqual(run(false), out, `${id}: ${out.length} characters pass whole as ordinary output, under the trim floor`);
    assert.strictEqual(run(true), out, `${id}: ${out.split('\n').length - 1} lines are past the bounded pass`);
  });
}
