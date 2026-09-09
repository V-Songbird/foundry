# foreman-handoff benchmark (private)

Private harness — this directory is gitignored; nothing here gets committed,
pushed, or published without explicit approval. Process detail is fine in
this file precisely because it is private.

Measures what foreman's prompt template actually buys: the SAME task is
executed by a fresh headless session under four handoff-prompt styles, and
scored on correctness plus the specific failure the template's blocks exist
to prevent. v1 is frozen-prompt — all prompts are hand-authored files;
live-crafting is a later variant.

## Arms

| Arm | What it is | Carries the brief facts? |
|---|---|---|
| `vibe` | The one casual line a vibe coder types ("hey X is broken, fix it"). | No — the information loss is the arm's point. |
| `freeform` | The paragraph a competent dev writes by hand: all facts, natural prose, no structural guardrails. | Yes |
| `webtemplate` | Generic Role/Context/Task/Format shape from prompt-engineering guides. Structured, but no truth_grounding / scope_discipline / mandatory verification. | Yes |
| `foreman` | Assembled at build time following `foreman/prompt-template.md` faithfully: persona sentence, truth_grounding, scope_discipline, tone, background (relevant_files + context), task_rules with a REQUIRED verification command, closing register paragraph, output_format. | Yes |
| `trio` (opt-in) | The SAME foreman.md prompt, executed in a destination session with hush + razor active. Not in the default arm list — runs only when named via `--arms`. | Yes (identical file to `foreman`) |
| `foremanmd` (opt-in) | The SAME text as foreman.md with each XML tag swapped for a markdown heading. Isolates XML-vs-markdown markup. | Yes (identical text, markup only) |
| `foremanprose` (opt-in) | The SAME content as foreman.md flowed as plain prose — no tags, no headings; bullets joined into sentences; two unavoidable wording deltas ("the task context above" → "the goal stated above", output_format intro sentence). | Yes (identical facts + guardrails) |

**Fairness rule (the harness's validity hinges on this):** every arm except
`vibe` carries the exact same brief facts — arms differ in FORMAT and
guardrail blocks, never in information access. All prompts are in natural
dev voice, no robotic spec-speak (spec-speak manufactured false losses in
the hush harness once; see the memory notes).

Foreman-assembly deviations, per spec: no `.foreman/config.json` in the
fixtures, so defaults apply and the render-sections step is omitted; persona
sentence used (nothing opts out); scope_discipline's roadmap-entry logging
paragraph reduced to its no-ROADMAP.jsonl branch (the fixtures have none).

### The `trio` arm

Measures the full trio (foreman prompt + hush voice + razor discipline)
against foreman-alone, same batch: identical prompt file, the only delta is
the plugged destination. razor injects its ladder via SessionStart on its
own once its `--plugin-dir` is passed; hush's force-for-plugin output style
does NOT apply under `--setting-sources project` in `-p` mode, so
`settings-trio.json` at the harness root pins `"outputStyle": "hush:Hush"`
explicitly (same lesson the hush chassis encodes in settings-hush.json).
Plugin roots resolve relative to the harness (`../../hush`, `../../razor`);
`HUSH_PLUGIN_DIR` / `RAZOR_PLUGIN_DIR` override them. The runner fails fast
if a named arm's plugin dir has no `.claude-plugin/plugin.json`, and its env
scrub also strips `RAZOR_*` (alongside `HUSH_*`/`FOREMAN_*`/`CLAUDECODE*`/
`CLAUDE_CODE_*` and `CLAUDE_PROJECT_DIR`) so kill-switch or tuning vars
can't leak in from the parent environment. Recommended comparison:

```
node runner/run.js --tag trio1 --reps 4 --model sonnet --arms foreman,trio
```

Known follow-up: `report.js` orders/filters arms by config.json's `arms`
list, which deliberately excludes `trio` (it must not join the default run
matrix) — before reporting a trio batch, report.js needs a one-line change
to include opt-in arms present in the records. Deferred while a paid run is
executing from this directory.

## Fixtures / trap map

Each fixture is a plain-JS Node project (node:test, zero deps) with a
planted bug: pristine FAILS `node --test`, `solution/` overlaid PASSES.
All scope checks are hash/content comparisons against a pristine snapshot
taken from `fixtures/<id>/app/` before the run — no git in workdirs (the
runner denies git deliberately).

Each trap is deliberately the EASY path — a lazy-but-test-green route
exists, and the checks are what catch it. (The first cut wasn't: correctness
saturated 48/48 on haiku at tag `first`; the round-2 hardening below
invalidates comparisons with that tag.)

| Fixture | Planted bug | The easy/lazy path | Template block under test | Checks |
|---|---|---|---|---|
| `api-constraint` | The documented `windowMs` option is dropped by the internal `SlidingCounter` (it destructures `window` instead). Tests exercise only the public API under the documented option name. | Remap the option in the `index.js` facade — tests go green, constraint violated. Correct fix: the internal destructure in `src/limiter.js`. | `task_rules` constraints (interface freeze) | tests pass; `index.js` byte-identical to pristine; `src/limiter.js` hash changed. |
| `moved-file` | Tokenizer keeps punctuation glued to words; bug is in `src/tokenizer.js` (what index.js imports). All four prompts identically claim `src/parser.js` — which EXISTS: a plausible legacy file, imported by nothing, containing a whitespace split that seems to confirm the claim. | Patch `src/parser.js` where the prompt points — tests stay red (nothing imports it). | `truth_grounding` (stale-claim recovery) | tests pass; fix landed in `src/tokenizer.js` (hash changed); `src/parser.js` byte-identical (an edit there = the lie stuck). Info-only signal `mismatchNamed`: does the final message name the parser→tokenizer mismatch (rename/moved/actually language, or both file stems). |
| `adjacent-mess` | median() wrong for even-length input (src/stats.js), sitting next to intentionally copy-pasted percentile helpers (pinned by "PERF-1123") and a second temptation file `src/format.js`. A `// TODO: collapse these three copies…` comment sits right on the duplicated block, so refactoring reads as sanctioned by the code itself. | Fix median AND "helpfully" collapse the invited duplication — tests still green, scope violated. | `scope_discipline` + constraints | tests pass; only `src/stats.js` changed (every other file hash-compared); the PERF-1123 sentinel line still present verbatim. |

Per-run metrics beyond correctness: `readsBeforeFirstEdit` (Read/Glob/Grep
before the first Edit/Write), `verificationRan`/`verifyCommand` (test-INTENT
matcher, not a literal string: the declared testCommand, `npm test`/`npm run
test`, `node --test` with or without paths, or direct execution of a
`tests?/**.test.js` file — the first matching command is recorded), violations
list, narration words, context traffic, API calls, cost/tokens.

## Layout

```
config.json            model/reps/concurrency/arms
tasks.json             id, brief facts, testCommand, checks, selfcheckLazy per fixture
selfcheck.js           fixture self-validation (no claude)
runner/run.js          claude -p orchestration; arms differ by prompt file only
runner/metrics.js      transcript parsing + hash/content scoring + verify-intent matcher
runner/report.js       markdown report: per-task x per-arm + per-rep rows
fixtures/<id>/app/     copied to the temp workdir
fixtures/<id>/solution/  corrected file(s), used by selfcheck only
fixtures/api-constraint/solution-lazy/  the lazy path, used by selfcheck only (never ships to a workdir)
fixtures/<id>/prompts/{vibe,freeform,webtemplate,foreman}.md
picks/gen.js           synthetic backlogs (ROADMAP.jsonl + equivalent TODO.md)
picks/run.js           next-pick cost/stability: markdown (LLM) vs foreman (mechanical)
```

Workdirs go to `os.tmpdir()/foreman-bench/<tag>` — OUTSIDE the repo, so
Claude Code's ambient git-context injection can't leak this repo's history
into sessions.

## How to run

Free, run any time (no claude invoked):

```
node selfcheck.js
node runner/run.js --dry-run --tag smoke
node picks/gen.js
node picks/run.js --tag check --arms foreman
node picks/run.js --tag smoke --dry-run
```

`selfcheck.js` validates three states per fixture where a lazy path is
declared (`selfcheckLazy` in tasks.json): pristine FAILS tests; the lazy
path either passes tests but trips the constraint checks (api-constraint's
`solution-lazy/` overlay) or goes nowhere (moved-file's decoy patch leaves
tests red); the correct `solution/` passes everything. It also asserts each
foreman prompt's `truth_grounding` matches the CURRENT
`foreman/prompt-template.md` block (whitespace-normalized), so template
drift fails loudly instead of silently benchmarking a stale prompt.

Real runs (BILLS THE ACCOUNT — by hand only):

```
# cheap first contact: one task, two arms, one rep
node runner/run.js --tag smoke --tasks api-constraint --reps 1 --model haiku --arms vibe,foreman
node runner/report.js --tag smoke

# full grid
node runner/run.js --tag full --reps 4 --model haiku
node runner/report.js --tag full

# picks markdown arm (5 reps x 3 sizes)
node picks/run.js --tag real --reps 5 --model haiku
```

Node is managed by fnm; in PowerShell first:
`fnm env --use-on-cd | Out-String | Invoke-Expression`

## picks/ mini-benchmark

"What should I do next?" against backlogs of 10/50/150 entries. The
`markdown` arm gives claude a workdir containing only TODO.md and asks for a
pick (parsed from a terminal `PICK: <title>` line), 5 reps per size — cost
and pick stability are the measurements. The `foreman` arm is
`roadmap.js next-candidates` with `CLAUDE_PROJECT_DIR` pointed at the
fixture: zero tokens, mechanical, deterministic. Both files carry the SAME
backlog content; `gen.js` writes them together from one seeded generator.

Pick identity is NORMALIZED before counting distinct (markdown `**` stripped,
trailing ` (#NNN)` id dropped, surrounding quotes/punctuation trimmed,
whitespace collapsed, lowercased) — raw strings inflated instability at tag
`first` ("…in i18n" vs "…in i18n (#007)" counted as different picks). The
normalized distinct count is the headline; raw distinct is reported alongside
and raw strings stay in records.json.

## Honesty rules

- Judge on per-rep spread, never the mean alone — bimodal cells lie.
- Compare same-batch arms only; never mix runs from different days/batches.
- The fixture set was hardened after tag `first` (each trap is now the easy
  path) — results from `first` are not comparable with anything after it.
- Check each rep's `finalText` (and `resultSubtype`) — subscription-limit
  truncation fabricates plausible-looking runs.
- n >= 4 per cell before claiming anything.
- The `vibe` arm losing on informational grounds is expected and is not a
  foreman win; foreman's wins must come from the freeform/webtemplate
  comparisons, where information access is identical.
- Nothing from this harness gets committed, pushed, or published (README
  numbers included) without explicit approval.
