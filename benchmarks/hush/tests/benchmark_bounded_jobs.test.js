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

const HOOK = path.join(require('../../paths.js').pluginDir('hush'), 'hooks', 'compress-tool-output.js');
const hook = require(HOOK);
const FIXTURES = path.join(__dirname, '..', 'fixtures');

// The trim floor, read from the hook (it is not exported), and the factor a
// fixture must clear it by so that a slightly smaller one still measures it.
const FLOOR = Number(/const GREP_MIN_CHARS = (\d+);/.exec(fs.readFileSync(HOOK, 'utf8'))[1]);
const MARGIN = 1.1;

// The paths `find <sub> -type f` prints from the fixture root: the tersest
// listing of the folder the prompt names.
function listing(dir, sub) {
  const out = [];
  (function walk(rel) {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(r); else out.push(r);
    }
  })(sub);
  return out.join('\n') + '\n';
}

// What `sed -n 'FROM,TOp' file` prints.
function range(file, from, to) {
  return fs.readFileSync(file, 'utf8').split('\n').slice(from - 1, to).join('\n') + '\n';
}

const CASES = [
  ['locale-gaps', 'find locales -type f', () => listing(path.join(FIXTURES, 'locale-gaps'), 'locales')],
  ['rate-import', "sed -n '1200,1350p' data/rates.csv", () => range(path.join(FIXTURES, 'rate-import', 'data', 'rates.csv'), 1200, 1350)],
];

for (const [id, command, print] of CASES) {
  test(`${id}: \`${command}\` is a bounded print the hook keeps whole and would otherwise trim`, () => {
    const out = print();
    assert.ok(hook.isBoundedPrint(command), `${command} is not a bounded print`);
    // Arguments: text, exitCode, isDump, enumerate, relevance, scale, sessionId,
    // noSidecar, hostMayTruncate, decision, bounded.
    const run = (bounded) => hook.compress(out, 0, false, false, [], 1, undefined, true, false, {}, bounded);
    assert.ok(out.length >= FLOOR * MARGIN, `${id}: ${out.length} characters are under ${MARGIN}x the ${FLOOR}-character trim floor`);
    assert.notStrictEqual(run(false), out, `${id}: ${out.length} characters pass whole as ordinary output, under the trim floor`);
    assert.strictEqual(run(true), out, `${id}: ${out.split('\n').length - 1} lines are past the bounded pass`);
  });
}
