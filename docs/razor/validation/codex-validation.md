# Validation plan

The production sibling exists at `plugins/razor-codex`. This checklist records
its release gates; completed live evidence is in
[HEADLESS_PROBES.md](codex-headless-probes.md#production-sibling-validation).

## A. Static package and adapter checks

1. Parse `.codex-plugin/plugin.json`; require `./`-prefixed internal paths, a kebab-case name, version, description, and no files other than `plugin.json` below `.codex-plugin/`.
2. Parse `hooks/hooks.json` as JSON in the test suite; require `PLUGIN_ROOT` for bundled code and `PLUGIN_DATA` for writes. Require `SessionEnd` to invoke the bundled cleanup script with timeout `3`. Reject direct use of `.claude`, `CLAUDE_PLUGIN_OPTION_*`, user-home state, installed-cache mutation, `prompt_id`, and transcript parsing.
3. Unit-test every hook against Codex-shaped stdin: malformed JSON, absent optional paths, null transcript path, unknown tool, disabled state, main-agent and subagent identity, concurrent state writes, scoped SessionEnd cleanup, and stale state cleanup.
4. Require an action fingerprint to be persisted before every deny response.
   Test first action denied, a separately-started exact retry allowed, changed
   action independently assessed, and a later same-session action still
   guarded. Launch identical requests concurrently and prove neither can
   consume a grant created after that request began.
5. Run the sibling suite and assert `git diff -- razor` is empty.

## B. Guard fixtures

| Fixture | Pass condition |
| --- | --- |
| `npm install axios` | First canonical Bash request is denied with the actual installed list where available; exact retry runs; `npm install --package-lock-only`, restores, and no-op forms retain current Razor exclusions. |
| Python / other supported managers | Existing parser expectations stay intact under a Codex Bash event. |
| `apply_patch` adds `package.json` dependency | Fresh name is denied once; version-only change and malformed patch fail open. |
| `apply_patch` introduces `import` / `require` | Newly undeclared external roots are denied once; stdlib, relative, declared, and test exemptions pass. |
| `apply_patch` adds files | Budget reserves only `Add File` paths during one `turn_id`; edits and temporary files are excluded. Concurrent reservations affect projected budget, successful post-tool completion commits the count, and turns remain isolated. |
| Successful and failed `apply_patch` | Only a successful matching `PostToolUse` commits the file reservation and marks the edit phase. A failed patch releases the reservation and leaves the committed count unchanged; denied or missing post-tool events do not report success. |
| Shell file creation | It remains an explicit known bypass, not a falsely claimed guard. |
| Post-edit `rg` / `grep` | Candidate classifier denies only the second qualifying search after a write; pre-edit search, command execution, and ambiguous shell syntax pass. |
| `razor off` / `razor on` | State changes are session-local, restart safely, and never require a Claude slash command. |

## C. Lifecycle, trust, and packaging

1. Add the sibling to a disposable `.agents/plugins/marketplace.json`, install it through the CLI, and start a fresh session.
2. Verify `PLUGIN_ROOT` and `PLUGIN_DATA`; verify every state file is below the latter and no source/cache file is modified.
3. Confirm untrusted hooks are skipped, a reviewed hook runs, and a changed hook definition requires review again. The prototype bypass flag is never a release instruction.
4. Run the desktop Plugins UI path separately. Record desktop version, OS, model, source, hook trust state, and canonical observed tool names.
5. Trigger a real writable subagent. Require `SubagentStart` to persist its `turn_id -> agent_id` mapping, verify tool hooks resolve it, remove the mapping to exercise turn-isolated fallback, and confirm neither path consumes parent budget/retry entries.
6. Exercise an official `agent_type: "explorer"` event. Require the identity
   map to be persisted but no ladder context to be emitted. Test full and bare
   names in comma-separated `RAZOR_AGENT_SKIP`, and prove
   `RAZOR_AGENT_INJECT` overrides both configured and default skips. When the
   host preserves explicit role selection, repeat this with a live built-in
   explorer; record a null/omitted role as inconclusive rather than a pass. Do
   not add other default exclusions without an equivalent host capability
   contract and fixture.
7. Confirm the IDE extension negative case: no plugin is advertised there.
8. Pin current stable CLI `0.145.0` for release acceptance. Close a main
   session and require `SessionEnd` to remove its main state, agent ledgers, and
   turn maps within three seconds while leaving unrelated files and symlinks
   untouched. Separately verify startup garbage collection handles stale state
   when lifecycle cleanup is missed.

## D. Ledger and correctness gates

1. Start in a disposable Git repository, capture a clean baseline, then make a below-threshold change: `Stop` must not continue.
2. Begin with more than 500 pre-session inserted lines in tracked dirty state,
   capture the baseline, and make no further change: `Stop` must not continue.
   Record the object directory, index bytes/status, and worktree before and
   after capture; all must remain unchanged.
3. Begin with untracked paths, capture the baseline, remove one, and create a
   different path so the total count is unchanged: membership comparison must
   count the new path. Exercise the bounded path cap and require unknown
   overflow membership to fail open.
4. Modify an already-dirty tracked file and assert the documented aggregate
   approximation: it may undercount but must not attribute the unchanged
   pre-session aggregate to the session.
5. Create insertion-heavy or new-file-heavy post-start change: `Stop` must create exactly one continuation, then remain silent when `stop_hook_active` is true.
6. Test a deletion-heavy refactor: it must not count as sprawl merely because the diff is large.
7. Confirm the continuation neither undoes user work nor asks for user approval. It should prompt the agent to reassess and report succinctly.
8. For every enabled feature, compare no-plugin and sibling runs for requested behavior, code correctness, tests, dependencies, files, and false positive rate. A leaner diff that breaks requested behavior is a failure.
9. For benchmark runs, optionally export OTel to a disposable local collector and reconcile tool decisions/results and `response.completed` token counts with the harness. Run the same suite with telemetry disabled to prove the plugin has no dependency on it.

## E. Release gate

Publish only after every advertised row passes on every advertised surface.
The historical search-meter, write/retry, subagent-isolation, state-path, and
one-shot Stop probes passed on CLI `0.144.6`. Final build
`0.1.0+codex.20260726231537` also passed the 101-test package gate and a clean
installed-package run on current stable `0.145.0`, including an installed
semantic retry and supported `SessionEnd` cleanup. Event fixtures cover
explorer filtering, concurrent retry isolation, file-budget commit/rollback,
cleanup starvation, and the read-only dirty baseline. Continue to defer the
settings UI, desktop hook support, live preserved-role explorer evidence, and
Codex performance claims until their own tests pass. Never carry Claude
benchmark values, hook coverage, or install language into Codex release copy.
