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
# tests 87
# pass 87
# fail 0
```

The Hush and Razor suites run the same way: `node --test hush/tests/*.test.js` and `node --test razor/tests/*.test.js`. The offline tests read no run history; they need only the plugin checkouts.

## Where things go

- **Plugin checkouts.** A runner measures Foundry's own `foreman/`, `hush/` and `razor/` checkouts, resolved in [paths.js](paths.js).
- **History and run output.** Datasets, records, experiments, results and runs go to `.private/benchmarks/<plugin>/` at the Foundry root. Git ignores that folder, so a clone has no history, and a run's raw output never reaches the repository. Razor's Claude runner is the exception: its runs go to `razor-bench` in your system temp folder, outside any Git tree, unless `RAZOR_BENCH_RUNS` names another folder.
- **Session state.** A live Foreman or Hush Claude run keeps its session registry and transcripts in a scratch state folder, set up by [bench-config-dir.js](bench-config-dir.js), never in your own `~/.claude`. Razor's Claude runner does not use that folder, so its sessions land in your own `~/.claude`.

## Configuration

| Name | Required | Default | What it does |
| --- | --- | --- | --- |
| `BENCH_PLUGINS_DIR` | No | The Foundry root | A folder that holds `foreman/`, `hush/` and `razor/`. Set it in a worktree, whose plugin folders are empty. |
| `BENCH_DATA_DIR` | No | `.private/benchmarks` in this checkout | A folder with the same per-plugin history layout. In a worktree, set it to `<Foundry root>/.private/benchmarks`: the worktree's own folder has no history and goes away with the worktree. |
| `BENCH_CONFIG_DIR` | Before a Foreman or Hush runner starts a Claude session | None | The scratch Claude state folder. A live run seeds it from `~/.claude` while it has no `.claude.json`, stored login included, so keep it outside any repository. A dry run, a plan-only run and Foreman's picks `--arms foreman` start no session and need none. |
| `FOREMAN_DIR` | No | From `BENCH_PLUGINS_DIR` | Another Foreman checkout for the Foreman prompt generators, `picks/run.js`, `selfcheck.js` and `validation/validate-records.js`. |
| `HUSH_PLUGIN_DIR` | No | From `BENCH_PLUGINS_DIR` | Another Hush checkout for the plugged arm of Hush's `runner/run.js` and for Foreman's `trio` arm. The Hush scorers, such as `metrics.js` and `caps.js`, always read the checkout under `BENCH_PLUGINS_DIR`. |
| `RAZOR_DIR` | No | From `BENCH_PLUGINS_DIR` | Another Razor checkout for Razor's runners. |
| `RAZOR_BENCH_RUNS` | No | `razor-bench` in the system temp folder | Where Razor's `runner/run.js` writes runs and where `runner/report.js` and `runner/demo.js` read them. Keep it outside any Git tree. |
| `RAZOR_PLUGIN_DIR` | No | From `BENCH_PLUGINS_DIR` | Another Razor checkout for Foreman's `trio` arm. |

Set these as environment variables. Where a script reads a per-plugin variable, it wins over `BENCH_PLUGINS_DIR`. `BENCH_CONFIG_DIR` receives a copy of your login, so treat that folder as a secret.

## Limitations

- Published figures keep the model, plugin revision and limits of the run that produced them. A figure measured on one host says nothing about another.
- The Hush suite has no readiness gate for Hush 2.0. No check yet decides whether a Hush release's figures are ready to publish.

## Support

Report a harness bug in Foundry's issue tracker, with the command, the suite and the full output.

## License

See [LICENSE](../LICENSE).
