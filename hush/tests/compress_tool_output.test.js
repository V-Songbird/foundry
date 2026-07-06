'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { runHook, hookOutput } = require('./helpers');
const {
  stripAnsi,
  resolveCarriageReturns,
  dedupeConsecutive,
  capLines,
  looksLikeFailure,
  isFileDump,
  compress,
} = require('../hooks/compress-tool-output');

describe('unit: transforms', () => {
  test('stripAnsi removes color and cursor codes', () => {
    assert.strictEqual(stripAnsi('\x1b[32mPASS\x1b[0m tests'), 'PASS tests');
  });

  test('resolveCarriageReturns keeps only the final redraw of a line', () => {
    assert.strictEqual(resolveCarriageReturns('10%\r50%\r100% done\nnext'), '100% done\nnext');
  });

  test('resolveCarriageReturns treats CRLF as an ordinary line ending, not a redraw', () => {
    assert.strictEqual(
      resolveCarriageReturns('one\r\ntwo\r\nthree\r\n'),
      'one\ntwo\nthree\n'
    );
  });

  test('resolveCarriageReturns still resolves a bare mid-line redraw after CRLF lines', () => {
    assert.strictEqual(
      resolveCarriageReturns('done: one\r\n10%\r50%\r100%\r\n'),
      'done: one\n100%\n'
    );
  });

  test('dedupeConsecutive collapses repeats with a count marker', () => {
    const out = dedupeConsecutive(['warn: x', 'warn: x', 'warn: x', 'end']);
    assert.deepStrictEqual(out, ['warn: x', '[hush: previous line repeated 2x]', 'end']);
  });

  test('dedupeConsecutive leaves blank lines alone', () => {
    assert.deepStrictEqual(dedupeConsecutive(['', '', 'a']), ['', '', 'a']);
  });

  test('capLines keeps head and tail with an omitted marker', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
    const out = capLines(lines, 10);
    assert.strictEqual(out.length, 11);
    assert.strictEqual(out[0], 'line 0');
    assert.strictEqual(out[6], '[hush: 90 lines omitted]');
    assert.strictEqual(out[10], 'line 99');
  });

  test('capLines is a no-op under the cap', () => {
    assert.deepStrictEqual(capLines(['a', 'b'], 10), ['a', 'b']);
  });

  test('capLines keeps a signal line outside the head/tail window', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
    lines[50] = 'WARN W1042 deprecated-api in src/legacy/adapter.js';
    const out = capLines(lines, 10);
    assert.ok(out.includes(lines[50]), 'signal line should survive the cap');
  });

  test('capLines with no signal lines behaves exactly as a plain head+tail cap', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
    const out = capLines(lines, 10);
    assert.strictEqual(out.length, 11);
    assert.strictEqual(out[0], 'line 0');
    assert.strictEqual(out[6], '[hush: 90 lines omitted]');
    assert.strictEqual(out[10], 'line 99');
  });

  test('exit code wins over text sniffing', () => {
    assert.strictEqual(looksLikeFailure('Error everywhere', 0), false);
    assert.strictEqual(looksLikeFailure('all good', 1), true);
  });

  test('failure sniff catches common markers, skips clean output', () => {
    assert.strictEqual(looksLikeFailure('Traceback (most recent call last):'), true);
    assert.strictEqual(looksLikeFailure('✗ should retry'), true);
    assert.strictEqual(looksLikeFailure('111 tests passed'), false);
  });

  test('compress caps failing output more generously than passing output', () => {
    const big = Array.from({ length: 1000 }, (_, i) => `unique line ${i}`).join('\n');
    const pass = compress(big, 0).split('\n').length;
    const fail = compress(big, 1).split('\n').length;
    assert.ok(pass < fail, `pass cap ${pass} should be tighter than fail cap ${fail}`);
    assert.ok(pass <= 61);
  });

  test('isFileDump recognizes plain file-print commands', () => {
    assert.ok(isFileDump('cat src/Foo.kt'));
    assert.ok(isFileDump('  cat "src/My File.kt"  '));
    assert.ok(isFileDump('type C:\\src\\Foo.kt'));
    assert.ok(isFileDump('Get-Content ./Foo.ps1'));
    assert.ok(isFileDump('gc ./Foo.ps1'));
  });

  test('isFileDump rejects piped, chained, redirected, or non-dump commands', () => {
    assert.strictEqual(isFileDump('cat src/Foo.kt | grep bar'), false);
    assert.strictEqual(isFileDump('cat src/Foo.kt && rm src/Foo.kt'), false);
    assert.strictEqual(isFileDump('cat src/Foo.kt > out.txt'), false);
    assert.strictEqual(isFileDump('npm test'), false);
    assert.strictEqual(isFileDump(undefined), false);
  });

  test('compress treats a file-dump command like a failure — keeps more of the middle', () => {
    const big = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');
    const asLog = compress(big, 0, false).split('\n').length;
    const asDump = compress(big, 0, true).split('\n').length;
    assert.ok(asDump > asLog, `dump cap ${asDump} should be looser than log cap ${asLog}`);
  });
});

describe('hook: end to end', () => {
  test('unwatched tool stays silent', () => {
    const r = runHook('compress-tool-output.js', { tool_name: 'Read', tool_response: 'x\n'.repeat(500) });
    assert.strictEqual(hookOutput(r), null);
  });

  test('short clean output stays silent — no churn', () => {
    const r = runHook('compress-tool-output.js', { tool_name: 'Bash', tool_response: 'ok\ndone' });
    assert.strictEqual(hookOutput(r), null);
  });

  test('string response gets compressed', () => {
    const big = Array.from({ length: 500 }, (_, i) => `l${i}`).join('\n');
    const r = runHook('compress-tool-output.js', { tool_name: 'Bash', tool_response: big });
    const out = hookOutput(r);
    const updated = out.hookSpecificOutput.updatedToolOutput;
    assert.strictEqual(out.hookSpecificOutput.hookEventName, 'PostToolUse');
    assert.match(updated, /\[hush: \d+ lines omitted\]/);
  });

  test('object response compresses stdout, preserves shape and other fields', () => {
    const big = Array.from({ length: 500 }, (_, i) => `l${i}`).join('\n');
    const r = runHook('compress-tool-output.js', {
      tool_name: 'PowerShell',
      tool_response: { stdout: big, stderr: '', interrupted: false },
    });
    const updated = hookOutput(r).hookSpecificOutput.updatedToolOutput;
    assert.strictEqual(updated.interrupted, false);
    assert.match(updated.stdout, /\[hush: \d+ lines omitted\]/);
  });

  test('a plain file dump keeps more lines than a same-size build log', () => {
    const big = Array.from({ length: 400 }, (_, i) => `line ${i}`).join('\n');
    const dumpResult = runHook('compress-tool-output.js', {
      tool_name: 'Bash',
      tool_input: { command: 'cat src/Foo.kt' },
      tool_response: big,
    });
    const logResult = runHook('compress-tool-output.js', {
      tool_name: 'Bash',
      tool_input: { command: 'npm run build' },
      tool_response: big,
    });
    const dumpLines = hookOutput(dumpResult).hookSpecificOutput.updatedToolOutput.split('\n').length;
    const logLines = hookOutput(logResult).hookSpecificOutput.updatedToolOutput.split('\n').length;
    assert.ok(dumpLines > logLines, `dump (${dumpLines} lines) should keep more than log (${logLines} lines)`);
  });

  test('HUSH_DISABLE=1 bypasses everything', () => {
    const big = 'x\n'.repeat(500);
    const r = runHook('compress-tool-output.js', { tool_name: 'Bash', tool_response: big }, { HUSH_DISABLE: '1' });
    assert.strictEqual(hookOutput(r), null);
  });

  test('malformed stdin exits cleanly', () => {
    const { spawnSync } = require('child_process');
    const path = require('path');
    const r = spawnSync('node', [path.join(__dirname, '..', 'hooks', 'compress-tool-output.js')], {
      input: 'not json',
      encoding: 'utf-8',
    });
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), '');
  });
});
