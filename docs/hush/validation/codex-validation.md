# Validation plan

> **Status note, 2026-08-18.** Snapshot of hush as of 2026-07-20; the "four
> skills" inspected under Evidence are now two. See [README.md](../research/codex-port-dossier.md)
> before treating any gate below as current.

No sibling implementation exists in this change. The source-capture boundary passed controlled prototypes; every row below remains a release gate for a general runner and packaged plugin.

## A. Static package and adapter checks

1. Parse `.codex-plugin/plugin.json`; require `./`-prefixed component paths contained by the sibling root.
2. Parse `hooks/hooks.json`; require hook code to resolve from `PLUGIN_ROOT` and hook-owned writes from `PLUGIN_DATA`.
3. Reject Claude-only markers: `updatedToolOutput`, `outputStyle`, `force-for-plugin`, `.claude/output-styles`, and `/hush:`. Compatibility environment variables may be read only when explicitly tested.
4. Prove the runner never imports executable code from `hush/`. Copy calibrated pure transforms into the sibling and run parity fixtures against the Claude source without modifying it.
5. Unit-test malformed hook JSON, missing IDs, disabled flags, loop prevention, parallel jobs, job tampering, secret-shaped commands/output, clean/failing output, enumeration, and sidecar retrieval.
6. Verify `git diff -- hush` is empty.

## B. Installation and trust

1. Add the sibling to `.agents/plugins/marketplace.json` with an `AVAILABLE` install policy.
2. Desktop: install from Plugins, start a new Codex task, confirm skills, inspect `/hooks`, and trust the exact hook definitions.
3. CLI: install from the same marketplace, open a new session, inspect `/hooks`, and repeat the runtime fixtures.
4. Confirm untrusted hooks are skipped and changed hook hashes require review again.
5. Record plugin/CLI/app version, OS, model, shell, sandbox, approval policy, and permission mode.

The IDE extension is an expected plugin negative test. Cloud remains deferred until plugin and local-hook runtime support are documented and proven.

## C. Runner correctness fixtures

| Fixture | Pass condition |
| --- | --- |
| Short clean command | Runner returns the original output unchanged and exact status. |
| Long clean command | Bounded digest is smaller; head/tail/relevant signals and omission count are accurate. |
| Long failing command | Every error/failure signal and authoritative child exit code survive; outer-tool normalization is disclosed. |
| Mixed stdout/stderr | Ordering or stream labels remain diagnostically correct. |
| Enumeration request | No cap, template collapse, or sidecar substitution silently removes requested items. |
| Secret-shaped output | No sidecar is written and the digest does not repeat secrets. |
| Sidecar | Full bytes are private, atomic, retrievable through an approved path, and removed by retention policy. |
| Shell fidelity | Quoting, pipelines, redirection, working directory, environment, globbing, Unicode, and native executables match direct execution. |
| Long-running/background | Supported cases stream state safely; unsupported interactive/TTY/background cases bypass routing without hanging. |
| Cancellation/timeout | Child process tree terminates and partial sidecars are not advertised as complete. |
| Sandbox | Child cannot exceed the direct shell tool's access on Windows, macOS, or Linux. |
| Approval | Direct runner call follows normal approval. Denial/retry does not approve the retry. No default hook emits `permissionDecision: "allow"`. |

## D. Routing fixtures

Run every command family in three modes: no plugin, execution contract only, and contract plus denial fallback.

1. The contract routes likely-noisy tests, builds, and log commands on the first call.
2. It leaves short inspection, sidecar retrieval, explicit raw output, enumeration, interactive commands, and the runner itself unwrapped.
3. A missed noisy command is denied before side effects and receives exactly one valid retry.
4. Retry cannot loop and the child executes once.
5. A directly conflicting user request is handled explicitly: either honor raw output or explain that Hush must be disabled for that call.
6. An optional same-call rewrite, if ever offered, is off by default and tested separately under each approval/sandbox combination.

## E. Host-mechanism negative tests

Keep these tests so a future CLI improvement can be adopted without assumption:

- `PostToolUse decision:block`, exit `2`, and `continue:false` with complete feedback;
- `updatedMCPToolOutput` and `suppressOutput` support status;
- `tool_output_token_limit` head/tail behavior and diagnostic loss;
- whether `PostToolUse` or code mode receives pre-cap output;
- `permission_mode` mapping for default, accept-edits, never/don't-ask, and dangerous bypass;
- compaction summary injection and MCP structured-result replacement.

## F. Measurements and release gate

Measure correctness first, then raw bytes, model-visible bytes, total and cached input tokens, number of model round trips, tool failures, latency, and sidecar retrieval. Compare:

1. unwrapped direct command;
2. direct runner on the first call;
3. denial/retry fallback;
4. host history cap alone.

A lower per-result size is not a win if an extra model round trip raises total input, an error disappears, approval changes, or the final answer becomes wrong. State corpus, model, sampling, cache state, and cost source. Do not transfer Claude benchmark numbers to Codex.

## Evidence already collected

- Current Claude hush manifest, style, hook registrations, four skills, and compression exports were inspected without modification.
- Official plugin, skill, hook, configuration, and MCP documentation was refreshed through the current Codex manual and exact published pages.
- The active package binary and runnable bundled CLI were identified; CLI version is `0.145.0-alpha.18`.
- Disposable plugin install/load/environment/removal passed.
- Report-contract priority, PreTool rewrite, all documented post-tool replacement forms, native history limiting, code-mode visibility, source-capture success/failure, sidecar retrieval, first-call routing, fallback routing, and permission-mode mapping were exercised in headless sessions.
- A paired direct-runner fixture reduced total input by 4,710 tokens while preserving one tool call; this remains prototype evidence, not a release claim.
