# Codex headless comparison

The native runner compares the same task seeds with Razor enabled and disabled,
using the same explicit model, reasoning effort and permissions. It runs the
13 original tasks, four counter-examples where adding code is necessary, and
two multi-turn conversations. Arms are shuffled within each task/repetition.

Before you start:

- The Codex CLI must be signed in. Every run starts paid model sessions.
- Node.js 22 or later on your PATH. With fnm, activate it in this shell first,
  for example `fnm env --use-on-cd | Out-String | Invoke-Expression`.
- On Windows, pass the native `codex.exe` with `--codex-bin` (or set
  `RAZOR_CODEX_BIN`), not a PowerShell or npm command shim. On Unix, `codex`
  on the PATH works and `--codex-bin` can be left out. Last run on Windows
  with Codex CLI 0.161.0.
- The razor submodule is on its `main` package, or `RAZOR_DIR` points at a
  razor checkout.

From the Foundry root, run:

~~~powershell
node benchmarks/razor/runner/codex-run.js --codex-bin "<absolute path to codex.exe>" --model gpt-5.6-sol --effort high --suite all --runs 2 --workers 2 --seed razor-sol-paired-20260908 --report .private/benchmarks/razor/results/codex-sol-high-paired.md
~~~

The run ends by writing the Markdown report named by `--report`, beside its
JSON measurements. Without `--model` and `--effort`, `codex-run.js` uses its
own defaults, which differ from `codex-parity.js`'s; pass both to compare runs.

The runner first verifies native activation with a package-manager no-op:
baseline executes it directly; Razor must deny it once, then permit its retry.
An activation failure stops the comparison. No packages are actually installed.

Each session runs in a disposable project. A temporary Codex home holds the
authentication copy, hooks, session history and logs. The original user config
is untouched. Hook trust is bypassed only for the exact vetted benchmark hook
definitions; tool approval still uses Codex's automatic review and a
`workspace-write` sandbox. Windows selects the restricted unelevated sandbox.
Other plugins, memories, skills and browsing are disabled equally in both arms.

`--suite full|counter|note|all` chooses a group; `--tasks a,b` chooses tasks.
`--probe` runs activation only, `--smoke` adds one small task per arm, and
`--selftest` checks the original instruments offline. `--timeout <seconds>`
limits each session (default 300, at most 1800). Unknown options are
rejected. `--help` explains the command without starting a model.

Every completed cell is checkpointed before its project is deleted. Resume
only pending cells with the same model, effort, seed, repetition count, Codex
runtime, source revision and instrument fingerprints. Incompatible checkpoints
are rejected before starting a model. Successful complete runs remove their
intermediate checkpoint. To resume:

~~~powershell
node benchmarks/razor/runner/codex-run.js --codex-bin "<absolute path to codex.exe>" --model gpt-5.6-sol --effort high --suite all --runs 2 --seed razor-sol-paired-20260908 --resume-report .private/benchmarks/razor/results/codex-sol-high-paired.checkpoint.json --report .private/benchmarks/razor/results/codex-sol-high-paired.md
~~~

For a safe pause, create a file named `PAUSE` in the printed run root. The
runner finishes active cells, saves their measurements, and starts no more.
Avoid killing its console: Windows can terminate a parent before `finally`
runs. On resume, completed cells are never sampled again.

The output is a Markdown report and JSON measurements. Code files, local
package-manager shims, Razor state, raw events, logs, session history and the
temporary authentication copy are deleted even when a cell fails. Only derived
scores, counts, API references and paired text-equality results survive. No
generated code or credentials belong in a report or commit.

Interpret the measures separately:

- Correctness and safety use the original executable task scorers.
- LOC counts physical added lines against seeded HEAD for Git fixtures and
  source inventory for other fixtures. It does not measure semantic complexity
  or readability. No-code tasks retain their original zero-LOC convention.
- Editing observations compare final source against the original seed and
  record API references and dependency changes. Text equality is textual,
  not a proof of functional equivalence.
- Token totals are the last cumulative thread snapshot, including after resume.
  Input plus output is the total; cached input and reasoning output are subsets
  and are never counted twice. Separate approval-review threads are not included.
  Dollar cost is unavailable.
- Timing includes the native hook observer's process overhead and automatic
  approval review. Both arms use the same approval policy.
- Efficiency ratios include only matching task/model/repetition pairs where
  both arms pass correctness and safety. Runtime failures remain visible.
- A small run is exploratory; measured differences can vary on repetition.

The native runner adapts the headless transport, not the historical task
scorers. It allows shell reads in both arms because Codex uses shell tools to
inspect source; non-shell coding tasks receive the same original instruction
to write code without running it. Two-turn cases resume the exact session ID.

Conversation notes are scored as rendered text: absolute Markdown file-link
destinations are removed while their visible labels and narrative remain.
A directory named `note-drift` is not itself a note to the user.

Native functional checks are separate from the comparison:

~~~powershell
node benchmarks/razor/runner/codex-parity.js --codex-bin "<absolute path to codex.exe>" --model gpt-5.6-sol --effort high --report .private/benchmarks/razor/results/codex-sol-high-parity.json
~~~

They cover imports, manifests, file budgets, on/off with resume, the once-only
ledger and writing/read-only subagents. The subagent probe declares a role
description in its temporary Codex config so the CLI exposes `agent_type`.
Model identity comes from native child metadata, not model self-report.

Without `--report`, both runners write to `.private/benchmarks/razor/results/`,
and their run roots go under `.private/benchmarks/razor/runs/`. Git ignores
`.private/`, so a report stays on your machine. Before you publish one, keep its
provenance and review it.
