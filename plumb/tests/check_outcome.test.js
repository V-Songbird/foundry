'use strict';

// Spec P3: check-outcome parsing (ran ≠ passed). ranCheck() only proves a
// check ran; checkOutcome(entries) pairs each Bash/PowerShell CHECK_RE
// tool_use with its tool_result (matched by tool_use_id — assistant entries
// carry tool_use blocks with an id, the paired tool_result blocks live in
// LATER type:"user" entries' content arrays) and classifies the result text
// with FAIL_RE. When a check ran, failed, and the closing message still
// claims success, that outranks the base class's silent check-ran exit — new
// candidate kind claimed-over-failure.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { runHook, hookOutput, freshSession, writeTurn, freshLog } = require('./helpers');
const { checkOutcome } = require('../hooks/plumb-lib');
const { CHECK_RE, FAIL_RE, checkFailedBlockReason, snippet } = require('../hooks/stop-gate');

function readLog(log) {
  if (!fs.existsSync(log)) return [];
  return fs
    .readFileSync(log, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// ---- raw-entry fixture builders (unit-level checkOutcome tests) ----

function toolUseEntry(id, command, name = 'Bash') {
  return { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name, input: { command }, id }] } };
}

function toolResultEntry(toolUseId, text, isError) {
  const block = { type: 'tool_result', tool_use_id: toolUseId, content: text };
  if (isError !== undefined) block.is_error = isError;
  return { type: 'user', message: { role: 'user', content: [block] } };
}

// ---- unit: checkOutcome pairing ----

describe('unit: checkOutcome — tool_use/tool_result pairing', () => {
  test('matches a tool_result to its tool_use by id among multiple results', () => {
    const entries = [
      toolUseEntry('tu0', 'npm test'),
      toolResultEntry('tu-other', 'unrelated result'),
      toolResultEntry('tu0', 'PASS\nAll 5 tests passed'),
    ];
    assert.strictEqual(checkOutcome(entries, CHECK_RE, FAIL_RE), 'passed');
  });

  test('a turn with multiple check calls: any one failing result makes the overall outcome failed', () => {
    const entries = [
      toolUseEntry('tu0', 'npm run lint'),
      toolUseEntry('tu1', 'npm test'),
      toolResultEntry('tu0', 'no issues found'),
      toolResultEntry('tu1', '3 failed, 12 passed, 15 total'),
    ];
    assert.strictEqual(checkOutcome(entries, CHECK_RE, FAIL_RE), 'failed');
  });

  test('a check with no findable result is unknown, never failed', () => {
    const entries = [toolUseEntry('tu0', 'npm test')];
    assert.strictEqual(checkOutcome(entries, CHECK_RE, FAIL_RE), 'unknown');
  });

  test('no check calls at all is unknown', () => {
    assert.strictEqual(checkOutcome([], CHECK_RE, FAIL_RE), 'unknown');
  });

  test('non-check Bash commands are ignored entirely', () => {
    const entries = [toolUseEntry('tu0', 'git status'), toolResultEntry('tu0', 'nothing to commit')];
    assert.strictEqual(checkOutcome(entries, CHECK_RE, FAIL_RE), 'unknown');
  });

  test('PowerShell check calls are paired the same way as Bash', () => {
    const entries = [toolUseEntry('tu0', 'npm test', 'PowerShell'), toolResultEntry('tu0', '2 failed, 3 passed')];
    assert.strictEqual(checkOutcome(entries, CHECK_RE, FAIL_RE), 'failed');
  });
});

describe('unit: checkOutcome — is_error classification', () => {
  test('is_error:true on the result block classifies failed even with neutral-looking text', () => {
    const entries = [toolUseEntry('tu0', 'pytest -q'), toolResultEntry('tu0', 'command exited with a non-zero status', true)];
    assert.strictEqual(checkOutcome(entries, CHECK_RE, FAIL_RE), 'failed');
  });

  test('is_error:false with passing text classifies passed', () => {
    const entries = [toolUseEntry('tu0', 'pytest -q'), toolResultEntry('tu0', '5 passed in 0.12s', false)];
    assert.strictEqual(checkOutcome(entries, CHECK_RE, FAIL_RE), 'passed');
  });
});

// ---- unit: FAIL_RE families ----

describe('unit: FAIL_RE families', () => {
  test('FAILED word, case-insensitive', () => {
    for (const t of ['1 test FAILED', 'test failed', 'Failed: assertion error']) {
      assert.strictEqual(FAIL_RE.test(t), true, t);
    }
  });

  test('go-style "--- FAIL:" line', () => {
    assert.strictEqual(FAIL_RE.test('=== RUN TestFoo\n--- FAIL: TestFoo (0.00s)\nFAIL'), true);
  });

  test('"N failed" / "N errors" summary line', () => {
    for (const t of ['3 failed, 12 passed, 15 total', '2 errors', '  1 error']) {
      assert.strictEqual(FAIL_RE.test(t), true, t);
    }
  });

  test('"Tests: ... fail" summary line', () => {
    assert.strictEqual(FAIL_RE.test('Tests:       2 failed, 8 passed, 10 total'), true);
  });

  test('does not fire on clean passing output', () => {
    for (const t of ['5 passed in 0.12s', 'All tests passed.', 'PASS src/app.test.js', 'Build succeeded']) {
      assert.strictEqual(FAIL_RE.test(t), false, t);
    }
  });
});

// ---- cross-plugin dependency: hush's signal-preservation guarantee (Part 7.3) ----

describe('cross-plugin dependency: hush signal-preservation fixture', () => {
  test('a hush-compressed failing-test output still classifies failed — locks the dependency without importing hush', () => {
    // Captured shape of hush's compress_tool_output.js output: head lines
    // kept verbatim, a run of clean lines elided behind hush's own marker
    // (which promises no warning/error/failure line was cut), and the
    // surviving FAIL lines kept intact. This string IS the contract — a
    // fixture, not a live hush call. plumb's suite never imports hush code.
    const hushCompressed = [
      '$ npm test',
      '',
      '> myapp@1.0.0 test',
      '> jest',
      '',
      'PASS src/utils.test.js',
      '[hush hook: 42 lines omitted from this view, none with warnings/errors/failures]',
      'FAIL src/parser.test.js',
      '  ● parses a malformed token',
      '',
      '    expect(received).toBe(expected)',
      '',
      'Tests:       1 failed, 24 passed, 25 total',
      'Test Suites: 1 failed, 3 passed, 4 total',
    ].join('\n');

    const entries = [toolUseEntry('tu0', 'npm test'), toolResultEntry('tu0', hushCompressed)];
    assert.strictEqual(checkOutcome(entries, CHECK_RE, FAIL_RE), 'failed');
  });
});

// ---- unit: checkFailedBlockReason ----

describe('unit: checkFailedBlockReason', () => {
  test('names the mechanism, disclaims user-declining, and states the fix-then-finish action', () => {
    const reason = checkFailedBlockReason('All tests pass now.');
    assert.match(reason, /^plumb:/);
    assert.match(reason, /check output contains failures/);
    assert.match(reason, /not the user declining/);
    assert.match(reason, /fix the failures or state them plainly, then finish/);
  });

  test('exact-match: full reason string, deterministic from the claim snippet', () => {
    const reason = checkFailedBlockReason('All tests pass now.');
    assert.strictEqual(
      reason,
      `plumb: this turn's check output contains failures (${snippet('All tests pass now.', 80)}), but the final message reads ` +
        `as complete. This is plumb's automated completion checkpoint — not the user declining. The correct next ` +
        `step is to fix the failures or state them plainly, then finish. ` +
        `(Fires once per turn; PLUMB_DISABLE=1 to silence.)`
    );
  });
});

// ---- integration: the gate end to end ----

function failingCheckTurn({ uuid = 'turn-1', session, result = '2 failed, 8 passed, 10 total', finalText = 'Done — all tests pass now.' } = {}) {
  return {
    session_id: session || freshSession(),
    transcript_path: writeTurn({
      uuid,
      calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }],
      commands: [{ command: 'npm test', result }],
      finalText,
    }),
    hook_event_name: 'Stop',
  };
}

describe('integration: claimed-over-failure fires', () => {
  test('armed: blocks a code-edit turn with a failing check and a success claim', () => {
    const out = hookOutput(runHook('stop-gate.js', failingCheckTurn(), { PLUMB_ARM: '1' }));
    assert.strictEqual(out.decision, 'block');
    assert.match(out.reason, /plumb:/);
    assert.match(out.reason, /check output contains failures/);
  });

  test('dormant: logs kind claimed-over-failure and stays silent', () => {
    const log = freshLog();
    const input = failingCheckTurn();
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'claimed-over-failure');
    assert.strictEqual(lines[0].mode, 'dormant');
    assert.deepStrictEqual(lines[0].files, ['src/app.js']);
    assert.ok(lines[0].claim.includes('pass'));
  });
});

describe('integration: claimed-over-failure outranks the silent check-ran exit', () => {
  test('a failing check with NO success claim stays silent (still check-ran)', () => {
    const log = freshLog();
    const input = failingCheckTurn({ finalText: 'The auth test is still failing; I need to look closer.' });
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'check-ran');
  });

  test('a passing check with a success claim stays silent (today\'s behavior, unchanged)', () => {
    const log = freshLog();
    const input = failingCheckTurn({ result: 'PASS\n5 passed, 5 total' });
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'check-ran');
  });

  test('an unknown outcome (no findable tool_result) with a success claim stays silent', () => {
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({
        calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }],
        commands: ['npm test'], // string form — no paired result attached
        finalText: 'Done — tests pass.',
      }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'check-ran');
  });
});

describe('integration: shared dedup + session cap', () => {
  test('fires at most once per turn (dedup shared with the base class state)', () => {
    const input = failingCheckTurn({ uuid: 'turn-dedup' });
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })).decision, 'block');
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null); // deduped
  });

  test('respects the session cap and logs suppressed-session-cap once exhausted', () => {
    const session = freshSession();
    const env = { PLUMB_ARM: '1', PLUMB_SESSION_CAP: '1' };
    const first = failingCheckTurn({ session, uuid: 'turn-1' });
    const second = failingCheckTurn({ session, uuid: 'turn-2' });

    assert.strictEqual(hookOutput(runHook('stop-gate.js', first, env)).decision, 'block');
    assert.strictEqual(hookOutput(runHook('stop-gate.js', second, env)), null);
  });
});

// ---- compat: observe-report.js registers the new kind ----

describe('compat: observe-report.js counts claimed-over-failure as a candidate', () => {
  test('byKind and candidateCount both include claimed-over-failure', () => {
    const { readRecords, buildReport } = require('../scripts/observe-report');
    const log = freshLog();
    fs.writeFileSync(
      log,
      [
        JSON.stringify({
          ts: '2026-07-14T00:00:00.000Z',
          session: 's1',
          turnKey: 't1',
          mode: 'armed',
          kind: 'claimed-over-failure',
          claim: 'tests pass now',
        }),
      ].join('\n') + '\n'
    );
    const report = buildReport(readRecords(log));
    assert.strictEqual(report.byKind['claimed-over-failure'], 1);
    assert.strictEqual(report.candidateCount, 1);
  });
});
