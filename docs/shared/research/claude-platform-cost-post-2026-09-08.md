# The ClaudeDevs cost post, checked against the plugins — 2026-09-08

Local research note (gitignored `docs/research/`). Nothing here is publishable as-is; README lines
are proposals, benchmark numbers stay local per ADR 0004.

## Sources

- The post: "Reducing cost and improving performance with Claude Platform", @ClaudeDevs,
  2026-09-08 11:01, https://x.com/ClaudeDevs/status/2097369738968195513 (Lance Martin, Brad
  Abrams, Isabella He, Ben Lehrburger). Read in full via the owner's Chrome.
- Its docs basis, read the same day: the platform guide *Optimizing for cost and intelligence*
  (`about-claude/models/optimizing-for-cost-and-intelligence`), the *Effort* page
  (`build-with-claude/effort`), the Claude Code *Manage costs effectively* page
  (`code.claude.com/docs/en/costs`), and the bundled `claude-api` skill in CLI 2.1.260:
  `shared/prompt-audit.md`, `shared/prompt-caching.md`, `shared/cost-optimization.md`.

## What the post says, with every number

| Section | Claims | Numbers |
| --- | --- | --- |
| Prompt cache | KV prefill state is cached; pinned to one model; byte-exact prefix; TTL. Effort renders into the prefix, so changing it mid-conversation breaks the cache except on Opus 5 / Fable 5.1 (per-message effort). Keep timestamps and IDs out of the prefix. Tool definitions render first — any change breaks everything. Subagents share the parent's cache only with a byte-identical prefix, same model, same effort. Fixes: monitor hit rate (Console + cache diagnostics API), `defer_loading` on rare tools, system updates as `role: system` messages, stable layout, change model/effort at compaction when the cache is already broken, move the breakpoint, pre-warm with `max_tokens: 0`, and use the 1-hour TTL when a tool call or subagent blocks the parent past 5 minutes. | 5-minute TTL counts from request start |
| Instructions | Six anti-patterns that hobble frontier models: verification rituals ("verify twice"), emphasis boosters ("CRITICAL: YOU MUST ALWAYS"), mandatory procedures / scratchpad scaffolds, stale few-shot examples, contradictory rules, dated configuration (manual thinking budgets). Fix: `/claude-api prompt-audit`, which also scans Claude Code's own config (CLAUDE.md, skills). | Opus 4.8 → Opus 5 support benchmark, six planted anti-patterns: audit cut cost 14.6% and raised accuracy 5.3% on average |
| Effort | Curves differ by task. Miscalibration both ways: over-thinking at high, answering from partial evidence at low. Fixes: try a stronger model at lower effort; sweep effort on your own eval; `/claude-api hillclimb`. | Fable 5 on FrontierCode Diamond: 11.5% at `low` for $5.35/task vs 30.9% at `max` for $19.00. Fable 5.1 on HLE: ~53% at `low` for $0.30 vs ~61% at `max` for $2.23; the last step adds ~0.5 pt for +46% cost. Fable 5.1 at `low` = Fable 5 at `high` on CursorBench 3.2 at a third of the cost; Fable 5.1 cache reads $0.25/M vs $1.00/M. Hillclimb on support tickets: held-out 90.5% vs 78.6% at ~1/5 cost |
| Automating | `/claude-api cost-optimize`: profile spend (Admin API → `usage` logs → code estimate), rank levers (caching, trimming incl. prompt-audit, bounding output, batching), then effort/model if an eval exists. | With Sonnet 5: LegalBench −58% (thinking tokens 102,779 → 8,284), tau2-bench retail −73% (explicit breakpoints), OfficeQA Pro $136.20 → $64.87, **SWE-bench Verified −55% from effort `medium` plus "constraining the agent's output to just a few concise sentences"; median steps 29 → 17, prompt tokens 75.2M → 33.7M** |
| Getting started | `prompt-audit` after a model migration; `cost-optimize` for API apps; `hillclimb` with an eval. | — |

Two facts from the docs pages the post links that matter here:

- **Claude Code's default effort is `high`.** Effort page: Opus 5 and Fable 5.1 "Start with `high`,
  the default"; Sonnet 5 "defaults to `high` effort on the Claude API and Claude Code". `medium` is
  described as the cost step-down, never as recommended. (The bundled skill's cached note that
  `xhigh` is Claude Code's default is Opus 4.7/4.8-era guidance.)
- **Effort does not shorten visible replies on Opus 5.** Effort page: "changing effort does not
  reliably shorten responses, so prompt for length instead." That is hush's mechanism, stated
  officially.

## Fact checks against the plugins

Scope: foreman 2.6.0, hush 1.11.5, razor 1.5.8 (the pinned releases) and flint. Note: the razor
working tree sits on branch `Codex` (2 commits past 1.5.8, Codex-facing README and hooks). Claude
Platform guidance does not reach that runtime; nothing below is about it.

### Prompt cache

| Post fact | Plugin surface | Status |
| --- | --- | --- |
| Byte-exact prefix; never edit the system prompt or history mid-conversation | hush's style is a static file; `/hush:pick-style` binds at the next session (HOW-IT-WORKS: "The voice is chosen when a session starts"). razor's ladder is one SessionStart injection plus `DRIFT_NOTE` appended on each prompt. foreman's hooks append (`ledger-recall` after `Read`, `context-fill` after three scripts, `session-start`). | Compliant. No plugin changes the prefix. |
| Context editing rewrites the cache (cost-optimization § 2.3: "cost more than it saved") | hush shortens a tool result at delivery (PostToolUse `updatedToolOutput`) before it enters the transcript, and parks the full copy on disk. Nothing is rewritten later. | Compliant, and the safer shape: pruning at ingestion never invalidates. |
| Persistent injected text costs on every later call; a reminder removed later is a history edit, and on Fable 5.1 that invalidates every later thinking block (accounts created on/after 2026-08-31 get a 400) | hush `silence-nudge.js`: `TURN_DIAL` at every UserPromptSubmit, `STEP` on a detected leak. Measured 2026-08-08: a mid-turn `additionalContext` block did not survive a `claude -p` resume, re-caching 5–12k tokens per resume. Not re-checked since CLI 2.1.2xx. | **Open.** On Fable 5.1 this is now a correctness question, not only cost. Cheap re-probe: one two-prompt harness task with the per-event cache probe (~$2), or an interactive hush session read through `/usage`'s prompt-cache line (misses + likely cause, CLI ≥ 2.1.260). |
| Subagents share the cache only on a byte-identical prefix | hush `subagent-brief` and razor `subagent-start` add context inside the subagent, after its own prefix. | Compliant; the parent's cache is untouched. |
| TTL: a tool call or subagent blocking past 5 minutes expires the parent's cache; use 1h | Claude Code: 1h on subscription, 5m on an API key or usage credits (costs page). foreman's background-Agent destination is the >5-minute case for API-key users. | Not plugin-controllable (Claude Code's own TTL setting). No action. |
| Verify from `usage` fields, never from code review | `benchmarks/hush/runner/metrics.js` takes `total_cost_usd` from the `claude -p` result and sums `input + cache_read + cache_creation` per call into `contextTraffic`; razor's `run.js` reads the same. No local price table exists to go stale. | Compliant. Fable 5.1's $0.25/M cache read is priced by Claude Code, not by the harness. |

### Instructions — the six anti-patterns

A mechanical scan of every prompt surface (hush `output-styles/hush.md`, hush skills, foreman skills
and `prompt-template.md`, razor `RULESET`/`DRIFT_NOTE` and skill, flint style and prompts) with
the greppable signals from `prompt-audit.md` Groups 1–2: CAPS boosters, "think step by step" /
scratchpad, hedges (`try to`, `if possible`, `ideally`), verification rituals, retired model names,
`reminder:` cadences, migration-relative wording.

Result: **zero** boosters, scaffolds, hedges, rituals or retired model names. `double-check` appears
only as a routing phrase in foreman's `foreman` and `survey` descriptions (legitimate trigger text
per the audit's own split). What remains is deliberate, and each item has a measurement behind it:

| Surface | Audit row it matches | House evidence | Verdict |
| --- | --- | --- | --- |
| hush.md: "8 lines, tops. 90 words, tops", 8 words per sentence, count-before-send, "No semicolons. No parentheses.", no text between tool calls | 1b numeric caps; 1d update suppressors + anti-formatting; 1f output-shaping choreography | Caps carried when moved into the counting action (408-run A/B, 2026-08-06). Opus 5 basis rm320: final message 71 vs 406 words, 36/36 correct, cost $0.4517 vs $0.5775, answerable 97.2% tie / Sonnet 100% vs 83.3%. The cost docs say to prompt for length; the SWE-bench result came from exactly this lever. | Keep. **Unmeasured on Fable 5.1**, the model the audit says under-narrates already. |
| hush `silence-nudge.js` per-turn reminder; razor `DRIFT_NOTE` on every prompt | 1d instruction re-insertion on a cadence | react cheaper than the no-mid-turn design 3/3 batches; style-alone loses to `turn` (8/12 vs 9/12 silent, 11/12 correct). Drift note: 84% vs 73% recall. | Keep. |
| razor ladder: seven fixed rungs, "Never narrate or deliberate the rungs in your output or your thinking" | 1b/1c mandatory procedure; prose steering of thinking | 39 sessions per setup on Opus 5: 9.6 vs 18.3 lines, $0.121 vs $0.155, 39/39 clean. | Keep. |
| foreman `prompt-template.md`: "Do NOT claim success without running this", `Verification (REQUIRED)`, three-step `<plan>`, "Reason through … in your thinking", `<tone>` silent by default | 1a mild emphasis; 1c procedure; 1b/1d | Swept 2026-09-02 against the Fable 5.1 prompting docs: 16 candidates, all refuted; the narration clause is the one Fable 5.1 conflict and is parked (foreman has no model input; the background-Agent destination needs it). | No new finding. Do not re-sweep. |
| flint `prompts/tune-for-opus5.md`: model in the file name and first sentence | Group 2 pinned model names | None; it is a paste-in prompt. | Low: generalize the name when flint next moves. |
| foreman `context-fill.js` renders "this session is about N% full (X tokens against Y)" into context | Group 4 "budget countdowns rendered into context can cause premature wrap-up" | Gated: only ≥ 25% of a configured window, only after a pick/craft script, once per turn, and it says the number is a reading for the destination question. | Flag only. |

Contradictory rules: hush overrides the base prompt's opener line by name (failure mode #5 in the
wording lessons) — a resolved contradiction, not an open one. razor's "note the swap in one line"
and hush's "Cut what you ruled out" are compatible: the swap changes what the reader does next.
Dated configuration: no `budget_tokens`, `MAX_THINKING_TOKENS` or thinking config anywhere; the
harnesses pass `--effort` once per run and never vary it.

**Verdict:** the plugins pass the official audit's mechanical scan. A formal `/claude-api
prompt-audit` run would re-surface the measured items above as medium-confidence `remove`
proposals; the audit's own keep-list ("prohibitions against current, demonstrated failures stay";
"an audit that finds nothing should change nothing") is the answer to each.

### Effort

| Post / docs fact | Plugin surface | Status |
| --- | --- | --- |
| `high` is the default; `medium` is the cost step-down | `hush/docs/BENCHMARKS.md:26`: "Claude Opus 5 at its recommended medium effort" | **Wrong word.** Nothing in the docs recommends medium. Reword to "at medium effort" (release-bearing edit in the hush submodule; the README's bench-cuts alt text already says just "at medium effort"). |
| Higher effort "may explain the plan before taking action, provide detailed summaries" | hush's Opus basis (rm320) runs at `medium`; users run at `high` by default | Representativeness gap. Baseline narration is probably higher at `high`; hush's own leak rate there is unknown. A default-effort basis: 2 arms × 9 jobs × 4 reps = 72 Opus runs; the docs put `medium` at about half of `high` on long-horizon coding, so estimate $70–90 against the ~$37 medium basis. |
| Fable 5.1 at `low` matches Fable 5 at `high`; Fable 5.1 cache reads at $0.25/M | No plugin has ever been measured on Fable 5.1 (the owner's daily model). Fable runs about 2× Opus per run at list price, less with the cheap cache reads. | A Fable 5.1 arm: 36 runs (2 arms × 9 × 2 reps) ≈ $50; 72 runs ≈ $100. Pairs with the audit gap above. |
| Effort is user-side in Claude Code (`/effort`); the `Agent` tool has no effort parameter | foreman never passes `model` to a background Agent; razor/hush never touch effort | No plugin action possible. |

### "Automating cost reduction"

- `cost-optimize` audits application code that calls the Claude API. The plugins are hooks and
  prompts; the harnesses drive `claude -p`. No `cache_control`, `max_tokens`, or batch endpoint
  is ours to set. Not applicable.
- The hush harness's judges (`answerable.js`, `retention.js`) also run through `claude -p` (they
  read `total_cost_usd`), so the Batch API's 50% is unreachable without rewriting them against the
  SDK. Judging is ~$4 per batch. Not worth it.
- `hillclimb`: the hush harness already is an eval (ground truth, answerability, reading ease,
  cost), and the style body went through an in-house iteration loop in August. No new tool needed.

### The SWE-bench line is hush's thesis, from Anthropic's own optimizer

On SWE-bench Verified with Sonnet 5, `cost-optimize` cut cost 55% at a flat pass rate from two
levers: effort `medium` and "constraining the agent's output to just a few concise sentences", with
median steps 29 → 17 and prompt tokens 75.2M → 33.7M. That is hush's short final message and
silence, at the effort hush's basis already uses. hush's own read on Opus 5 (rm320): −22% mean
cost, whole-session output −40%, 36/36 correct. The larger SWE-bench number is expected: a 29-step
loop re-reads every assistant message on every step, and the optimizer also cut steps.

README opportunity (owner's call, marketing surface): one plain sentence in `## Why you'd want it`
or `## How it works` saying Anthropic's own cost tool reaches for the same lever, linking the
post. No number quoted; hush's numbers stay hush's.

### The Claude Code costs page endorses three of hush's mechanisms outright

- "Offload processing to hooks … Instead of Claude reading a 10,000-line log file to find errors,
  a hook can grep for `ERROR` and return only matching lines" — `compress-tool-output.js`.
- "Add custom compaction instructions" — `precompact-summary.js` (PreCompact raw stdout).
- "Delegate verbose operations to subagents … only a summary returns" — `subagent-brief.js` keeps
  that summary terse.
- Also new there: `/usage` shows a `Prompt cache (main)` line (CLI ≥ 2.1.251) with misses,
  expected rebuilds and, from 2.1.260, a likely cause — a free way to see what hush's injections
  cost in an interactive session.

## Opportunities, ranked

1. **Free, now** — `hush/docs/BENCHMARKS.md:26`: drop "recommended". Bundle with the next hush
   release.
2. **Free, ~$2** — re-probe whether hook `additionalContext` survives a `claude -p` resume on CLI
   2.1.260 (hush nudge memory, 2026-08-08). On Fable 5.1 a dropped reminder is a history edit that
   invalidates later thinking blocks, so this is now a correctness check. One interactive session
   read through `/usage` is the zero-cost version.
3. **Paid, ask first** — hush on Fable 5.1 (≈$50 for 36 runs, ≈$100 for 72). The audit's
   suppressor and cap warnings are Fable-5.1-specific and hush has never run there. Optionally the
   same for razor (its Opus run was ~$0.13/session; Fable ≈ $0.26 × 78 ≈ $20).
4. **Paid, ask first** — hush's Opus basis at the default `high` effort (≈$70–90) so the published
   numbers match how users run it.
5. **Free, owner's call** — one README sentence + link citing the post's SWE-bench lever (hush).
6. **Low** — flint `tune-for-opus5.md` model pin; foreman `context-fill` percentage (flag only).
7. **razor** — nothing beyond (3). The checkout is on the `Codex` branch; the released 1.5.8 is
   unchanged by anything in the post.

## Addendum, same day: the Fable 5.1 read ran

Owner's go at 11:xx. Smoke `fable-smoke-b89eb41d` (failing-suite, 1 rep, $1.30) then batch
`fable1-f56599f4`: 2 arms × 9 jobs × 2 reps = 36 runs, `--model claude-fable-5-1`, CLI default
effort, $25.76 + ~$1.00 of Sonnet judging. Records local under `benchmarks/hush/records/`;
results under `benchmarks/hush/results/fable1/`. Nothing published — a third read, not a basis.

| Meter, mean per run | no plugin | hush | note |
| --- | --- | --- | --- |
| ground truth | 18/18 | 18/18 | |
| cost | $0.756 | $0.676 | −11%; 7 of 9 jobs cheaper, release-digest +3%, plan-apply +1% |
| output tokens | 4,522 | 3,635 | −20% |
| context traffic | 235,704 | 235,088 | flat — cheap cache reads shrink the prefix tax |
| mid-turn narration words | 43 | **0** | 0 words in 18 of 18 hush runs; baseline opened "I'll look at…" 18 of 18 |
| final words | 371 | 67 | baseline up to 788 words on release-digest |
| reading ease / grade | 72.2 / 6.1 | 94.8 / 1.4 | |
| sentences over 8 words | 57.5% | 4.5% | Opus 1.11.0 basis read 21.9% for hush |
| runnable next step | 77.8% | 88.9% | hush lost this row on Opus, wins it here |
| anchored file link | 0% | 91.7% | |
| answerable q1–q3 | 100% | 100% | judge sonnet, 36 calls |
| task facts recovered | 93.3% | 83.3% | one real miss + one judge-strict read, see below |

The two hush runs behind the facts row: `release-digest r1` (76 words) gave counts — "Five
breaking items. Nine bug fixes." — and left the names in the drafted CHANGELOG.md it linked;
that is the style's own "say the findings, not that the file covers them" rule, half obeyed.
`plan-apply r2` carried every rubric fact (cli.js, `buildRows()`, `owner`/`slow`, the USAGE
string) but three of them inside its code block, which the judge did not credit. n=18 per arm,
so the row is a flag, not a finding.

**What this says about the post's Fable-specific warnings.** `prompt-audit` says numeric caps
starve reasoning and update suppressors make Fable 5.1 under-narrate. On this read: ground truth
36/36, answerable 100%, the caps held better than on Opus, and plain Fable 5.1 in Claude Code
does not under-narrate at all — it narrates more than Opus 5 did (0 of 18 baseline sessions
stayed quiet; 43 words mean, 163 max). The one cost is the facts row, and it is one run's shape.

## Addendum 2, same day: Opus 5 at the default `high` effort

Owner's go. Batch `opushigh1-3a98a3cc`: 2 arms × 9 jobs × 4 reps = 72 runs, `--model opus
--effort high` (the CLI default, set explicitly so the record says so), $38.71 + ~$2.00 of Sonnet
judging. Records local under `benchmarks/hush/records/`; results under
`benchmarks/hush/results/opushigh1/`. Same geometry as the published medium basis (rm320), so the
two read side by side. Unpublished.

| Meter, mean per run | no plugin, `high` | hush, `high` | hush on the medium basis (rm320) |
| --- | --- | --- | --- |
| ground truth | 36/36 | 36/36 | 36/36 |
| cost | $0.574 | $0.501, −13% | $0.452 vs $0.578, −22% |
| spoke at most once before the answer | 17/36 | **36/36** | 36/36 |
| said nothing at all | 1/36 | 15/36 | 30/36 |
| mid-turn blocks, total / worst run | 114 / 9 | 21 / 1 | 8 / 1 |
| mid-turn words | 53 | 4.3 | 1.5 |
| final words | 509 | 80 | 71 |
| reading ease / grade | 69.5 / 6.8 | 90.3 / 2.1 | 88.7 / 2.6 |
| sentences over 8 words | 62.6% | 10.2% | 21.9% (1.11.0 basis) |
| runnable next step | 100% | 100% | 94% |
| anchored file link | 0% | 89.4% | 89% |
| answerable q1–q3 | 97.2% | 100% | 97.2% |
| task facts recovered | 88.3% | 95.0% | 90.0% |
| tool-result chars | 22,331 | 17,529, −22% | −28% |

What `high` changes, in order of size:

1. **The opener comes back.** Every one of the 21 hush mid-turn blocks is the same 7-word line —
   "I'll start by looking at the project." / "…exploring the repository structure." — exactly
   once, at the top of the turn, then silence. The style's `Never open a turn with the word
   I'll` holds at `medium` (30/36 fully silent) and slips to 15/36 at `high`. Never a second
   block, never a transition announcement; the at-most-once claim is intact. Plain Opus 5 at
   `high` narrates more than at `medium` (53 vs 41 words, 114 blocks, worst run 9), as the effort
   page says higher effort "may explain the plan before taking action".
2. **The cost win narrows from −22% to −13%.** Baseline finals grow to 509 words at `high`;
   hush's grow to 80; the gap in output tokens is what pays, and it pays less when both sides
   spend more on thinking.
3. **Everything the reader touches holds or improves**: answerable 100%, facts 95% (hush ahead),
   runnable 100%, caps 10.2% over (better than the medium basis), reading grade 2.1.

So the published numbers are not flattered by `medium` on any reader-facing row; the two rows
that move with effort are the zero-word silence (softer, as BENCHMARKS.md already says) and the
size of the cost win. The one candidate this opens: the 7-word opener is one fixed shape at
`high`, so a wording experiment aimed at it is well-posed — but the ledger already records three
failed mechanisms against Opus's turn-opening line; do not spend on it without a new idea.

## Addendum 3: the resume re-probe — the 2026-08-08 resume tax is gone

Two probes on Fable 5.1, CLI 2.1.261, `incident-forensics` (4 prompts, so 3 `--continue`
boundaries), $3.03 total: `resume-probe-11b73ce9` (baseline + hush default) and
`resume-probe2-568691e6` (hush with `HUSH_NUDGE=max`, a doubled reminder after every one of 11
tool results — the mid-turn injection the old finding was about). Per boundary, loss =
end-of-call context minus what the next call read back from cache:

| arm | boundary 1 | boundary 2 | boundary 3 | cache written at resume |
| --- | --- | --- | --- | --- |
| no plugin | 32 | 32 | 32 | 1,079 / 788 / 762 |
| hush default | 32 | 32 | 32 | 1,378 / 342 / 492 |
| hush max nudge | 32 | 32 | 32 | 538 / 310 / 625 |

32 tokens is the resumed call's own new prompt; every arm reads the whole prior context back.
So on the current CLI, hook-injected `additionalContext` — turn-top and mid-turn alike — is
replayed byte-stably on `--continue`. The 2026-08-08 measurement (5–12k tokens re-cached per
resume for any mid-turn nudge) no longer reproduces; it was a host behaviour and the host fixed
it. Consequences:

- The post's "a reminder removed later is a history edit" warning does not apply to hush: nothing
  is removed. On Fable 5.1 no thinking block is invalidated by a resume with hush installed.
- The nudge memory's closed conclusion ("more mid-turn coverage costs more, every time, because
  the injection does not survive resume") lost its mechanism. The `max` tier's cost premium was
  mostly that tax. A fresh `max` vs default read is now a well-posed, cheap question — n=1 here
  read max at $0.83 against default $1.07 and no plugin $1.13, which is noise, not a result.
- The sentinel fix (`d434395`) held live: 0 `hush-note-*` files after three more hush sessions.

## What the post does not change

- No plugin sets effort, model, tools, `cache_control`, `max_tokens`, thinking or beta headers.
  Nothing to migrate.
- The measured contradictions between the house rules and the audit's generic rows (numeric caps,
  mid-turn silence, cadence reminders, the ladder) stand on evidence; the audit itself says such
  rules stay when the failure they prevent still reproduces, and every hush/razor basis shows it
  does on Opus 5 and Sonnet 5.
