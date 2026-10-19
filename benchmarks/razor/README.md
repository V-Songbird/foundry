# Razor benchmarks

The runners measure Foundry's `razor/` checkout unless `RAZOR_DIR` names another. `runner/run.js` targets Claude; `runner/codex-run.js` and `runner/codex-parity.js` target Codex. Offline tests live in `tests/`. Codex reports and run workspaces go to the ignored `.private/benchmarks/razor/` folder at the Foundry root. [All benchmark suites](../README.md) explains that layout and its environment variables.

Run Codex checks and create a local report with the [Codex runner](CODEX-HARNESS.md).
The Claude Code runner is described below.

## Claude Code runner

This runner loads Razor's package from the submodule or `RAZOR_DIR`. It refuses
an arm whose `hooks/hooks.json` registers the Codex hook, because this runner
invokes Claude. Offline `--selftest`, `--rescore` and reporting always work.
These runs do not measure Codex.

It drives **real headless Claude Code sessions** (`claude -p`) on the same fixed coding tasks, once with no plugin and once with razor. Cost and token counts come straight out of the API's own usage JSON. No mocks, no estimates, and no single-shot prompts — a canned reply can't tell you what a plugin costs across a real multi-turn session. Each session is scored on the code it leaves behind, and correctness is checked mechanically — the harness runs the produced code with `node`. A lean answer that breaks the task scores as a *failure*, not a win.

## Before you start

- **Claude Code, signed in.** `claude` must be on your PATH and already authenticated (run any `claude` command once first). Every run bills your account — see the cost note below.
- **Node.js 22 or later** on your PATH — it runs the harness *and* scores the code each session produces. If you use [fnm](https://github.com/Schniz/fnm), activate it in this shell first — e.g. on PowerShell: `fnm env --use-on-cd | Out-String | Invoke-Expression`.
- **A scratch Claude state folder.** Set `BENCH_CONFIG_DIR` to a folder outside any repository before `--smoke`, `--default` or any other live run; the runner refuses to start a session without it. The first live run copies your `~/.claude` login there, so treat it as a secret. `--selftest` and `--rescore` need none. [All benchmark suites](../README.md#configuration) describes it.
- Run the commands **from this `benchmarks/razor/` directory.**

## The honest disclaimer, up front

> [!WARNING]
> This costs real money. The cheap default run measured about **$3 on Sonnet** and takes a few minutes; the same run on Opus is roughly twice that. The full set — every task, three arms, three reps, both models, 234 sessions — measured **$36**. Those are measured bills, not a quote; yours will differ.

> [!NOTE]
> The numbers move between runs — a handful of reps against a live model, not a powered experiment. A small sweep is a small sample; add reps for steadier numbers (`--runs 4`). A result only counts when both models agree on the direction.

**What you should see:** razor landing **at or below baseline on cost and code size**, with **no new dependencies added** and every task still passing — the same *shape* as our published charts. You will **not** reproduce our exact figures, and that's expected. If razor is leaner and no pricier with correctness intact, the claim holds.

A default run uses Sonnet. Razor's README shows Claude Opus 5 rows only, so compare against it with `--models opus`. `--models` accepts `sonnet`, `opus` and `opus55` (Claude Opus 5.5).

## Run it

**1. Prove the instruments first** (free — no API spend) to confirm each task scores a correct answer as correct, catches a wrong one, and finds the razor plugin:

```bash
node runner/run.js --selftest
```

If it prints `all instruments valid`, you're good.

**2. Smoke test** (one cheap task per arm, ~1 min, tiny spend) to confirm the plumbing actually drives `claude`. Set `BENCH_CONFIG_DIR` and `RAZOR_BENCH_RUNS` (step 3 explains it) first, or it stops with exit 2:

```bash
export BENCH_CONFIG_DIR=/path/outside/any/repo/razor-bench-config
export RAZOR_BENCH_RUNS=/path/outside/any/repo/razor-bench-runs
node runner/run.js --smoke
```

**3. The real thing** — the cheap default subset, with the same `BENCH_CONFIG_DIR` — then turn the run into charts and a readable report:

```bash
node runner/run.js --default
node runner/report.js <the-run-dir-it-printed>
```

`run.js` prints the exact run directory when it finishes, under `RAZOR_BENCH_RUNS`. Every live run needs that folder *outside* your project and outside your system temp dir. Each cell is a real Claude session with permissions bypassed, so the runner refuses, with exit 2, a folder inside a Git work tree, where a cell's git could touch your repo. It also refuses, with exit 2, any folder under the temp dir or a `scratchpad` folder, its default `razor-bench` in your system temp dir included: razor treats those as scratch, so its new-file check never speaks there. `runner/hillclimb.js` puts each variant's live run under the same folder, so it needs `RAZOR_BENCH_RUNS` set too. To run in such a folder anyway, set `RAZOR_BENCH_ALLOW_TEMP=1`; the run then goes ahead with a warning. `--rescore` and `report.js` still look in the temp default when `RAZOR_BENCH_RUNS` is unset, so keep it set for them too.

**Runs affected.** Before this refusal, a run with `RAZOR_BENCH_RUNS` unset ran every cell under the temp dir, and razor's new-file check had that exemption from its first commit. Razor's [benchmark page](../../razor/docs/knowledge/benchmarks.md) does not record where its runs' workspaces sat, so treat each Claude Code run there (the corpus, the 2026-08-29 batch, the Opus 5 rival run and the checklist wording test) as not having exercised the new-file check. The held-out tests replay corpus sessions and inherit the same gap. The 2026-10-09 Codex run is not affected: its log prints a run root under `.private/benchmarks/razor/runs`, outside the temp dir. The earlier 2026-09-08 Codex run records no workspace path, and razor's temp exemption applies on Codex too, so treat it as not having exercised the check either.

**4. Go bigger** (optional) — every task, more reps, or the larger model (costs more):

```bash
node runner/run.js --full --runs 3      # every task, 3 reps each
node runner/run.js --default --models opus
```

Flags: `--task a,b` (pick tasks) · `--arms baseline,razor` (`razor-start` is a third arm, see the note suite) · `--full` (whole suite) · `--counter` (the other suite, below) · `--note` (the note suite, below) · `--runs N` · `--models sonnet|opus|opus55` · `--effort low|medium|high` (reasoning effort for every cell; left to the CLI default when unset) · `--workers N` · `--max-cost USD` (stop starting cells once the summed cost of finished cells, every billed turn of a failed cell included, reaches it; cells already running finish, and `results.json` records `max_cost`, `cost_total` and `stopped`, which stays null when no cell was skipped; `runner/hillclimb.js` keeps the cells of a capped run) · `--seed N` (replay an earlier run's arm order) · `--rescore <run-dir>` (recompute metrics offline, no API) · `--sdk` (run every cell through the Agent SDK on `ANTHROPIC_API_KEY` instead of `claude -p`; see [Run sessions on the API key](../README.md#run-sessions-on-the-api-key)) · `RAZOR_DIR` (override the razor plugin location).

The setups take turns in a shuffled order rather than one finishing before the next starts, so neither pays more of the cold-start cost than the other. The run prints its seed and saves it — pass `--seed` to repeat the exact same order.

## The other suite: when adding is the right answer

Every job in the main suite has the same shape. The best answer is to add
nothing. That only ever shows whether razor can say no.

`--counter` runs four jobs that go the other way. Each one needs something
added, and each one names something razor could wrongly talk Claude out of:

| Job | What the job needs | What would go wrong |
| --- | --- | --- |
| `need-installed-dep` | Use the library the project already installed | Writing it by hand, so the output stops matching |
| `need-old-node` | Ship code that runs on Node 16 | Using `fetch`, which that version does not have |
| `need-abstraction` | Two storage backends behind one shape, as asked | Building only one of them |
| `need-validation` | Check untrusted input at a public endpoint | Trimming the checks away |

```bash
node runner/run.js --counter --arms baseline,razor --runs 3
```

These four are kept out of `--full` on purpose, so the published tables stay
the published tables.

## The note suite: when the session has wandered off

Every job above is a single request. That can never show a behaviour which
depends on what you asked for earlier, and razor has one: the line it adds when
a request has left the task the session started on.

`--note` runs four conversations. All open the same way, and differ in what
you ask for next:

| Job | The later requests | What should happen |
| --- | --- | --- |
| `note-drift` | Something unrelated, in a new file | The work gets done, and a line says the session has moved off its original task |
| `note-steady` | The first request's own spec was wrong, fix it | The work gets done and nothing is said — it is the same job |
| `note-once` | `note-drift`'s request, then a second unrelated one | The line appears after the second request and not again after the third. A missing line fails `correct`; a repeat, a line after the first request or a reply that stops to ask fails `safe`. It adds a three-turn conversation per arm and run |
| `note-late` | Two fixes to the first request, then a new script that only uses its result | The line appears after the fourth request alone. The drift comes late and does not announce itself, the hard case for an instruction given once. A missing line fails `correct`; a line after an earlier request or a last reply that stops to ask fails `safe`. It adds a four-turn conversation per arm and run |

`note-steady` is the one that matters. A warning there is a false alarm, and a
setup that cries wolf on ordinary corrections is worse than one that says
nothing at all.

```bash
node runner/run.js --note --arms baseline,razor --runs 3
```

Each note cell in `results.json` also records `note_turns` and `balked_turns`:
the turns, counted from 1, whose reply carried the line or stopped to ask.
`report.js` counts them in a note tally per task and arm: how many cells noted
on each turn from the first drift turn on, late notes (the first one after
that turn), repeats, EARLY notes (before the drift turn, which on `note-steady`
is any note) and balks. `balked` counts a balk on any turn, while the scorers
check only some turns. Every cell, including one that recorded an error,
also records `repetition` (its run index, from 0; `null` when a Claude cell's
folder name carries none) and `turn_count` (the calls it sent; `null` for a
Claude cell from before the runner wrote that count). A note cell records
`replies` (the turns that answered) when it was scored, so a Codex
`runtime_failed` record has none. A cell with fewer replies than the task has prompts,
such as one whose last turn died, or one that recorded an error, such as a lost
login, or a Codex status other than `completed`, is left out of the counts and
named under the table by its run index. The verdicts do not change.

Razor repeats its instruction for that line with every request. To compare that
with giving the instruction once, when the session starts, add the `razor-start`
arm:

```bash
node runner/run.js --note --arms baseline,razor,razor-start --runs 3
```

`razor-start` is a copy of the razor checkout that the runner builds in the run
folder, under `_arms/razor-start`. The copy adds the instruction to the
checklist razor gives Claude at session start, and stops repeating it with each
request. Each later request resumes the session, which runs the session-start
hook again, so the copy adds the instruction only when the session first starts. The razor checkout itself does not change. If razor's hooks no longer
contain the two lines the copy edits, the run stops before any session starts.
The arm adds one more conversation per job and run.

These four are kept out of `--full` as well. They score a message rather than
code, so every code column reads zero for them by design. Their cost and turns
cover the whole conversation, but their wall time and tokens cover only its last
turn, and have no value when that turn wrote no result.

## Bring your own rival

Want to see how razor stacks up against some *other* plugin? Point `--rival-dir` at any plugin directory on your machine and it becomes a third arm — loaded exactly like razor, measured on the same tasks, same way:

```bash
node runner/run.js --default --rival-dir /path/to/other-plugin
```

One rival is the common case. To race several builds at once — say three
cut-down copies of a plugin against the real one — name each with its own
`--arm-dir`:

```bash
node runner/run.js --default --arms baseline,razor,cutA,cutB \
  --arm-dir cutA=/path/to/build-a --arm-dir cutB=/path/to/build-b
node runner/report.js <the-run-dir-it-printed>
```

Options: `--rival-name <label>` (how it shows up in the report). We don't ship or name any rival — you bring whichever one you're curious about.

## Verify it yourself, for free

The claims also rest on razor's unit tests, which cost nothing to run — they exercise razor's gates and ruleset directly:

```bash
node --test tests/*.test.js
```

(Run that from Foundry's `razor/` checkout; it runs the plugin's own suite.)

## What's measured

Each run records, per session: cost, tokens, wall time, turns, the **code delivered** (lines and new files), whether a **new dependency** was added, and a pass/fail from the task's ground-truth check. Every cell's workspace and raw transcript is kept, so any measurement is recomputable offline with `--rescore` — tweaking a metric never costs you API twice.

All tasks are self-contained (seeds are inline in `runner/tasks.js`) and solvable with a Node builtin or the platform, so the lean answer is objectively small and the scorer can execute it with `node`:

| tier | what it probes |
|---|---|
| **dependency traps** | a job a Node builtin covers, but that tempts a new dependency — `safe` = no new dep added |
| **vibe-coder dep traps** | same, but the prompt itself casually names a needless library ("let's just use axios") |
| **reuse trap** | a seeded mini-codebase where nothing is actually reusable — does the agent glance and move on, or over-search? |
| **sprawl trap** | an open-ended feature edit — measures new files + diff size against a working behavior check |
| **injection overhead** | no-code tasks, where a plugin can only add tokens/cost/time — the pure overhead tax |

This **can** show whether razor changes what the agent builds and what it costs, on ground-truthed tasks you can inspect. It **can't** prove production-readiness from a handful of tasks — a deterministic check is a floor, not a full proof, and on a small, high-variance sample you should read trends, not decimals.

### A note on fairness

razor's once-per-session ladder is part of the product, so its token cost is included in the measurement, not subtracted. Each arm runs in a fresh throwaway workspace outside any git repo, with only that one plugin loaded (`--setting-sources project,local`, no MCP servers, a scoped tool allowlist) — so a difference between arms is the plugin, nothing else.

## The README replay

The side-by-side replay at the top of the front page comes from a run directory too:

```bash
node runner/demo.js --run <the-run-dir-it-printed> --task dep-querystring
```

It shows the file one no-plugin session and one razor session each delivered, as a diff against the seed, a line at a time on the recorded clock, and writes Foundry's `razor/assets/demo.svg`. With no `--baseline` or `--razor` named it takes, per arm, the session whose file has the median number of lines — a typical one, not a flattering one — and the caption prints every session's average, so the choice hides nothing.

## Where a run lands

Each run writes `results.json` (one record per session — task, arm, model, cost, tokens, code size, dependency verdict, pass/fail) and `summary.json` into the run directory it prints when it finishes. `report.js` adds `report.md` and `charts.svg` there. That directory sits under `RAZOR_BENCH_RUNS`, outside your project, and nothing leaves your machine. The front page's numbers came from a run of this same harness; run it yourself to regenerate them from scratch.
