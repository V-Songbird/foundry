'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { runHook, hookOutput, freshSession, writeTurn, freshLog } = require('./helpers');
const { editedCode, editTargets, ranCheck, claimsSuccess, blockReason } = require('../hooks/stop-gate');

// ---- unit: the three signals ----

describe('unit: editedCode (signal 1)', () => {
  test('true when a source file was edited', () => {
    assert.strictEqual(editedCode([{ name: 'Edit', input: { file_path: 'src/app.js' } }]), true);
    assert.strictEqual(editedCode([{ name: 'Write', input: { file_path: 'lib/parse.py' } }]), true);
    assert.strictEqual(editedCode([{ name: 'NotebookEdit', input: { notebook_path: 'a.ipynb' } }]), false); // .ipynb not in code set
  });

  test('false for docs/config-only edits — nothing to run', () => {
    assert.strictEqual(editedCode([{ name: 'Write', input: { file_path: 'README.md' } }]), false);
    assert.strictEqual(editedCode([{ name: 'Edit', input: { file_path: 'config.yaml' } }]), false);
    assert.strictEqual(editedCode([{ name: 'Edit', input: { file_path: 'notes.txt' } }]), false);
  });

  test('false when no edit tool ran', () => {
    assert.strictEqual(editedCode([{ name: 'Read', input: { file_path: 'src/app.js' } }]), false);
    assert.strictEqual(editedCode([]), false);
  });

  test('editTargets pulls file paths from every edit tool', () => {
    const calls = [
      { name: 'Edit', input: { file_path: 'a.js' } },
      { name: 'Read', input: { file_path: 'b.js' } },
      { name: 'Write', input: { file_path: 'c.ts' } },
    ];
    assert.deepStrictEqual(editTargets(calls), ['a.js', 'c.ts']);
  });
});

describe('unit: ranCheck (signal 3)', () => {
  test('true for test/build/run commands', () => {
    for (const cmd of ['npm test', 'npm run build', 'pnpm test', 'pytest -q', 'go test ./...', 'cargo test', 'node dist/app.js', 'python main.py', 'tsc --noEmit', 'vitest run']) {
      assert.strictEqual(ranCheck([{ name: 'Bash', input: { command: cmd } }]), true, cmd);
    }
  });

  test('false for non-check shell commands', () => {
    for (const cmd of ['git status', 'ls -la', 'cat package.json', 'grep foo src', 'mkdir build']) {
      assert.strictEqual(ranCheck([{ name: 'Bash', input: { command: cmd } }]), false, cmd);
    }
  });

  test('only inspects Bash/PowerShell tool calls', () => {
    assert.strictEqual(ranCheck([{ name: 'Edit', input: { command: 'npm test' } }]), false);
  });

  // hush's preserve-exit-code.js wraps Bash/PowerShell commands under
  // bypassPermissions/HUSH_WRAP=1 to smuggle the real exit code past a
  // PostToolUseFailure event. Literal fixtures of that wrap shape (not a
  // live hush call — plumb never depends on a sibling plugin), confirmed
  // 2026-07-14: PreToolUse hooks don't chain (razor/plumb roadmap 011), so
  // stop-gate never actually sees a wrapped command in the transcript — this
  // locks CHECK_RE's substring match as a defense-in-depth regardless.
  test('still matches hush-wrapped Bash commands', () => {
    const wrapped = "npm test\n__hush_exit=$?\necho '[[hush:exit='\necho $__hush_exit\necho ']]'\nexit 0";
    assert.strictEqual(ranCheck([{ name: 'Bash', input: { command: wrapped } }]), true);
  });

  test('still matches hush-wrapped PowerShell commands', () => {
    const wrapped =
      "& { npm test } 2>&1 | Out-String -Width 4096\nWrite-Output '[[hush:exit='\n$LASTEXITCODE\nWrite-Output ']]'\nexit 0";
    assert.strictEqual(ranCheck([{ name: 'PowerShell', input: { command: wrapped } }]), true);
  });
});

describe('unit: claimsSuccess (signal 2)', () => {
  test('true for completion/correctness claims', () => {
    for (const t of ['Done — the parser now works.', 'Fixed the off-by-one.', 'All tests should pass now.', 'That resolves the issue.', 'The implementation is complete.', 'Good to go.']) {
      assert.strictEqual(claimsSuccess(t), true, t);
    }
  });

  test('false for neutral progress text', () => {
    for (const t of ['I updated the parser logic.', 'Here is what I changed and why.', 'I added a helper to the module.', '']) {
      assert.strictEqual(claimsSuccess(t), false, t);
    }
  });
});

describe('unit: blockReason', () => {
  test('names the edited file and carries automated provenance + an escape hatch', () => {
    const reason = blockReason(['src/app.js', 'src/util.js']);
    assert.match(reason, /src\/app\.js \+1 more/);
    assert.match(reason, /automated completion checkpoint/);
    assert.match(reason, /not the user declining/);
    assert.match(reason, /say so in one line and stop/);
  });
});

// ---- integration: the gate end to end ----

function candidateTurn() {
  return {
    session_id: freshSession(),
    transcript_path: writeTurn({
      calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }],
      finalText: 'Done — the fix works.',
    }),
    hook_event_name: 'Stop',
  };
}

describe('integration: armed', () => {
  test('blocks a code-edit-then-claim turn with no check', () => {
    const out = hookOutput(runHook('stop-gate.js', candidateTurn(), { PLUMB_ARM: '1' }));
    assert.strictEqual(out.decision, 'block');
    assert.match(out.reason, /plumb:/);
    assert.match(out.reason, /src\/app\.js/);
  });

  test('uses last_assistant_message when the Stop payload carries it', () => {
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({ calls: [{ name: 'Edit', input: { file_path: 'a.ts' } }], finalText: 'neutral text' }),
      hook_event_name: 'Stop',
      last_assistant_message: 'All set — this fixes it.',
    };
    const out = hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' }));
    assert.strictEqual(out.decision, 'block');
  });

  test('silent when a check ran this turn', () => {
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({
        calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }],
        commands: ['npm test'],
        finalText: 'Done — tests pass.',
      }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null);
  });

  test('silent when only docs changed', () => {
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({ calls: [{ name: 'Write', input: { file_path: 'README.md' } }], finalText: 'Done.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null);
  });

  test('silent when the closing message makes no claim', () => {
    const input = {
      session_id: freshSession(),
      transcript_path: writeTurn({ calls: [{ name: 'Edit', input: { file_path: 'src/app.js' } }], finalText: 'I updated the parser logic.' }),
      hook_event_name: 'Stop',
    };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null);
  });

  test('fires at most once per turn', () => {
    const input = candidateTurn();
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })).decision, 'block');
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null); // deduped
  });

  test('never re-blocks under stop_hook_active', () => {
    const input = { ...candidateTurn(), stop_hook_active: true };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null);
  });

  test('silent with no transcript', () => {
    const input = { session_id: freshSession(), hook_event_name: 'Stop' };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null);
  });
});

describe('integration: prompt_id turn keys', () => {
  test('prompt_id present but transcript missing still stays silent — no entries to analyze', () => {
    const input = { session_id: freshSession(), prompt_id: 'p-1', hook_event_name: 'Stop' };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null);
  });

  test('dedup state keyed by prompt_id blocks a second checkpoint in the same turn', () => {
    const input = { ...candidateTurn(), prompt_id: 'p-dedup' };
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })).decision, 'block');
    assert.strictEqual(hookOutput(runHook('stop-gate.js', input, { PLUMB_ARM: '1' })), null); // deduped
  });
});

describe('integration: dormant (default)', () => {
  test('stays silent but records the candidate to the observation log', () => {
    const log = freshLog();
    const input = candidateTurn();
    const r = runHook('stop-gate.js', input, { PLUMB_LOG: log });
    assert.strictEqual(hookOutput(r), null); // never interrupts while dormant

    const lines = fs.readFileSync(log, 'utf-8').trim().split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 1);
    const rec = JSON.parse(lines[0]);
    assert.strictEqual(rec.mode, 'dormant');
    assert.deepStrictEqual(rec.files, ['src/app.js']);
    assert.ok(rec.claim.includes('works'));
  });

  test('PLUMB_DISABLE=1 kills the hook entirely — no output, no log', () => {
    const log = freshLog();
    const r = runHook('stop-gate.js', candidateTurn(), { PLUMB_LOG: log, PLUMB_DISABLE: '1' });
    assert.strictEqual(hookOutput(r), null);
    assert.strictEqual(fs.existsSync(log), false);
  });
});
