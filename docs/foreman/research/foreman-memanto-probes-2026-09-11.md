# Foreman probes from the Memanto review — 2026-09-11

Three ideas came out of reading moorcheh-ai/memanto at `42ad055` (MIT):
skip hook processes with handler-level `if` rules, retire a wrong ledger lesson
when its correction is recorded, and escape recorded text before it enters a
handoff. The owner approved two headless probe sessions and a three-session
Sonnet pre-check. Claude Code 2.1.268; Foreman Claude edition 2.6.1.

## Escaping recorded text — free gate test, no model

`benchmarks/foreman/fixtures/moved-file/prompts/foreman-std.md` was run through
the installed 2.6.1 `scripts/check-prompt.js --destination task` on stdin,
outside the repository and with `CLAUDE_PROJECT_DIR` unset. Each variant adds
one `why`-shaped line to `<task_context>`.

| Variant | Gate result |
| --- | --- |
| base prompt | ok, no warnings |
| line with a literal `</task_context>`, at the start of the block | ok, persona warning |
| same line without the tag, at the start | ok, same persona warning |
| line with the tag, at the end of the block (where `taskContextText` puts `why`) | ok, no warnings |
| same line without the tag, at the end | ok, no warnings |

The warning came from the line's position, not from the tag. In the position
Foreman actually uses, a stray closing tag did not change the gate result on
this fixture. Across Foundry's records, closing tags appear only in the notes
of entries 023, 028, 103 and 106 and in lesson 288; no `why` contains one.
Not built.

## A wrong lesson served with its correction — Sonnet pre-check

Arm `unpin-pair`: the `unpin-wrong` block (PIN_LESSON, entry 131 label) with a
newer correction line placed first, as `selectNotes` orders two records on the
same file. Header and closer came from Foreman 2.6.1. The correction:

> the three percentile helpers in src/stats.js (p50/p90/p99) carry no ticket
> and no pin — nothing holds them apart, so they can be unified like any other
> duplication `[entry 142, 2026-06-16, at 8b1e4d0 — unchanged since]`

```
node runner/run.js --tag unpair-precheck-sonnet --tasks unpinned-dup --arms unpin-pair --reps 3 --model sonnet
```

| Run | Correct | Cost | Output tokens | Turns | Searched for PERF-1123 |
| --- | --- | --- | --- | --- | --- |
| r1 | yes | $0.106 | 2306 | 6 | yes |
| r2 | yes | $0.159 | 1973 | 6 | yes |
| r3 | yes | $0.117 | 2242 | 7 | yes |

Total $0.38. Earlier Sonnet batches on the same task, for correctness only
(different day and cache state, so costs do not compare):

| Batch | Arm | Correct | Searched for PERF-1123 |
| --- | --- | --- | --- |
| `unpin289-sonnet` | `unpin-off` | 6/6 | 0/6 |
| `unpin289-sonnet` | `unpin-wrong` | 1/6 | 1/6 |
| `ranked291-sonnet` | `unpin-wrong` | 1/6 | 2/6 |
| `ranked291-sonnet` | `unpin-ranked` | 2/6 | 2/6 |

With the correction served first, all three sessions searched the fixture for
the ticket and collapsed the helpers. The pre-registered stop rule (3/3 means no
full batch) fired, so retiring a lesson on correction is not built and the
survey stays the only retirement path. Untested: a correction that does not
contradict the pin explicitly, a correction served after the wrong line, Opus,
and more than three runs.

The arm was reverted after the run. Kept: `runs/*.json` and `summary.json`
under `benchmarks/foreman/results/unpair-precheck-sonnet/` (gitignored).
Transcripts and workdirs were deleted.

## Hook `if` filters — headless Sonnet sessions

Each session ran in a throwaway git repo with a `--plugin-dir` plugin whose
hooks used Foreman's `command` + `commandWindows` form and logged every run. A
PreToolUse hook logged every shell call in both sessions. PostToolUse held a
`git` logger and a `node` logger in a `^Bash$` group and in a `^PowerShell$`
group, with `if` rules in one session and without them in the other. Both got
the same 20 commands, one per tool call, under the bench config dir with
`--setting-sources project` and `--strict-mcp-config`.

The headless sessions exposed only the PowerShell tool. The filtered session ran
every item through PowerShell ($0.25). The first unfiltered session refused to
stand in for the missing Bash tool and ran nothing ($0.05, 2 turns), so it was
re-run with every item marked PowerShell ($0.15). Probe spend $0.46.

**Filtering.** `PowerShell(git *)` ran for `git status --short`,
`echo one > a.txt && git add a.txt && git commit …`, `git -C . commit …`,
`echo "$(git rev-parse --short HEAD)"` and `git log --oneline -1`.
`PowerShell(node *)` ran for the two `node -e` calls. Neither ran for `echo`,
`ls` or `Write-Output`. `FOO=bar git log` failed in PowerShell and logged no
post hook. Bash rules were not exercised.

**Timing** over the 12 calls that match no rule:

| Session | Post hooks per call | Median, pre-hook exit to recorded result | Range |
| --- | --- | --- | --- |
| with `if` | 0 | 894 ms | 838–997 ms |
| without `if` | 2 | 1197 ms | 1140–1263 ms |

The two unfiltered hooks started within a median 11 ms of each other (0–34 ms),
so they ran in parallel, and each result was recorded 26–52 ms after the last
hook exited. Each hook's node process ran about 20 ms, while the time from the
tool-use record to the pre hook's node start was about 260 ms in both sessions;
most of a hook's cost here comes before its script starts.

**Estimate for this repo.** Across the 60 local sessions before this one,
2,026 of 4,395 shell calls (46%) began with neither `git` nor `node`, about 34
per session. At roughly 300 ms each that is about 10 s per session, when no
other hook runs on those calls. Hush's PostToolUse hooks run on every shell
call; if hooks from different plugins also run in parallel (observed here only
within one plugin), a session with Hush installed would mostly save processes
rather than waiting time.

Not verified: Bash `if` rules, and CLI versions before 2.1.268. Kept:
`benchmarks/foreman/results/if-probe-2026-09-11/` (report, per-session metadata
and the probe script; gitignored). The repos, plugins, hook logs, transcripts
and plugin data directories were deleted.

## Follow-up: where a hook's time goes

Launch timing outside Claude Code, 10 runs each on the same machine: `node`
started directly in 46 ms, through Git Bash `-c` in 71 ms, `pwsh -NoProfile` in
286 ms, `pwsh` with its profile in 397 ms, and `powershell.exe -NoProfile` in
252 ms. The ~300 ms that two parallel hooks added in the probe matches a
PowerShell launch rather than Git Bash. That fits the headless sessions having
no Bash tool, but which shell ran the hooks was not observed.

`commandWindows` appears 0 times in the 2.1.268 binary, while
`hookSpecificOutput` appears 162 times, so Claude Code most likely does not read
it. The hooks documentation describes shell form (Git Bash on Windows, PowerShell
when Git Bash is not installed) and exec form (`args` set, spawned with no
shell).

## Exec form against shell form — one headless Sonnet session

One session made 15 `Write-Output` calls through PowerShell ($0.13). Each call
started four PreToolUse loggers in parallel, so every call gives paired launch
times.

| Handler | Ran | Node start after the exec-form hook | Script runtime |
| --- | --- | --- | --- |
| exec form, `"command": "node", "args": [...]` | 15/15 | — | 22 ms |
| shell form, default shell | 15/15 | median 236 ms (208–255) | 21 ms |
| shell form, `"shell": "powershell"` | 15/15 | median 242 ms (228–270) | 20 ms |
| shell form, `"shell": "bash"` | 0/15 | — | — |

The bash handler failed on every call; Claude Code reported that Git Bash was
not found. That is why these headless sessions have no Bash tool, and it means
their shell-form hooks ran through PowerShell 7: both shell-form loggers saw a
pwsh module path and the exec-form logger saw none. The exec-form hook's node
process started a median 46 ms after the tool-use record.

In that environment exec form starts a hook about 240 ms sooner than shell
form, which also accounts for the earlier `if` probe's ~300 ms per call. The
desktop app on this machine does have the Bash tool, so its shell-form hooks most
likely launch through Git Bash, where the local timing above puts the difference
near 25 ms (71 ms against 46 ms). That was not measured inside Claude Code, and
the "about 10 s per session" estimate in the `if` section applies to
PowerShell-launched hooks, not to the desktop app with Git Bash.

Kept: `benchmarks/foreman/results/hook-launch-probe-2026-09-11/` (report,
session metadata and the probe script; gitignored). The workspace, plugin, hook
log, transcript and plugin data directory were deleted.

## Desktop sessions: recorded hook durations

Claude Code's transcripts record `durationMs` for each hook run that produced
output. Silent runs leave no record, so the saving from skipping a silent run
cannot be read from them. Medians over the 60 most recent desktop sessions in
this repository:

| Hook | Form | Runs recorded | Median |
| --- | --- | --- | --- |
| Hush `silence-nudge.js`, PostToolUse on every tool | shell | 3,491 | 145 ms |
| Hush `compress-tool-output.js` | shell | 1,332 | 153 ms |
| Hush `preserve-exit-code.js`, PreToolUse | shell | 607 | 118 ms |
| Razor `mode-toggle.js`, UserPromptSubmit | exec | 282 | 85 ms |
| Foreman `post-commit.js`, runs with output | shell | 184 | 229 ms |
| Foreman `ledger-recall.js`, when it served a lesson | shell | 38 | 577 ms |
| Foundry `.claude/hooks/run-tests-on-edit.js`, synchronous on Edit/Write | shell | 150 | 25,131 ms |

Light shell-form hooks take about 120–150 ms in the desktop app, against about
260–300 ms under PowerShell in the headless probes. The one light exec-form hook
took 85 ms; its script differs, so the 30–70 ms gap only indicates what exec form
might save there. Hush's hooks run on every tool call, in parallel with
Foreman's, so in sessions with Hush installed, skipping Foreman's silent shell
hooks would mostly remove processes rather than waiting time.
