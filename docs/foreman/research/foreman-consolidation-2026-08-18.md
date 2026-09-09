# Foreman consolidation — state, dispositions, and what is left

**Date:** 2026-08-18, updated the same day after the build pass below.
**Status:** ACTIVE CONTRACT. This supersedes every other document's account of what
Foreman has left to do. Read it before proposing, picking, or building Foreman work.

> **Build pass, 2026-08-18 (foreman `8c2682d`).** Everything in §2A and §2B is
> built and closed — entries 233, 240-245 and 248 `done`, 246
> `awaiting_acceptance` (harness built, spend not approved), 247 still deferred
> behind it. Suite **1070 passing, 218 suites**. §2C is untouched and still
> waits on the same go. Nothing is pushed and no version is bumped; the
> changelog carries an `[Unreleased]` section.
**Scope:** the `foreman/` submodule plus the parent-repo surfaces that describe or
govern it — `ROADMAP.jsonl`, `docs/research/`, `docs/foreman/`, `docs/adr/`,
`.claude/rules/`, `benchmarks/foreman/`, and the session memory store.

**Method.** A 13-agent audit swept six surfaces, every finding re-checked by an
adversarial verifier whose default was to refute, then a completeness critic swept
for surfaces nobody had been assigned: 127 candidates, 25 refuted, 102 confirmed,
13 added by the critic. A seven-agent pass applied them across disjoint file groups
with a verification pass behind it. A seven-agent build pass then closed every Tier
1 and Tier 2 item, with an adversarial reviewer that returned REQUEST-CHANGES on one
repro-confirmed defect, fixed before the commit.

---

## 1. Where Foreman stands

| | |
| --- | --- |
| Released version | 1.2.1, pushed 2026-08-13, pinned in `marketplace.json` at `2e89f57` |
| Local `foreman` HEAD | `8c2682d`, four commits ahead of the pin — normal between releases |
| Skills | exactly five — `foreman`, `roadmap`, `init`, `survey`, `craft-prompt` |
| Hooks | seven JS files under `foreman/hooks/` plus `hooks.json` |
| Test suite | **1070 passing, 218 suites, zero failing** |
| Roadmap | 232 entries — 199 done, 1 awaiting_acceptance, 18 deferred, 9 rejected, 5 dropped |
| Foreman's own open set | 1 awaiting_acceptance (246), 6 deferred |
| Health | `roadmap.js doctor`: zero errors. Benchmark selfcheck: `truth_grounding current` on all three fixtures |

The product is in good shape. The audit found no architectural defect, no broken
gate, and no rule the code fails to honour. What it found was **rot in the
descriptions** — documents that had finished their job and still read as live plans,
paths that had moved, and a memory store describing a product two releases old — plus
**four instruction blocks that had drifted between copies**, which is where the real
defects were hiding.

Four things are deleted and are not coming back. If you meet them in an older file,
they are gone: the **sprint** skill and all batch execution, the **model-advice**
surface (`modelSuggestions`, `targetModel`, `model-fit.md`), **parallel execution**,
and the **committed-records** evidence policy that ADR 0004 reversed on 2026-08-11.

---

## 2. What is left to build

Everything below is a roadmap entry. `/foreman:roadmap` offers it without anyone
having to find this document first.

### A. The Lesson Ledger — entries 240 to 247

Accepted by the owner on 2026-08-18. Spec and full task detail:
`foreman-lesson-ledger-design-2026-08-11.md`. Build in id order; the dependency
chain is already recorded on the entries.

| Entry | Task | State |
| --- | --- | --- |
| 240 | Stamp the prior-work recall leads with three-valued staleness | **done** |
| 241 | The append-only notes store and the `lesson` close input | **done** |
| 242 | Config, edit guard and doctor findings | **done** |
| 243 | The staleness resolver and the `notes` pull command | **done** |
| 244 | Serve lesson lines in the handoff, and ask for one at close | **done** |
| 245 | The SCOPE.md amendment, as a `kind:"decision"` entry with its own decision doc | **done**, `docs/foreman/tasks/245.md` |
| 246 | Build the P2/P3 harness, then **stop and propose the batch** | **done** — batch ran and was accepted |
| 247 | Stage 2 — survey retire verdict, prune, anchor read-back, reassign-id demotion | **awaiting_acceptance** — built 2026-08-19, foreman `8ec5448` |
| 252 | Measure what a WRONG fresh lesson costs | **awaiting_acceptance** — measured 2026-08-19, parent `af48d19` |

**Three deviations from the spec, each deliberate.** `roadmap.js` takes stdin
JSON for every mutating verb, so the close input is a `lesson` field rather
than a `--lesson` flag — adding a second input channel for one field would have
been worse than restating the ask. `area-notes-config.js` was built inside 241
rather than 242, because 241's own disabled-but-flag-passed fallback needs it.
And the anchor has two kinds, not three: an `entry` anchor that resolves to
nothing already yields `unknown`, which is exactly what `none` was for.

**One design change is already folded in, forced by the P0 probe** (entry 239, run
and closed): R1's serving window is a flat six records ranked by path overlap, not
"two areas by three records". Only 34% of closed entries have most of their touches
in one area, and Foreman clusters worst of anything measured, because an ordinary
Foreman change edits an instruction file, its assembler and its test together.
Selection was always path-level, so the retrieval spine is untouched.

**The spend is not approved.** Accepting the direction did not accept the P1 and P2
measurement batches. Entry 246 exists to build the harness and then ask.

### B. Two standalone fixes

**Entry 233 — six one-option questions. DONE.** Four in `craft-prompt/SKILL.md`'s Call 4-N
and two in `init/SKILL.md` (Q1 and Q2) author a single option, below the tool's floor
of two. Promoted from a taste call to planned work: one option is outside the
documented bound, which makes it the same class of defect as entry 232, and the fix
does not change what the interview asks. Follow the pattern Call 3 already uses.
The `init` pair was found by the readiness check in §8, not by the audit — the audit
scoped its question sweep to `craft-prompt`.

**Entry 248 — `acquireLock` never removes its lock directory. DONE.** Found by the build
review. Nothing removes the per-project `<tmpdir>/foreman-roadmap-<hash>.lock`
container, so every temp project a test builds orphans one — the operator's machine
held **154,039, of which 154,032 were empty**, which is what settled the
measure-first question: the container was the leak, so the fix is `releaseLock`
rmdir-ing it (rmdir refuses a non-empty directory, so it cannot race a live
contender) and not a test teardown. The 154,032 empty directories were removed. Two related blind spots ride along:
`removeAbandonedClaim` and the test's `activeClaims` helper both filter on the
`claim-` prefix, so a leaked `staging-` directory would be neither swept nor caught.

### C. Held behind measurement — MEASURED 2026-08-18, all three DECLINED

From `foreman-prompt-engineering-opportunities-2026-08-13.md` §4. Sections 2.x and
3.x of that report shipped in 1.2.0; these three did not, and each was held for a
batch. **The batches ran on Sonnet and Opus and all three are declined on evidence.**
Full numbers, designs and the caveats in
`foreman-prompt-eng-measurements-2026-08-18.md` — read it before re-proposing any of
them. In short: §4.2's output shape **lengthens** the final message it was meant to
bound (+47% Sonnet, +19% Opus, correctness unchanged); §4.1's clause prevents nothing
because neither model games the fixture without it, and costs +20% / +92% output;
§4.3's concrete bar admits no more candidates (Sonnet 4.60 → 3.80, Opus 4.20 → 4.20).

Each change now sits behind an environment switch defaulting to today's behaviour —
`FOREMAN_STANDARD_OUTPUT_SHAPE`, `FOREMAN_TEST_GAMING_CLAUSE`,
`FOREMAN_DISCOVERY_CONCRETE_BAR` — so re-opening a question costs a batch, not a
rebuild. The three harnesses live at `benchmarks/foreman/outputshape/`, `gaming/` and
`discovery/`. The original descriptions follow, unchanged, for whoever revisits them.

- **§4.1 — anti-test-gaming clause on the `testFirst` branch.** Its prerequisite,
  entry 231, is done. The clause names three shortcuts by name, which is the exact
  shape that has primed behaviour here before, so A/B it on a silent-failure fixture.
- **§4.2 — give the standard profile an output shape.** Mechanically one word:
  drop `reinforced` at `craft-handoff.js:594`. Cost is +21% to +35% on a 68-word
  floor, for the profile whose whole purpose is the length it saves. Six files move.
- **§4.3 — post-commit discovery, swap both gates.** The opening bar at
  `hooks/post-commit.js:307-310` and the closing "Say nothing if nothing is
  confirmed" at `:342` must change together or it is a no-op.

### D. Deferred, with triggers that can still fire

| Entry | Waits for |
| --- | --- |
| 062 — pin the scripts layer as a harness-free CLI | an explicit request to port; the owner deferred all porting until the three plugins are best-in-scope |
| 074 — research-grounded options in `craft-prompt` | a real trace where a hand-typed `relevant_files` entry points at the wrong file |
| 075 — gate errors as error/fix/example objects | any craft trace needing three or more gate iterations; every trace so far converged in two |
| 147 — evaluate ranking changes with real roadmap replays | someone proposing a concrete ranking change, or a pick observed ordering two entries in a way the current rule cannot explain |
| 209 — model-side trial events | a project running the trial log that wants the three rates `roadmap-health.js` reports as null |

---

## 3. What is cut, and must not be re-proposed

Each was decided, with a reason. Listed here so a session meeting them in an old
document recognises them as closed rather than forgotten.

| Idea | Disposition |
| --- | --- |
| Sprint / batch execution of several entries | **dropped** at the 1.0 close. Entries 038, 145, 148. The surface was deleted and batch execution is on `../../../foreman/docs/adr/SCOPE.md`'s never-list, which bars it from any 1.x release |
| Unattended roadmap routines | **rejected**. Entry 039. Its only unblock condition was sprint shipping |
| Parallel execution | **dropped**. Entry 148, and never-listed at `SCOPE.md:411` |
| Model and effort advice | **dropped**. Entry 146. `modelSuggestions`, `targetModel` and `model-fit.md` were deleted end to end |
| Blocking `Read` on `ROADMAP.jsonl` | **rejected**. Entry 050. Reads cannot corrupt, and the rule is unsealable — `Grep` and `cat` would need arbitrary shell parsing |
| Per-task ADR-style decision documents | **rejected**. Entry 051. `annotate` plus `notes` already hold decision breadcrumbs with no new code |
| Structured status-block output flavour | **rejected**. Entry 076. The Workflow-stage flavour is schema-enforced and strictly stronger |
| Asking about `decisionLog` in `init` | **rejected**. Entry 086. `init` asks only about policies that fire on routine, every-project events |
| Asking about checkpoint preferences in `init` | **rejected**. Entry 087. Same principle; `onFinish` already asks at the moment it matters |
| Capturing user suggestions from conversation | **dropped**. Entry 115, built on a misread and reverted |
| Area-keyed grouping in the Lesson Ledger | **cut by measurement**, 2026-08-18. P0 showed it does not hold for Foreman; `area` survives as a cosmetic field only |

---

## 4. What this pass did

Two commits in `foreman` (`74d626c`, `3b03af1`) and one in the parent (`1b8eaaf`).

**Behaviour fixed — the four drifted blocks.** `pick.md`'s checkpoint protocol was a
copy of the canonical section that had dropped the `unexpected_files` refusal path
and the never-push rule; it now reads the canonical section and keeps inline only
what is genuinely pick's own. `craft-prompt`'s return-handling block had dropped the
rule that warnings surface even when the gate passes, so a stale path could ship
unmentioned. `pick.md`'s background-Agent bullet would have passed free text through
as a model. The destination question had three copies; the template now points at the
one that calls itself canonical.

**Behaviour fixed — three code defects.** `craft-handoff.js` preflighted only the
first verification command, so a stale symbol in any later position shipped
unchecked. `roadmap-lock.js` staged an in-progress claim under a name beginning
`claim-`, so contenders opened `owner.json` inside a half-built directory and the
publishing rename failed with EPERM on Windows — that was the flaky lock test, and
the fix is in production code with the test unchanged and 50 consecutive green runs.
`craft-prompt` asked five optional-section options against a cap of four.

**Descriptions corrected.** `PRODUCT-STRATEGY.md` now says it is a historical charter
whose P0–P2 programme shipped. Sixteen pre-1.0.0 CHANGELOG releases carried an
identical "Fixed" block that postdated them. Three public-docs rule violations
removed. The committed-records policy that ADR 0004 reversed survived in five places,
two of them tracked rule files that contradicted each other.

**Memory rebuilt.** The store announced 1.1.0 as current, described three skills and
two hooks, said decision docs were not files when nineteen exist, warned about a
content-hash trap that can no longer fire, and carried a commit freeze lifted three
releases ago. Thirty-three dangling cross-references repaired or removed.

**One finding was deliberately reverted, and has since landed.**
`scripts/git-hooks/check-reference-names.js` explained its records exemption with
the superseded committed-records rationale. `check-reference-names.test.js:303`
asserts the parent copy is byte-identical to all three plugins' copies, so the fix
could not land in one repo alone — it was held for the next three-plugin change.
That arrived with the 2026-08-18 build pass, and the comment is now corrected in
all four copies (hush `7b814ae`, razor `4d9c5d9`). **The branch itself is
load-bearing** for clones made before ADR 0004 and must not be removed.

---

## 5. Traps a new session must know

1. **`ROADMAP.jsonl` is written only through `foreman/scripts/roadmap.js`.** A guard
   hook blocks `Edit` and `Write`, and direct writes corrupt id computation.
   `correct` additionally requires `expected_updated_at` **and** an `expected` object
   carrying the current field values.
2. **`planned_touches` paths in this repo are parent-root-relative** — `foreman/…`,
   not `scripts/…`. The submodule-relative form resolves as missing and silently
   disables the collision check. Do not encode this in `foreman/roadmap-schema.md`;
   that file ships to every project and knows nothing about this layout.
3. **`benchmarks/foreman/selfcheck.js` pins `prompt-template.md`'s `<truth_grounding>`
   block** into three frozen fixture prompts. Any edit inside that block must
   regenerate all three and re-run selfcheck in the same change. Edits elsewhere are
   safe — run selfcheck anyway.
4. **`craft-handoff.js:52` hard-throws when an expected `prompt-template.md` line is
   missing.** Append to that file; do not delete from it. Both `check-prompt.js` and
   `craft-handoff.js` parse only the ```` ```xml ```` fence near the top, so text
   below it is safe to reword — verify per edit, do not assume.
5. **`relevant_files` may never be empty.** `check-prompt.js:258-259` makes an empty
   block a hard error, not a warning, so a `touches` of `[]` cannot assemble at all.
   Any interview answer that names no file must still yield a directory.
6. **The R-0xx content-hash trap is inert.** It once forced supersede-not-edit on
   skill files. ADR 0004 removed every record JSON, so no sha256 gate can fire and
   skill files edit freely. Older notes still warn about it; they are wrong.
7. **Any commit inside `foreman/` moves the submodule off its pinned `source.sha`.**
   The parent's pre-commit hook blocks bumping the pointer without a matching
   `version` bump. Working ahead of the pin is the normal state between releases.
8. **Three test files pin documentation strings** — `check_prompt.test.js` on the
   destination question and on "There is no `push` key and none should be added",
   `decision_log_config.test.js` on `decision-log.md`, `settings.md` and
   `roadmap-schema.md`, `confidence_modes.test.js` on `README.md`.

---

## 6. Open decisions

**Authorise the remaining measurement batches.** Only the Lesson Ledger's P1 still
waits on a proposed batch and a go. §2C's three items no longer do: they ran on
2026-08-18 and all three are declined. P2 ran and was accepted.

**P2 is DONE.** It ran 2026-08-18 on an explicit go, and entry 246 is closed
`done` with the full result in its notes. 4 arms × `moved-file` × 4 reps ×
sonnet + haiku = 32 sessions, tags `p2-lessons-sonnet` and `p2-lessons-haiku`,
records local per ADR 0004. **32/32 passed every check on both models, 0
violations** — every arm fixed `src/tokenizer.js` and left the `src/parser.js`
decoy untouched. The poison half of the bar is CLEAR: the graded-labeled-stale
arm scored 4/4 on haiku, so the anchors-only fallback is not needed and the
graded rule stays as shipped. The "fresh helps at least one model" half is
**unmeasurable on this task, not refuted** — the arms splice onto the frozen
`foreman.md` prompt, which already solves `moved-file` 100% of the time on
gen-5 sonnet and haiku 4.5, so `lessons-control` had no headroom by
construction. Any future benefit claim needs a task the base prompt does not
already ace. Two traps for whoever reads the records: cost is not comparable
across these arms because `run.js:324` queues arm-major and `lessons-control`
ate the cold cache, and `mismatchNamed` (`metrics.js:131`) is a keyword regex
over `finalText`, not correctness.

P4 also ran, free, off the P2 transcripts. **Sonnet is non-zero but only on the
two stale arms** — `lessons-graded` 4/4 and `lessons-unlabeled` 4/4 reference the
served line, `lessons-control` 0/4, and `lessons-fresh`, the TRUE lesson, scored
**0/4 on every pattern**. So the block's one observable effect is the model
spending output adjudicating a false claim. Haiku is zero everywhere, with the
usual terse-final caveat. 247's freeze clause does not fire, but nothing measured
argues FOR stage 2 either. Full numbers are in entry 247's notes.

P3 ran later the same day, free, over this repo's own trial log: `trialLog` and
`areaNotes` were switched on before the day's five closes, and the bar is **met
at n=5** — 5 closes offered the ask, 5/5 recorded a lesson, 100% stored, zero
refusals. The staleness labels verified themselves in passing.

**The benefit half is measured, and it is positive.** A separate fixture built
for the purpose — `pinned-dup`, the `adjacent-mess` module with its PERF-1123
pin deleted from the code comment, the brief and the prompt alike — moves
correctness from **0% to 100%** when the lesson is served, identically on Sonnet
and Opus, with complete separation at n=6. All twelve control runs collapsed the
pinned helpers and reported success on a green suite. Full report:
`foreman-lesson-benefit-2026-08-18.md`. **Entry 247 is BUILT** (2026-08-19, foreman `8ec5448`): `note-supersede`, `note-prune`, survey step 3b, the decision-anchors lesson channel, and reassign-id demoting note anchors to `ambiguous` rather than repointing them. **And the mirror is measured** (entry 252, report `foreman-wrong-lesson-2026-08-19.md`): a false fresh lesson costs tokens, not correctness — but only where a runnable check refutes it, which is why the feature stays off by default and why the survey retire path is not optional polish.

The pre-check that preceded it is the durable lesson: the control passed 3/3 on
the first version of the fixture, because foreman's own `<scope_discipline>`
block stops a session folding in a tidy-up nobody asked for. Buy headroom before
buying a batch — the control arm alone, three reps, under a dollar.

**Haiku is retired as a test model, 2026-08-18, across all three plugins.** The
owner extended hush's earlier ruling to the whole repo. `benchmarks/foreman/`
now defaults to `sonnet` in `config.json` and in `picks/run.js`, and every usage
comment and README example names sonnet or opus. **This voids the P2 bar as
written** — "graded-stale does not poison haiku" can no longer be re-run as
stated, so the 2026-08-18 result stands as history and any redo is sonnet + opus.
foreman's product `model` menu still offers `haiku`, deliberately: that is a user
choosing which model runs their own task, not a test.

**A second decision now exists: cut foreman 1.3.0.** The pending changes are
user-visible and the changelog carries them under `[Unreleased]`. Cutting it is
the documented one-step sequence in §7. Nothing is pushed.

Settled in this pass, recorded so nobody re-opens them: entry 147 is deferred with a
live trigger rather than dropped; entry 233 is planned rather than a taste call; the
Lesson Ledger direction and its SCOPE.md wording are accepted, and its area key is
cut by measurement.

---

## 7. Release state

Nothing is pushed. `foreman` local `main` is four commits ahead of the released pin,
which is the ordinary between-release state here. Cutting the release is one
owner-approved step: push the submodule, then bump `version` and `source.sha`
together in the parent's `marketplace.json`, with the CHANGELOG entry inside the
plugin's own repo. `CONTRIBUTING.md` → "Cutting a release" has the sequence.

The pending changes are user-visible — the checkpoint protocol a split run follows,
the warnings a craft-prompt handoff surfaces, the model parameter a background agent
receives, the options six interview questions offer, the freshness stamps on every
recalled lead, and the whole opt-in lesson ledger — so they want a real version bump
and CHANGELOG lines, not a silent pin move. A new feature behind a default-off flag
plus fixes makes it **1.3.0**. The changelog entries are already written under
`[Unreleased]`; cutting the release renames that heading and does the pin move.

---

## 8. Re-checking this

`docs/foreman/validation/scripts/readiness-check.js` is the harness behind every claim in §1. Run it
before and after any Foreman work:

```bash
node docs/foreman/validation/scripts/readiness-check.js
```

It exits non-zero on a failure. What it asserts, and why each one is there:

| Check | The mistake it catches |
| --- | --- |
| every roadmap line parses | a hand-edit that corrupted the file |
| open foreman entries name only real paths | an entry pointing at a moved or deleted file — the single most common rot here |
| no open entry waits on a dropped or rejected one | an entry recording a future that is not coming |
| `planned_touches` are parent-root-relative | the submodule-relative form, which resolves as missing and silently disables the collision check |
| foreman suite, gate suite, selfcheck, doctor | the ordinary regressions |
| the gate file is byte-identical across all three plugins | a one-repo edit to a mirrored file, which turns CI red |
| nothing claims a stale suite total | a number left behind by a test change. Dated records are exempt — they are claims about their date. It reads the session memory store too, so a suite change means updating `MEMORY.md` in the same pass |
| memory has no dangling links, no missing pointers, no unindexed file | a memory the index promises and the disk does not have |
| every foreman research report is indexed | a report nobody can find |
| every `AskUserQuestion` authors 2 to 4 options | the schema violation entry 233 tracks |

Warnings are scoped deliberately: hush and razor findings are reported and not
counted, because each plugin is reviewed independently.

`docs/foreman/validation/scripts/lesson-ledger-p0-probe.js` is the other one — the free P0 measurement
whose result sits at the foot of the Lesson Ledger spec. Re-run it if the roadmap
grows enough to change the clustering answer.
