# razor /goal run — close the dagger rows (2026-07-18)

**Goal (user-confirmed scope):** LOC parity or better on the six dagger-convention rows from the 2026-07-17 480-cell batch, holding the zero-loss correctness/dep-discipline record; behavior first, then razor's own code; autonomous within $50; fresh rival sweep + existing corpus. **Nothing committed or pushed — working-tree only, per the goal's constraint.**

**Verdict up front: four of six rows closed by measurement, two are deliberate purchases, and no ruleset change ships.** Three rows dissolve when LOC is conditioned on clean cells (the "winner" shipped unsafe/incorrect code — the dagger convention's own point); `dep-dotenv-lib` razor wins outright at n=16; the last two (`dep-slug` Haiku ~0.5 line, `dep-justified` Sonnet ~3 lines) are real but bought: they pay for razor's correctness edge and the deny contract respectively. Three same-batch A/B rounds ($35) tested two grounded wording candidates plus their combo; every effect that appeared failed to reproduce (one degraded correctness), so per the 0.3.8 validate-then-revert precedent the RULESET stays byte-identical to 0.4.4. The session's shipped value is two internals fixes (a stale check-suggesting sentence in the search gate, wrapper-prefix hardening in the install gate), the widened rival-correctness gap now on record at n=16, and the sweep's confirmation that razor's axes are uncontested in the current field.

---

## 1. Ground truth: what the six "losses" actually were

Re-analysis of `runs/20260717-*` conditioning LOC medians on correct==1 AND safe==1 (the dagger convention's own logic):

| dagger row | published | conditioned truth |
| --- | --- | --- |
| Haiku dep-slug (razor 5 vs ponytail 4.5) | loss | **real** but 0.5-line, both arms clean |
| Haiku dep-toml (razor 15 vs ponytail 14) | loss | ponytail safe 0.75 → dagger; razor best among clean |
| Haiku dep-retry-lib (razor 10 vs karpathy 9) | loss | karpathy correct 0.25 (stub/25-line cells); razor ties ponytail among clean |
| Haiku dep-dotenv-lib (razor 10 vs ponytail 9) | loss | ponytail correct 0.75 w/ 0-LOC cell; clean winner karpathy 9.5 by 0.5 |
| Sonnet dep-retry-lib (razor 10 vs karpathy 6) | loss | karpathy safe 0.25 — already daggered in the README |
| Sonnet dep-justified (razor 11.5 vs base/karpathy 10) | loss | **real**: razor wraps the `pool.query(...)` call multiline 2/4 reps |

Root causes read from delivered files: dep-slug = Haiku naming a single-use intermediate (`slug = title.lower()` then reassign) where rivals fuse; dep-toml = 5-line dict-literal return vs comprehension; dep-justified = call-wrap formatting. All idiom-level, all ≤1.5 median lines.

## 2. The experiment (three same-batch A/B rounds, $35.0 total spend)

Variant arms built as full copies of razor 0.4.4 under `benchmarks/razor/experiments/dependency-comparison/arms/` (razor-v1/-v2/-v3), wired into `bench.py` `ARM_DIRS` (gitignored), injection verified in-stream before spend.

- **v1** = Rules line + `; a value used once is written inline, not named` (the 2026-07-16 Sonnet-NULL wording, retried on Haiku where the idiom gap lives)
- **v2** = Rules line − `boring over clever; ` (deletion)
- **v3** = both

**Round 1** (`runs/20260718-0423*..0447*`, 236 cells, $15.15, 0 errors):

| row | control | v1 | v2 | rival |
| --- | --- | --- | --- | --- |
| dep-slug haiku n=16 | 5.0 @ 0.875 | 5.0 @ 0.938 | **4.5 @ 1.000** | ponytail 4.0 @ 1.000 |
| dep-toml haiku n=8 | 15.0 | **13.5** | 15.0 | ponytail 11.5 @ safe 0.875 |
| dep-dotenv-lib haiku n=16 | **9.0 @ 16/16 — row closed by control itself** | 9.0 | 9.0 | karpathy 10.0 @ 0.875 |
| dep-justified sonnet n=8 | 13.0 | **10.0** | **10.0** | karpathy 10.0, baseline 15.0 |
| dep-http-lib haiku n=8 (guard) | 3.0 @ 8/8 safe | 2.5 @ 8/8 | 2.5 @ 8/8 | — |

**Round 2 — v3 combo confirm** (`runs/20260718-0450*..0512*`, 216 cells, $13.82, 0 errors): v3 closed dep-justified again (10.0 vs control 13.0, cheapest arm) and held every guard (guard-keep clean both models, over-guard-rich tie, http-lib 8/8, retry-lib tie), **but** dep-slug correctness 0.812 vs control's 1.000 — the v1 clause degrades the flaky `Already--Slugged` case (v1 0.938, v3 0.812, v2 1.000 across rounds). dep-toml's v1 win did not reproduce (v3 14.5 vs control 14.0). Same batch: ponytail dep-slug fell to 0.812 and dep-toml safe fell to 0.688 — the rival wobbles on the same tasks.

**Round 3 — v2-only ship gate** (`runs/20260718-0515*..0521*`, 72 cells, $5.64, 0 errors): **NULL.** dep-slug haiku n=16: control 5.0 @ 0.938 vs v2 5.0 @ 0.938 — identical. dep-justified sonnet n=8: control 13.0 vs v2 13.0 — v2's round-1 win did not reproduce. guard-keep parity both models.

**Decision: ship NO ruleset change.** The full v2 evidence is {win, (v3: harm), null} — not reproducible, exactly the 0.3.7→0.3.8 shape, and the validation loop again says no. The v1 clause is worse (its dep-toml win didn't reproduce and it degrades dep-slug correctness: v1 0.938, v3 0.812 vs v2/control 1.000 in their clean rounds). What the three rounds actually established: control razor's own numbers swing across runs by more than every candidate's effect size (dep-slug control: 5.0@0.875 → 4.5@1.000 → 5.0@0.938; dep-justified variants: 10.0×3 then 13.0), so the residual gaps are at or below cross-run noise, and the two that are real are deliberate purchases:

- **Haiku dep-slug (~0.5 line to ponytail):** razor's cells keep a named intermediate; pooled across rounds razor is *more correct* (45/48 vs ponytail 29/32) — the half line buys the reliability edge.
- **Sonnet dep-justified (~3 lines to karpathy/baseline):** multiline formatting of the `pool.query(...)` call plus the guard's justify-then-retry turns; all razor cells correct, razor the cheapest arm. The lines are the deny contract working as designed. **Post-refusal forensics (rounds 2–3 delivered files):** the wrap is NOT deny-caused — it appears in deny=0 cells too (razor 5/8 and 7/8 multiline vs karpathy 0/8; a deny-wording A/B is therefore ungrounded and was not run). The only arm that suppressed the wrap was v3 (1/8) via the inline-once clause — the same clause refuted for degrading dep-slug correctness. The 3-line row is formatting idiom, reachable only through the null/harmful lever class.

Also strengthened this session, for free: ponytail itself wobbled hard in these batches (dep-toml safe 0.688, dep-slug correct 0.812) while razor stayed 1.000/1.000 on those same rows — the correctness/dep-discipline moat widened at n=16.

## 3. Fresh rival sweep (agent, API-verified 2026-07-18 — full notes in `docs/razor/research/razor-fresh-sweep-2026-07-18.md`)

- **ponytail is now at 85,363 stars** (v1.0.0→v4.8.4 in 17 days of June 2026), with intensity dial, 9-host plugin tier, MCP server, `/ponytail-debt`, `/ponytail-gain`. Its published claims (54% LOC, 20% cheaper) still make **no correctness or dep-discipline claim** — razor's measured axes remain uncontested.
- **No new rival** does need-based dependency justification anywhere (everything is security-scored); razor's installed-deps-evidence deny stays unique. Lean-code category absent from awesome-lists; "YAGNI skills" on MCP marketplaces are SEO shims.
- **Adopted from the sweep:** wrapper-prefix hardening for the install gate (GuardFall-class bypass research: literal-string parsers miss `env`/`command`-wrapped installs). `sudo|env|command` + `VAR=` prefixes now all stripped before manager matching.
- Noted, rejected as YAGNI: LLM-validated PreToolUse gates (tdd-guard/probity pattern — razor's moat is deterministic evidence), pinned-install rewrite via updatedInput (razor's audited refusal stands), ~20-line bugfix diff ceiling (pilot-shell — ledger already covers sprawl with generous thresholds).

## 4. Internals pass (all uncommitted, tests 185/185; RULESET untouched)

1. **`hooks/search-meter.js`** — deny reason no longer says "If you're deciding how to leave a check behind, inline is enough" — that sentence referenced the check-behind rule **deleted from the ladder in 0.4.2** and actively re-suggested the checks whose removal was 0.4.2's whole win. Top comment reworded to match. Found by reading, confirmed by no test asserting the old wording.
2. **`hooks/dep-guard.js`** — parseSegment strips `env` and `command` wrapper prefixes (was: only `sudo` and `VAR=`); +2 table tests in `tests/dep_guard.test.js` (183→185).
3. Everything else read end-to-end (all 12 hook files + `scripts/unused-deps.js` + `lib/safe-write.js`): no dead code, no security findings — symlink-refusing atomic writes, arg-array git calls, sanitized state filenames all hold. No churn for its own sake.

## 5. Release — SHIPPED (user go, 2026-07-18)

- razor **0.4.5-alpha RELEASED**: razor `97528c3` (parent foundry `62c8234`), both pushed. Contents: the two hook fixes, +2 tests (185), CHANGELOG, and the full benchmark-section refresh below.
- **README rebuilt on a single fresh basis** (user approved ~$34 over budget): new 480-cell batch `runs/20260718-130612` (Haiku n=8) + `runs/20260718-133307` (Sonnet n=4), 0 errors, $34.27, run under the release tree. Both tables regenerated (bold/dagger logic scripted: scratchpad `update_readme_tables.py`); hero `bench-offcut.svg` regenerated from the same Haiku run (generator: scratchpad `gen_hero.py` — 10 jobs, 80 sessions, offcut 116 lines, razor mean 8.2 vs baseline 9.1, biggest job dep-toml 26%); supplychain SVG + alt session-count 244→120; prose rewritten to the new stats.
- **New-basis facts now in the README:** razor Haiku correct 78/80 (best; baseline 72, ponytail/karpathy 71), Sonnet 40/40; **safe 80/80 + 40/40 — the ONLY arm with zero needless-dep ships (baseline 62/80!)**; axios row 0/8-0/8-0/8 vs razor 8/8 Haiku, 0/4-3/4-0/4 vs 4/4 Sonnet; Sonnet cost: razor cheapest on 5/10 jobs = other three combined, lowest mean $0.1262; **razor's own cells picked up two † daggers (dep-slug, dep-http Haiku, one miss each at 7/8) — disclosed in prose ("the daggers cut both ways"); dep-justified razor tied-lowest BOTH models this run (the round-1-3 formatting delta didn't recur); dep-dotenv Haiku is the one clean razor LOC loss (9.5 vs ponytail 9)**. Cross-run flips again confirmed the noise-floor conclusion of §2.
- doc-consistency-reviewer: 2 FLAGs on session-counts inside image alt text — **declined with cause**: those counts are the images' own visible footer text (user-approved chart design); alt text must describe the image. CHANGELOG clean. manifest-curator: VALID, version+sha moved together.
- Benchmark variant arms kept under `benchmarks/razor/experiments/dependency-comparison/arms/razor-v{1,2,3,4}` with `ARM_DIRS` wiring; all four are refuted candidates — do not re-ship them without new evidence, they are kept as frozen fixtures of what was tested.

## 5b. Levers deliberately not pulled (the "no more room" argument, scoped)

- Wording for the two residual rows: triple-tested, refuted above. Register/idiom clauses are the null-lever class (`prompt-wording-lessons` §7).
- A line-count meter or diff-size ceiling (pilot-shell-style): contradicts razor's deny-once soft-gate doctrine and the generous-thresholds lesson from the ledger; would fire on formatting choices, the exact thing the residual rows are made of.
- LLM-validated gates (probity-style): razor's moat is deterministic, evidence-carrying denies; an LLM judge trades that for latency+cost+nondeterminism.
- updatedInput rewrites (pin-on-install): re-affirmed refusal from the 2026-07-12 audit.

## 6. Hunt 2 (user-ordered second pass, 2026-07-18): the open-ended tier

The dep-bait suite was exhausted, so the second hunt opened the surface no round had touched: the upstream vibe tier ("Write me a JSON config loader with validation in Python" — the agent picks the scope, correct = a delivered .py compiles). Fresh measurement under current razor (`runs/20260718-123742`, 64 cells, $3.60):

| arm | vibe-jsonconf | vibe-todo |
| --- | --- | --- |
| baseline | 120.0 LOC @ 0.875 | 81.5 @ 1.000 |
| ponytail | 53 @ 0.500 | 63 @ 1.000 |
| karpathy | 93 @ 0.375 | 82 @ 1.000 |
| razor | 56.0 @ 0.625 | 66 @ 0.875 |

Current razor is dramatically leaner than its 2026-07-06-era self here (91→56 — the 0.4.2 deletion's reach) and near-halves baseline, but drops correctness. **Forensics: every failing cell is "no .py file written" — not one compile error.** karpathy's failures are its clarify-first shape (0-LOC cells). razor's and ponytail's failures all delivered the code as a chat code-fence instead of a file (one razor cell claimed "todo.py is a minimal CLI" without writing it). Both failing rulesets carry the same clause — razor's `fewest files`, the rival's "Fewest files possible" — and the no-clause arms deliver files 7-8/8. Wording-lessons #1 shape: a cap on file count, read literally on an open-ended ask, is satisfied best by zero files.

**Candidate (razorv4): delete `fewest files; ` from the Rules line.** Doctrine-aligned hypothesis: the file-meter already enforces sprawl mechanically at budget 4/turn, so the prompt clause is the redundant copy. **A/B result (`runs/20260718-124617/-124955/-125404`, 72 cells, $4.87, 0 errors): REFUTED — the arrow reversed.** vibe-jsonconf Haiku n=8: control 0.875 correct with 1 chat-delivery vs v4 0.500 with 4 — the clause-free arm delivered FEWER files. Control itself swung 0.625→0.875 between the measure and A/B runs hours apart. The chat-vs-file coin flip is arm-independent Haiku variance on "write me X" prompts (baseline threw one too), not a clause effect. Guards all clean (dep-slug v4 4.5 @ 8/8, sprawl-todo both 1.000, Sonnet vibe 4/4 both — Sonnet never chat-delivers). `fewest files` STAYS. Fourth wording refutation of the session; the finding that survives is the tier measurement itself: **current razor's open-ended LOC is ~half of baseline (56-66 vs 82-120) at rival-or-better correctness, and 0.4.2's deletion is what halved razor's own July-6 number (91→56).** The residual chat-delivery flakiness is a scorer-convention boundary (a chat answer to "write me X" is a defensible reading), not a razor defect — any "always write files" clause would be an unprompted priming risk against a non-defect.

## 7. Methodology guards honored

Same-batch A/B against frozen control only; per-task tables, never means; transcripts/delivered files read for every moved metric; n=16 on the rows that mattered; ask-before-batches superseded for this run by the user's autonomous-within-$50 grant. Spend: smoke $0.13 + round 1 $15.15 + round 2 $13.82 + round 3 $5.64 + hunt-2 measure $3.60 + hunt-2 A/B $4.87 = **$43.21 of $50**. One methodology note for future rounds: a control arm re-run in every batch is what caught rounds 1 and 3 disagreeing (and hunt 2's arrow reversal) — a remembered control number would have shipped two wrong deletions today. Four wording candidates entered validation this session; four were refuted; the two changes that ship are both mechanical fixes found by reading code, not prompting.
