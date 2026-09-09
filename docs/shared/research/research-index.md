# Research status register

Local research register. Entries retain their original status and dates; check newer evidence before treating a historical open-work list as current. Status vocabulary: **active contract** — binding, read before touching its area · **superseded** — kept for the trail, read the successor · **historical** — evidence and past decisions, no current obligations.

## Active contracts

- `../../foreman/research/foreman-consolidation-2026-08-18.md` — **the** account of what Foreman has left to do, and what is cut so it is never re-proposed. Supersedes every other document's open-work list for foreman. Read before proposing, picking, or building foreman work.
- `foundry-housekeeping-audit-2026-08-06.md` — repo-wide structure audit with execution log; still the housekeeping ground truth EXCEPT §3 D1 / §9 D1 (committed records), reversed by ADR 0004.
- `../../hush/research/hush-consolidation-2026-08-18.md` — **the** account of what hush has left to do, and what is cut so it is never re-proposed. Supersedes every other document's open-work list for hush. Read before proposing, picking, or building hush work. §8 is a second pass the same evening: 1.6.3 released, every decision that did not cost money ruled, and three paid batches left waiting.
- `../../hush/research/hush-context-engineering-recon-2026-08-06.md` — Anthropic context-engineering recon; one deferred gate still stands.
- `../../razor/research/razor-consolidation-2026-08-18.md` — **the** account of what razor has left to do, and what is cut so it is never re-proposed. Supersedes every other document's open-work list for razor. Read before proposing, picking, or building razor work.
- `../../foreman/research/foreman-prompt-engineering-opportunities-2026-08-13.md` — prompt-surface audit; §2.x and §3.x shipped in foreman 1.2.0, §4.1–4.3 were HELD behind measurement and are now all DECLINED (see the measurements report below), and §5 names two open gaps. Read before touching foreman's prompt-template.md, skills, or gate.
- `../../foreman/research/foreman-prompt-eng-measurements-2026-08-18.md` — the §4.1–4.3 batches, run on Sonnet and Opus. All three declined on evidence: the output shape LENGTHENS the final message, the anti-gaming clause prevents nothing and nearly doubles Opus output, and the concrete discovery bar admits no more candidates. Each switch stays in the tree defaulting off. Read before re-proposing any of the three.
- `../../foreman/research/foreman-proof-axes-2026-08-29.md` — the whole foreman-vs-vanilla case, measured. 96 paid sessions on both models: the crafted handoff TIES a hand-written paragraph on correctness, scope, verification and truth-grounding at +7-8% cost, and beats a one-line ask by 15% (Sonnet) / 42% (Opus). Also records the harness repair that had to come first — neither candidate foreman arm was valid — and four harder fixtures built and all refuted. Read before quoting any foreman benchmark number.
- `../../foreman/research/foreman-fable51-prompt-docs-2026-09-02.md` — the Fable 5.1 re-read of the whole prompting docs tree against foreman's prompt surface. 12 Opus 5 agents, 16 candidates, every one refuted: nothing in the release invalidates how foreman crafts prompts. Carries the §4a extras-clause batch (48 sessions, DECLINED — zero extras in either control on two task shapes and two models, +40% Sonnet output) and the source-g correction that shipped. Read before proposing another docs sweep or re-proposing an extras/scope clause.
- `../../foreman/research/foreman-2026-prompting-talks-2026-08-29.md` — foreman audited against four 2026 prompting talks. Sixteen findings, fourteen killed as already-shipped or already-declined. The one real defect it surfaced is the create-file gate: a handoff naming a file the task CREATES is refused as stale. Read before running another prompting sweep.
- `../../foreman/research/foreman-wrong-lesson-2026-08-19.md` — the mirror of the benefit result: what a FALSE lesson costs when it is served on a fresh label. On this fixture, tokens and not correctness — 12 of 12 sessions across both models did the work anyway and named the contradiction. Read the "not settled" half before trusting that: the fixture hands the session a test that refutes the claim, and a false claim nothing can check is unmeasured.
- `../../foreman/research/foreman-lesson-benefit-2026-08-18.md` — the benefit half of the lesson ledger, measured on a fixture with real headroom. A correct served lesson moves correctness from 0% to 100% on both Sonnet and Opus, with complete separation at n=6. Also records why the first fixture had no headroom: foreman's own scope discipline already prevents the unprompted mistake. Read before re-arguing whether the ledger's read side earns its place.
- `../../foreman/research/foreman-ledger-batches-2026-09-05.md` — the two batches the review asked for, 48 sessions, $7.68. The symbol chain carries a fact exactly as well as a lesson (0% → 100% on both models). A false lesson nothing can refute FLIPS Sonnet five times in six and leaves Opus untouched, because Opus goes and looks. The ledger stays opt-in; one measure-first header candidate. Read before quoting any chain or wrong-lesson number.
- `../../foreman/research/foreman-cut-channel-2026-09-05.md` — the same fact delivered as a `Constraints:` line instead of a lesson note, 48 sessions, $7.86. True fact: 6/6 both channels, the constraint 9% cheaper. False uncheckable fact: as a note Opus grepped for the ticket 6/6 and refuted it; as a constraint 0/12 sessions looked, Opus flipped to 1/6 and two runs wrote the false pin into a code comment. DECLINED — the verify header is the safety mechanism; never promote a lesson into constraints or the cutter's brief.
- `../../foreman/research/foreman-ledger-review-2026-09-05.md` — the ledger measured against the owner's provenance vision (a close records what it learned, the id rides into git, a later task on the same function gets what earlier ones did AND why, for the project's whole life). Two claims hold, three fall short with numbers: the `why` never rides, hot files are dropped at dispatch (four of this repo's busiest are never served), archiving erases prior work. A free `git log -L` probe resolves the "005 then 030" chain for 21 of 26 named symbols with no new store. Seven ranked proposals, five free, and the beta-exit bar. Read before any ledger, prior_work or provenance work.
- `../../foreman/research/foreman-lesson-ledger-design-2026-08-11.md` — three-way-verified design for an append-only `.foreman/notes.jsonl`. ACCEPTED by the owner 2026-08-18 and on the roadmap as entries 239–247; the P0 probe at the foot of the file is run and demoted the `area` key to cosmetic. P2, P3 and P4 have all run; the benefit half is measured separately in `../../foreman/research/foreman-lesson-benefit-2026-08-18.md`.
- `opus5-backlash-recon-2026-08-06.md` — cross-cutting; read before making any Opus-5 behaviour claim (verdict BUILD NOTHING).
- `prompt-wording-lessons-2026-07-15.md` — A/B-validated wording failure modes; read before writing any rule, style clause, or skill description.
- `rival-idea-pass-2026-08-18.md` — the open candidate pool for all three plugins (five sources, absorbs the fml pass as §6). Idea pass only: nothing approved, specced or built. Read before proposing a new idea for hush, razor or foreman — it is probably already in here with a verdict.
- `reference-names.txt` — the live private blocklist the commit gate reads.

## Superseded

- `../../hush/research/hush-product-contract-and-remediation-2026-07-27.md` → the 07-28 groundtruth report + the 08-01 ship plan.
- `../../razor/research/razor-product-strategy-2026-07-27.md` → `../../razor/research/razor-product-strategy-groundtruth-2026-07-28.md`.
- `fml-idea-pass-2026-08-17.md` → `rival-idea-pass-2026-08-18.md`, which merges it with four further sources and carries the current standing of every candidate. Kept as the long-form detail for its own source.

## Historical

foreman:

- `../../foreman/research/foreman-goal-run-2026-07-16.md` — /goal improvement run.
- `../../foreman/research/foreman-ground-truth-2026-07-18.md` — behavior vs Claude Code binary.
- `../../foreman/research/foreman-repo-mining-2026-07-18.md` — rival-repo mining sweep.
- `../../foreman/research/foreman-xml-experiment-2026-07-18.md` — XML-tag prompt experiment.
- `../../foreman/research/foreman-codekeel-intel-2026-07-21.md` — AGPL rival mining (pool spent, shipped 0.33.0-alpha).
- `../../foreman/research/foreman-praxis-mining-2026-07-22.md` — MIT rival mining (verdict ~do-nothing).
- `../../foreman/research/foreman-prompt-library-2026-07-23.md` — official prompt-library mining (built, shipped).
- `../../foreman/research/foreman-critique-evaluation-2026-07-28.md`, `-2-`, `-3-` — three critique evaluations.
- `../../foreman/research/foreman-doc-alignment-audit-2026-08-05.md` — doc-alignment pass over 1.0.0; its §1a pick.md checkpoint defect is still OPEN.
- `../../foreman/research/foreman-task-family-brief.md` — Task-family implementation brief (entries closed).
- `foreman-hush-simplification-plan-2026-08-04.md` — simplification-wave brief (executed, entries 218–228 done; 229 was added afterwards and is not in the brief).

hush:

- `../../hush/research/hush-competitor-intel-2026-07-13.md` — four-rival ground-truth pass.
- `../../hush/research/hush-clauditor-intel-2026-07-17.md`, `../../hush/research/hush-gcf-intel-2026-07-17.md`, `../../hush/research/codelore-intel-2026-07-17.md` — single-rival intel reads.
- `../../hush/research/hush-probe-corpus-2026-07-17.md` — corpus probe verdicts (entry 063).
- `hush-razor-repo-mining-2026-07-17.md` — 10-repo mining sweep, ranked.
- `../../hush/research/hush-goal-run-2026-07-18.md` — best-in-class /goal push.
- `../../hush/research/hush-silence-campaign-2026-07-19.md` — the silence-nudge campaign (delivery beats wording).
- `../../hush/research/hush-voice-transfer-2026-07-20.md`, `../../hush/research/hush-voice-mix-2026-07-21.md` — crafted-style voice findings.
- `../../hush/research/hush-anchor-absorb-2026-07-21.md` — action-first lever experiment.
- `../../hush/research/hush-aligned-comparison-2026-07-19.md` — Hush Aligned vs stock verbatim finals. The style is RETIRED (2026-08-18): its file is gone and the nine finals show it losing on words and cost. Evidence only.
- `../../hush/research/hush-groundtruth-and-delivery-strategy-2026-07-28.md` — the remediation programme (entries 161–176, all done). §2 verdicts, §3 errata and §9's wave log are the parts that still earn their place; §6–§8 are spent.
- `../../hush/research/hush-v1-ship-plan-2026-08-01.md` — the executed v1 scope contract (entries 210–217, released as 1.0.0). §4's refuted-cut list still holds except the two rows corrected in place; the byte-untouched rule on `output-styles/hush.md` is lifted.
- `../../hush/research/hush-simple-english-mining-2026-08-06.md` — SimpleEnglish mining pass.
- `../../hush/research/hush-h2h-and-benchmark-reframe-2026-08-06.md` — 6-arm head-to-head and the cost-ceiling verdict (beating rivals on tokens is unreachable; silence is the moat).
- `../../hush/research/hush-silence-ceiling-2026-08-07.md` — between-call silence campaign; verdict SHIP NOTHING, three mechanisms failed against the turn-opening line.
- `../../hush/research/hush-reading-benchmark-win-2026-08-11.md` — reading-ease benchmark behind hush 1.6.0 (ease 81.2 vs 71.6, grade 4.3 vs 5.7).
- `../../hush/research/hush-reading-win-style-2026-08-11.md` — frozen byte-copy of the 1.6.0 style file, kept as the measured state behind the batch above. Not the shipped style, not installable; the recipe itself is the edit list in `../../hush/research/hush-reading-benchmark-win-2026-08-11.md`.
- `../../hush/research/hush-opus5-style-rewrite-2026-08-27.md` — the from-scratch Opus-5 style rewrite (codename Fern) measured against shipped hush on Opus medium: 8/8 silent runs to 6/8, reading ease 93.7 to 91.5, grade 1.6 to 2.0. Sonnet-checked, confirmed, and shipped as hush 1.8.0 the same day.
- `../../hush/research/hush-opus5-fern-style.md` — frozen byte-copy of the Fern style file as measured in the batch above. Evidence, not the shipped style.
- `cap-arms-2026-08-06/` — run records behind the 15-word-cap A/B (shipped the counting-redo fix).
- `rival-arms-2026-08-06/`, `rival-arms-2026-08-07/` — run records behind the head-to-head and silence-ceiling batches.

razor:

Every file below carries a dated status banner naming what in it is now false. The
open-work list in all of them is superseded by `../../razor/research/razor-consolidation-2026-08-18.md`.

- `../../razor/research/razor-competitor-intel-2026-07-14.md` — YAGNI-lens competitor sweep; two of its claims are dead.
- `../../razor/research/razor-benchmark-audit-2026-07-16.md` — what the published table measured, and where razor lost. Reads as a brief for a run that has since happened twice.
- `../../razor/research/razor-fresh-sweep-2026-07-18.md` — lean-code landscape sweep; its top idea rests on a marker comment razor dropped in 1.1.0.
- `../../razor/research/razor-goal-run-2026-07-18.md` — dagger-row close-out run.
- `../../razor/research/razor-product-strategy-groundtruth-2026-07-28.md` — the strategy v1 half-executed: six entries done, six deferred post-v1 and never re-decided.
- `../../razor/research/razor-v1-recon-2026-08-06.md` — canon sync and the frozen-ladder decision. Its "remaining to v1" list shipped three releases ago.

cross-cutting:

- `trio-stack-benchmark-2026-07-18.md` — stack-vs-stack benchmark.
- `understanding-style-research-2026-07-19.md` — comprehension evidence behind Hush Sightline.
- `voice-reference-readme.md` — private voice sample; never cite in public records.
