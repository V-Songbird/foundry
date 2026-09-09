# Validation plan

The source tree is rebased to Foreman `1.1.2` at `cdec583` as of 2026-08-08. This file intentionally does not publish final totals or live-surface success before the release owner records them.

## Final evidence ledger

| Evidence | Result |
| --- | --- |
| Focused and full Codex test totals | **Pending final integration run** |
| Claude baseline regression | **Pending final integration run** |
| Source-to-installed-cache file/hash identity | **Pending final CLI install** |
| Normal CLI install and hook trust | **Pending** |
| Fresh CLI skill and three-hook delivery | **Pending** |
| Complete CLI lifecycle and uninstall | **Pending** |
| Codex desktop install/trust and lifecycle | **Pending** |

Insert only measured commands, versions, dates, totals, and hashes here. Do not promote historical headless probes to final evidence.

## A. Package and compatibility gates

1. Validate `.codex-plugin/plugin.json`, its `./skills/` path, and default `hooks/hooks.json` discovery with no duplicate manifest hooks field.
2. Confirm exactly five skill directories and every skill-relative helper/reference inside the installed cache.
3. Compare every source file with the installed cache by relative path and SHA-256; prove test fixtures never mutate installed code.
4. Run Claude and Codex mechanical suites against shared format-1 and format-2 fixtures, including active and archive ledgers.
5. Verify format-1 reads are byte-preserving, explicit/automatic migration creates backups, and newer unsupported markers fail safely.
6. Confirm concurrent root edits do not modify the Foreman `1.1.2` source baseline unintentionally.

## B. Skill gates

| Workflow | Required evidence |
| --- | --- |
| `$foreman` | Routes add, status, correct, doctor, pick, and reconcile-and-pick without owning mutations. |
| `$foreman-init` | Preview, approval, config defaults, format marker, safe extension, cancel path, and scoped commit. |
| `$foreman-roadmap` | Add/review/correct/doctor/lifecycle/archive/restore/pick branches use only helper mutations and preserve returned ranking. |
| `$foreman-craft-prompt` | Standard/reinforced profiles, familiarity/blind-spot signals, explicit unknowns, and all destinations pass the checker. |
| `$foreman-survey` | Bounded read-only evidence, subagent/sequential paths, exact proposals, and confirmation before writes. |
| Reconcile-and-pick | Surveys exactly the returned scope, applies only confirmed repairs, reloads the compact menu, and does not invent a second ranking. |

Exercise both structured chooser availability and ordinary conversational questions. Exercise current-task, supervised-subagent, and clipboard delivery without claiming detached execution.

## C. Roadmap and evidence gates

1. Cover `planned_touches` and `observed_touches` normalization, writes, collisions, corrections, and append-only history.
2. Cover `awaiting_acceptance` candidacy, dependencies, accept/decline transitions, evidence warnings, follow-up commits, and archive refusal.
3. Cover correct, reassign-id, doctor, migrate, archive, and restore across healthy, corrupt, and conflict cases.
4. Cover root and submodule SHAs, exact trailers, abbreviated SHAs, unresolved evidence, staged closes, and safe-commit trailer behavior.
5. Run roadmap-health and attention-cost against representative active/archive/trial fixtures and verify metric names and denominators.

## D. Hook gates

1. `SessionStart`: startup/clear, resume/compact exclusions, nested cwd, corrupt/missing roadmap, stale entries, awaiting entries, archive rate limit, trial opt-in, and native JSON context.
2. `PreToolUse`: apply_patch add/update/delete/move and multi-file forms, Edit/Write aliases, POSIX/Windows paths, exact archive ownership, malformed fail-open, helper guidance, and shell repair boundary.
3. `PostToolUse`: compound commits, `git -C`, exit shapes, wrapped markers, JSON context, default verification, awaiting follow-ups, trailers, planned-vs-observed ranking, corrupt roadmap, discovery defaults/invite, worktrees, submodules, undeclared nested repos, and unrelated repos.
4. Static checks: no Claude runtime names, transcript parsing, home/tmp state, installed-code writes, TaskCreated/TaskCompleted registration, broad Stop close gate, or decision-anchor registration.
5. Review and trust the exact final hook hash in normal CLI and desktop runs.

## E. Prompt and health gates

1. Validate every required Markdown section and fixed evidence/scope/closure pin.
2. Run positive and negative fixtures for implementation, bug fix, docs, research, decisions, stale paths, conflicts, constrained scope, unfamiliar users, blind spots, and explicit unknowns.
3. Verify reinforced signals cannot use the standard profile and that both profiles preserve the same fixed structure.
4. Record Codex-specific correctness and attention evidence before making performance or model claims.
5. Keep Anthropic, Fable, XML, and Workflow-schema assertions absent from Codex output.

## F. Live release gates

### CLI

Use the CLI marketplace flow only. Install, review hook trust, start a fresh task, invoke all five skills, exercise the three hooks, complete init → pick → execute → acceptance → archive/restore, restart, and uninstall. Record the exact CLI version, OS, permission mode, commands, hashes, and outcomes.

### Desktop

After CLI evidence is complete, install through the desktop surface, review the same hook definitions, and execute at least one complete lifecycle. Record the app version, OS, model, permission mode, canonical tool names, clipboard behavior, and any divergence.

### Deferred assertions

Do not treat successful managed execution as proof of a generic close gate, detached resume, model mapping, XML/Workflow schema, cloud support, or decision-anchor attribution.
