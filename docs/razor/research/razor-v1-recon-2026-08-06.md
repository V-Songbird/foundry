# razor v1 recon — canon sync, over-engineering audit, defect verification (2026-08-06)

> **Status 2026-08-18 — HISTORICAL. `razor-consolidation-2026-08-18.md` now carries what razor
> has left to do and supersedes this document's open-work list.** Everything below is the state on
> 2026-08-06. Since then v1 shipped as 1.0.0, followed by 1.0.1, 1.1.0, 1.1.1, 1.1.2 and 1.1.3.
> §5's "Remaining to v1" is done — squash-merge, release, and re-baseline all happened. The §6
> batch that reads as awaiting approval was approved and run; its numbers are in the shipped
> README. §1's two ladder-text flags are moot: §5 of this same file records the owner freezing the
> ladder byte-identical, and it is still frozen. The §3 "discuss" list was decided in §5 —
> search-meter and session-end were deleted, the rest declined by rung 1.

**Baseline:** razor `fee5c97` (main, in sync with origin), 0.4.7-alpha released, 185/185 tests green.
Marketplace pin `20080f6` — one docs-only commit behind HEAD (re-pin happens at the next release anyway).
Untracked in razor: `../../foreman/research/PRODUCT-STRATEGY.md` (2026-07-27). Companion review: `docs/razor/research/razor-product-strategy-groundtruth-2026-07-28.md` (15 confirmed + 2 partial claims; roadmap 149–160 mapped, W1 go never given — all twelve entries still `planned`).

**Method:** 7-agent workflow (`wf_7a48b06d-904`, journal in the session's subagents dir) — 4 canon readers (one per blog), an over-engineering auditor, a defect verifier (independent of the 07-28 groundtruth), a docs-vs-code auditor. Plus inline reads of every standing razor memory, the 07-16 benchmark audit, the 07-18 goal-run and fresh-sweep reports.

---

## 1. Canon synthesis — the four articles, netted for razor

Direction of the whole set: **the risk flipped.** 4-gen models over-built (razor corrective); 5-gen models under-complete ("agentic laziness"), over-honor precise instructions, and default to industry-best-practice structure when unguided. Anthropic removed **80% of Claude Code's system prompt** for Opus 5/Fable with no measured loss.

Per-surface verdicts, all four articles pooled:

| razor surface | canon verdict | why |
| --- | --- | --- |
| Mechanical deny-once gates (dep/import/manifest) | **ENDORSED** | "Examples → interface design": shape behavior at the tool surface, not prose. The "critical areas" carve-out explicitly licenses hard constraint where mistakes are costly — dependency addition qualifies (razor's 0-ship claim is the one that always holds). |
| ~300-token SessionStart ladder | **PRESSURED, not condemned** | It is the old rules-style form ("rules → judgment") and always-on (vs progressive disclosure). BUT: the 80% trim was of the *harness* prompt — razor's own binary audit already established the slim base prompt left razor the PRIMARY YAGNI source. Cuts must be benchmark-gated, not article-gated. Compact size + `compact` re-injection matcher already mitigate the drift/budget complaints. |
| Rung 5's accreted qualifier ("even when the user names the library…") | **FLAGGED** | The laundry-list anti-pattern, and on 5-gen "too specific → followed even when a pivot fits" makes the swap rule riskier. The never-cut "anything explicitly requested" clause collides with it — conflict pairs now cost reasoning. |
| Ladder rung 5 vs gate deny messages | **DUPLICATION** | "Repetition → point of use": one authoritative statement per rule; detail belongs in the deny message at the violation, the ladder keeps the one-line principle. |
| search-meter | **TENSION** | Iterative explore (glob/grep/read loops) is the endorsed core 5-gen agent loop. Only its narrow post-edit re-verification scope keeps it defensible; any broadening fights trained behavior. |
| file-meter | mild tension | Numeric per-turn ceiling is the hardcoded-threshold style the "right altitude" section rejects; also, first-party workflow patterns now legitimately write fresh harness JS files. Deny-once + generous default bounds the risk. |
| Stop-hook ledger | mild flag | Self-preferential bias: the session's own model judges its own balloon. Cheap as-is; do NOT add a verifier panel (contradicts razor's own cost doctrine + "earn the coordination cost"). |
| Subagent re-injection, agent-type gated | **ENDORSED** | Isolated contexts genuinely don't inherit the ladder; gating keeps explore-class agents free of search-restraint clauses. |
| Update process | **PRESCRIBED** | "Start minimal with the best model, add only from observed failures" → the v1 evidence step is a re-baseline on current models with and without razor, keeping only what measured failures justify. Matches the 0.3.7→0.3.8 validate-then-revert precedent. |

Quotable for positioning: "do the simplest thing that works remains the best advice" and "parallelism and specialization have to earn their coordination cost" are now Anthropic's own words — razor's thesis, first-party.

## 2. Defect verification (independent re-run of the strategy doc's ten claims)

Agrees with the 07-28 groundtruth on 9/10; refines one.

- **D1 CONFIRMED** — dep-guard denies an already-declared dependency (`npm install lodash` with lodash in package.json) while listing it as installed in the same sentence. Bash-path only; import/manifest guards do suppress declared names.
- **D2 CONFIRMED** — "Already installed (N)" is a *declared* list (manifest keys), never node_modules/site-packages. Reproduced with no node_modules present.
- **D3 CONFIRMED** — `depKey` keys raw tokens: `lodash` vs `lodash@4.17.21` are two decisions (deny fires twice — breaks the one-nudge contract) and the cross-gate ledger records the versioned token the import/manifest guards can never match.
- **D4 CONFIRMED** — Python src-layout absolute imports of the project's own package deny as new deps (no local-module check; JS relative imports are exempt, Python has no marker).
- **D5 PARTIAL** (refines groundtruth) — JS comments/strings extract as imports (no stripping); Python line comments are safe (anchored regex). Docstring-leading import lines still match.
- **D6 CONFIRMED + regex bug** — `import type` strip uses `[^;]*` which matches newlines: in semicolon-less code it swallows every following real import (reproduced: `import type …\nimport axios` → no imports at all). Affects gate AND audit.
- **D7 CONFIRMED** — ledger diffs working tree vs baseSha; pre-existing dirty work attributed to the session; untracked is a count so deletions+creations cancel.
- **D8 CONFIRMED** — audit blind to .vue/.svelte/.astro/.mdx; no dist-to-import metadata (PIL/bs4/cv2/sklearn all miss); KNOWN_LIMITS doesn't name either class.
- **D9 CONFIRMED, worse than remembered** — see §4.
- **D10 CONFIRMED** — "enforced", "flawless", supply-chain juxtaposition, "No dials." vs 7 env vars + 6 userConfig options.

## 3. Over-engineering audit (razor judged by its own ladder)

**Dead code (delete):**
- `benchmarks/runner/run.js` `task.open`/`task.fixture` branches + `surgical` computation + selftest skip — no shipped task sets either flag.
- `benchmarks/runner/metrics.js` `readFixtureSet` (reads a file nothing writes) + `chatCodeLoc` (only caller is the dead branch).
- `benchmarks/runner/report.js` `mdToHtml` (~30 lines) — third output format nothing consumes.
- `razor-lib.js` dead exports: `stateDir`, `statePath`, `currentTurnKey`, re-exported `safeWriteFileSync`.
- `tests/injection.test.js` "DEFAULT_SKIP stays lean" length-only assertion (tests nothing behavioral).

**Discuss (cut candidates, judgment calls):**
- **search-meter** — read-side scope, 0 fires in 96 validation cells, entry 157 + canon both against it. Delete vs default-off vs keep.
- **Transcript-tail turn fallback** (~55 lines + 78-line cross-plugin conformance test + helpers) — only serves harness versions without `prompt_id` (present since 2.1.196). If the supported floor always sends it, this is back-compat scaffolding.
- **session-end.js** — redundant with the 7-day GC sweep AND behaviorally harmful: erases the `/razor off` toggle so a `--resume` of the same session silently re-arms razor. Deleting the hook fixes a real defect.
- **Exotic evidence readers** (cargo/go/composer/gem/dotnet, ~100 lines + ~70 test lines) — enrich deny text for ecosystems nothing exercises; the gate works without them via the generic fallback.
- **subagent-start.js DEFAULT_SKIP** hardcodes a sibling plugin's private agent names; `RAZOR_AGENT_INJECT` is an override-of-an-override only its own test exercises.
- **mode-toggle.js** accepts `@razor`/`$razor` sigils documented nowhere.
- **Ledger knobs** RAZOR_LEDGER_LOC/FILES: env-only, undocumented in README/userConfig, and their CLAUDE_PLUGIN_OPTION_ resolution half can never exist.

**Merge/simplify:**
- `denyReason` written three times ~90% identical (dep/import/manifest guards); LIST_CAP declared thrice.
- import-guard does two independent 12-level up-tree walks per gated Write (findManifest + installedDeps re-walk).

## 4. Docs-vs-code audit — the burning v1 blocker

The README benchmark section is **not reproducible from what ships**, beyond what memory recorded:

1. Table rows "Parse a `.toml` config file", "Tenacity's the move", "Read a user row from postgres" (both model tables) name tasks that **do not exist** in `benchmarks/runner/tasks.js` — the corpus is all-Node, TOML was explicitly replaced by dep-querystring (comment says so), retry bait is p-retry, no postgres task at all. The numbers came from the *private* bench.py suite whose task set differs from the shipped public runner.
2. `bench-offcut.svg` hero is baked from the stale corpus (bars "parse a .toml", "a postgres client"; footer + README alt text "a quarter of it on the TOML-parsing job").
3. The four-arm table (ponytail, prompt-only) can't be reproduced by the shipped two-arm harness (`--rival-dir` accepts ONE rival; "We don't ship or name any rival"). README:210 "Reproduce it yourself" points at benchmarks/.
4. "Every job, every setup" — 13 shipped tasks, 10 rows shown, 2 shown rows don't ship, 5 shipped tasks unshown.
5. README:84 "**never** reported as a clean finding" — the warm rewrite hardened "not" to "never"; the script's own KNOWN_LIMITS disclaims exactly that (peer-satisfied deps land in Unused with no warning).
6. Ledger described as "end-of-session" in README (2×) + plugin.json title; it's a Stop-hook, fires once per session possibly mid-session; userConfig description omits the new-files trigger.
7. benchmarks/README:73 test command is monorepo-relative (`razor/tests/`) — fails in the standalone public clone, the only audience that file has.
8. Smaller: installed-list claim unconditional (fallback exists), "razor asks about them when you enable it" false for RAZOR_DISABLE, SKILL.md "the ecosystems razor's gates already cover" equates audit scope with the 7-manager command gate, undocumented RAZOR_AGENT_SKIP/INJECT + ledger knobs.

Only substantive fact change from the warm rewrite: the "never reported" hardening (§5 above). The benchmark drift predates it.

## 5. v1 decisions and execution (2026-08-06, user-confirmed)

User picked, via AskUserQuestion: **truth-first v1**; **ladder frozen** + re-baseline before any wording change; **search meter deleted**; **batch spec proposed after code work**.

Executed on razor branch `v1` (6 commits over `fee5c97`, 29 files, +292/−524, suite 177/177):

| commit | what |
| --- | --- |
| `ac1b876` | search-meter + session-end deleted (session-end was erasing `/razor off` on resume) |
| `9e81558` | declared deps never checkpoint; version-spec-normalized identity across all 3 gates + cross-gate ledger; one shared `evidenceReason` builder; "Already declared" wording |
| `11b6d0c` | comment stripping; `[^;\n]` type-strip fix; `isLocalPyModule` (flat+src); `KNOWN_IMPORT_NAMES` aliases |
| `350d3ab` | ledger subtracts the session-start dirty baseline (insertions/deletions/added/untracked) |
| `fa9a8d5` | dead code: runner open/fixture branches, `chatCodeLoc`, `readFixtureSet`, `mdToHtml`, dead lib exports, `@`/`$` toggle sigils, count-only skip-list test |
| `8d6c69b` | claims truth pass (checkpoints not enforcement, No-dials dropped, audit blind spots named, 1.0.0 CHANGELOG entry) |

Declined by razor's own rung 1: single-manifest-walk restructure in import-guard (elegance, not need — the walk-disagreement defect is rare-monorepo-only and the fix risks the suppressing direction); exotic-ecosystem evidence-reader deletion (working, tested, harmless); transcript-tail turn fallback deletion (still serves prompt_id-less harnesses + byte-identical hush conformance contract); forge skip-list decoupling (shipped 0.4.0 feature).

Roadmap: 157 awaiting_acceptance; 149/151/152/155/159 in_progress with shipped-scope notes; 150/153/154/156/158/160 deferred post-v1. manifest-curator: VALID, 0 errors (pin lag intentional until release).

**Adversarial review (13-agent workflow `wf_95a71edd-fca`, 3 lenses → per-finding refuters, all repro-verified):** 6 confirmed, 3 refuted. Confirmed and FIXED in `8b7af2d` (suite 183/183): (1) quoted install tokens defeated packageName/declared-suppression — quotes now stripped in packageArgs; (2) ledger charged pre-session untracked files once staged/committed — baseline now stores untracked NAMES and diffStats excludes them via numstat; (3) pip hyphen/underscore = two ledger identities — `ledgerName` folds `-`→`_` across all three gates; (4) `export type … from` denied while `import type` passed — strip covers both; (5) block-comment strip started at `/*` inside glob strings, silently bypassing the gate between two globs — strip now anchors to line-start openers; (6) `//` in URL specifiers truncated mid-string and the deny embedded following source lines — line-comment strip requires leading whitespace and specs are `\n`-bounded. Refuted (correctly, no action): stale-state key-shape compat across plugin upgrade (7-day cache, extra soft nudge accepted); inline `import { type X }` changelog phrasing (that form CAN ship under verbatimModuleSyntax — suppressing it would be wrong); TL;DR/alt-text benchmark numbers (pre-existing, regenerate with the batch).

Remaining to v1: user go on squash-merge + 1.0.0 release; the re-baseline batch (regenerates the README benchmark section from the shipped corpus, killing the drift rows).

## 6. Proposed re-baseline batch (needs explicit user go — ask-before-batches)

**Instrument:** the SHIPPED public harness (`benchmarks/razor/runner/run.js --full`), 13 tasks, run under the v1 tree. Models already wired: haiku=`claude-haiku-4-5-20251001`, sonnet=`claude-sonnet-5`.

**Option A (recommended): public 2-arm basis.** baseline + razor × 13 tasks × (Haiku n=8 + Sonnet-5 n=4) = **312 cells**. Everything the README publishes becomes reproducible by a reader with the shipped harness — fixes the four-setup reproducibility contradiction by design. Est. **~$20–30** (the 2026-07-18 480-cell 4-arm batch was $34.27 on Haiku 4.5 + Sonnet 4.5; Sonnet 5 pricing is the unknown).

**Option B: A + one private rival arm** (`--rival-dir` ponytail clone) for the moat claim, kept to private notes per house rules. 468 cells, est. **~$30–45**.

Deliverables either way: README tables/hero/alt-text regenerated from this run only (drift rows die); run records retained as the frozen basis (entry 159); canon-prescribed re-baseline read — which rungs/gates current models still need — logged privately as the input for any post-v1 ladder experiment. Per [[benchmark-no-auto-publish]], numbers reach the README only with the release go.
