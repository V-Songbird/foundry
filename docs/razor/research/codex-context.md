# Razor Codex Port

This bounded context defines a Codex sibling without redefining Razor's product promise.

## Language

**Claude Razor**:
The existing calibrated Claude Code plugin under `razor/`. It is source evidence and is never dual-hosted.
_Avoid_: old Razor, converted Razor

**Codex sibling**:
The independently packaged `razor-codex` plugin under `plugins/razor-codex`. It owns its manifest, hook adapters, state, skills, tests, and measurements.
_Avoid_: drop-in conversion

**First-deny retry**:
Razor's core mechanical guarantee: it blocks one matching risky addition with a reuse-first explanation, records that checkpoint, and permits a separately-started identical retry. A concurrent request that began before the checkpoint existed is not that retry. It is neither a permanent veto nor a user-approval request.
_Avoid_: blocklist, enforcement ban

**Guarded write path**:
A Codex tool invocation that can be inspected before side effects. The current portable paths are `Bash` and `apply_patch`; all other paths need per-tool evidence.
_Avoid_: all edits, all commands

**Turn key**:
Codex's `turn_id`, used to reset per-turn file and search budgets. It replaces Claude Razor's `prompt_id` and transcript-tail inference.
_Avoid_: transcript key

**Agent namespace**:
The state partition formed from `session_id` and the `agent_id` recorded with a subagent's `turn_id` at `SubagentStart`. A missing map falls back to that unique turn, never the parent's ledger. Mapping occurs even when ladder injection is skipped for the read-only `explorer`; additional role policy is explicit configuration, not inferred permission.
_Avoid_: shared session ledger

**Edit confirmation**:
A successful `PostToolUse` event used to mark that an `apply_patch` edit actually landed. It supports post-edit accounting but never replaces a pre-side-effect guard.
_Avoid_: post-tool enforcement

**Continuation ledger**:
A one-shot `Stop` decision that starts a second Codex pass when the Git diff crosses Razor's growth threshold. It preserves the final reconsideration intent but cannot rewrite the already-emitted answer.
_Avoid_: final-message hook

**Read-only session baseline**:
The aggregate tracked insertion/deletion counts and bounded hashes of
added/untracked path names captured at `SessionStart` without writing Git
objects, the index, or the worktree. It removes unchanged pre-session dirt from
the Stop estimate; edits to an already-dirty tracked hunk are deliberately
approximate and fail open.
_Avoid_: synthetic tree, clean checkout

**Session cleanup**:
The supported Codex `0.145.0` `SessionEnd` hook that best-effort removes the
main session file, agent-scoped ledgers, and turn maps inside the host's
three-second ceiling. Bounded startup garbage collection remains a fallback.
_Avoid_: alpha-only cleanup

**Deferred surface**:
A feature that lacks a supported primitive or live validation. It is omitted from product claims and implementation, not quietly approximated.
_Avoid_: supported with caveats

**Canary primitive**:
A behavior observed only on an alpha build or outside the official contract. It may have a probe, but release correctness and product copy never depend on it.
_Avoid_: upcoming support
