'use strict';

// Spec P4: every code-edit turn logs exactly one disposition, not just full
// candidates. Drives the gate's early-return chain end to end (real entry
// point, per Spec P6) and checks the log line each branch produces.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { runHook, hookOutput, freshSession, writeTurn, freshLog } = require('./helpers');

function readLog(log) {
  if (!fs.existsSync(log)) return [];
  return fs
    .readFileSync(log, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function armedCandidateInput({ session, uuid = 'turn-1' } = {}) {
  return {
    session_id: session || freshSession(),
    transcript_path: writeTurn({ uuid, calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }], finalText: 'Done — the fix works.' }),
    hook_event_name: 'Stop',
  };
}

describe('disposition: check-ran', () => {
  test('logs kind check-ran with no candidate fields', () => {
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({ calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }], commands: ['npm test'], finalText: 'Done — tests pass.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'check-ran');
    assert.strictEqual(lines[0].files, undefined);
    assert.strictEqual(lines[0].claim, undefined);
  });
});

describe('disposition: no-claim vs no-claim-text', () => {
  test('non-empty closing text with no claim phrase → no-claim', () => {
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({ calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }], finalText: 'I updated the parser logic.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'no-claim');
  });

  test('both last_assistant_message and transcript fallback empty → no-claim-text (honest no-signal)', () => {
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({ calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }], finalText: '' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'no-claim-text');
  });
});

describe('disposition: non-edit turns stay unlogged', () => {
  test('docs-only edit + claim never touches the log', () => {
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({ calls: [{ name: 'Write', input: { file_path: 'README.md' } }], finalText: 'Done.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log })), null);
    assert.strictEqual(fs.existsSync(log), false);
  });
});

describe('disposition: candidates', () => {
  test('dormant candidate logs kind candidate-dormant with files/tools/claim', () => {
    const log = freshLog();
    assert.strictEqual(hookOutput(runHook('stop-gate.js', armedCandidateInput(), { PLUMB_LOG: log })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'candidate-dormant');
    assert.deepStrictEqual(lines[0].files, ['src/app.js']);
  });

  test('armed candidate logs kind candidate-armed-blocked and blocks', () => {
    const log = freshLog();
    const out = hookOutput(runHook('stop-gate.js', armedCandidateInput(), { PLUMB_LOG: log, PLUMB_ARM: '1' }));
    assert.strictEqual(out.decision, 'block');
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'candidate-armed-blocked');
  });
});

describe('disposition: suppressed-repeat-turn', () => {
  test('the once-per-turn dedup hit is itself logged, not silently dropped', () => {
    const log = freshLog();
    const input = armedCandidateInput();
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })).decision, 'block');
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 2);
    assert.strictEqual(lines[0].kind, 'candidate-armed-blocked');
    assert.strictEqual(lines[1].kind, 'suppressed-repeat-turn');
  });
});

describe('disposition: per-session block cap', () => {
  test('armed: blocks up to PLUMB_SESSION_CAP, then suppressed-session-cap and stays silent', () => {
    const log = freshLog();
    const session = freshSession();
    const env = { PLUMB_LOG: log, PLUMB_ARM: '1', PLUMB_SESSION_CAP: '2' };

    const first = hookOutput(runHook('stop-gate.js', armedCandidateInput({ session, uuid: 'turn-1' }), env));
    const second = hookOutput(runHook('stop-gate.js', armedCandidateInput({ session, uuid: 'turn-2' }), env));
    const third = hookOutput(runHook('stop-gate.js', armedCandidateInput({ session, uuid: 'turn-3' }), env));

    assert.strictEqual(first.decision, 'block');
    assert.strictEqual(second.decision, 'block');
    assert.strictEqual(third, null);

    const kinds = readLog(log).map((r) => r.kind);
    assert.deepStrictEqual(kinds, ['candidate-armed-blocked', 'candidate-armed-blocked', 'suppressed-session-cap']);
  });

  test('dormant mode ignores the cap entirely', () => {
    const log = freshLog();
    const session = freshSession();
    const env = { PLUMB_LOG: log, PLUMB_SESSION_CAP: '2' };

    for (const uuid of ['turn-1', 'turn-2', 'turn-3', 'turn-4']) {
      assert.strictEqual(hookOutput(runHook('stop-gate.js', armedCandidateInput({ session, uuid }), env)), null);
    }

    const kinds = readLog(log).map((r) => r.kind);
    assert.deepStrictEqual(kinds, ['candidate-dormant', 'candidate-dormant', 'candidate-dormant', 'candidate-dormant']);
  });
});
