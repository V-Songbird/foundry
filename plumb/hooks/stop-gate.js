#!/usr/bin/env node
'use strict';

// Stop — the evidence gate. When a turn edited code and the closing message
// reads as "done" but no check ever ran, that's an unproven completion claim.
// Dormant by default: it logs the candidate and stays silent. Armed, it returns
// decision:"block" to force one more turn — the one place a forced continuation
// is productive, because it has real work to do (run the check), unlike a
// bare-acknowledgment nudge.
//
// The gate is deliberately conservative. All three signals must hold, and every
// ambiguous case fails toward silence: a stall at turn's end is worse than a
// missed nudge, so plumb only speaks when it's fairly sure.
//
// A second, independent class runs on turns with NO edit tool at all: a
// closing message claiming changes were made (fixed/added/refactored/…) while
// the working tree is clean is a fabricated completion, not just an unproven
// one. Same dormant-first, fail-toward-silence discipline; see
// handlePhantomClaim below.

const path = require('path');
const {
  readInput,
  isActive,
  isArmed,
  settingNumber,
  readState,
  writeState,
  logObservation,
  currentTurn,
  turnKey,
  turnToolCalls,
  lastAssistantText,
  checkOutcome,
  git,
} = require('./plumb-lib');

// ---- signal 1: code changed this turn ----

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

// Only source code counts. Editing a README or a config and saying "done" has
// nothing to run, so those turns must not trip the gate — the fail-safe
// direction is to under-match, never over-match.
const CODE_EXT_RE =
  /\.(js|jsx|mjs|cjs|ts|tsx|py|pyi|rb|go|rs|java|kt|kts|scala|clj|c|h|cc|cpp|cxx|hpp|hh|cs|php|swift|m|mm|lua|ex|exs|erl|dart|sql|vue|svelte|sh|bash|zsh|ps1|psm1)$/i;

function editTargets(calls) {
  const files = [];
  for (const c of calls) {
    if (!EDIT_TOOLS.has(c.name)) continue;
    const p = c.input && (c.input.file_path || c.input.notebook_path || c.input.path);
    if (typeof p === 'string') files.push(p);
  }
  return files;
}

function editedCode(calls) {
  return editTargets(calls).some((p) => CODE_EXT_RE.test(p));
}

// ---- signal 3 (negated): a check ran ----

// Any test / build / lint / type-check runner, or running a script directly.
// Deliberately broad: a false positive here just means the gate stays silent
// (it saw evidence of a check), which is the safe direction.
const CHECK_RE = new RegExp(
  [
    '\\b(npm|pnpm|yarn|bun|npx)\\s+(run|test|start|ci|build|lint|typecheck|exec)\\b',
    '\\b(jest|vitest|mocha|ava|jasmine|karma|cypress|playwright)\\b',
    '\\b(pytest|py\\.test|unittest|nose2?|tox)\\b',
    '\\b(rspec|minitest|rake\\s+test)\\b',
    '\\bgo\\s+(test|run|build|vet)\\b',
    '\\bcargo\\s+(test|check|build|run|clippy)\\b',
    '\\bdotnet\\s+(test|build|run)\\b',
    '\\b(mvn|gradle|make|cmake|ninja|bazel|ctest|phpunit)\\b',
    '\\b(tsc|eslint|ruff|mypy|pyright|rubocop|clippy|prettier)\\b',
    '\\b(node|python3?|ruby|deno|bun|php)\\s+[^\\s|;&]+\\.(js|mjs|cjs|ts|py|rb|php)\\b',
  ].join('|'),
  'i'
);

function ranCheck(calls) {
  return calls.some((c) => {
    if (c.name !== 'Bash' && c.name !== 'PowerShell') return false;
    const cmd = c.input && c.input.command;
    return typeof cmd === 'string' && CHECK_RE.test(cmd);
  });
}

// ---- signal 3b: a check ran AND it failed (Spec P3, ran ≠ passed) ----

// Own set, informed by public test-runner conventions rather than any single
// framework: the bare word (case variants), go's "--- FAIL:" line, a
// "N failed"/"N errors" summary line, and a "Tests: ... fail" summary line.
// Combined with 'im' so the per-line anchors (^--- FAIL:, ^\s*\d+ ...) match
// multiline check output. is_error on the tool_result block is checked
// separately in checkOutcome — it's a structural signal, not a text pattern.
const FAIL_RE = new RegExp(
  ['\\bFAIL(?:ED)?\\b', '^--- FAIL:', '^\\s*\\d+\\s+(failed|errors?)\\b', '\\bTests?:.*\\bfail'].join('|'),
  'im'
);

// ---- signal 2: the closing message claims success ----

// The calibration surface. Ships intentionally middle-of-the-road: this list is
// what the dormant observation log exists to tune. "done"/"completed" alone are
// broad, but a false candidate here only writes a log line — it can't block
// while dormant.
// Kept as a flat array (not just a pre-joined regex) so observe-report.js can
// test each alternation separately against logged candidates — which phrases
// actually fire is the calibration surface (Spec P4).
const CLAIM_PATTERNS = [
  'it (now )?works', 'works now', 'now works',
  'should (now )?(work|be working|pass|fix|resolve)',
  '(is|are) (now )?(fixed|resolved|passing|working)',
  '(tests?|the tests?|build|the build|everything|it all) (now )?(pass(es|ing)?|green|succeeds?|is green|are green|works?)',
  '(fixes|fixed|resolves|resolved) (the|this|that|it|your)',
  'that (fixes|resolves) it',
  '(implementation|feature|fix|change) is (complete|done|working|ready)',
  'all set', 'good to go', 'ready to (go|use|merge|ship)',
  '\\ball done\\b', '\\bdone\\b', '\\bcompleted\\b',
];

const CLAIM_RE = new RegExp(CLAIM_PATTERNS.join('|'), 'i');

function claimsSuccess(text) {
  return typeof text === 'string' && CLAIM_RE.test(text);
}

// ---- signal 4 (phantom-claim class): a claim of DONE work with no edit tool ----

// Own tense-variant list, one family per verb: fix/implement/add/create/write/
// refactor/update/change/edit/modify/patch/resolve/replace. Past/perfect forms
// are what matter (claiming to have DONE work), but each family's base form is
// included too since "?" makes the suffix optional — a broader match here is
// fine because CHANGE_VERBS_RE is only one of four required conditions.
const CHANGE_VERBS_RE = new RegExp(
  [
    'fix(?:ed|es|ing)?',
    'implement(?:ed|s|ing)?',
    'add(?:ed|s|ing)?',
    'creat(?:e|ed|es|ing)',
    'wr(?:ite|ites|iting|ote|itten)',
    'refactor(?:ed|s|ing)?',
    'updat(?:e|ed|es|ing)',
    'chang(?:e|ed|es|ing)',
    'edit(?:ed|s|ing)?',
    'modif(?:y|ies|ied|ying)',
    'patch(?:ed|es|ing)?',
    'resolv(?:e|ed|es|ing)',
    'replac(?:e|ed|es|ing)',
  ]
    .map((f) => `\\b${f}\\b`)
    .join('|'),
  'i'
);

// A clean tree is the EXPECTED state right after a successful commit/push, so
// a commit claim legitimizes it — this is a suppressor, never a trigger.
const COMMIT_VERBS_RE = /\b(commit(?:ted|s|ting)?|push(?:ed|es|ing)?)\b/i;

// A CHANGE_VERBS_RE match preceded within ~12 chars by a negator doesn't
// count — "did NOT fix" must not read as a claim. Missing a claim here is
// silent and safe; false-accusing is the failure mode to avoid.
const NEGATION_RE = /\b(not|never|unable)\b|n't/i;
const NEGATION_WINDOW = 12;

function claimsChange(text) {
  if (typeof text !== 'string') return false;
  const re = new RegExp(CHANGE_VERBS_RE.source, 'gi');
  let m;
  while ((m = re.exec(text))) {
    const preceding = text.slice(Math.max(0, m.index - NEGATION_WINDOW), m.index);
    if (!NEGATION_RE.test(preceding)) return true;
    if (re.lastIndex === m.index) re.lastIndex += 1; // guard against zero-length matches
  }
  return false;
}

// ---- reason ----

function snippet(text, max = 160) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function blockReason(files) {
  const f = files.length
    ? ` (${files[0]}${files.length > 1 ? ` +${files.length - 1} more` : ''})`
    : '';
  return (
    `plumb: this turn edited code${f} and the final message reads as complete, but no test, ` +
    `build, or run command appears anywhere in the turn. This is plumb's automated completion ` +
    `checkpoint — not the user declining. The correct next step is to actually run the change ` +
    `(or its tests), confirm it works, then finish. If verification genuinely doesn't apply here, ` +
    `say so in one line and stop. (Fires once per turn; PLUMB_DISABLE=1 to silence.)`
  );
}

function phantomBlockReason(claimText) {
  return (
    `plumb: the final message claims changes (${snippet(claimText, 80)}), but no edit tool ran this turn ` +
    `and the working tree is clean. This is plumb's automated completion checkpoint — not the user declining. ` +
    `If the work was already committed or lives outside this repo, say so in one line and stop. ` +
    `(Fires once per turn; PLUMB_DISABLE=1 to silence.)`
  );
}

function checkFailedBlockReason(claimText) {
  return (
    `plumb: this turn's check output contains failures (${snippet(claimText, 80)}), but the final message reads ` +
    `as complete. This is plumb's automated completion checkpoint — not the user declining. The correct next ` +
    `step is to fix the failures or state them plainly, then finish. ` +
    `(Fires once per turn; PLUMB_DISABLE=1 to silence.)`
  );
}

// Shared by the base class, the claimed-over-failure class, and the
// phantom-claim class: the Stop/SubagentStop payload's last_assistant_message
// is the happy-path source, the transcript scan is the fallback (needs
// allowSidechain:true when entries came from a subagent's own transcript).
function resolveClaimText(data, entries, allowSidechain) {
  return typeof data.last_assistant_message === 'string' && data.last_assistant_message.trim()
    ? data.last_assistant_message
    : lastAssistantText(entries, { allowSidechain });
}

// Default per-session cap on armed blocks (Spec P4 §4): bounds the armed
// worst case the way razor's gates bound theirs by asking once. Dormant mode
// never checks it — observations are free.
const DEFAULT_SESSION_CAP = 3;

function record(data, key, armed, kind, extra) {
  logObservation({
    session: data.session_id || null,
    ...(data.agent_id ? { agent_id: data.agent_id } : {}),
    turnKey: key,
    mode: armed ? 'armed' : 'dormant',
    kind,
    ...(extra || {}),
  });
}

// ---- phantom-claim class: claim + NO edit tool + clean tree ----

// editedCode's non-edit turns stay unlogged for the base class (bounds log
// growth); this is that same branch, evaluating a second, independent
// completion-claim heuristic instead of just returning. All four conditions
// are required, and the miss path for any of them is silent/unlogged —
// matching the base class's own "non-edit-turn" precedent — since only a
// full candidate is worth writing to the log (most no-edit turns are
// ordinary conversation, not phantom claims).
// ctx = { stateId, allowSidechain } — stateId is the session_id for the main
// thread or gateStateId(data) (session--agent_id) for a subagent; allowSidechain
// is true only when entries came from a subagent's own transcript.
function handlePhantomClaim(data, key, entries, calls, ctx) {
  if (calls.some((c) => EDIT_TOOLS.has(c.name))) return; // condition 3 — an edit tool ran; that's the base class's turn, not this one

  const claimText = resolveClaimText(data, entries, ctx.allowSidechain);
  if (!claimText.trim()) return; // no signal at all

  if (!claimsChange(claimText)) return; // condition 1 — no change claim (or negated away)
  if (COMMIT_VERBS_RE.test(claimText)) return; // condition 2 — commit claim suppresses; a clean tree is expected there

  const status = git(['status', '--porcelain'], data.cwd);
  if (status === null || status !== '') return; // condition 4 — no git / not a repo / dirty tree → fail-open, silent pass

  // Candidate. Dedup + session cap + armed state are shared with the base
  // class (same state file, scoped by ctx.stateId): one checkpoint per human
  // turn (or per subagent invocation), whichever class fires first.
  const armed = isArmed();
  const state = readState(ctx.stateId);
  const armedBlocks = state.armedBlocks || 0;

  if (state.turnKey === key && state.fired) {
    record(data, key, armed, 'suppressed-repeat-turn');
    return;
  }

  const candidateExtra = { claim: snippet(claimText) };

  if (armed) {
    const cap = settingNumber('SESSION_CAP', DEFAULT_SESSION_CAP);
    if (armedBlocks >= cap) {
      record(data, key, armed, 'suppressed-session-cap');
      writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
      return;
    }
    record(data, key, armed, 'phantom-claim', candidateExtra);
    writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks: armedBlocks + 1 });
    process.stdout.write(JSON.stringify({ decision: 'block', reason: phantomBlockReason(claimText) }));
    return;
  }

  record(data, key, armed, 'phantom-claim', candidateExtra);
  writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
}

// Core three-signal + claimed-over-failure logic, shared by the main-thread
// Stop path and the SubagentStop path (Spec P2). ctx = { stateId,
// allowSidechain } — see handlePhantomClaim's ctx doc above. The session-cap
// VALUE (PLUMB_SESSION_CAP / DEFAULT_SESSION_CAP) is the thing that's shared
// across main and subagent gates, same as razor's per-scope budgets
// (razor-lib.js gateStateId comment): each ctx.stateId gets its OWN
// armedBlocks counter against that shared cap, so one runaway subagent can't
// burn the main thread's block budget or vice versa.
function runGate(data, key, entries, calls, ctx) {
  if (!editedCode(calls)) return handlePhantomClaim(data, key, entries, calls, ctx); // signal 1 — no code edit this turn; try the phantom-claim class instead

  const armed = isArmed();
  const state = readState(ctx.stateId);
  const armedBlocks = state.armedBlocks || 0;

  if (state.turnKey === key && state.fired) {
    // One checkpoint per human turn — this is the dedup hit itself, logged as
    // its own disposition rather than silently dropped.
    record(data, key, armed, 'suppressed-repeat-turn');
    return;
  }

  if (ranCheck(calls)) {
    // signal 3b (Spec P3): a check ran, but ran ≠ passed. A failing check
    // whose closing message still claims success outranks the silent
    // check-ran exit below — it's the worst case (claim + machine-readable
    // failure evidence) and the lowest-false-positive candidate class plumb
    // has. Passed / unknown outcomes, or a failed check nobody claimed
    // success over, keep today's silent check-ran behavior.
    const outcome = checkOutcome(entries, CHECK_RE, FAIL_RE, { allowSidechain: ctx.allowSidechain });
    if (outcome === 'failed') {
      const claimText = resolveClaimText(data, entries, ctx.allowSidechain);
      if (claimText.trim() && claimsSuccess(claimText)) {
        const files = editTargets(calls).filter((p) => CODE_EXT_RE.test(p));
        const candidateExtra = { files, tools: calls.map((c) => c.name), claim: snippet(claimText) };

        if (armed) {
          const cap = settingNumber('SESSION_CAP', DEFAULT_SESSION_CAP);
          if (armedBlocks >= cap) {
            record(data, key, armed, 'suppressed-session-cap');
            writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
            return;
          }
          record(data, key, armed, 'claimed-over-failure', candidateExtra);
          writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks: armedBlocks + 1 });
          process.stdout.write(JSON.stringify({ decision: 'block', reason: checkFailedBlockReason(claimText) }));
          return;
        }

        record(data, key, armed, 'claimed-over-failure', candidateExtra);
        writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
        return;
      }
    }

    record(data, key, armed, 'check-ran');
    writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
    return;
  }

  const claimText = resolveClaimText(data, entries, ctx.allowSidechain);

  if (!claimText.trim()) {
    // Both the Stop payload and the transcript fallback came back empty —
    // plumb had no signal at all. Distinct from "read the text, no claim in
    // it" (record no-signal honestly rather than inventing a claim verdict).
    record(data, key, armed, 'no-claim-text');
    writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
    return;
  }

  if (!claimsSuccess(claimText)) {
    // signal 2 failed
    record(data, key, armed, 'no-claim');
    writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
    return;
  }

  // Candidate. Dormant mode always logs it (observations are free). Armed
  // mode logs+blocks up to the per-session cap, then logs the suppression
  // and stays silent for the rest of the session.
  const files = editTargets(calls).filter((p) => CODE_EXT_RE.test(p));
  const candidateExtra = { files, tools: calls.map((c) => c.name), claim: snippet(claimText) };

  if (armed) {
    const cap = settingNumber('SESSION_CAP', DEFAULT_SESSION_CAP);
    if (armedBlocks >= cap) {
      record(data, key, armed, 'suppressed-session-cap');
      writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
      return;
    }
    record(data, key, armed, 'candidate-armed-blocked', candidateExtra);
    writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks: armedBlocks + 1 });
    process.stdout.write(JSON.stringify({ decision: 'block', reason: blockReason(files) }));
    return;
  }

  record(data, key, armed, 'candidate-dormant', candidateExtra);
  writeState(ctx.stateId, { turnKey: key, fired: true, armedBlocks });
}

// ---- SubagentStop (Spec P2) ----
//
// Probed live 2026-07-14 (roadmap 014): a scratch SubagentStop hook dumping
// stdin + returning {decision:"block"} on its first firing, driven by
// `claude -p --model haiku` spawning one Task-tool subagent (cost $0.088).
// Findings, folded into this gate:
//   - decision:"block" IS honored on SubagentStop, exactly like Stop: the
//     blocked agent produced a second SubagentStop firing with
//     stop_hook_active:true, having visibly reacted to the block reason. So
//     this gate is NOT permanently observe-only — it arms/blocks the same
//     way the main Stop gate does.
//   - Payload fields (session_id, transcript_path, cwd, prompt_id,
//     permission_mode, agent_id, agent_type, hook_event_name,
//     stop_hook_active, agent_transcript_path, last_assistant_message,
//     background_tasks, session_crons): transcript_path is the PARENT
//     session's transcript, not the subagent's. agent_transcript_path is a
//     dedicated field carrying the subagent's OWN transcript path directly —
//     no path-convention guessing needed on the happy path.
//   - Every entry inside a subagent's own transcript carries isSidechain:true
//     (relative to the root session, it's all a sidechain) — the existing
//     isSidechain-skipping helpers would silently see nothing there. Fixed by
//     threading { allowSidechain: true } through turnToolCalls/
//     lastAssistantText/checkOutcome for this path only (see plumb-lib.js).
//   - The transcript has no isRealUserPrompt boundary (the assigning message
//     isn't human-origin), so currentTurn() naturally returns the WHOLE file
//     as entries — exactly right, since a subagent's entire run is "the
//     turn." No new transcript-walking logic needed.
//   - agent_id is a short opaque hex-ish token (e.g. "a20cdc0db794b4878"),
//     stable across the block/continuation pair — safe as a state-scoping key.

// razor's gateStateId pattern (razor-lib.js:292), reimplemented per-plugin —
// plumb and razor never import across the plugin boundary.
function gateStateId(data) {
  return data.agent_id ? `${data.session_id || 'unknown'}--${data.agent_id}` : data.session_id;
}

// Fallback only: agent_transcript_path is expected on every real payload
// (confirmed live above). This reconstructs the historical
// <project>/<session-uuid>/subagents/agent-<id>.jsonl convention for an
// older harness that omits the field.
function subagentTranscriptFallback(data) {
  if (!data.transcript_path || !data.session_id || !data.agent_id) return null;
  return path.join(path.dirname(data.transcript_path), data.session_id, 'subagents', `agent-${data.agent_id}.jsonl`);
}

function handleSubagentStop(data) {
  if (data.stop_hook_active) return; // same loop guard as Stop — confirmed live on the re-fire
  if (!data.agent_id) return; // can't scope state without it — stay silent

  const transcriptPath =
    typeof data.agent_transcript_path === 'string' && data.agent_transcript_path
      ? data.agent_transcript_path
      : subagentTranscriptFallback(data);
  if (!transcriptPath) return;

  const { entries } = currentTurn(transcriptPath); // whole file = the turn (see comment above)
  if (!entries.length) return;

  const calls = turnToolCalls(entries, { allowSidechain: true });
  const key = turnKey(data); // prompt_id is present on every probed payload

  runGate(data, key, entries, calls, { stateId: gateStateId(data), allowSidechain: true });
}

function main() {
  const data = readInput();
  if (!isActive()) return;

  const event = data.hook_event_name;
  if (event === 'SubagentStop') return handleSubagentStop(data);
  if (event && event !== 'Stop') return;
  // The host sets this when the turn is already continuing because of a Stop
  // hook; never re-block into a loop. Belt to the per-turn state's suspenders.
  if (data.stop_hook_active) return;

  const { turnKey: transcriptTurnKey, entries } = currentTurn(data.transcript_path);
  if (transcriptTurnKey === 'no-transcript') return; // can't scope the turn → stay silent
  const key = turnKey(data, transcriptTurnKey);

  const calls = turnToolCalls(entries);
  runGate(data, key, entries, calls, { stateId: data.session_id, allowSidechain: false });
}

if (require.main === module) main();

module.exports = {
  EDIT_TOOLS,
  CODE_EXT_RE,
  CLAIM_PATTERNS,
  CHECK_RE,
  FAIL_RE,
  DEFAULT_SESSION_CAP,
  editTargets,
  editedCode,
  ranCheck,
  claimsSuccess,
  blockReason,
  snippet,
  CHANGE_VERBS_RE,
  COMMIT_VERBS_RE,
  NEGATION_RE,
  claimsChange,
  phantomBlockReason,
  checkFailedBlockReason,
  gateStateId,
  subagentTranscriptFallback,
  handleSubagentStop,
  runGate,
};
