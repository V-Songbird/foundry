# Development hook reconciliation — 2026-09-09

Foundry's Claude and Codex project configurations now invoke the same three
maintenance scripts: test-on-edit, manifest review reminders and checkpoint
commit reminders. These are repository development checks; no installed plugin
hooks, skills, manifests or runtime code changed.

Claude binds them through `.claude/settings.json`; Codex binds them through
`.codex/hooks.json`. Their shared implementation currently lives in
`.claude/hooks/`. That directory name is historical ownership, not a second
implementation for Codex. The Codex launcher finds the containing Foundry tree
from the session working directory, including nested plugin checkouts.

## Corrected coverage

- Test discovery recognizes either native manifest and the nearest owning
  edition. Deep worktrees and project-relative file paths work.
- Scratch directories, benchmark archives, fixtures and dependency trees do not
  trigger a product test run merely because they contain a copied manifest.
- The shared input adapter accepts Claude Edit/Write paths and Codex
  `apply_patch` through `tool_input.command`. It collects additions, updates,
  deletions and rename destinations; multi-file patches run each owning suite
  once, including patches spanning editions.
- Child tests execute through the current Node executable in the owning plugin
  directory. Inherited Git routing and Node test IPC markers are removed.
- A 90-second total test budget fits within the 100-second outer hook timeout.
  Timeout feedback is distinct from an assertion failure; suites omitted after
  budget exhaustion are explicitly reported as not run.

## Native activation boundary

The official [Codex hooks guide](https://learn.chatgpt.com/docs/hooks) documents
project `.codex/hooks.json`, canonical `apply_patch` input, and the review of
each non-managed hook definition before execution. The configuration does not
bypass that review or alter user trust settings. In a trusted project, use
Codex's `/hooks` interface to review the definitions when the client requests
it. Changes to a definition can require renewed review.

Validation here proves payload handling, script behavior and command execution.
It does not prove that an already-running desktop session has reloaded and
trusted the new definitions. Client activation remains an integration check.
Tool hooks also do not cover arbitrary filesystem writes through every possible
shell command; the existing repository checks remain necessary.

## Verification

- All 169 maintenance tests pass, including real child-process tests for both
  native command locations, Codex patch payloads, multiple owning editions,
  checkout cwd, inherited Git routing and timeout reporting.
- Native binding tests verify that each of the three shared scripts is bound
  once in each client's project configuration.
- All 435 protected product files still match the captured baseline.
- No benchmark session, installation, project commit or remote change occurred.

Evidence: `.scratch/consolidation/development-hooks-tests.log` and the maintained
tests under `.claude/hooks/`. The broader audit's hook-detection finding is now
corrected locally; native activation and the remaining reconciliation work are
not claimed complete.
