# Reproduce razor's benchmarks

Curious whether the numbers in razor's README hold up? Run them yourself. This folder is a
small, self-contained harness that puts razor head-to-head with plain Claude Code on real
coding tasks and reads the cost straight from the API — no mocks, no guesswork.

Every "cell" is a real headless Claude Code session (`claude -p`) in a fresh throwaway
workspace, with exactly one setup active: **baseline** (no plugin) or **razor** (the plugin in
this repo). It's scored on the code the session leaves behind plus the CLI's own usage JSON.

## Start here — it's free

```bash
python bench.py --selftest
```

This proves every measuring instrument (each task's correct answer scores as correct, each
wrong answer is caught) and confirms the razor plugin is found — **without spending a cent on
the API.** Run it first. If it prints `all instruments valid`, you're good.

## Then the real run

```bash
python bench.py --default
```

That runs the default sweep and prints a table per task, then writes everything to a
timestamped run directory — it prints the exact path when it finishes. (Runs land in your
system temp dir, *outside* your project, on purpose: each cell is a real Claude session with
permissions bypassed, so keeping the workspaces out of any git tree means a sandboxed run can
never touch your repo.) Turn a run into charts and a readable report with:

```bash
python report.py <the-run-dir-it-printed>
```

### Honest cost + variance, up front

- **Cost:** roughly **$1–3 on the cheap model (Haiku)**, and it takes **several minutes.**
- **Variance is real.** Haiku is high-variance — numbers move noticeably between runs, and a
  small sweep is a small sample. What you should look for is the *direction*: **razor landing
  at or below baseline on cost and code size, with correctness intact** — not our exact
  figures. Want steadier numbers? Add reps: `python bench.py --default --runs 4`.
- Bigger runs cost more, linearly. `python bench.py --full` runs every task; `--runs N` sets
  the repetitions per cell.

## Prerequisites

- **`claude` on PATH and authenticated** — the harness shells out to the real CLI.
- **Python 3.11+** (it uses the stdlib `tomllib`, added in 3.11).
- **`node` on PATH** — razor's hooks and a couple of the scorers need it. If you use a version
  manager like `fnm`, run from a shell where its environment is already applied.

## Bring your own rival

Want to compare razor against some *other* plugin? Point the harness at it — any plugin
directory works, and it's added as a third arm called `rival`:

```bash
python bench.py --default --rival-dir /path/to/some/other/plugin
```

The rival is loaded exactly like razor (`--plugin-dir`), scored on the same tasks, and shown
side-by-side in the tables and charts. We don't ship or name anyone else's plugin — you choose
what to line razor up against.

## Verify it yourself, another way

The benchmark is one kind of evidence. The other is razor's own unit tests, which are **free
and instant** — no API involved:

```bash
node --test razor/tests/*.test.js
```

(Run that from the repo root.) They exercise razor's gates and ruleset directly.

## What it can and can't show

- **Can:** whether razor actually changes what the agent builds (dependencies added, code
  size) and what it costs (tokens, time), on ground-truthed tasks you can inspect, with the
  raw session transcript kept per cell.
- **Can't:** prove production-readiness from a handful of tasks. A deterministic check is a
  floor, not a full proof. And on a small, high-variance sample, read trends, not decimals.

## The tasks

All tasks are self-contained (seeds are inline in `razor_tasks.py`) and solvable with the
standard library or platform, so the lean answer is objectively small and the scorer can run
it:

| tier | what it probes |
|---|---|
| **dependency traps** | a job the stdlib/platform covers, but that tempts a new dependency — `safe` = no new dep added |
| **vibe-coder dep traps** | same, but the prompt itself casually names a needless library ("let's just use axios") |
| **reuse trap** | a seeded mini-codebase where nothing is actually reusable — does the agent glance and move on, or over-search? |
| **sprawl trap** | an open-ended feature edit — measures new files + diff size against a working behavior check |
| **injection overhead** | no-code tasks, where a plugin can only add tokens/cost/time — the pure overhead tax |

## Handy flags

```bash
python bench.py --selftest                     # free; prove the instruments
python bench.py --smoke                         # 1 cheap task per arm, ~1 min, tiny spend
python bench.py --default                        # the default sweep (~$1-3 on haiku)
python bench.py --full --runs 3                  # every task, 3 reps
python bench.py --task dep-slug,oh-question --arms baseline,razor --runs 2
python bench.py --default --rival-dir /path/to/plugin
python bench.py --rescore <run-dir>              # recompute metrics offline, no API
python report.py <run-dir>                       # tables + charts -> report.md / report.html
```

Each run directory keeps every cell's workspace and raw transcript, so every measurement is
recomputable offline with `--rescore` — tweaking a metric never costs you API twice. Runs go
to a temp dir outside your project by default; set `RAZOR_BENCH_RUNS` to put them elsewhere.
Override the model with `--models sonnet`; override the razor plugin location with `RAZOR_DIR`.
