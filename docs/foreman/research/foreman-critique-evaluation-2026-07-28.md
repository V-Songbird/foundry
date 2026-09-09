# Foreman critique evaluation — 2026-07-28

**What was evaluated:** an external pessimistic critique of Foreman, received 2026-07-28, judged against the current working tree — foreman HEAD `b9f18dc` (committed, unreleased wave on top of released `0.46.0-alpha`; foreman's own tree is clean, the parent's submodule pointer is simply ahead).

**How:** every checkable claim was verified directly against the tree, and the critique's "dogfood" numbers were reproduced by re-running Foreman's own instruments (`roadmap.js doctor`, `benchmarks/health/attention-cost.js`) on the foundry `ROADMAP.jsonl`.

**Headline verdict:** the critique's *facts* are excellent — essentially every number and file citation checks out, because it ran our own health tools against us. Its *interpretations* are roughly one-third already shipped in the tree it measured, one-third known-and-documented design trades it presents as discoveries, and one-third genuinely useful — including one real spec defect (survey investigator context) and one strategic point I endorse (we keep building instruments without turning the recorder on).

---

## Verified facts

| Claim | Verified | Notes |
|---|---|---|
| 892 tests pass | ✅ exact | `node --test` (node 22.22.2): 892/892, 183 suites, 24.9s |
| Roadmap: 162 entries, 107 done / 9 rejected / 1 dropped = 117 terminal (72%), nothing archived | ✅ exact | Live tally: also 36 planned, 9 deferred. No archive file exists |
| Doctor: unknown source, one done entry without evidence, one duplicate pair | ✅ exact | `082` source `"user-requested"`, `085` terminal_without_evidence, `070`/`072` similar 0.46. All warnings, 0 errors |
| Precision 0.646 / recall 0.88 over 10 scorable; 30/86 files (34.9%) unpredicted; 107 unscorable | ✅ exact | `attention-cost.js` reproduces every figure. These are *Foreman's own* self-measurements |
| 7 statuses, ~16 fields, 3–8 init tasks, survey default 3, sprint serial cap 5, 68 vs 567 fixed words | ✅ | Schema counts 13 required + 4 optional fields |
| resolve-symbols: column-0 regex, JS/TS + Python + Kotlin only, 2000-file walk cap | ✅ | `WALK_LIMIT = 2000` at resolve-symbols.js:222; honest-limit comment lives in the file header |
| Line counts (5,668 scripts / 1,297 hooks / 11,782 tests / 2,422 CLI / 677 workflow) | ⚠️ inflated ~10% | Measured: 5,165 / 1,092 / 10,193 / 2,304 / 623. Same magnitude; likely a different basket (benchmarks/ folded in) |
| README charts have no result records; one static record exists | ✅ | README "Performance claims" section says so itself; `R-001-prompt-overhead.json` is the only record |
| Trial metrics defined but nothing records them | ✅ | `roadmap-health.js` / `attention-cost.js` headers both state "nothing records yet" |

**Critique-session side effects on our repo (housekeeping):** it migrated the live foundry roadmap v1→v2 (backup `ROADMAP.jsonl.backup-20260728-030911`, 03:09, format marker 1→2) and filed two `claude-suggested` planned entries: `177` (align correctable-status wording) and `178` (stamp applied corrections for health counting). Both await review. The backup file is untracked and safe to delete once the migration is trusted.

---

## Claim-by-claim assessment

### Genuinely new and actionable

**1. Survey investigator context gap — CONFIRMED DEFECT (the critique's best catch).**
`skills/survey/SKILL.md:119–128` asks each investigator to detect hidden dependencies against "another *not-done* task's `planned_touches`" (both directions) and duplicates ("closely overlap another entry"), but the supplied context (lines 92–98) contains only the candidate itself, its resolved dependencies, and path-exists flags. No other entries' surfaces are handed over. Detection therefore depends on the Explore agent deciding on its own to read `ROADMAP.jsonl` — the exact context expansion the flow exists to avoid, and unreliable.
**Fix:** include a compact digest of all not-done entries (id, title, `planned_touches`) in each investigator prompt. A few hundred tokens, deterministic, aligned with the flow's own philosophy. → Roadmap entry candidate, priority 1.

**2. Archive never happens on its own — CONFIRMED BY OUR OWN FILE.**
Archive/restore shipped this wave, is manual, and our own roadmap sits at 72% terminal with the feature never invoked. "Install-and-forget projects naturally accumulate terminal state" is empirically true here.
**Fix:** a threshold *offer* — when status/session-start sees terminal entries past some count, offer the one-call archive. An offer, not an auto-move ("nothing moves without you"). → Roadmap entry candidate.

**3. Corrupt-state silence in post-commit — CONFIRMED, IMPROVABLE.**
`hooks/post-commit.js:359–363` deliberately returns silently on an unreadable roadmap ("stay silent rather than nudge Claude into writing on top of it"). The critique's UX point is fair: automation is least visible exactly when trust is compromised.
**Fix:** emit a read-only one-liner ("roadmap unreadable — run doctor"). Nudges a *read*, preserving the no-write rationale. → Roadmap entry candidate.

**4. Symbol-preflight language coverage is not user-visible — CONFIRMED DOCS GAP.**
The code's honest-limit comment (regex, three language families, 2000-file cap) has no user-facing counterpart. README says "paths and symbols preflighted" with no language list, so a Go/Rust/Java user silently gets path-checks only (fail-soft, still correct, but less than the sentence implies).
**Fix:** one NOTE in README/settings naming covered languages. Allowed under the public-docs rule (real, current limitation). Needs go — README edit.

**5. Date-only `correct` guard — REAL WINDOW, KNOWN TRADE, LOW SEVERITY.**
The critique is right that two *sessions* can read → correct → correct sequentially on the same day and the second silently overwrites the first: `expected_updated_at` is date-only, and the mutation lock serializes writes, not composition. It is wrong that this is an unacknowledged defect — `roadmap.js:1172–1178` and the schema document exactly this split and call it a deliberate trade (guard catches cross-day staleness; lock covers intra-call atomicity). For a solo developer, two sessions correcting the *same entry the same day* is rare, and the blast radius is one text field.
**Fix direction if we harden:** content compare-and-swap on the corrected fields (no format change) beats switching `updated_at` to timestamps (format v3 churn). → Roadmap entry candidate, low priority. Critique-session's own `178` is adjacent.

**6. Strategy/tree inconsistency on sprint — CONFIRMED GOVERNANCE HIT.**
PRODUCT-STRATEGY places sprint under P3 "evidence-gated expansion", yet sprint is built (labeled experimental everywhere, serial, capped at 5). We front-ran our own gate.
**Action:** freeze sprint feature growth until trial evidence exists. The experimental labels stay.

**7. "Measurement infrastructure before evidence" — CONFIRMED, AND THE RIGHT STRATEGIC READ.**
Instruments (health tools, records rule, trial definitions) exist; recording does not — `TRIALS.md` metrics all return `no_trial_log`. Building the instrument first is the only possible order, but the awkwardness becomes real if features keep shipping with the recorder off.
**Action:** the next milestone should be *turning recording on* (opt-in trial log on our own repos) plus record-backed benchmark runs — not new features.

### Already shipped in the tree it measured

- **"Call it 'default ready order', not 'recommended next task'"** — shipped almost verbatim: `skills/roadmap/SKILL.md:131–135` ("Foreman's **recommended** ordering, the default one, not a claim to have found the objectively best task: the sort knows dependencies, hint words, collisions, and age, and nothing about product value, urgency, or effort"), README ("The order is Foreman's default; the pick is yours"), CHANGELOG Unreleased. Every offered task states its ranking reason.
- **Benchmark honesty** — the performance-claims rule, `validate-records.js`, and the explicit "the three charts predate the rule and no record backs them" disclosure ARE the current tree's own response. The critique cites the disclosure as an admission; it is the fix in progress. The remaining real gap: unbacked charts still headline the README (see actions).
- **Craft-prompt bundling** — already demoted: frontmatter "Advanced surface, separate from Foreman's core roadmap job", README "a separate tool, not part of the roadmap job", the entrance never routes to it. Splitting into a separate plugin is declined while it shares `prompt-template.md` + `check-prompt.js` — two copies of the template is two truths.
- **Decision notes "many decisions never qualify"** — wrong: `decision-log.md:21–26` explicitly handles emergent decisions ("If a build turns out to have decided something real, the honest move is a `kind: "decision"` entry of its own"). Anchor drift after refactors is a real residual cost; the anchors hook resurfacing notes when files open is both the mechanism and the correction opportunity.
- **Discovery cost** — after-commit discovery is now opt-in and no longer loads the backlog per commit.
- **Init interview weight** — down to three questions; optional policies asked first time they matter.

### Known, documented design trades presented as discoveries

- **Profiles are process classification, not risk classification** — accurate, and the template says so itself ("never a judgment call… there is no roadmap risk field and none should be added"). A fresh security-critical task with a verification command does get `standard` — which still carries both trust invariants and mandatory verification. Keyword-based risk detection is declined: priming risk (per prompt-wording lessons) and a judgment surface, for an unproven failure mode.
- **Prompt checker validates structure, not content** — by design, self-stated at `prompt-template.md:673–675`; content is the checklist's half. The alternative is an LLM judge in the gate — cost and nondeterminism the design rejects.
- **Fast pick knows nothing of value/urgency** — stated verbatim in the skill; richer prioritization is strategy-gated on evidence (P3).
- **Survey covers only the near-term set** — and mandates disclosing partial coverage ("don't imply full coverage silently").
- **Safe-commit rigidity** — refusing undeclared files and never committing on a dirty tree is the chosen failure direction (stop-and-name beats absorb-dirt). Our own 34.9% unpredicted-file rate says stops WILL happen; the failure mode is recoverable friction, not loss. The instrument for measuring that friction (`commit_interruptions`) is defined and unrecorded — same action as #7.
- **Sequential IDs + `reassign-id`** — the repair subsystem is the price of human-readable ids (spoken, typed into trailers and anchors). Collision-resistant ids would delete the repair and the readability with it. Declined; reassignment stamps a note that health counts.
- **Repo coupling costs** (cherry-picks transport state, squashes merge evidence, trailers are permanent) — real, inherent to the core promise (state in repo, no server). Mitigations exist: merge repair, single commit-evidence interpreter. Accepted.
- **Model/effort telemetry** — consumers now exist and run (`roadmap-health.js`, `attention-cost.js`); the trial-gated half records nothing and says so. Suspension declined (two optional keys; deleting them destroys the data the consumer needs). Expansion frozen until trials record.
- **Post-commit is "a sophisticated nudge"** — accurate and intended: the hook proves nothing, it routes evidence to the actor that can confirm. `requireVerification` + `awaiting_acceptance` exist precisely because the nudge is not proof.

### Where the critique is off

- **"Seven statuses resemble the PM system Foreman says it is not"** — each status is load-bearing for a concrete mechanism (acceptance gate, discovery dedup, deferred exclusion, derived-not-stored blocked). The user never types one; scripts do. The vocabulary is machine-facing.
- **The unscorable-107 framing** — the planned/observed split is days old; the 107 skipped entries are pre-split history whose observed half legitimately starts empty (documented migration semantics). The 10 scorable entries are simply the ones closed since the instrument existed. Not absent discipline — a new instrument reading old history.
- **"Not much of a sprint"** — naming quibble; docs never promise more than a small serial batch, everywhere labeled experimental.
- **The dogfood section's rhetorical frame** — "running Foreman's health tools produced a less flattering picture" is Foreman's own self-measurement working as designed. The numbers exist because we built the instrument; the doctor findings were reproduced verbatim by our own run. Quiet evidence *for* the machinery: an external auditor pointed our tools at a messy 162-entry real roadmap and they worked first try.

---

## Recommended actions (ranked)

1. **Survey context fix** — pass the not-done digest to investigators. Defect, cheap, priority 1.
2. **Archive threshold offer** — evidence-backed by our own 72%-terminal file.
3. **Corrupt-roadmap read-only nudge** in post-commit.
4. **README:** language-coverage NOTE + decide the charts (back them with recorded runs — cost, needs explicit go — or pull them until records exist; the second is the move consistent with our own rule).
5. **Evidence release:** turn on opt-in trial logging on our own repos; freeze sprint/new features until it reads something. This is the critique's strategic core and I endorse it.
6. **`correct` guard hardening** — content CAS on corrected fields; low priority.
7. **Roadmap housekeeping:** review critique-session entries `177`/`178`; resolve `070`/`072` duplicate pair; note `082` source and `085` evidence gaps; delete the migration backup once trusted.

**Declined:** splitting craft-prompt out, suspending model/effort fields, collision-resistant ids, keyword risk classification, un-bundling decision notes.

**The critique's closing thesis** — "process debt disguised as continuity; every safeguard makes the machinery safer while making the product harder to justify" — is the right *risk* to name and the wrong *verdict* to reach today: the tree it measured had already demoted, gated, or disclosed most of what it indicts, and its own audit succeeded *because* the machinery held. The half we should take to heart is the freeze: no new subsystems until the recorder is on and real usage numbers exist.
