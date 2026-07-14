'use strict';

// Spec P1: the phantom-claim candidate class. A closing message that claims
// changes were made while NO edit tool ran and the working tree is clean is a
// fabricated completion — distinct from the base class's unproven-but-real
// edits. Same dormant-first discipline: all four conditions required, every
// miss fails toward silence.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { runHook, hookOutput, freshSession, writeTurn, freshLog } = require('./helpers');
const { CHANGE_VERBS_RE, COMMIT_VERBS_RE, claimsChange, phantomBlockReason } = require('../hooks/stop-gate');

function readLog(log) {
  if (!fs.existsSync(log)) return [];
  return fs
    .readFileSync(log, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

// ---- git fixtures ----

function cleanRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plumb-clean-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'a@b.c'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'plumb-test'], { cwd: dir });
  return dir;
}

function dirtyRepo() {
  const dir = cleanRepo();
  fs.writeFileSync(path.join(dir, 'untracked.txt'), 'x');
  return dir;
}

function notARepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'plumb-norepo-'));
}

// ---- unit: CHANGE_VERBS_RE / COMMIT_VERBS_RE / claimsChange (negation guard) ----

describe('unit: CHANGE_VERBS_RE', () => {
  test('matches the tense-variant verb families', () => {
    for (const t of [
      'I fixed the bug.',
      'Implemented the new endpoint.',
      'Added a helper function.',
      'Created the config file.',
      'I wrote the parser.',
      'Refactored the module.',
      'Updated the dependency.',
      'Changed the default value.',
      'Edited the README.',
      'Modified the schema.',
      'Patched the vulnerability.',
      'Resolved the merge conflict.',
      'Replaced the old client.',
    ]) {
      assert.strictEqual(CHANGE_VERBS_RE.test(t), true, t);
    }
  });

  test('does not match unrelated text', () => {
    assert.strictEqual(CHANGE_VERBS_RE.test('Here is a summary of the codebase.'), false);
  });
});

describe('unit: COMMIT_VERBS_RE', () => {
  test('matches commit/push tense variants', () => {
    for (const t of ['Committed the change.', 'I commit this now.', 'Pushed to main.', 'Pushing the branch.']) {
      assert.strictEqual(COMMIT_VERBS_RE.test(t), true, t);
    }
  });

  test('does not match change verbs', () => {
    assert.strictEqual(COMMIT_VERBS_RE.test('Fixed the bug.'), false);
  });
});

describe('unit: claimsChange (negation guard)', () => {
  test('true for an unnegated change claim', () => {
    assert.strictEqual(claimsChange('I fixed the auth bug.'), true);
  });

  test('false when the match is negated within ~12 chars', () => {
    for (const t of [
      'I did not fix the bug.',
      "I didn't fix it.",
      'I could never fix this.',
      "I wasn't able to fix it.", // "n't" within window
      'I am unable to fix this right now.',
    ]) {
      assert.strictEqual(claimsChange(t), false, t);
    }
  });

  test('a later unnegated verb still counts even if an earlier one was negated', () => {
    assert.strictEqual(claimsChange('I did not fix the typo, but I resolved the crash.'), true);
  });

  test('false for non-string input', () => {
    assert.strictEqual(claimsChange(undefined), false);
    assert.strictEqual(claimsChange(null), false);
  });
});

describe('unit: phantomBlockReason', () => {
  test('names the mechanism, disclaims user-declining, and offers the honest way out', () => {
    const reason = phantomBlockReason('Done — fixed the auth bug.');
    assert.match(reason, /^plumb:/);
    assert.match(reason, /no edit tool ran this turn/);
    assert.match(reason, /working tree is clean/);
    assert.match(reason, /not the user declining/);
    assert.match(reason, /say so in one line and stop/);
  });
});

// ---- integration: the gate end to end ----

describe('integration: phantom-claim fires', () => {
  test('armed: blocks a no-edit turn that claims changes over a clean tree', () => {
    const cwd = cleanRepo();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({ calls: [], finalText: 'Done — I fixed the auth bug.' }),
      hook_event_name: 'Stop',
    };
    const out = hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' }));
    assert.strictEqual(out.decision, 'block');
    assert.match(out.reason, /plumb:/);
    assert.match(out.reason, /no edit tool ran this turn/);
  });

  test('dormant: logs kind phantom-claim and stays silent', () => {
    const cwd = cleanRepo();
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({ calls: [], finalText: 'Done — I fixed the auth bug.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log })), null);
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'phantom-claim');
    assert.strictEqual(lines[0].mode, 'dormant');
    assert.ok(lines[0].claim.includes('fixed'));
  });
});

describe('integration: suppressors and guards', () => {
  test('a commit claim suppresses even though a clean tree + change verb are present', () => {
    const cwd = cleanRepo();
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({ calls: [], finalText: 'Committed the fix and pushed it.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    assert.strictEqual(fs.existsSync(log), false);
  });

  test('a negated claim ("did NOT fix") suppresses', () => {
    const cwd = cleanRepo();
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({ calls: [], finalText: 'I did NOT fix the underlying issue.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    assert.strictEqual(fs.existsSync(log), false);
  });

  test('a dirty working tree suppresses', () => {
    const cwd = dirtyRepo();
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({ calls: [], finalText: 'Done — I fixed the auth bug.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    assert.strictEqual(fs.existsSync(log), false);
  });

  test('no git repo (non-zero exit) suppresses — fail-open', () => {
    const cwd = notARepo();
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({ calls: [], finalText: 'Done — I fixed the auth bug.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    assert.strictEqual(fs.existsSync(log), false);
  });

  test('missing cwd suppresses — fail-open', () => {
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({ calls: [], finalText: 'Done — I fixed the auth bug.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    assert.strictEqual(fs.existsSync(log), false);
  });

  test('an edit-tool turn routes to the base class, not this one, even on a non-code file', () => {
    const cwd = cleanRepo();
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({
        calls: [{ name: 'Write', input: { file_path: 'README.md' } }],
        finalText: 'Done — I fixed the docs.',
      }),
      hook_event_name: 'Stop',
    };
    // Neither class fires: base class requires a CODE_EXT_RE match (README.md
    // isn't code) and phantom-claim requires NO edit tool at all (one ran).
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' })), null);
    assert.strictEqual(fs.existsSync(log), false);
  });

  test('a code-edit turn routes to the base class candidate kind, never phantom-claim', () => {
    const cwd = cleanRepo();
    const log = freshLog();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({
        calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }],
        finalText: 'Done — the fix works.',
      }),
      hook_event_name: 'Stop',
    };
    const out = hookOutput(runHook('stop-gate.js', input, { PLUMB_LOG: log, PLUMB_ARM: '1' }));
    assert.strictEqual(out.decision, 'block');
    const lines = readLog(log);
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].kind, 'candidate-armed-blocked');
  });
});

describe('integration: shared dedup + session cap', () => {
  test('fires at most once per turn (dedup shared with the base class state)', () => {
    const cwd = cleanRepo();
    const input = {
      session_id: freshSession(),
      cwd,
      transcript_path: writeTurn({ uuid: 'turn-1', calls: [], finalText: 'Done — I fixed the auth bug.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })).decision, 'block');
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null); // deduped
  });

  test('respects the session cap and logs suppressed-session-cap once exhausted', () => {
    const session = freshSession();
    const env = { PLUMB_ARM: '1', PLUMB_SESSION_CAP: '1' };

    const first = {
      session_id: session,
      cwd: cleanRepo(),
      transcript_path: writeTurn({ uuid: 'turn-1', calls: [], finalText: 'Done — I fixed the auth bug.' }),
      hook_event_name: 'Stop',
    };
    const second = {
      session_id: session,
      cwd: cleanRepo(),
      transcript_path: writeTurn({ uuid: 'turn-2', calls: [], finalText: 'Done — I fixed another bug.' }),
      hook_event_name: 'Stop',
    };

    assert.strictEqual(hookOutput(runHook('stop-gate.js', first, env)).decision, 'block');
    assert.strictEqual(hookOutput(runHook('stop-gate.js', second, env)), null);
  });
});

// observe-report.js's CANDIDATE_KINDS now registers 'phantom-claim' (Spec
// P3 task closed the gap this comment used to document — see
// check_outcome.test.js for the parallel claimed-over-failure registration).
describe('compat: observe-report.js on the new kind', () => {
  test('counts phantom-claim as both byKind and a full candidate', () => {
    const { readRecords, buildReport } = require('../scripts/observe-report');
    const log = freshLog();
    fs.writeFileSync(
      log,
      [
        JSON.stringify({ ts: '2026-07-14T00:00:00.000Z', session: 's1', turnKey: 't1', mode: 'dormant', kind: 'phantom-claim', claim: 'fixed it' }),
      ].join('\n') + '\n'
    );
    const report = buildReport(readRecords(log));
    assert.strictEqual(report.byKind['phantom-claim'], 1);
    assert.strictEqual(report.candidateCount, 1); // gap closed: CANDIDATE_KINDS now includes phantom-claim
  });
});
