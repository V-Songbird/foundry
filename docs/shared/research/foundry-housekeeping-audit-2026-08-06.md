# Foundry housekeeping audit — 2026-08-06

**Scope:** repo/plugin structure, docs, ignore rules, git state, manifests, public docs. House-maintenance only — no plugin functionality was touched or is proposed to change.
**Method:** full-tree and git-state walk of the parent repo and the three submodules, plus two local audit agents (`manifest-curator`, `doc-consistency-reviewer`) whose reports are folded in at §6–§7.
**Status (2026-08-11):** §3 D1 and its §9 execution row are SUPERSEDED by docs/shared/adr/0004-benchmark-data-stays-local.md — no benchmark run data is committed anywhere; benchmarks/razor/records/ was removed in razor b4e5fc0, foreman's in foreman de7a937. Everything else in this report stands.

## Verdict

The repo is fundamentally healthy. The released state is fully consistent: marketplace pins = parent gitlinks = each plugin's `origin/main` (foreman `1742d2a` / 1.0.1, hush `df00c59` / 1.1.1, razor `ed4004f` / 1.0.0), the commit gates are wired in all four repos, CI re-verifies the pins, no blocklisted rival name appears in any tracked file outside a README, and no tracked file references the removed plugins (hestia, kairoi, rulesense, scriptorium, virgil).

What the audit found: **6 mechanical fixes**, **4 owner decisions**, **2 additions** that establish order, and one piece of context that explains the current `git status`.

---

## 1. Context: the ` M foreman / M hush / M razor` flags are unreleased work, not damage

Every submodule working tree is clean; the flags are new commits sitting ahead of the recorded pointers:

| Repo | Ahead of origin | Commits |
| --- | --- | --- |
| parent | 2 | `38e004b` cap-conformance meter (benchmarks/hush), `81b97e1` .gitignore scoping |
| foreman | 1 | `6359db2` poster hero + paper trail redraw |
| hush | 2 | `8eeaff7` caps carve-out close, `4119f9f` poster hero + cost chart |
| razor | 1 | `2b2cc52` poster hero + supply-chain card |

All three plugin commits already carry CHANGELOG entries. This is the poster-hero wave (ADR 0001–0003) staged for the next release. To ship it: bump versions in `.claude-plugin/marketplace.json` (foreman 1.0.2, hush 1.1.2, razor 1.0.1 — hush's `8eeaff7` changes style behavior, so it is more than a doc release), re-pin the three `source.sha` values, push the submodules first, then the parent. The pre-commit gate and `validate-marketplace.yml` will hold the pins honest. Until that release, the ` M` flags are the expected steady state.

Verified live: the hook scripts' own tests pass 54/54; `verify-marketplace-pins.js` run against the working tree correctly reports all three pointers drifted (that strict check runs only in CI, where checkout follows the recorded gitlinks and passes); the local pre-commit gate fires only on a *staged* pointer bump, so ordinary parent commits are not blocked meanwhile.

## 2. Fix now — mechanical, zero functionality risk

**F1 — `foreman/docs/foreman/tasks/097.md` is committed in the wrong repo.**
It is a foundry-internal decision doc (task 097, decision-doc resolution semantics) tracked — and published in foreman 1.0.1 — inside the plugin, against foreman's own `/docs/*` ignore. Parent `ROADMAP.jsonl` cites `docs/foreman/097`, which does not exist at the parent (098–161 all resolve; 097 is the one broken reference).
*Fix:* copy the file to parent `docs/foreman/tasks/097.md` (local, ignored — heals the roadmap reference immediately), then in foreman `git rm docs/foreman/tasks/097.md` + commit, riding along in the next release.

**F2 — root `.gitignore` comment is stale, two lines are redundant.**
Lines 18–19 claim the Codex foreman/razor port dossiers are "release-trackable", but `/docs/*` ignores everything under docs/ and nothing there is tracked. Lines 4–6 (`plugins/razor-codex/`, `plugins/foreman-codex/`) are subsumed by the later `/plugins/`.
*Fix:* reword the comment to what is true ("everything under /docs/ stays local; un-ignore docs/codex/ when the ports actually ship") and delete the two redundant plugin lines.

**F3 — `scripts/plugin-lib/safe-write.js` is a dead tracked file.**
Zero references in any tracked file across all four repos. razor ships its own living copy in its hooks; the only other copies are frozen arm snapshots inside gitignored `.scratch/`.
*Fix:* delete it (with its directory if that empties `plugin-lib/`).

**F4 — `docs/comparison.md` is filed in the wrong place.**
It is research (Hush Aligned vs stock hush, verbatim final messages, ~2026-07-19) sitting at the docs/ root.
*Fix:* move to `docs/hush/research/hush-aligned-comparison-2026-07-19.md`. Keep it — it backs the parked Hush Aligned decision.

**F5 — the private blocklist misses two mined rivals.**
`docs/shared/research/reference-names.txt` lacks `codekeel` and `praxis-workflow-os`, both mined in 2026-07 reports. No tracked file uses either today, but the commit gate cannot stop a future slip it has never heard of.
*Fix:* add the two lines. (`praxis` alone is a real English word — list only the full repo name to avoid false blocks.)

**F6 — two research reports read as current but are superseded.**
`../../hush/research/hush-product-contract-and-remediation-2026-07-27.md` (header: "Product proposal") was superseded by the 07-28 groundtruth report and the 08-01 v1 ship plan. `../../razor/research/razor-product-strategy-2026-07-27.md` (header: "Working product strategy") was superseded by its 07-28 groundtruth twin.
*Fix:* one `**Status:** superseded by <file>` line at the top of each. No deletions — they are the evidence trail.

## 3. Owner decisions — flagged, not acted on

**D1 — razor's README numbers have no committed records behind them.**
ADR 0001/0002 require poster and graphic numbers to come from *committed* benchmark records. foreman commits `benchmarks/records/R-*.json` in its own repo; hush's records are committed in the foundry repo and its README links there. razor tracks only the runner — `runs/` is ignored and runs land in the system temp dir, so the 468-cell data behind razor 1.0.0's README exists only in local notes.
*Options:* (a) commit razor's run records under `benchmarks/razor/records/` at the next release, foreman-style — recommended, and it would make foreman's pattern (records in-plugin, heavy harness in parent) the standard all three follow; or (b) record a small ADR amendment accepting README-cited numbers without in-repo records for razor.
Related detail, same decision: the three READMEs also cite differently — hush links its records cross-repo (works), razor links a runner with no records beside it, and foreman's README cites nothing at all (its records back the hero SVG and a validator test, findable only by browsing). Whatever record home wins, one "reproduce it yourself" citation style should ship in all three READMEs. (Checked in passing: `TRIALS.md` is a live product surface — trial-log scripts, hooks, and tests reference it — not an orphan doc.)

**D2 — the ADRs are permanent policy that exists on one machine.**
`docs/adr/0001–0003` are marked "permanent house rule" but live under the ignored `/docs/*` — no remote, no backup. All three scanned clean of blocklisted names, so tracking them is safe.
*Options considered:* add `!/docs/adr/` and commit them; or keep them local. **Decided 2026-08-06: the owner ruled the ADRs stay local, always.** Not tracked; the .gitignore comment now records the intent. An off-machine backup of `/docs/` remains a good idea, since git provides none for ignored files.

**D3 — `renames` map is incomplete (spec-confirmed, see §6).**
`marketplace.json` retires forge, verity, jetbrains-router as `null`, but the also-removed kairoi, rulesense, and scriptorium are absent. Per the fetched marketplace spec, a plugin removed without a `renames → null` entry leaves users who still have it enabled with a raw `plugin-not-found` error instead of the clean "removed from marketplace" notice. Recommended: add `"kairoi": null`, `"rulesense": null`, `"scriptorium": null`; confirm whether hestia was ever a marketplace entry before adding a fourth.

**D4 — `benchmarks/hush` is double-nested.**
The harness moved from the hush repo keeping its old wrapper: content sits at `benchmarks/hush/benchmarks/*` with `benchmarks/hush/tests/*` beside it. Flattening `benchmarks/hush/benchmarks/*` up one level is a cosmetic tidy needing path fixes plus a green test run; the hush README's public deep link (`…/tree/main/benchmarks/hush`) keeps working either way. Fine to leave; do it opportunistically.

## 4. Add — the order-establishing pieces

**A1 — `docs/shared/research/research-index.md` index.** 40 reports, no map. One line each — date, subject, status from a three-word vocabulary: *active contract* / *historical* / *superseded by X*. The active-contract set to mark explicitly: `hush-v1-ship-plan-2026-08-01`, `hush-groundtruth-and-delivery-strategy-2026-07-28`, `prompt-wording-lessons-2026-07-15`, `razor-v1-recon-2026-08-06`, `hush-context-engineering-recon-2026-08-06`. Everything else is historical record; nothing needs deleting.

**A2 — `.scratch/` top-level tidy.** 71 loose `*.runlog.txt` probe logs sit beside the harnesses. Move them to `benchmarks/hush/experiments/voice-comparison/runlogs/`. Private and ignored — zero risk, purely for findability.

## 5. Verified healthy — no action

- Commit gates wired in all four repos (`core.hooksPath → scripts/git-hooks`); CI checks out submodules, re-verifies pins, runs the hook scripts' own tests.
- Community files (README, CHANGELOG, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY) present in the root and all three plugins; owner identity consistent everywhere (Victor Villegas / victor.villegas@tuta.com).
- Blocklist compliance: zero hits in tracked files outside READMEs, all four repos.
- The poster wave matches ADR 0001's stated consequences (bench-narration and bench-offcut retired, heroes added, detailed charts kept below the fold).
- Decision docs `docs/foreman/098–161`: every ROADMAP reference resolves (once F1 lands, 097 does too).
- Local-by-design and correctly ignored: `ROADMAP.jsonl`, `.foreman/`, `.agents/`, `.codex/`, `/plugins/` (parked Codex ports), `.scratch/`, `.claude/agents|skills` (local agents/skills), research docs.
- `docs/codex/` dossiers are the parked port specs for the deferred entries — keep as-is.
- Root README's repo-layout and development sections match reality (hooksPath setup, the two dev hooks, version ownership in marketplace.json).

## 6. Manifest audit (manifest-curator agent)

Verdict: **VALID_WITH_WARNINGS** — 0 errors, 1 real warning, the rest informational.

- **WARNING — `renames` completeness** (drives D3): kairoi, rulesense, scriptorium were removed from this marketplace but have no `null` entry, so a user who still has one enabled gets `plugin-not-found` instead of the clean removal notice. hestia is confirm-first — no hard evidence it was ever a marketplace entry.
- **INFO — `keywords` and `tags` are byte-identical** in all three plugin entries (and the plugin.json files declare neither). Redundant but legal; optional dedup.
- Clean on everything else: schema compliance including `$schema`/`renames` as documented fields; `foundry` clear of the fetched reserved-name list; owner block valid; all three descriptions rated GOOD; strict-mode declarations conflict-free; version-only-in-marketplace confirmed as sound under the spec (plugin.json never sets a competing value, so no masking risk); all three SHA pins well-formed and internally consistent with the release model; no `dependencies` arrays anywhere, so nothing to allowlist.
- The six `plugin.json` files under `benchmarks/razor/experiments/dependency-comparison/arms/*` are recognized as gitignored benchmark-arm fixtures, not unpublished plugins — no action.

## 7. Public-docs audit (doc-consistency-reviewer agent)

Overall clean: 3 FLAGs, 3 INFOs across 15 files — and every FLAG turns out to be a known, deliberate deviation once session memory is layered on:

- **hush CHANGELOG 0.16.1 / 0.11.0** — two old entries narrate "used to X, now Y" history. *Known:* these exact FLAGs were raised during Wave B (2026-07-28) and the owner froze the historical phrasing. No action unless the owner changes their mind.
- **hush SECURITY.md `[hush …]` marker section** — extra section beyond the shared template. *Known:* deliberate, user-approved deviation shipped in 1.1.1. Open follow-up the agent rightly suggests: decide whether the marker-provenance note should fold back into `.github/PLUGIN_SECURITY_TEMPLATE.md` so future plugins inherit it.
- **foreman README `## Scope` and `## Requirements`** (INFO) — two sections outside the template's canonical order, both plain user-facing prose. Confirm intentional or fold their content into the canonical sections at the next doc pass.
- **razor README length** (INFO) — ~239 lines vs the ~160 guideline, earned by the template-sanctioned Benchmarks section and worked examples; the "ponytail" naming stays inside the README-only allowance. No action.
- Everything else verbatim-matches the templates: CONTRIBUTING, CODE_OF_CONDUCT, and SECURITY (foreman, razor) across all three plugins; both Unreleased changelog entries for the poster wave are effect-first and compliant; hush README structure matches the canonical order exactly.

## 8. Suggested execution order

1. F2–F6 in one parent-repo housekeeping commit (gitignore comment, safe-write deletion, comparison.md move, blocklist lines, superseded markers) — F4/F6 touch only ignored files, no commit needed for those two.
2. F1's parent half (copy 097.md into parent docs/foreman/) immediately — it is local-only and heals the roadmap reference.
3. Fold D3 (renames nulls) plus F1's foreman half (`git rm docs/foreman/tasks/097.md`) into the poster-wave release, which already needs marketplace.json edits and a foreman commit.
4. Decide D1 (razor records) and D2 (track the ADRs) before that release too — both ride the same release train cheaply.
5. A1/A2 (research index, runlog tidy) anytime — local-only, zero risk.

## 9. Execution log — 2026-08-06, on the owner's go

Everything below landed the same day; plugin functionality untouched throughout.

| Item | What landed |
| --- | --- |
| F1 | `../../foreman/tasks/097.md` copied to parent `docs/foreman/` (roadmap reference resolves again) and removed from foreman with a changelog line — foreman commit `b284938`. |
| F2 | `.gitignore` comment now states the docs-stay-local truth; the two redundant Codex-port lines deleted. |
| F3 | `scripts/plugin-lib/safe-write.js` deleted. |
| F4 | `comparison.md` → `docs/hush/research/hush-aligned-comparison-2026-07-19.md`. |
| F5 | Blocklist gained `codekeel` and `praxis-workflow-os`. |
| F6 | Both 07-27 strategy docs now open with a SUPERSEDED pointer to their successors. |
| D1 | Executed: the frozen 468-cell v1 run (156 sonnet + 312 haiku, recovered from the harness's temp run root `razor-bench/20260806-{030838,024407}`) distilled into `benchmarks/razor/records/v1-2026-08-06.json` — metrics only, no transcripts, rival arm relabeled `rival`, workspace paths scrubbed, with a sanitizer assert guarding both. `benchmarks/README.md` points at it, changelog line added, suite 183/183 — razor commit `4341963`. |
| D2 | Owner decision recorded: **the ADRs stay local, always.** Not tracked. |
| D3 | `renames` gained `kairoi`/`rulesense`/`scriptorium` nulls; JSON re-validated; manifest-curator re-audit (per the repo's edit hook): **VALID, zero findings** — all six null entries confirmed well-formed against the fetched spec. |
| D4 | Left as-is per the recommendation (flatten only opportunistically). |
| A1 | `docs/shared/research/research-index.md` index written — active contracts / superseded / historical, one line per report. |
| A2 | 71 loose runlogs moved to `benchmarks/hush/experiments/voice-comparison/runlogs/` (verified no script references them). |

Parent commit `8894b79` carries F2 + F3 + D3. Submodule pointers deliberately **not** staged — the pins still equal each plugin's `origin/main`, and the staged wave (now foreman `b284938`, hush `4119f9f`, razor `4341963`) ships with the next release bump, which must update versions and pins together.

Still open, owner-level (§7 follow-ups): whether hush's SECURITY marker section folds back into the shared template, and whether foreman's README `## Scope` / `## Requirements` sections are confirmed or folded into the canonical order.

## 10. Round 2 — publish-hygiene sweep and the flattens (2026-08-06, later the same day)

Trigger: the owner flagged `foreman/TRIALS.md`, ordered the deferred flattens performed, and asked for a second analysis round focused on files and structures that should not be published.

### Executed

- **D4 flatten done.** `benchmarks/hush/benchmarks/*` → `benchmarks/hush/` (git mv, ~360 renames; untracked `results/` moved along, inner dir removed). Follow-up path fixes: `runner/run.js` plugin-sibling resolution (`ROOT/../../hush`), `runner/metrics.js` + `runner/caps.js` static requires (`../../../hush/...`), `scripts/readiness-gate.js` (`RECORDS_DIR = 'records'`, `readHarness('config.json')`, requires, evidence string), all four test files' requires, `readiness_gate.test.js` fixture layout (`config.json` at fixture root), `benchmark_evidence.test.js` `BENCH` + describe title, README "from this directory (`benchmarks/hush/`…)". Harness suite 134/134 in 2.2s. Parent commit `38dd099`.
- **`benchmarks/foreman/README.md` health section repointed** — commands now `node ../../foreman/scripts/health/{roadmap-health,attention-cost}.js`, link now `../../foreman/TRIALS.md`; a `health/` dir has not existed in the harness since the 1.0.1 move. Same parent commit.
- **`foreman/TRIALS.md` links fixed** — the three relative links still pointed at the pre-move layout (`roadmap-health.js`/`attention-cost.js` as siblings, `../../scripts/trial-log.js`); now `scripts/health/…` and `scripts/trial-log.js`. Unreleased CHANGELOG gained the Fixed line. foreman commit `39d6a9a`, suite green via pre-commit (30.1s).
- **foreman CHANGELOG 1.0.0 reworded** — "`../../foreman/adr/SCOPE.md` now publishes a never-list…" cited a file foreman's own `.gitignore` deliberately keeps out of the repo. Now "Foreman now commits to a never-list… The README carries it." (README §"What Foreman will never grow into" is the public copy.)

### Sweep verdicts

- **`foreman/TRIALS.md` is not a leak — kept published.** It is the privacy contract for the opt-in trial log, announced in the 1.0.1 changelog, cited as normative by `scripts/trial-log.js`, `safe-commit.js`, `hooks/session-start.js`, `roadmap.js`, `craft-handoff.js`, both health tools and `tests/trial_log.test.js`, and linked from `settings.md` and the parent harness README. Unpublishing it would orphan all of that and remove the user-facing privacy guarantees. Only its links were broken. The `[Foreman: 143]`/`[Foreman: 208]` anchors in it are the anchor feature dogfooded, same as across foreman's source — deliberate, kept.
- **foreman's deliberately-local set is coherent.** `foreman/.gitignore` keeps `/PRODUCT-STRATEGY.md`, `/SCOPE.md`, `/docs/*` local (currently `../../foreman/research/product-review-2026-07-28.md`, `../../foreman/research/wave2-design-2026-07-28.md`, `../../foreman/research/wave3-design-2026-07-29.md`, `../../foreman/research/R-004-instruction-load-draft.json`; none ever tracked). Tracked files citing PRODUCT-STRATEGY.md (`validate-records.js`, `tests/confidence_modes.test.js`, both health tools, TRIALS.md) quote the criteria they rely on inline — a knowing pattern, left alone. The one public line that implied SCOPE.md was readable was the changelog defect fixed above.
- **hush and razor are clean.** `git status --porcelain --ignored` is empty in both: no local-only files, no docs/ dirs, no stray roots. Every tracked file is a product file.
- **Parent is clean after the flatten.** Only local dirs are the owner-ruled `/docs/` and the gitignored rigs (`.scratch/`, `ROADMAP.jsonl`, …).

### State after round 2

Release train unchanged in shape, new tips: foreman `39d6a9a` (4 ahead of the 1.0.1 pin), hush `4119f9f`, razor `4341963`, parent `38dd099` (4 ahead of origin). Versions + pins still bump together on the owner's go; nothing pushed.
