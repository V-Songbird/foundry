# Reproduce hush's benchmarks

This suite holds its runners, scorers, fixtures and offline tests. Run output, records and past studies go to the ignored `.private/benchmarks/hush/` folder at the Foundry root. The harness targets Claude; no equivalent Codex comparison exists yet. [All benchmark suites](../README.md) explains that layout and its environment variables.

Curious whether the numbers on hush's front page hold up? This is the actual harness — run it yourself.

It drives **real headless Claude Code sessions** (`claude -p`) on the same fixed tasks, once with no plugin and once with hush. Cost and token counts come straight out of the API's own usage blocks. No tokenizer estimates, no hand-waving, and no single-shot prompts — a canned reply can't tell you what a plugin costs across a real multi-turn session. Correctness is checked mechanically, so compression that mangles the answer scores as a *failure*, not a win.

## Before you start

- **Claude Code, signed in.** `claude` must be on your PATH and already authenticated (run any `claude` command once first). Every run bills your account — see the cost note below.
- **A scratch Claude state folder.** Set `BENCH_CONFIG_DIR` to a folder outside any repository before a live run; the runner refuses to start a session without it. The first live run copies your `~/.claude` login there, so treat it as a secret. A `--dry-run` needs none. [All benchmark suites](../README.md#configuration) describes it.
- **Node.js 22 or later** on your PATH. If you use [fnm](https://github.com/Schniz/fnm), activate it in this shell first — e.g. on PowerShell: `fnm env --use-on-cd | Out-String | Invoke-Expression`.
- Run the commands **from this directory** (`benchmarks/hush/` in Foundry). The runner measures Foundry's `hush/` checkout unless `HUSH_PLUGIN_DIR` names another.

## The honest disclaimer, up front

> [!WARNING]
> This costs real money. The default run is roughly **$12–16 on the small model** and takes a few minutes. Extra arms or the bigger model cost more — the bill scales with tasks × arms × reps. `--tasks log-triage,dep-bump-warnings` is the cheap way to see the shape first.

> [!NOTE]
> The numbers move between runs — a handful of reps against a live model, not a powered experiment. Expect single-digit-percent swings on any given task, and more on the noisy ones. Judge a task by the *per-rep spread*, not just the mean.

**What you should see:** the same *shape* as our published charts — hush **cutting most on the tasks whose commands print a lot** (`log-triage`, `release-digest`, `incident-forensics`), **far less mid-turn narration** throughout, and every task still passing. Cost on the tasks that print little depends on the model: on Opus 5.5, hush cost more on seven of the nine jobs. You will **not** reproduce our exact figures, and that's expected. A run where hush is cheaper on every single task would be the surprising result, not the target.

## Run it

**0. Check your flags for free.** `--dry-run` resolves the arms, builds the randomized order and stops there — nothing spawned, nothing billed:

```bash
node runner/run.js --tag plan --dry-run
```

**1. Smoke test first** (one task, one rep — pennies, ~30s) to confirm the plumbing drives `claude` and scores an answer:

```bash
node runner/run.js --tag smoke --tasks failing-suite --reps 1
```

**2. The real thing** — the whole suite (9 tasks × baseline + hush × 2 reps) on Sonnet, the default in `config.json`. Hush's headline figures ran on Opus 5.5 with 4 reps; add `--model opus --reps 4` to match them, at a higher cost:

```bash
node runner/run.js --tag mine
node runner/report.js --tag mine
```

That writes `report.md` and `report.html` under `.private/benchmarks/hush/results/mine/` at the Foundry root — tables, per-segment distributions, SVG bar charts, and the two arms' final answers side by side. Open the HTML to see it all at a glance.

**3. Cross-check on the larger model** (optional) — a result only counts when both models agree on the direction:

```bash
node runner/run.js --tag big --model opus
```

Flags: `--tasks a,b` (pick tasks) · `--extra-tasks a,b` (add tasks outside the default set) · `--reps N` · `--model sonnet|opus` · `--effort LEVEL` · `--arms baseline,hush` · `--concurrency N` · `--tag NAME` · `--seed N` (the arm order is shuffled inside every task-and-rep block so no arm always meets a cold cache; pass the seed a run printed to replay its exact order) · `--ablations` (see below) · `--resume` (re-read completed runs from disk instead of paying for them again — a rate-limited or interrupted run records as an error and re-runs) · `--hush-debug` (attach hush's per-decision manifest to each hush-arm record, surfaced in `report.md` as a "hush decisions" line per task).

## Which half of hush is doing the work?

hush has two independent surfaces — Core (tool-output compression, exit codes, compaction) and Quiet (the turn nudge, the subagent brief). `--ablations` adds an arm for each, so a win lands on a surface instead of on "the plugin":

```bash
node runner/run.js --tag abl --ablations
```

That runs `hush-core-only` (Quiet switched off) and `hush-quiet-only` (Core switched off) alongside the usual two arms, same tasks, same everything else.

## Bring your own rival

Want to see how hush stacks up against some *other* plugin? Point `--rival-dir` at any plugin directory on your machine and it becomes a third arm — measured on exactly the same tasks, same way:

```bash
node runner/run.js --tag vs --rival-dir /path/to/other-plugin
node runner/report.js --tag vs
```

Options: `--rival-name <label>` (how it shows up in the report) · `--rival-settings <path>` (a `--settings` file if that plugin needs one) · `--rival-env KEY=VAL,KEY2=VAL2` (env vars it expects) · `--rival-overlay <dir>` (files copied over the task fixture for this arm only). We don't ship or name any rival plugin — you bring whichever one you're curious about.

To race several rivals at once, repeat the flags. The Nth value of each `--rival-*` flag describes the Nth rival, so give each flag once per rival or not at all. Pass an empty value (`""`) to leave one field out for one rival:

```bash
node runner/run.js --tag vs2 --rival-name a --rival-dir /path/to/plugin-a --rival-name b --rival-dir ""
```

The runner refuses a flag given for only some rivals, a flag with no value, two rivals with the same name, and a rival named `baseline`, `hush`, `hush-core-only` or `hush-quiet-only`.

**Racing a built-in style.** Claude Code ships its own output styles, and one of them — `Concise` — sets out to do much of what hush's final message does. It needs no plugin loaded, so give it no plugin directory — leave `--rival-dir` out for a single rival, or pass `--rival-dir ""` next to other rivals — and point at a settings file instead:

```bash
node runner/run.js --tag native --rival-name concise --rival-settings settings-concise.json
```

`settings-concise.json` is in this directory and holds one line. Any built-in style works the same way — swap the name inside it.

## Verify it yourself, for free

The claims also rest on hush's unit tests, which cost nothing to run — they exercise the compression and narration logic directly:

```bash
node --test hush/tests/*.test.js
```

(Run that from the Foundry root; it runs the plugin's own suite. The same command from `benchmarks/` runs this harness's offline tests instead.)

## What's measured

Each run records, per session: cost, output tokens, **context traffic** (the sum of input + cache tokens across every API call — where tool-output compression shows up), mid-turn narration words vs. the final answer, characters of tool output that entered context, turns, wall time, and a pass/fail from the task's ground-truth check.

Reports group all of that **by segment**, because a plugin that saves you money on a log-triage session and costs you a little on a one-line question is two different results, not one average. Each segment gets its own median, mean, quartiles, confidence interval, win rate against baseline, and the single worst task regression, named. Correctness is a keyword rubric or a `node` exit code, hand-ground-truthed per task — a degenerate one-word answer fails. Where the grader is a script the prompt never mentions, it never enters the workspace: the check runs it from the fixture in a randomly named copy of the workspace, deleted when the check ends — a session that could read it would either implement its answer or stop to ask why it says more than the prompt did.

The tasks: **13** in all, across three segments — the shapes of real engineering work hush is built for. **Nine of them run by default**; `crash-origin`, `style-forge`, `locale-gaps` and `rate-import` sit outside the default set and join a run only when you name them with `--tasks`.

- **noisy build and test output** (6) — a production log to triage, 380 commits of release history hiding three changes anyone would notice, a dependency bump that buried a real error under 400 warnings, a 625-case suite hiding three real failures, a six-part on-call handoff that has to come out of 300KB of incident logs in one message, and three bad rows to find in a 151-line range of a 1,600-row CSV.
- **search-heavy work** (5) — finishing a half-done API migration across 76 modules without touching the vendored copy, scoping a column rename that matches a thousand lines and must not touch three of them, finding the file and line a crash really comes from when the stack trace names a different one, planning a new CLI flag without editing anything, and finding the missing and empty files in a 167-file listing of translation folders.

`locale-gaps` and `rate-import` invite a directory listing and a line-range print long enough that hush would trim ordinary output of that size. hush passes a listing or a ranged print whole up to 250 lines, so these two tasks measure that pass. `tests/benchmark_bounded_jobs.test.js` fails if either fixture leaves that size range.
- **long sessions that drift** (2) — a feature whose requirements change under it across five prompts, and a four-prompt incident investigation over 300KB of logs. These are the shapes where history piles up.

The suite spans the size range on purpose. hush can only compress output that reaches the session, so its effect swings from a large saving on a task whose tool results run to tens of thousands of characters down to a small loss on a task with almost nothing to cut. Half the tasks sit at each end, and the per-task table shows where the line falls rather than hiding it in an average.

Every repo the tasks run in is a purpose-built fixture — a small seeded project with the bug, the noisy log, or the half-done migration already in place, not an open-source checkout. That keeps runs comparable and cheap; it also means the suite measures those shapes of work, not the shape of your repo. Short no-tools questions are deliberately absent: hush costs a little more there, the front page says so, and a suite of them would measure a workload hush is not for.

## How hard is the answer to read?

Cost is only half of what a plugin changes. `readability.js` scores the one final
message every arm shipped, on measures that predate all of them — Flesch Reading
Ease, Flesch-Kincaid grade level, words per sentence, the share of long words,
whether the reply opens with the answer, and whether it hands you something to run:

```bash
node runner/readability.js --records ../../.private/benchmarks/hush/records/mine-1a2b3c4d --by-segment
```

Same code scores every arm, so no tool is marked against its own rulebook. It is a
regex pass over markdown, not a reader: syllables come from the usual vowel-group
heuristic, wrong on some words in every English text and wrong the same way for
every arm. The numbers compare two texts scored by the same version. They are not
a literacy verdict.

## Records you can audit

Every run leaves two copies, both under `.private/benchmarks/hush/` at the Foundry root. `results/<tag>/` holds raw transcripts and reports as a local working copy; publishing any of it needs its own review. `records/<batch>/` is the auditable copy — the same numbers with absolute paths, usernames, machine names, env values and anything secret-shaped scrubbed out before the file is written. Records are written once and stamped with a content hash: a second write to the same name is refused, and an edited record is caught on read rather than quietly published. They land read-only, so on Windows a batch you no longer want needs its read-only attribute cleared before it will delete — `attrib -R <Foundry root>\.private\benchmarks\hush\records\<batch>\*.* /S` and then remove the folder.

Turn a batch of records into the tables and charts:

```bash
node runner/publish.js --records ../../.private/benchmarks/hush/records/mine-1a2b3c4d
```

That writes `claims.md` and standalone SVG charts, per segment, from the records alone — every published number is generated, never hand-typed. Records carry the batch they came from, and publishing refuses a mix of batches: a warm prompt cache roughly halves cost, so numbers from two batches are not comparable and arms have to be raced together, inside one batch.

The side-by-side replay on hush's README comes from the same records:

```bash
node runner/demo.js --records ../../.private/benchmarks/hush/records/mine-1a2b3c4d --task failing-suite
```

It plays every message the no-plugin session sent beside the one message hush sent, on the recorded wall clock, and writes `hush/assets/demo.svg`. With no `--baseline` or `--hush` run named, it takes the run with the median-length final message from each arm — a typical session, not a flattering one — and prints which two it drew.

### A note on fairness

hush's output style is part of the product, so its prompt overhead is included in the measurement, not subtracted. Each arm runs in a fresh throwaway workspace outside any git repo, with only that one plugin loaded (`--setting-sources project`, no MCP servers, a scoped tool allowlist) — so a difference between arms is the plugin, nothing else.

## Check a batch before you publish it

The readiness gate decides whether one batch's figures are ready to publish with the hush checkout you are about to release. Run `runner/publish.js` on the batch first, because the gate compares the batch's `published/claims.md` with what its records regenerate. The gate also needs the retained batch of the previous hush release, on the same model. It reads both batches and the hush checkout, and starts no session:

```bash
node scripts/readiness-gate.js --records ../../.private/benchmarks/hush/records/mine-1a2b3c4d --previous ../../.private/benchmarks/hush/records/mine-0f9e8d7c
```

Replace `mine-1a2b3c4d` with the batch to publish, and `mine-0f9e8d7c` with the previous release's batch.

It prints each point as `[MET]` or `[NOT MET]`, with what it read. The last line is `READY TO PUBLISH: every point met.` and the exit code is 0. Otherwise the last line names each unmet point, such as `NOT READY TO PUBLISH: point(s) 2, 5 unmet.`, and the exit code is 1.

Each point is a promise from hush's output style or README, checked against the batch's records:

| Point | Proven by |
| --- | --- |
| 1. The batch is complete and auditable | Hash-verified records, one `batch.json` naming the records' batch and listing its planned runs, every planned run present and scored, each record stamped with batch, seed, segment and model id, both `baseline` and `hush` arms |
| 2. The batch measured one clean hush build, and the checkout being published ships that build's code | The `hush` field of `batch.json`: a full commit, a clean tree, and the version in the checkout's `.claude-plugin/plugin.json`. The checkout has no uncommitted or untracked changes, holds that commit, and its `HEAD` differs from it only in `README.md`, `docs/` or `assets/` |
| 3. The hush voice was active in every hush session | Each hush record's `outputStyle` is `hush:Hush` |
| 4. Every hush job passes its check | Each hush record's `check.pass` |
| 5. No hush session breaks in more than once before the answer | `narrationTexts`, counted as in `runner/stats.js` |
| 6. The sentence cap holds at least as well as without a plugin and as in the previous release | `runner/caps.js` over both batches, with the cap read from the style |
| 7. The block cap holds at least as well as without a plugin and as in the previous release | `runner/caps.js` over both batches, with the cap read from the style |
| 8. No more semicolons and asides than without a plugin or in the previous release | `runner/caps.js` over both batches |
| 9. No hush answer opens with a preamble | `runner/readability.js` |
| 10. Hush carries less tool output per call on noisy jobs | Median tool characters per call on the `noisy-output` segment, strictly lower than without a plugin |
| 11. The published claims regenerate from the records, the README names this batch and its model ids, and each README dollar figure equals one of its costs | `published/claims.md` matches `runner/publish.js`. Hush's README names the batch and each model id its records carry, such as `claude-opus-5-5`. Each dollar figure outside code in that README, such as `$3`, `$0.42` or `$1,204.50`, equals one of the batch's costs at the figure's precision |

Points 6, 7 and 8 compare hush with the no-plugin arm of the same batch, because the published figures compare arms. They also compare it with the hush arm of the previous release's batch, so a release cannot regress on the caps and still pass. The previous release is the highest version below the checkout's in the Git history of its `.claude-plugin/plugin.json`. That batch's `batch.json` must record exactly that hush version and the same model, and its hush runs must record the same model ids as this batch's. Both batches are scored with the caps of the checkout's style.

The gate does not prove these promises:

- `HUSH_WRAP=1` on every arm. `runner/run.js` always sets it, and no record holds it.
- Compression never hides a failure or an exit code. hush's own tests cover that: `compress_tool_output`, `preserve_exit_code` and `transform_properties`.
- One fact per sentence beyond punctuation, no dashes, a link for every file, the reply in the user's language, and no stock block labels.
- That a README dollar figure is the statistic, arm or segment its sentence names. Point 11 only finds the figure among the batch's costs.
- Any README figure that is not a dollar amount, such as a pass count, a word count or a percentage.
- Which model a README sentence or table row names, or the host and date the README states. Point 11 only finds each model id somewhere in the README.
- That the previous release's batch ran the same tasks and repetitions. Points 6, 7 and 8 check only its version, its model, its model ids and its record hashes.
- Any dollar figure written without a leading digit, such as `$.42`.

> [!NOTE]
> Point 2 fails on a batch whose `batch.json` does not record the hush build, as in a batch written before the runner recorded it. The runner keeps the full commit in every batch it writes, so a new run can pass it.
>
> Points 6, 7 and 8 also fail when the previous release's batch does not record the hush version it measured; such a batch cannot serve as the previous release.
