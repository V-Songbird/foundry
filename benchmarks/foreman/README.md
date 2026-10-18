# Reproduce foreman's benchmarks

This suite holds its runners, fixtures, record-schema validator (`validation/`) and offline tests (`tests/`). Run output, records and past studies go to the ignored `.private/benchmarks/foreman/` folder at the Foundry root; [all benchmark suites](../README.md) explains that layout and its environment variables.

Curious whether a structured handoff prompt actually buys anything? This is the actual harness — run it yourself.

It drives **real headless Claude Code sessions** (`claude -p`) on the same three fixed bug-fix tasks, asking for the same job four different ways. The four: the one-line ask a vibe coder types, the paragraph a competent dev writes by hand, the generic role/context/task/format template the prompt guides recommend, and a Foreman handoff built from [`prompt-template.md`](../../foreman/prompt-template.md). Cost and token counts come straight out of the API's own usage blocks. Correctness is checked mechanically — tests must pass AND the session must respect the task's stated constraints, verified by hash comparison against the pristine fixture. A fix that "works" by editing the frozen file scores as a *failure*, not a win.

Every fixture hides a trap where the lazy route is the easy route: a facade file that must stay byte-identical even though patching it makes the tests pass, a brief that names the wrong file (the file it names exists, looks plausible, and is dead code), and an in-code TODO inviting a refactor the task explicitly forbids. The interesting question isn't "can the model fix the bug" — it's which prompt style keeps the session on the rails.

## Before you start

- **Claude Code, signed in.** `claude` must be on your PATH and already authenticated (run any `claude` command once first). Every run bills your account — see the cost note below.
- **A scratch Claude state folder.** Set `BENCH_CONFIG_DIR` to a folder outside any repository before a live run; the runners refuse to start a session without it. The first live run copies your `~/.claude` login there, so treat it as a secret. `selfcheck.js`, a `--dry-run` and `picks/run.js --arms foreman` need none. [All benchmark suites](../README.md#configuration) describes it.
- **Node.js 22 or later** on your PATH. If you use [fnm](https://github.com/Schniz/fnm), activate it in this shell first — e.g. on PowerShell: `fnm env --use-on-cd | Out-String | Invoke-Expression`.
- Run the commands **from this `benchmarks/foreman/` directory.**

## The honest disclaimer, up front

> [!WARNING]
> This costs real money. The default grid (3 tasks × 4 arms × 4 reps = 48 sessions) is roughly **$2–4 on the small model** and takes a while. The bigger model costs several times that.

> [!NOTE]
> The numbers move between runs — a handful of reps against a live model, not a powered experiment. Judge every cell by its *per-rep spread*, not just the mean, and expect the shape rather than exact figures.

**What you should see:** the *shape*, not our numbers. On the small model, the one-line ask tends to ship broken or constraint-violating work on the trap tasks — especially the one whose brief names the wrong file — while the structured arms recover. On the bigger model everything tends to pass, and the difference moves into cost and discipline: the one-line ask often costs *more*, because the session burns turns rediscovering everything the ask didn't say. The `vibe` arm losing is partly informational (it deliberately drops detail); the comparison that isolates *structure* is freeform vs. webtemplate vs. foreman, which all carry identical facts.

## Sanity-check it for free

None of this invokes `claude`:

```bash
node selfcheck.js                  # every fixture: bug planted, lazy path trapped, solution passes
node runner/run.js --dry-run --tag smoke   # print the full planned run matrix, invoke nothing
```

`selfcheck.js` proves each fixture the hard way: the pristine app fails its tests; the lazy shortcut either passes tests but trips the constraint checks or goes nowhere; the correct solution passes everything. It also verifies the frozen foreman prompts still match the current `prompt-template.md` — if the template has moved, selfcheck says so instead of letting you benchmark a stale prompt.

## Run it

**1. Smoke test first** (one task, two arms, one rep — pennies) to confirm the plumbing drives `claude` and scores an answer:

```bash
node runner/run.js --tag smoke --tasks api-constraint --reps 1 --model sonnet --arms vibe,foreman-std
node runner/report.js --tag smoke
```

**2. The real thing** — every task, with the arm to quote. The default arms in `config.json` still hold the legacy `foreman` arm and leave `foreman-std` out, so name the arms:

```bash
node runner/run.js --tag mine --model sonnet --arms vibe,freeform,webtemplate,foreman-std
node runner/report.js --tag mine
```

That writes `.private/benchmarks/foreman/results/mine/report.md` at the Foundry root: per-task × per-arm tables (correctness, cost, tokens, reads-before-first-edit, verification, violations) plus per-rep rows so you can see the spread yourself.

**3. Go bigger** (optional — costs more):

```bash
node runner/run.js --tag big --model opus --arms vibe,freeform,webtemplate,foreman-std
```

Flags: `--tasks a,b` · `--reps N` · `--model sonnet|opus` · `--arms vibe,freeform,webtemplate,foreman-std,foreman,trio,cut-on,cut-wrong` · `--concurrency N` · `--tag NAME`.

## The arms

| Arm | What it is |
|---|---|
| `vibe` | The one casual line: "hey the rate limiter is broken, fix it?" Deliberately drops detail — that information loss is the arm's point. |
| `freeform` | The paragraph a competent dev writes by hand: every fact, natural prose, no structural guardrails. |
| `webtemplate` | The generic Role/Context/Task/Format shape common prompt guides recommend. Same facts, structured — but no truth-grounding, scope-discipline, or mandatory-verification blocks. |
| `foreman-std` | **The foreman arm to quote.** A handoff assembled by running the product's own `craft-handoff.js` — same facts again, plus the template's guardrail blocks and a required verification command. Generated by `defaultarm/gen.js`, and it passes `check-prompt.js`, the gate a real crafting session must clear. |
| `foreman` (legacy) | The older hand-frozen prompt. **Do not quote it.** It fails `check-prompt.js` with six errors — altered `<scope_discipline>`, no closure-evidence rule, no `<plan>`, no no-invention line, no fixed closing paragraph, and an *unbounded* fix loop — so foreman would refuse to hand it over. Kept only so previously tagged runs stay re-reportable. |
| `trio` (opt-in) | The identical foreman prompt, executed in a destination session with hush and razor active — the full trio versus foreman-alone. Runs only when named via `--arms`. |
| `cut-on` / `cut-wrong` (opt-in) | A pin stated as a constraint line inside the task rules. `cut-on` runs on `pinned-dup`, where it is true; `cut-wrong` on `unpinned-dup`, where it is false. See [the cut arms](#the-cut-arms). |

**The fairness rule the whole harness hinges on:** every arm except `vibe` carries the exact same brief facts. Arms differ in format and guardrails, never in information access — including the deliberately wrong file name in the stale-brief task, which every arm states identically.

The harness asserts that rule. `defaultarm/gen.js` refuses to write an arm prompt that drops a constraint fact or repairs the stale file name, `tests/default_arm.test.js` pins the file set against the `freeform` arm, and `selfcheck.js` runs the product's own gate over the generated prompt. The reason for all three: a prompt can come out of `craft-handoff.js` and still lose facts. Constraint facts passed as `judgment.context` are dropped by the standard profile, and naming the task's real file instead of the brief's claimed one disarms the stale-brief trap.

### The trio arm

`trio` needs the hush and razor plugins on disk. By default they resolve to Foundry's `hush/` and `razor/` checkouts. If yours live elsewhere:

```bash
HUSH_PLUGIN_DIR=/path/to/hush RAZOR_PLUGIN_DIR=/path/to/razor \
  node runner/run.js --tag trio --reps 4 --model sonnet --arms foreman,trio
```

The default four arms never need those plugins; if `trio` is named and they're missing, the runner fails fast and tells you which env vars to set. `settings-trio.json` pins hush's output style for the headless session (forced plugin styles don't apply on their own under `--setting-sources project` in `-p` mode).

## The picks mini-benchmark

A separate, smaller question: what does "what should I work on next?" cost against a backlog of 10, 50, or 150 tasks?

```bash
node picks/gen.js                            # generate the synthetic backlogs (free, deterministic)
node picks/run.js --tag mine --arms foreman  # foreman arm: zero tokens, no LLM — free
node picks/run.js --tag mine                 # adds the markdown arm: 5 claude sessions per size — bills you
```

Both arms see the same backlog content. The `markdown` arm hands a session a human-style TODO.md and asks it to pick; the `foreman` arm runs `roadmap.js next-candidates` — mechanical dependency-graph filtering, zero tokens, and the same answer every time. The report counts distinct picks across reps (normalized, so "Task X" and "**Task X** (#007)" count as one answer) next to mean cost and tokens.

To inspect a possible ranking change without changing Foreman's production
sorter, replay any real or synthetic roadmap through the current ranking,
critical-depth-first, and critical depth as a late tie-breaker:

```bash
node picks/ranking-replay.js --roadmap /path/to/ROADMAP.jsonl
```

The replay is deterministic and free. It reports top-pick disagreements for
human judgment; it does not silently turn critical depth into a new priority
system.

**Which roadmap you replay decides whether the answer means anything.** The
generated backlogs at `picks/fixtures/10`, `/50` and `/150` cannot separate
the three orderings at all: every entry in them has a critical depth of 0 or
1, and depth equals `unblocks_total` on every row, so all three come back
byte-identical however large the backlog gets. A replay over those reports no
disagreement and means nothing by it.

`picks/fixtures/deep` is hand-authored to be the shape they never produce — a
four-long serial chain against a three-wide fan, deliberately tied on
`unblocks_total` so the comparator has to fall through to direct `unblocks`:

```bash
node picks/ranking-replay.js --roadmap picks/fixtures/deep/ROADMAP.jsonl
```

Current ranking picks the fan head; critical-depth-first picks the chain head;
critical depth as a late tie-breaker changes nothing, because direct
`unblocks` has already separated the two rows before depth is consulted. That
one disagreement is the whole trade, and Foreman declines it: its user works
one task at a time, so three immediate options beat a longer critical path.
`tests/ranking_replay.test.js` pins all of it, so a future change to the
sorter has to argue with the case rather than rediscover it.

## The pick-flow eval on the API

A third question: does a Fast pick reach the right questions, and what does its instruction text cost? `pickflow/` runs the pick from "what's next" to the destination question in a simulated Claude Code session on the Claude API. It bills the API key, not a Claude Code plan.

```bash
node pickflow/run.js --smoke                 # scripted replies through the simulator and grader: free
node pickflow/run.js                         # plan only: cases, cost bounds and the oracle path's size; nothing is sent
node --env-file=<key file> pickflow/run.js --go --max-usd 12 --tag mine
```

The model gets Read, Bash, Skill and AskUserQuestion tools, and every result is scripted. Skill files come from the Foreman checkout. Menu, list and trial-log outputs are real runs of Foreman's scripts on the fixtures in `pickflow/fixtures/`. Nothing the model writes is executed. A case stops at the destination question, at a reply with no tool call, or after `--max-rounds`.

- Arms: `prose` reads `pick.md`, `destination-question.md` and the sibling files they link (`accept.md`, `resume.md`, `defer.md`, `hint.md`, `reconcile.md`, `prepare-increments.md`) as Foreman 4.1.0 (commit 4200026) shipped them, frozen in `pickflow/arms/prose/` (the prose baseline, before `pick.md` moved to action codes). `p1` reads Foreman's current files, whose `pick.md` is the code table, with a prototype in which `roadmap.js step pick` returns an action code and the skill holds one row per code. That `step` command is the prototype in `pickflow/sim.js`. `real` reads every file from another Foreman checkout, `PICKFLOW_REAL_DIR` (default `.private/foreman-step-pick`), and runs that checkout's own `step pick` on a scratch git copy of the fixture with the trial log on; its events are read back from that log.
- Scenarios, in `pickflow/scenarios.json`: a plain menu, a finished entry waiting for acceptance, a single option, other work in progress, a full session, and a task the user names.
- Grade per case: the Q1 options, order and labels; the destination options with their `(Recommended)` and `(Caution)`; the trial events; and no file read, command or status change outside the flow. Cost: input, cached and output tokens, tool calls and rounds.
- Flags: `--arms`, `--scenarios`, `--reps` (3), `--model` (`opus`), `--api batches|messages` (`batches`, half price), `--max-rounds` (14), `--max-tokens` (8192).
- Billing guards: the key is read only from `ANTHROPIC_API_KEY`, so load it for one command with `--env-file`. `--go` and `--max-usd` are required to send. Before each round, the worst case (every reply at `--max-tokens`, nothing cached) must fit under the cap, or the run stops there.
- Output: `records.json`, `report.md` and the raw replies under the ignored `.private/benchmarks/foreman/pickflow/<tag>/`; the hill-climb files under `.claude/hillclimb/foreman-pickflow/`, `baseline` for `prose`, `v1` for `p1` and `v2` for `real`.

The simulator is not Claude Code: its system prompt is a short stand-in, and the tool results are fixed. Compare the arms with each other, not with a real session.

## The close-protocol eval

A fourth question: does a worker that follows a Foreman handoff keep the roadmap's books? `closeflow/` hands a simulated background agent the entry paragraph of a Foreman handoff and scores four steps: opening the entry as `in_progress`, taking the commit boundary with `safe-commit.js begin`, staging only the files the task owns, and closing with the right status and one commit whose last line is `Foreman: <id>`.

```bash
node closeflow/run.js --smoke                # scripted replies through the simulator and grader: free
node closeflow/run.js                        # plan only: cases and prompt sizes; nothing is sent
```

From `benchmarks/`, `node --test foreman/tests/closeflow.test.js` runs the offline tests: the scripted replies, one broken step at a time, and the sandbox's refusals.

- Prompt: each case crafts its prompt with the Foreman checkout's own `craft-handoff.js`, for the background-agent destination. The eval therefore always grades the bookkeeping Foreman prints today. The one arm, `current`, is that prompt.
- Scenarios, in `closeflow/scenarios.json`, all on the `api-constraint` fixture: `clean` (expects `done` and one commit), `hold` (the project keeps `requireVerification` at its default, so it expects `awaiting_acceptance` and one commit) and `dirty` (another session left an uncommitted edit to `index.js`, so it expects `done` and no commit, with that edit untouched and unstaged).
- Grade per case: `opened`, `boundary`, `owned`, `closed` and `clean` (no refused command or write), each 0 or 1, read from the repository and the order of the calls. `pass` is 1 only when all five are.
- What runs: only Foreman's `roadmap.js` and `safe-commit.js`, and the git subcommands `add`, `commit`, `status`, `diff`, `rev-parse`, `log` and `show`, in a throwaway repository under the system temp folder that is deleted after grading. Writes land only inside that repository, never in `ROADMAP.jsonl` or `.foreman/`. A push, reset, amend, `--output` or other git subcommand is refused and counted, and the roadmap and `.foreman/` stay guarded whatever the path's case or trailing dots. The test command gets a scripted pass.
- Flags: `--arms`, `--scenarios`, `--reps` (1), `--max-rounds` (20).

There is no model path yet. The paid comparison against the `task.js` arm of Foreman entry 1078 adds one in a later step.

## Held-back tests

In the `gamed-check` fixture, the shipped suite names exactly **one**
case of a rule that holds for every input, so a fix hard-coded to that case
passes everything the session can see. `fixtures/gamed-check/hidden/` asserts
the same rule at inputs the session never sees. After the run,
`checks.hiddenTests` runs it in a randomly named copy of the workspace and
deletes that copy, so the workspace itself never holds it. A run whose shipped
tests pass while the held-back ones fail is scored `gamed:` — its own
violation, never folded into `tests`.

`gamed-check` carries no arm prompts, so `runner/run.js` refuses it by name;
`tests/hillclimb.test.js` uses it to prove the held-back scoring.

## The cut arms

Another question: when a handoff states a fact as a constraint, does the session obey it, and what happens when that fact is false?

```bash
node benefit/gen.js                                        # write both arm prompts (free, deterministic)
node benefit/gen.js --check                                # exit 1 if they drifted
node runner/run.js --tasks pinned-dup --arms cut-on --reps 6
node runner/run.js --tasks unpinned-dup --arms cut-wrong --reps 6
```

The fixture is `pinned-dup`: the `adjacent-mess` module with the ticket that
pins its three copy-pasted percentile helpers removed from the code comment,
the brief and the prompt alike. The `TODO: collapse these three copies` that
invites the tidy-up is still there. Both arms add the same line under
**Constraints** in the task rules: do not unify the helpers, because ticket
`PERF-1123` pins them.

- `cut-on` runs as the `pinned-dup` task, where the line is true and the
  helpers must stay apart.
- `cut-wrong` runs as the `unpinned-dup` task: the same fixture with the
  opposite truth. The task asks for the collapse, no ticket pins anything, and
  nothing in the fixture can refute the line. The fixture's `lazy` overlay is
  this task's solution, and its `solution` is the lazy path.

Collapsing the helpers is caught by three `sentinels` on the lines the collapse
removes, however it is done — one shared helper, three thin delegates, anything.
`unpinned-dup` inverts them, so helpers left standing are its violation.
`fixtures/pinned-dup/lazy/` is that exact tidy-up, and `selfcheck.js` runs it on
every invocation, so the detector is proven without spending a session on it.

## Roadmap health and attention cost

A different question again: does a roadmap stay accurate over months, and what
does keeping one cost you? Mechanical tests can't answer either, so the foreman
plugin ships two health tools under `scripts/health/` that measure them
directly. From this directory, in a Foundry checkout:

```bash
node ../../foreman/scripts/health/roadmap-health.js --roadmap /path/to/ROADMAP.jsonl --date 2026-07-28
```

Free, deterministic, read-only, and no default roadmap — you name the file.
It reports stale entries, survey breadcrumbs, stranded dependencies, look-alike
duplicates, archive growth, and duplicate-id repairs, reusing `roadmap.js` and
the doctor's own checks so the numbers can't disagree with `roadmap.js doctor`.
`--archive` is autodetected next to the roadmap; `--date` fixes the run date so
a report is reproducible.

`attention-cost.js` is the same shape, asking what Foreman costs you rather
than what shape the roadmap is in:

```bash
node ../../foreman/scripts/health/attention-cost.js --roadmap /path/to/ROADMAP.jsonl --date 2026-07-28
```

Also free, deterministic, read-only, same flags. Three of its seven metrics
need nothing but the files: how closely each closed task's predicted files
matched the files it actually changed (precision and recall, matched with
`roadmap.js`'s own prefix-aware rule, so `src/auth` counts as predicting
`src/auth/middleware.ts`), how many files it changed that nothing predicted
— cross-checked against the scope-drift note the close already stamped — and
how much fixed guardrail text the short handoff profile drops relative to the
full one, read out of `prompt-template.md` through `check-prompt.js`'s own
exports so the two can't disagree.

Seven of the sixteen metrics across the two tools — whether you accept the
recommendation, override it, get what you meant from a hint, how long setup
runs before the first useful task, how many questions a task costs, how often a
commit gets interrupted, and whether an interrupted run comes back — only exist
if a session records them as they happen. [`TRIALS.md`](../../foreman/TRIALS.md)
defines those as opt-in, local, count-only project trials: no titles, no paths,
no ids, a log you can delete at any time, and only the script-side events
recorded today — the model-side ones (recommendation acceptance, override rate,
questions per task) stay unwired.
Pass `--trial-log <path>` and each tool computes its own rates; without one they
report `null` with a reason rather than zero. The recovery number additionally
ships a clearly labeled proxy — how much interrupted work is sitting open —
which is not the same thing and never stands in for the rate.

One of `attention-cost.js`'s numbers: **the standard handoff profile carries 68
words of fixed guardrail text against the reinforced profile's 567, 12% of it,
499 words saved on every standard handoff.** That is a static computation over
`prompt-template.md`, not a model trial.

Raw `results/` folders, retained outputs and records live in the ignored
`.private/benchmarks/foreman/` folder at the Foundry root.
The harness provides the method for reproducing a measurement; a new run is
separate evidence and does not replace the original record.

## What's measured

Each run records, per session: cost, output tokens, context traffic (input + cache tokens across every API call), mid-turn narration words, turns, wall time — and the discipline signals: how many Read/Glob/Grep calls before the first edit, whether a test-intent command actually ran (`npm test`, `node --test`, or executing the test file directly all count), the constraint violations by name, and on the stale-brief task, whether the final message names the file mismatch it found.

### A note on fairness

Each session runs in a fresh throwaway workspace in the system temp directory, outside any git repo, with a scoped tool allowlist, no MCP servers, and `--setting-sources project` — so a difference between arms is the prompt (or, for `trio`, the prompt plus the named plugins), nothing else. Scope checks are hash comparisons in the scorer, not model judgment. The foreman prompt's extra length is part of the product, so its overhead is included in the measurement, not subtracted.

## The README replay

The animated exchange at the top of Foreman's README is drawn from recorded transcripts, never typed:

```bash
node runner/demo.js --exchange ../../.private/benchmarks/foreman/records/<dir>/exchange.json
```

`exchange.json` names the project, the model, and one entry per turn: the text the user sent and the `claude -p --output-format stream-json` transcript of Foreman's answer (a `--resume` of the same session for the follow-up). The drawer plays each reply at its share of the recorded wall clock, cuts any reply after the first at a paragraph boundary with a word count, and shows the `task_context` and `relevant_files` blocks of the handoff prompt the session returned. Transcripts stay under `records/` and never ship; `foreman/assets/demo.svg` does.
