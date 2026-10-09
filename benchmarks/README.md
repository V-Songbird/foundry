# Foundry benchmarks

These harnesses measure the Foreman, Hush and Razor plugins in real headless sessions, each plugin against a no-plugin baseline. The folder holds the runners, scorers, fixtures and offline tests; run history stays out of the repository.

| Suite | Measures | Hosts |
| --- | --- | --- |
| [Foreman](foreman/README.md) | Handoff prompts against hand-written ones on fixed bug-fix tasks, plus the picks replay | Claude Code |
| [Hush](hush/README.md) | Final-message shape, cost and retained facts across engineering tasks | Claude Code |
| [Razor](razor/README.md) | Added dependencies and code size on tasks where cutting is right, and on tasks where adding is right | Claude Code and Codex, each against its own baseline |

## Requirements

- Node.js 22 or later and Git.
- The plugin checkouts: run `git submodule update --init` from the Foundry root.
- A live run also needs the `claude` or `codex` CLI with a signed-in account. Live runs start model sessions and can cost money; the offline tests start none.

## Quick start

Run one suite's offline tests from this folder:

```shell
node --test foreman/tests/*.test.js
```

Expected output, last lines:

```text
# tests 95
# pass 95
# fail 0
```

The Hush and Razor suites run the same way: `node --test hush/tests/*.test.js` and `node --test razor/tests/*.test.js`. The offline tests read no run history; they need only the plugin checkouts.

Before publishing a Hush batch's figures, run its readiness gate from `benchmarks/hush/`. It reads the batch, the previous hush release's batch and the hush checkout. The checkout must be its own clean Git checkout, so the gate can compare its `HEAD` with the commit the batch measured. It starts no session, and exits 1 naming each unmet point:

```shell
node scripts/readiness-gate.js --records <batch folder> --previous <previous release's batch folder>
```

[Check a batch before you publish it](hush/README.md#check-a-batch-before-you-publish-it) lists the points and what proves each.

## Where things go

- **Plugin checkouts.** A runner measures Foundry's own `foreman/`, `hush/` and `razor/` checkouts, resolved in [paths.js](paths.js).
- **History and run output.** Datasets, records, experiments, results and runs go to `.private/benchmarks/<plugin>/` at the Foundry root. Git ignores that folder, so a clone has no history, and a run's raw output never reaches the repository. Razor's Claude runner is the exception: its runs go to `razor-bench` in your system temp folder, outside any Git tree, unless `RAZOR_BENCH_RUNS` names another folder.
- **Session state.** A live Foreman, Hush or Razor Claude run keeps its session registry and transcripts in a scratch state folder, set up by [bench-config-dir.js](bench-config-dir.js), never in your own `~/.claude`.

## Hill-climb a suite

Claude Code's `/claude-api build-eval` and `/claude-api hillclimb` commands run an eval loop over a suite. Each suite has one entry point the loop calls once per variant: `runner/hillclimb.js`, run from the suite's folder, such as `benchmarks/hush/`.

1. Check the grader first. This starts no session and costs nothing:

   ```shell
   node runner/hillclimb.js --smoke
   ```

   Expected output, last line, from `benchmarks/hush/`:

   ```text
   oracle 3/3 pass (want all), null 0/11 pass (want none)
   ```

2. Run one variant. This starts paid sessions through the suite's own `runner/run.js`:

   ```shell
   node runner/hillclimb.js --variant baseline -- --reps 2
   ```

   Flags after `--` go to `runner/run.js`. Razor's runner also needs a task selector, such as `-- --default --runs 2`.

| Flag | What it does |
| --- | --- |
| `--variant baseline` or `--variant v<N>` | The variant folder to write. |
| `--from <source>` | Reads a finished run and starts nothing. The source is a tag for Foreman and Hush, a run folder for Razor. |
| `--flow <folder>` | The flow folder. Default: `.claude/hillclimb/<suite>` at the checkout root. |
| `--arm <name>` | The arm under test. Default: `hush`, `razor` or `foreman-std`. |
| `--regrade` | Grades each stored attempt twice and lists every verdict that changes. Exits 1 on a change, or when nothing could be graded. |
| `--smoke` | Grades a reference answer (oracle) and an empty result (null) for each task. Exits 1 unless every oracle passes and every null fails. |

An unknown flag, a flag with no value or a stray argument stops the call with exit code 2 before any session starts. Only a call without `--from` starts a live run.

Each call writes three things under `<flow>/<variant>/`:

- `results.jsonl`: one row per case and rep, with `prompt_id`, `rep`, `prompt`, `tags`, `grade`, `model`, `usage` and `latency_s`. `model` comes from the API response, not from the requested alias.
- `traces/<id>_rep<k>.json`: that attempt's conversation.
- `errors.jsonl`: attempts with no scorable output, such as a killed session, a rate-limited call or an API error, each with a `failure_class`.

The `grade` metrics are `pass` and `score` for Hush, `pass`, `correct` and `safe` for Razor, and `pass` and `tests` for Foreman. Git ignores `.claude/hillclimb/`, so the loop's transcripts and reports stay out of the repository.

Answer keys, reference solutions and held-back tests stay in this folder. A session works in a copy of its fixture in the system temp folder, and that copy never receives them:

- Foreman's held-back tests and Hush's held-out graders run in a randomly named copy of the session's folder, deleted when the check ends.
- Razor deletes every file its scorer writes into a cell, such as a test input, once the cell is scored.

## Configuration

| Name | Required | Default | What it does |
| --- | --- | --- | --- |
| `BENCH_PLUGINS_DIR` | No | The Foundry root | A folder that holds `foreman/`, `hush/` and `razor/`. Set it in a worktree, whose plugin folders are empty. |
| `BENCH_DATA_DIR` | No | `.private/benchmarks` in this checkout | A folder with the same per-plugin history layout. In a worktree, set it to `<Foundry root>/.private/benchmarks`: the worktree's own folder has no history and goes away with the worktree. |
| `BENCH_CONFIG_DIR` | Before a Foreman, Hush or Razor runner starts a Claude session | None | The scratch Claude state folder. A live run seeds it from `~/.claude` while it has no `.claude.json`, stored login included, so keep it outside any repository. A dry run, a plan-only run, Razor's `--selftest` and `--rescore`, and Foreman's picks `--arms foreman` start no session and need none. |
| `FOREMAN_DIR` | No | From `BENCH_PLUGINS_DIR` | Another Foreman checkout for the Foreman prompt generators, `picks/run.js`, `selfcheck.js` and `validation/validate-records.js`. |
| `HUSH_PLUGIN_DIR` | No | From `BENCH_PLUGINS_DIR` | Another Hush checkout for the plugged arm of Hush's `runner/run.js` and for Foreman's `trio` arm. The Hush scorers, such as `metrics.js` and `caps.js`, always read the checkout under `BENCH_PLUGINS_DIR`. |
| `RAZOR_DIR` | No | From `BENCH_PLUGINS_DIR` | Another Razor checkout for Razor's runners. |
| `RAZOR_BENCH_RUNS` | No | `razor-bench` in the system temp folder | Where Razor's `runner/run.js` writes runs and where `runner/report.js` and `runner/demo.js` read them. Keep it outside any Git tree. |
| `RAZOR_PLUGIN_DIR` | No | From `BENCH_PLUGINS_DIR` | Another Razor checkout for Foreman's `trio` arm. |

Set these as environment variables. Where a script reads a per-plugin variable, it wins over `BENCH_PLUGINS_DIR`. `BENCH_CONFIG_DIR` receives a copy of your login, so treat that folder as a secret.

## Limitations

- Published figures keep the model, plugin revision and limits of the run that produced them. A figure measured on one host says nothing about another.
- Hush's readiness gate cannot pass any retained batch: none records the hush build in `batch.json`, so point 2 finds no build. For the same reason, none can serve as the previous release that points 6, 7 and 8 compare against. A batch the runner writes now records the build, commit included.
- `--regrade` needs the workspace a session left in the system temp folder. Once that folder is cleared, only Hush's keyword tasks that do not read files can be graded again.
- Only Hush tasks with a reference answer under `anchors/<id>/gold.md` and a keyword check get an oracle: 3 of 11 today. `--smoke` checks only the null case of the rest.
- Foreman's `foreman-std` prompts are files that `foreman/defaultarm/gen.js` writes from the Foreman checkout. After a change to Foreman, run that generator before the next variant. A row whose prompt file changed since its run carries `meta.prompt_changed`, and the call prints a warning. A record written before runs stored a prompt hash is compared by length only, so a same-length change goes unflagged.
- While a check runs, its held-back tests or grader sit in a randomly named folder in the system temp folder. A concurrent session that searches the whole temp folder could find them in that window.
- Foreman's runner never clears a tag, so a second live call on the same variant stops before it starts a session. Adapt the earlier run with `--from hc-<flow>-<variant>`, or move its records aside.
- A multi-prompt attempt with fewer results than calls goes to `errors.jsonl` as `no_result`. Hush takes the call count from the record's `turnsRun`, so a later change to a task's prompts leaves older attempts alone. A Razor cell stores its call count in `_sent.json`. A cell written before that file existed takes the count from the current `followups` in `tasks.js`: after a followup is added to a task, every such older attempt of that task goes to `errors.jsonl` with no warning.
- Hush rows cover only tasks in `tasks.json`. The call names any task added with `-- --extra-tasks` and leaves its records out.

## Support

Report a harness bug in Foundry's issue tracker, with the command, the suite and the full output.

## License

See [LICENSE](../LICENSE).
