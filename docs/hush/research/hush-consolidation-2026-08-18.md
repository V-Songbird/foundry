# Hush consolidation — state, dispositions, and what is left

**Date:** 2026-08-18
**Status:** ACTIVE CONTRACT. This supersedes every other document's account of what
hush has left to do. Read it before proposing, picking, or building hush work.
**Start at section 11** — the 2026-08-19 close-out pass. It empties section 10.7:
the truth meter is built AND RUN, the three competitor items are closed, the
pre-commit docstring is fixed, and 1.6.4 is RELEASED AND PUSHED (hush f86fa04,
parent badb151, both CI green). Section 11.3 is the WHOLE remaining board.
Section 11.4 is the truth meter run. Section 11.5 says why the README swap was
NOT made, and what the three honest alternatives cost.
**Scope:** the `hush/` submodule plus the parent-repo surfaces that describe or
govern it — `ROADMAP.jsonl`, `docs/research/`, `docs/codex/hush/`, `docs/adr/`,
`.claude/rules/`, `benchmarks/hush/`, and the session memory store.
**Method:** a 15-agent blind audit swept seven surfaces, every finding re-checked by
an adversarial verifier whose default was to refute, then a completeness critic swept
for surfaces nobody read. 128 candidate findings, 10 refuted, 118 confirmed, 12 added
by the critic. A second 16-agent pass applied the confirmed set across eight disjoint
file groups, each group's diff reviewed by its own verifier.

---

## 1. Where hush actually stands

> **Second pass, 2026-08-18 (evening).** Every item in §2 now carries a ruling, and
> §6 is decided. The audit pass's two behaviour changes are released as **1.6.3**.
> T1.2 and T2.2 turned out to be measurable for free and are measured. The owner then
> authorised the honest-defect bundle, and **it ran**: $29.58 against a $33 estimate.
> **T1.3 is refuted** — its control scored 18/18, so the lever it wanted had nothing
> to fix. **T1.2's fix works on Sonnet**, and the same day's Opus batch showed the
> defect is model-specific. §6.4 prices what is left. §8 records the whole pass.

| | |
| --- | --- |
| Version | **1.6.3, released and pushed 2026-08-18** |
| Released commit | hush `6bd1ea5`, pinned in the root `marketplace.json` as `source.sha`; parent `d521440` |
| Working state | both repos clean and in sync with `origin/main`. hush's `main` carries three post-release commits, unreleased and correctly ahead of the pin: the reference-name gate comment, the session-state ignore, and the Haiku wording fix |
| Hooks | seven JS files under `hush/hooks/` plus `hooks.json` and five `hooks/lib/` modules |
| Skills | exactly two — `craft-style` and `pick-style` |
| Styles | stock `Hush` plus four presets — Glyph, Rock, Pirate, Sensei |
| Test suite | **498 passing, 61 suites, 0 failing** — and green with every `HUSH_*` flag exported |
| Benchmarks | the public harness lives in the **parent** repo at `benchmarks/hush/`; run data is local-only |
| Roadmap | 58 hush-touching entries — 55 done, 2 deferred (`057`, `059`), 1 planned (`250`, filed by this pass); plus `077` and `084` rejected |

The product is in good shape. The audit found no architectural defect, no broken
hook, and no gate the code fails to honour. What it found was **rot in the
description**: comments pointing at surfaces deleted a release ago, research
documents that finished their job and still read as live work orders, a public
README teaching a setting value that does not bind, and a memory store telling new
sessions about a product two releases old.

Six things are deleted and are never coming back. Every document that still
describes them has now been corrected or banner-marked, but if you meet them again
in an older file, they are gone: the **narration meter** (`narration-meter.js` and
its `hush-meter-<session>.json` state), the **stats dashboard** (`/hush:stats`), the
**Draft** surface, the **dead engine paths**, the **`hush-compress` skill**, and
three deleted presets — **`anchor.md`**, **Sightline** and **Chalkline**.

---

## 1b. What "ready" means, and where each part stands

The owner's bar for this pass was: apply the pending work, and leave a repo that
publishes only what hush ships. Written out as criteria, because "ready" was doing a
lot of work in one word.

| # | Criterion | State |
| --- | --- | --- |
| 1 | Every item in this document carries a ruling, not a shrug | **MET.** §2 has no undecided item left |
| 2 | Everything that could be settled without money is settled | **MET.** T1.1 by disclosure, T1.2 and T2.2 by measurement, T2.3/T2.4/Tier 4 by ruling, T3.4 half-closed by reading the code |
| 3 | Anything that needs money is priced, not hand-waved | **MET.** §6.4, eight options, `$6` to `$70`, per-run cost taken from the retained batches. The two the owner authorised then ran, for `$29.58` against a `$33` estimate |
| 4 | The shipped product matches its own documents | **MET.** 1.6.3 released and pushed; the two undocumented behaviour changes have a release note; the poster caption matches the run behind it |
| 5 | The suite is trustworthy | **MET.** 498/498, and 498/498 again with every `HUSH_*` flag exported |
| 6 | Nothing used to *develop* hush is published | **MET.** Verified against `origin/main` itself in both repos, not just the local tree — no `docs/`, no `plugins/`, no roadmap, no records, results or archives, no local agent or skill definitions. hush publishes 59 files, all of them product. Re-verified after the final push, and after two new record batches landed on disk |
| 7 | Nothing published is dev material in disguise | **MET.** Every tracked file classified; no run data, no reference names outside a `README.md` |
| 8 | Nothing was lost | **MET.** One directory was removed, backed up first. Everything else was kept — searched for, not assumed, see below |

**The one thing that was deleted, and why.** The owner offered a backup location
under `D:\Projects\Personal\Backups` in case a deletion could not be undone, which is
the right precaution for anything gitignored. It was used exactly once, for
`records/t31sonnet-ecc50178` — a batch whose 24 runs are all rate-limit error stubs,
carrying no cost, no usage and no `finalText`. It could never produce a claim set, and
the readiness gate requires one per batch, so that dead directory alone held points 8
and 10 at NOT MET and blocked any release. Copied to
`D:/Projects/Personal/Backups/claude-plugins/2026-08-18_hush-benchmark-records/` with
a README explaining it, then removed; the gate went straight back to 10 of 10. Trap 6
records the shape so the next session recognises it in minutes rather than hours.

**Nothing else was deleted, and that is a result rather than a skipped step.** The
search was real:

- **No junk.** A whole-repo sweep for `*.bak`, `*.orig`, `*.rej`, `*~`, `*.tmp`,
  `*.swp`, `*.old`, `.DS_Store` and `Thumbs.db` returns nothing. The audit pass had
  already removed the one stray editor backup that existed.
- **No orphans in scope.** Three research documents are unreferenced by
  `docs/shared/research/research-index.md`, and all three are foreman or razor scoped — outside this
  pass's scope, and not this pass's call.
- **No duplicates.** No two files anywhere under `docs/` are byte-identical.
- **Deletion is not this project's move for spent research.** The index carries
  explicit `## Superseded` and `## Historical` sections, and the audit pass corrected
  or banner-marked 21 documents rather than removing one. Deleting a finished report
  would destroy evidence the project deliberately keeps, and the consolidation
  documents exist precisely so an old file can be met and recognised as closed.

The one deletion this pass *could* have justified is the Codex dossier, now that the
port is closed (§6.3). It is kept for the same reason: `HEADLESS_PROBES.md` is
reproducible CLI evidence that still stands, and the closure is recorded in the
dossier itself rather than by erasing it.

**What "ready" deliberately does NOT mean.** It does not mean the roadmap is empty
and it does not mean every batch has run. `057` and `059` are `deferred` on an
external trigger, `250` is `planned`, and the remaining batch options wait on the
owner's go under the ask-before-batches rule. Those are *open work with a decided
disposition*, which is the finished state for a consolidation pass. A pass that ran
them on its own authority would be spending the owner's money without asking — which
is why the two that did run were proposed with arms, reps and a price first, and run
only after the owner picked them.

**One batch changed a decision, which is the point of running them.** T1.3 sat in
this document as a live defect with a shelved fix. Three reps said the defect does
not reproduce and the fix costs nothing to carry. No amount of argument would have
produced that; `$20.88` did.

---

## 2. What is left to build

Nothing here is in flight. Everything waits on a decision, a measurement, or a
trigger. Only `057`, `059` and `250` are roadmap entries; everything else in this
section lives here and nowhere else, which is the point of the document.

After the second pass, nothing in this section is undecided. T1.1 is closed by
disclosure, T1.2 and T2.2 are measured, T2.3 and T2.4 and every Tier 4 item are
ruled, and the four Tier 3 items are ruled and queued. What is left to *do* is a
priced menu of batches in §6.4, one build in T2.1, and one filed roadmap entry
(`250`). Nothing here is blocked on anything except money.

### Tier 1 — real gaps in the shipped product

**T1.1 — CLOSED 2026-08-18 by disclosure (ADR 0005).** The poster stays, plotted
from the retired suite, and its caption now names that suite beside the nudge
setting it already disclosed. ADR 0005 supersedes ADR 0001's same-records clause:
a hero may plot a retired run when the caption says so. Redrawing it on the
current six-job suite is still open and still needs a paid max-nudge batch — it is
now an improvement, not a defect. The original finding follows.

**The hero poster is plotted from a suite that no longer exists.**
`hush/README.md:9-11` shows `assets/hero.svg`, plotted from an 85-session run of a
17-task suite on 2026-08-06. Every table below it comes from the 6-job suite rebuilt
in 1.5.0 and re-measured for 1.6.0. ADR 0001 requires the poster and the Benchmarks
section to come from the same records. The caption discloses the nudge setting but
not the different suite. **No current record can regenerate it** — the local batches
under `benchmarks/hush/records/` carry no `HUSH_NUDGE=max` arm, so honouring ADR 0001
costs a fresh paid run. Owner decision, §6.1.

**T1.2 — MEASURED 2026-08-18, and it was never a paid batch.** `runner/caps.js`
scores cap conformance offline from the `finalText` every retained record already
carries; its own header says so. Scored against all three current-suite batches:

| batch | model | hush over-10w | `>12` lines | `;` | asides | longest |
| --- | --- | --- | --- | --- | --- | --- |
| `v18-c827bd6f` | Sonnet | **42.2%** (35/83) | 0 | 0 | 8 | 31w |
| `v18h-4031a4d4` | Haiku | **42.9%** (30/70) | 0 | 0 | 6 | 30w |
| `rxfinal-b8fa48a3` | Sonnet | **48.3%** (57/118) | 0 | 0 | 6 | 37w |

The 48.3% the finding quoted is confirmed exactly, and it is the worst of the three —
the current suite runs 42%. Two things the original finding did not have:

- **The word cap is the only cap hush misses.** Zero line-cap breaches in all three
  batches, zero semicolons, and by far the fewest parenthetical asides — 6 to 8
  against 28 to 44 for the other arms. The Register redo is working on everything
  except sentence length.
- **No arm on the board does better like-for-like.** In `v18`: baseline 59.2%,
  adhd 51.0%, ste 50.4%, caveman 42.9%, hush 42.2% — hush is lowest. In `rxfinal`,
  `hushstock` scores 59.6% against shipped hush's 48.3%, so the 1.6.0 tightening
  did move the number. Haiku's baseline scores lower (38.0%) but writes 121 units to
  hush's 70 and breaks the line cap five times where hush breaks it zero times.

**Disposition: a real gap against hush's own stated contract, and not a regression,
not a competitive weakness, and not urgent.** Any attempt to close it edits
`output-styles/hush.md`, which trap 1 makes a product change — so the *fix* needs an
A/B, even though the *measurement* was free. Re-run the number any time with
`node runner/caps.js --records records/<batch>` from `benchmarks/hush/`.

**CONFIRMED AT 3 REPS, 2026-08-19. Batch `capfixB-1f14a1b6`, Sonnet, 2 arms × 6
tasks × 3 reps, 36 runs, 18 paired cells.** This is the powered Sonnet-on-Sonnet run
the 2-rep result asked for, and it splits the finding in two.

| arm | units | over 10w | rate | 21-30 band | 31w+ band | longest | $/run | final words | ground truth |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hush` control | 122 | 60 | 49.2% | 14 | 1 | 31w | $0.366 | 77.1 | **18/18** |
| `secondfact` | 119 | 54 | 45.4% | **7** | **0** | **26w** | **$0.358** | **70.6** | 17/18 |

**The tail closes; the rate does not move.** Read the two halves separately, because
they do not say the same thing.

- **The tail is the real, repeated effect.** The 31-word-plus band empties in *both*
  batches — 4 to 0 in `capfixA`, 1 to 0 here — the 21-to-30 band halves, and the
  longest sentence lands on 26 words in both. That is two independent Sonnet batches
  agreeing, and it is the half of the item worth shipping.
- **The headline rate is noise at this sample.** 45.4% against 49.2% is 3.8 points,
  z ≈ 0.59. Pooling both batches (209 scored units per arm, legitimate here because
  `caps.js` scores `finalText` offline and no cache effect touches it) gives 43.1%
  against 48.3%, z ≈ 1.07, p ≈ 0.28. **Still not significant.** The 7.1-point gap the
  2-rep batch reported did not hold up, which is exactly what 2 reps cannot tell you.
- **It stays free.** Cost is a wash at −2%, the final message is 8% shorter, no line-cap
  breach and no semicolon in either arm.

**The one correctness miss is the scorer, not the arm.** `secondfact` scored 17/18
against the control's 18/18, on `incident-forensics__secondfact__r1`: 2 of 3 rubric
hits. That run named the root cause correctly — `dep-4471`, the connection pool — and
wrote the analysis to `INCIDENT_HANDOFF.md`. It lost the third keyword by writing a
**39-word** summary where every other run on that task wrote 126 to 153.
`runCheck` greps `finalText` and only reads workdir files when the task sets
`orFiles`, which `incident-forensics` does not. This is the retained
ground-truth trap: a keyword rubric punishes the terser arm for summarising instead of
restating. Not a regression, and not evidence the arm is safe either — one run is one run.

**Disposition: a defensible ship, described honestly as a tail fix.** The change is one
line in Register step 4 of `hush/output-styles/hush.md`, it costs nothing, it removes
the worst sentences in two independent batches, and `verify-style.js` derives its
Register clauses from the canonical file at run time, so no test hard-codes the old
wording. What it must **not** be published as is a conformance win — the rate did not
move. **Not shipped: a style edit is a product change, a release, and a README the
no-auto-publish rule reserves to the owner.** The 2-rep result follows.

**THE A/B RAN, 2026-08-18. Batch `capfixA-04ec9758`, Sonnet, 2 arms × 6 tasks × 2
reps, 24 runs, $8.70, 24/24 ground truth.** Candidate arm `secondfact` extends the
one Register step that demonstrably works — the *search* for `;`, `(` and `—` — to
also search for a comma before `and`, `so`, `but`, `which` or `because`.

| arm | units | over 10w | rate | 31w+ band | longest | $/run | final words |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `hush` control | 87 | 41 | **47.1%** | 4 | 33w | $0.372 | 79.8 |
| `secondfact` | 90 | 36 | **40.0%** | **0** | **26w** | **$0.353** | 74.8 |

**The candidate wins on every axis and costs nothing.** Conformance improves 7.1
points, the 31-word-plus band empties completely, the worst sentence drops from 33
words to 26, and the arm is slightly *cheaper* and slightly shorter. Correctness held
in both arms. The mechanism is confirmed as well as the result: the failure was a
conjunction gluing two facts into one sentence, which the style's own "one fact per
sentence" rule already forbade but never told the model to *look* for.

**Not yet shippable.** Two reps is not a powered result. The 11–15 band is unchanged
at 25 in both arms, so what moved is the tail, not the bulk. Shipping this edits the
measured product and invalidates every published figure, so it needs a confirming run
at 3+ reps first. **Next step: one Sonnet re-run at 3 reps, roughly `$14`.**

**THE DEFECT IS MODEL-SPECIFIC, and that was free to learn.** The Opus batch run the
same afternoon (`lf3A-f962e07d`, 36 runs) scores hush at **12.3%** over the 10-word
cap, longest sentence **19 words**, nothing above 20, nothing above 30, zero asides.
Against 47.1% and 33 words on Sonnet in the same week.

| model | batch | hush over-10w | 21w+ | longest | asides |
| --- | --- | --- | --- | --- | --- |
| Sonnet | `capfixA` | 47.1% | 7 | 33w | 5 |
| Opus | `lf3A` | **12.3%** | **0** | **19w** | **0** |

So the word cap is not broken. **Sonnet** breaks it and Opus keeps it, on the same
style file, the same tasks, the same week. That reframes the whole item: this is a
weaker model failing to follow a rule, not a rule that fails. It also means the usual
mandatory cross-model check cannot apply here in its normal form — an Opus arm has
almost no headroom to improve on 12.3%, so the confirming run is Sonnet-on-Sonnet.
The original finding follows.

**The shipped style breaks its own word cap on nearly half its sentences.**
A measurement taken while refuting other candidates found the hush arm over its
10-word cap on 48.3% of units (57/118) in one retained batch, longest sentence 37
words. That is the same class of defect that drove the whole 2026-08-06 conformance
campaign, which measured 35.5% against the then-15-word cap and shipped a
counting-redo fix for it. The 1.6.0 tightening from 15 words to 10 was published as a
reading-ease win with no conformance number beside it. The scorer is a regex pass
with a disclosed ceiling, so treat 48.3% as an upper bound — but it is unmeasured
either way. Source: `docs/shared/research/rival-idea-pass-2026-08-18.md:333-336`.

**T1.3 — RE-RUN 2026-08-18 AT 3 REPS. REFUTED on the current suite.** Batch
`lf3A-f962e07d`, Opus, 2 arms × 6 tasks × 3 reps, 36 runs, $20.88. This is exactly
the powered re-run the original report demanded, and it kills the item:

| arm | runs | ground truth | $/run | final words |
| --- | --- | --- | --- | --- |
| `hush` control | 18 | **18/18** | $0.583 | 67.9 |
| `lookfurther` | 18 | **18/18** | $0.577 | 67.5 |

**The control never failed once, so there was no gap for the lever to close.** Both
of the original claims fall together. The 32/34 that made this a defect does not
reproduce — the control is perfect at 3 reps. And the "costs about 20% more money"
that got the lever shelved does not reproduce either: the two arms are a wash, within
1% of each other on cost and within half a word on length.

Read it narrowly. The original was measured on the retired 17-task suite; this is the
current six-job suite, which may simply not contain the search-depth failure mode.
What is settled is that **this suite gives the lever nothing to fix and charges
nothing to carry it** — so the item cannot justify a style edit, and the cost
objection that shelved it is dead. Re-open it only with a task that actually
reproduces the miss. The original finding follows.

**hush stops searching early, and the one lever that fixed it was shelved.**
In failing Sonnet runs the target string never appears anywhere in the transcript —
hush never opened the file that held it. The `lookfurther` arm closed the gap (34/34
ground truth on Opus against the control's 32/34) and was shelved because it costs
about 20% more money. The re-run condition its own report set — 3+ reps, because
34-against-32 at 2 reps is not a powered result — was never met. The defect is still
open and the fix is still unshipped. Source:
`docs/hush/research/hush-silence-ceiling-2026-08-07.md:120-137,268-272`.

### Tier 2 — measurement debt

Every item here is a precondition for trusting a claim hush already makes. The
"free or nearly free" framing this tier shipped with did not survive the second
pass: T2.2 was genuinely free and is computed, but T2.1 and T2.3 both need a judge
model, so both cost money.

**T2.1 — NOT free after all; it needs a judge model.** The finding stands, but the
"offline and free" framing does not. `runner/retention.js` is the shape a claim
rescorer would copy, and it spawns a small judge model per report — a regex scorer
would be exactly the "contains the right nouns" failure the item is about. So a
claim-versus-ground-truth rescorer is a build plus a cheap paid pass, and it falls
under the ask-before-batches rule. Approved in principle, scoped as the next hush
build, not started. The original finding follows.

**Nothing anywhere checks whether the final message is true.**
`benchmarks/hush/runner/` scores words, cost, cap conformance, reading ease, and
blind retention of pre-frozen key details. A confident false conclusion that names
all the right identifiers wins on every one of them. Until a claim-vs-ground-truth
rescorer exists, every hush claim reduces to "shorter, and still contains the right
nouns", which is not "still correct". Offline, free, and ranked second of three in
its source's own shortlist. Source: `docs/shared/research/rival-idea-pass-2026-08-18.md:287-307`.

**T2.2 — COMPUTED 2026-08-18. The gate does not fire, and the instrument is
incomplete.** Local `HUSH_DEBUG` manifests under `%TEMP%`: 7,016 files, 39,905
records, 6,217 sessions.

| | |
| --- | --- |
| Records that are a `Read` of a parked sidecar | 855, across 847 sessions — 13.6% of all sessions |
| Records carrying `recovery: "sidecar"` | 784, across 707 sessions |
| Sessions that both parked and retrieved | 8 |

Retrieval is **not** near-zero, so the "freeze `DIGEST_HEAD` / `DIGEST_TAIL` /
`DIGEST_SIGNAL_SAMPLE` for good" outcome does not fire. The model does come back to
parked files, and digest quality still matters.

An exact rate is not computable from the record as it stands. A shell output that
was parked records `recovery: "rerun-command"` with a null `recoveryPath`, because
re-running the command is a genuine recovery route — so the sidecar it also wrote is
invisible to any count keyed on the recovery kind. That is why 839 sessions show a
retrieval with no park beside it, and why the two counts above cannot be divided.
**Precondition for an exact rate: record the sidecar path whenever one is written,
independent of the recovery kind.** That is roadmap entry `250`, filed 2026-08-18 —
so hush now has three open entries, not two. Original finding:
`docs/hush/research/hush-context-engineering-recon-2026-08-06.md:104-146`.

**T2.3 — DECIDED 2026-08-18: the number stays unpublished** (§6.2). The clean
pre-registered batch needs a judge pass, so re-opening it means authorising a batch.
The original finding follows.

**The retention meter's clean re-read never ran, and its number is unpublished.**
`benchmarks/hush/runner/retention.js` shipped with 1.6.0 and scored 95.7%. Its keys
were authored after that session saw its own outputs, which is disclosed in the file,
and the promised clean pre-registered batch never ran. The number is deliberately not
in the README pending an owner call. Source:
`docs/hush/research/hush-reading-benchmark-win-2026-08-11.md:79-107`. Owner decision, §6.2.

**T2.4 — DECIDED 2026-08-18: the arms are kept, the run is a paid batch** (§6.5).
The original finding follows.

**Three style arms were built and never run.**
`docs/research/rival-arms-2026-08-07/` holds `rival-arms-2026-08-07/edits-nextfact.json`,
`rival-arms-2026-08-07/edits-combo.json` and `rival-arms-2026-08-07/edits-parts.json`. No report anywhere covers any of them, and
`nextfact` is the exact follow-up the head-to-head report asked for: target the
collision directly rather than adding a redo step. The arms exist; only the run is
missing.

### Tier 3 — RULED 2026-08-18, still held behind a paid batch

**T3.1 — RUN ON BOTH MODELS 2026-08-19. REJECTED: the tax is real, and it comes
straight back as output.** Batches `t31sonnet-ecc50178` (Sonnet, $9.11) and
`t31opus-41d78f4f` (Opus, $10.48 + a resume), 2 arms × 6 tasks × 2 reps each. The arm
`t31deliver` is shipped hush with `output-styles/` **deleted** and the identical style
body — byte-for-byte, verified — injected by `silence-nudge.js` on the first
`UserPromptSubmit` of the session, once, behind a tmpdir sentinel. Arm at
`X:/Temp/hush-arms/t31deliver`, settings `{}` so the session runs `outputStyle:
"default"`.

**The premise is confirmed to the token.** `hush/output-styles/hush.md` is 141 lines /
1,859 words / 10,634 bytes, ≈2,642 tokens by chars÷4. Reading the first API call of
every session isolates the static prompt, and the two arms differ by almost exactly
that, on both models and 24 runs each:

| model | `hush` first call | `t31deliver` first call | difference |
| --- | --- | --- | --- |
| Sonnet | 32,417 (range 32,392–32,422) | 29,798 (29,763–29,805) | **−2,619** |
| Opus | 25,874 (25,849–25,879) | 23,250 (23,222–23,266) | **−2,624** |

**And the injected body genuinely arrives.** Verified behaviourally rather than by
token arithmetic, because the arithmetic above says the opposite: with the resident
style gone, `claude -p "Answer with one word only. Do your instructions anywhere
contain the exact phrase: a warm, patient friend? yes or no"` against the arm answers
**yes**. So there is no size cap on `additionalContext` in headless mode — a hook can
carry a 10,435-character style body. **How both facts hold at once was not resolved;
trust the probe, not the cache split, and do not build on that gap.**

**What it costs: the voice.** Sonnet, 12 paired cells, both arms 12/12 ground truth:

| arm | $/run | traffic/run | final words | narration words | over 10w | `;` | asides | longest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hush` resident | $0.369 | 397,454 | **73.6** | **5.3** | 56.6% | **0** | **5** | 35w |
| `t31deliver` hook | $0.391 | 438,646 | 96.8 | 14.4 | 57.1% | 2 | 19 | 40w |

- **The final message gets longer on every task.** Per task, Sonnet, `hush` →
  `t31deliver`: 65→83, 31→32, 19→50, 132→201, 148→169, 47→47. **Six of six, never
  shorter.**
- **The narration comes back.** 5.3 → 14.4 words of mid-turn play-by-play, +172%. The
  first assistant line of an Opus run reads `I'll dig into the log now.` — the exact
  sentence the Mid-turn silence section exists to prevent.
- **The punctuation rules stop binding.** Zero semicolons and 5 asides resident,
  against 2 semicolons and **19** asides hook-delivered. That is the search-for-a-mark
  step in Register — the one step the `secondfact` A/B proved actually works — going
  quiet.
- **The saving does not reach the bill.** Cost +6% and context traffic +10% overall.
  Per segment it is mixed rather than uniform: `noisy-output` is genuinely cheaper
  hook-delivered ($0.180 vs $0.215, CIs do not overlap), `search-heavy` is dearer
  ($0.827 vs $0.621, n=2). The cheap sessions bank the 2,619 tokens; the expensive ones
  hand it back with interest.

**Opus says the same thing, three times louder.** 12 paired cells, both arms 12/12
ground truth:

| arm | $/run | traffic/run | final words | over 10w | `>12` lines | `;` | asides | longest |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hush` resident | $0.654 | 429,783 | **76.1** | **11.5%** | **0** | **0** | **0** | **19w** |
| `t31deliver` hook | $0.671 | 445,546 | 255.4 | 33.9% | **6** | 3 | 13 | 33w |

**The final message goes to 3.4× the length, and the caps stop existing.** Shipped hush
on Opus is the tightest arm this harness has ever scored — 11.5% over the word cap,
zero line-cap breaches, zero semicolons, zero parenthetical asides, longest sentence 19
words. Hand the identical text to the model through a hook instead and it writes 255
words, breaks the line cap **six times**, and its worst task, `incident-forensics`,
goes from **93 words to 722**. Per task the arm is longer on five of six.

**Verdict: T3.1 is REJECTED, and it closes the delivery-channel question for good.**
The 2,620-token resident tax is real, and it is the price of the style working at all.
An output style bound in the style slot shapes the reply; the same bytes delivered as
context are read and then largely ignored — on both models, harder on the stronger one.
Cost moves 3–6% against the hook arm, so there is not even a bill to trade the voice
for. **Do not re-propose moving `output-styles/hush.md` out of the style slot.** The
arms stay on disk at `X:/Temp/hush-arms/t31deliver` if anyone wants to re-check it.


Each of these needs a measured run authorised before anything can ship. None of them
should be built on argument alone. Rulings and prices added by the second pass:

| Item | Ruling |
| --- | --- |
| T3.1 | **Premise re-measured 2026-08-18, and it got stronger.** `output-styles/hush.md` was 9,810 bytes / 129 lines / 1,715 words at the 1.1.0 commit `158f475`, where the 3,566-token fixed tax was measured, and is 10,634 / 141 / 1,859 at 1.6.3 — **+8.4%**. So the resident slice this item wants to move is now roughly **2,690 tokens**, not 2,483, and the fixed tax roughly 3,770. A chars÷4 estimate of the current file lands at 2,659, which corroborates it. **RUN AND REJECTED 2026-08-19 on both models — see the block above this table.** The prior was wrong: delivery lost, and lost the same way on Sonnet and Opus. The tax is exactly the file (−2,619 Sonnet, −2,624 Opus on the first call) and it returns as output length, narration and banned punctuation. |
| T3.2 | **Inherits T3.1's result, 2026-08-19.** Both are delivery-channel questions, and the cheaper one came back rejected: a style that is not resident does not bind, whatever hook carries it. A turn-boundary hook is still arguable as a *reminder* channel — hush already uses one — but not as a place to move the style. Re-open only for the reminder question, never for the tax. |
| T3.3 | **Build first, then measure.** No harness has a fan-out arm, so this is not a batch you can authorise today — someone has to write the arm. Lowest priority of the four: it prices a number nobody has complained about. |
| T3.4 | **Half of it is already closed, for free.** The look-alike half is a *disclosed, accepted limitation*: `hush/SECURITY.md` says a `[hush …]`-shaped line inside a file's own bytes is that file's content and deserves the same caution as any other text, and the code agrees — `HUSH_MARKER_RE` is used only for line accounting and nothing sanitizes attacker-supplied marker text. Only the first half is still open: whether telling the model to trust the markers moves its behaviour at all. One cheap session. |

| Item | What it would settle | Source |
| --- | --- | --- |
| **T3.1 — Resident style file versus hook-delivered** | `hush/output-styles/hush.md` is about 140 lines resident on every turn and is 2,483 of hush's measured 3,566-token fixed prompt tax. The one time hush tested delivery against wording, delivery won decisively. This has never been tested. | `rival-idea-pass-2026-08-18.md:238-249` |
| **T3.2 — A turn-boundary hook** | Four independent sources converge on intervening exactly once at the turn boundary. hush registers no turn-boundary hook at all. The one `Stop` design was refuted on delivery cost, which does not touch the claim underneath it. | `rival-idea-pass-2026-08-18.md:221-237` |
| **T3.3 — The subagent multiplier** | Every published per-session number comes from a single-agent run. `subagent-brief.js` fires on every `SubagentStart`, and no harness has a fan-out arm. Nobody has priced it. | `rival-idea-pass-2026-08-18.md:309-315` |
| **T3.4 — The marker-spoof probe** | Whether telling the model to trust `[hush …]` markers actually moves its behaviour, and whether a look-alike line inside a file's own bytes can exploit that trust. One cheap session. | `hush-context-engineering-recon-2026-08-06.md:118` |

### Tier 4 — DECIDED 2026-08-18

The owner delegated these for this pass. Every one now carries a ruling; the
original text is kept underneath each so a later session can re-open it knowing
what was actually proposed.

| Item | Ruling |
| --- | --- |
| T4.1 — five style candidates | **Held behind measurement**, except C6. All of C3/C5/C7/C8 edit `output-styles/hush.md`, which trap 1 makes a product change that invalidates every published figure — none may ship on argument. **C6 is cut**: hush's README already carries `## Good to know`, which is the will/won't contract that candidate asked for. |
| T4.2 — two SimpleEnglish riders | **Held behind measurement.** Both are edits to the same measured style file, and one is already orphaned from a refuted hypothesis. |
| T4.3 — the wave-log candidates | **Partly built, rest cut.** The ambient-flag candidate was verified live and is fixed in 1.6.3 — `HUSH_DISABLE=1` in the shell turned 83 tests red, and the suite is now green with every flag exported. The style-slot gitignore candidate is fixed in 1.6.3 too. The Grep-manifest candidate was closed by the audit pass. The rest are either recorded as T4.4 deferrals or speculative with no trigger — cut. |
| T4.4 — five in-code deferrals | **Closed as recorded.** §4 is now their home, each with its trigger. Nothing to build until a trigger fires. Deferral 3 (an orphaned sidecar after a rejected rewrite) has a second witness in the 07-28 wave log. |
| T4.5 — the parked Hush Aligned style | **Retired.** Its file is gone from disk, and the nine paired finals show it losing on both axes it was built to win — 26 words against stock's 24, $0.148 against $0.143. Rebuilding it is a fresh decision, not a resumed one. |
| T4.6 — hush's Codex port | **Closed.** See §6.3. |

- **T4.1 — Five fml candidates.** C3 "name the one check, not the list of maybes"
  (two-source convergence, upgraded), C5 personality-as-a-budget, C6 a will/won't
  contract as a README section (free, and hush states no refusals at all), C7 a
  one-turn persona, C8 a dense calibration block of worked pairs (weakened, and
  measure-first). Sources: `fml-idea-pass-2026-08-17.md:204-360` and
  `rival-idea-pass-2026-08-18.md:192-208`.
- **T4.2 — Two SimpleEnglish riders.** How a backticked identifier counts toward the
  word cap, orphaned when the hypothesis it was riding on was refuted; and
  condition-before-command as a reply rule, parked and explicitly not refuted.
  Source: `hush-simple-english-mining-2026-08-06.md:272-278,294`.
- **T4.3 — Seventeen wave-log candidates that were never filed.** Five wave blocks of
  the 07-28 remediation report end with a "surfaced, not acted on, need user go" list
  and none became a roadmap entry. Three are verified still live in shipped code.
  Source: `hush-groundtruth-and-delivery-strategy-2026-07-28.md:139,163,176,189,203`.
- **T4.4 — Five in-code upgrade paths.** `sidecar-store.js`, `precompact-summary.js`,
  `transform-manifest.js` and two sites in `compress-tool-output.js` each carry a
  deliberate "upgrade path if this ever bites" note. Each is a real design deferral
  with a real trigger, and none is tracked anywhere a session would look.
- **T4.5 — The parked Hush Aligned style.** A crafted style with nine paired verbatim
  finals against stock and no verdict section, no ship rule, and no recommendation.
  Its style file no longer exists on disk; the comparison document is its only record.
  Source: `hush-aligned-comparison-2026-07-19.md`.
- **T4.6 — hush's Codex port.** hush is the only sibling whose Codex port was never
  built — `plugins/` holds `foreman-codex` and `razor-codex` as complete plugin trees,
  and `docs/codex/hush/` is the only dossier with its own ADR, still `status:
  proposed`. The blanket 2026-07-17 porting deferral is offered as its disposition,
  but two of the three ports were built anyway, so that deferral does not actually
  cover it. Owner decision, §6.3.

### Tier 5 — deferred, with triggers that can still fire

| Entry | Waits for |
| --- | --- |
| `057` — formalize the harness adapter shared by all seven hooks | an explicit request to port hush to another agent CLI |
| `059` — golden contract-fixture suite for the seven hooks | the same trigger; it depends on `057` |

**Both re-checked 2026-08-18 and kept deferred, with the trigger narrowed.** Closing
hush's Codex port (§6.3) removed the only port ever proposed for hush, so the trigger
survives only as a *future* request and is materially less likely to fire. Kept
rather than dropped, because the specs are the expensive half and both are already
written. Two corrections went in through `roadmap.js` at the same time: `057`'s
verification line cited 499 tests and now cites 498, and `059`'s notes still named
`hush-meter-<session>.json` and "narration-meter scenarios" for a meter deleted at
1.0 — annotated, because `notes` is append-only. `059` also now records that
`tests/helpers.js` clears ambient `HUSH_*` at load, which a contract runner spawning
its own children has to reuse or reproduce.

One entry is `planned` rather than deferred: **`250`**, filed by this pass — record
the sidecar path in the debug manifest whenever one is written. It is the
precondition for an exact retrieval rate; see T2.2.

Both were re-anchored in the audit pass. Their descriptions cited a deleted hook, a
deleted state file, and a test count from before 1.0; a session picking either up
would have started by editing a file that does not exist.

**Reviewed 2026-08-18: both stay deferred, and their trigger just got further away.**
Closing the Codex port (§6.3) removed the only concrete second agent CLI that was
ever in view, so the trigger is now hypothetical rather than pending. Deferred is
still the right status — the designs are sound and cost nothing to hold, and
rejecting an entry whose trigger *could* fire would throw away considered work to
tidy a list. Neither is a defect, and nothing degrades while they wait.

---

## 3. What is cut, and must not be re-proposed

Each of these was decided, with a reason. They are listed so a fresh session meeting
them in an old document recognises them as closed rather than forgotten.

| Idea | Disposition |
| --- | --- |
| The narration meter | **deleted** at 1.0, entry 213. Its hook, its state file, and its `Stop` no-op are all gone |
| The stats dashboard (`/hush:stats`) | **deleted** at 1.0, entry 211. The trust boundary it guarded was kept |
| The Draft surface | **deleted** at 1.0, entry 210 |
| The dead engine paths | **deleted** at 1.0, entry 212 |
| The `hush-compress` skill | **deleted** at 1.0. Any idea whose target is that skill is dead with it |
| `anchor.md`, Sightline, Chalkline presets | **deleted**. Four presets ship: Glyph, Rock, Pirate, Sensei |
| Beating rival plugins on tokens or cost | **settled unreachable**. hush's fixed prompt tax is 3,566 tokens per session, so cost-wins-everywhere cannot happen. Silence is the moat |
| `nextstep`, `firstcall`, `firstcall2`, `opener` | **refuted** as levers against the model's turn-opening line |
| File density as a lever | **refuted**. Shortening the sentences inside the style file made the replies *longer* |
| An 8-word sentence cap | **backfired**. 10 is the shipped cap |
| The `## Explaining` section | **deleted** 2026-07-28 after measurement against four alternatives. A swap-don't-gloss rule replaced it |
| Mermaid for flows and shapes | **cut** at 1.6.2. No Claude Code surface renders it; shapes are sketched as plain text in a code block |
| A mandatory opening or closing line | **cut**. Measured indifferent to its content; the voice carries without it |
| Entry `077` — closing the razor-pair verdict narration leak | **rejected** |
| Entry `084` — a hook-delivered style marker line for weak presets | **rejected** |
| Committing benchmark records as evidence | **reversed** by ADR 0004 on 2026-08-11. Records stay local; the harness in the repo is the published way to regenerate them |

**One prohibition is now superseded.** The 2026-08-06 head-to-head report's point 4
said "do not add a rival-comparison table", and `hush/README.md` has carried exactly
such a table since 1.2.1 — the reading-effort comparison, which is now the product's
strongest published claim. The prohibition was written before the reading benchmark
existed and it lost. It is dead; the table stays.

---

## 4. What this pass changed

Two behaviours changed. Everything else is a comment, a document, a test, a manifest
field, a roadmap field, or a memory entry.

**Runtime.** Eight comment blocks naming the sibling plugin are gone from hush's
shipped code, along with the fabricated `CONTRIBUTING.md` rule one of them cited and
a "copy this into both plugin copies" instruction written from inside a copy. Four
comments citing `ROADMAP.jsonl` entry ids are gone — hush ships standalone and that
file is parent-local and gitignored, so no reader of the public repo could ever
resolve them. Their design record is preserved at the end of this section. A comment
anchoring sidecar retention to "the meter's state files" is gone; the meter was
deleted a release ago. Six exported symbols with no reader anywhere, one alias
constant that existed only to be exported, and one CLI flag no caller passes were
deleted. `verify-style.js` lost 46 net lines by collapsing a near-duplicate function
into a flag on the original. Five "upgrade path if this ever bites" deferrals were
cut from the code and are recorded below instead.

**Two behaviour changes, both closing a real defect, both unreleased.**
A `Grep` response in `files_with_matches` or `count` mode now writes its
passthrough record to the debug manifest instead of returning early, which is what
the manifest's own contract always said it did. And `verify-style.js` now requires a
style's description to *end with* the exact marker sentence that `list-styles.js` and
`activate-style.js` key on, rather than merely containing the word "unmeasured" — a
style could previously pass the verifier, activate, and still be invisible to the
shelf. **Neither is in the CHANGELOG, because this pass cuts no release.** Both need
a release note at the next cut.

**Tests.** A property test whose oracle was the production predicate it was meant to
check, against a harness that pre-filled the field that predicate reads, could not
fail for any input; it is gone. Two imports left over from the deleted delta-read
feature bound silently to `undefined`; gone, with the coverage gap they were hiding
now named. A duplicate test asserting the identical contract on the identical fixture
is gone, as is a dead roster entry describing a preset deleted months ago. The suite
count moved down accordingly — the released 1.6.2 tree runs 499, and this branch runs
fewer because vacuous tests were removed, not because coverage was lost.

**Public documents.** The README taught `"outputStyle": "Hush"`. That value does not
bind, and it is also the exact string `activate-style.js` deletes on the first
`/hush:pick-style` activation — so a user following the README got the setting
silently removed. It now teaches `"outputStyle": "hush:Hush"`, which binds and which
activation leaves alone. A `### Better together` subsection sat inside `## Benchmarks`
carrying no benchmark; it is gone, and the Install line that pointed down at it now
carries the cross-sell itself. `HUSH_DEBUG` now says where it writes. Two CHANGELOG
entries told users the run records behind the published numbers were committed and
available; under ADR 0004 they are not and never will be, so the claim is cut. Two
`../razor` links that 404 in the standalone repo now use the full URL. CI gained the
manifest-parse step hush was the only plugin missing.

**Styles and skills.** `styles/README.md` claimed every preset runs under stock's
hard caps; three of the four deliberately do not, and the claim — not the presets —
was the defect. Glyph banned explanation outright, losing stock's rule that anything
the user asked to have explained is never compressed; that one carve-out is back, in
Glyph's voice. Pirate is held to stock's full frame and its Register redo had lost
every cap-counting step; they are back, in Pirate's voice. In the stock style itself,
exactly two edits: the line-count redo step now carries the shape-sketch exemption
the rules above it already granted, and the canonical good/bad exemplar pair no
longer names another plugin's artifact in the one file the model reads every turn.

**Benchmarks.** The public repro README named a task with no fixture and predicted a
result the plugin README contradicts. The record writer's header still told readers
records are safe to check into a repo — the exact policy ADR 0004 retired. The
readiness gate's point 10 claimed the suite "publishes auditable run data", which it
cannot. A `--full` flag documented as doing more than the default did exactly the
default. The gate's own self-test built a fixture plugin whose skills were deleted a
release ago.

**Research record.** Twenty-one documents were corrected. The two indexed as active
contracts that had in fact finished — the v1 ship plan and the 07-28 groundtruth
report — are re-indexed as historical and banner-marked. The ship plan's §6 rule 6,
which forbade editing `output-styles/hush.md`, is explicitly killed: two shipped
releases have edited that file since, so a future session obeying the rule would have
been obeying a lie. Four intel documents closing with imperative "recommended
sequence" sections aimed at deleted code are banner-marked with what actually died and
what still stands. `../../shared/research/rival-idea-pass-2026-08-18.md`, the newest and richest source of
open hush candidates, was missing from the index entirely and is now in it, as is this
document.

**Governance.** The parent README described two dev hooks where three are registered,
and the missing one is the hook that governs how hush work gets committed. `docs/codex/hush/`
now says plainly that it describes a hush that no longer exists in several places.
Two ADR Consequences lines naming assets were checked path by path and only the
genuinely missing ones corrected, dated. A stray editor backup of the README template
was deleted.

**Roadmap.** `057` and `059` are the only open hush entries, and both were
unpickable: they specified themselves against a hook that was deleted, a state file
that no longer exists, and a test count from before 1.0. Both were corrected through
`roadmap.js` and annotated with what changed. Neither status moved; both still wait
on the same trigger.

**Memory.** Ten hush memory files became four. The index announced 1.5.0 as current,
two releases behind. The state file declared its own current state three separate
times at three different versions. Two files gave contradictory accounts of the same
measurement. One shut a "never spend here again" door using numbers measured on a
nudge cadence that stopped being the default two releases later — that claim is now
version-stamped rather than absolute, and whether the door reopens is §6. Six memories
named crafted style files under a directory that does not exist. The competitor
shortlist still said "nothing built" with four of its nine items shipped. Everything
that survived is stamped with the version it was measured on, and every file's
dangling links were repaired.

**Two frozen files, deliberately unfixed.** `scripts/git-hooks/check-reference-names.js`
still explains its exemption with the retired committed-records policy, and
`scripts/git-hooks/pre-commit` still claims to be a canonical source it is a copy of.
Both are byte-synced across four repos with a test asserting it. See §6.6.
*Superseded 2026-08-18: the first of the two was corrected in all four copies once a
three-plugin change came along. Only `pre-commit` is still frozen.*

**A third round fixed the second round.** Verifiers read every diff of the applying
pass and found 33 problems with it, all repaired: banners that declared a whole
document dead when four of its five items were alive; a diagnostic message naming one
of the two markers it accepts; a released version heading left with an empty body
after its only line was cut; a Register redo step in one preset that gained a line
count without the shape-sketch exemption stock had just been given; a rule amended in
a way that still did not describe the file it was amended for; an ADR correction line
that stated something false about which assets are outstanding; and a memory file that
stamped this branch's test count onto the released build. The lesson worth keeping:
**a cleanup pass needs its own adversary.** Roughly a quarter of the first round's
edits were wrong in a way only a reader with the file open could see.

**Two memory files were left alone on purpose.** `project_benchmarks_harness.md` is
45 KB and mixes durable harness traps with 2026-07 alpha-era run narration about hush,
including a "STATE … NEXT: awaiting the user's go for run 4" block that has been dead
for a month. It is shared with the other two plugins, so trimming it is not a
hush-scoped act. Its links and its traps are correct; its shape is not. It wants its
own pass.

### The design record the deleted comments pointed at

Four `ROADMAP <id>:` citations were removed from hush's shipped code and eleven more
from its tests. The entries are all `done` and all parent-local. The mapping, so the
design record stays reachable:

| Entry | What it specified |
| --- | --- |
| `164` | the common transform and recovery manifest contract |
| `165` | session-scoped sidecar retention and cleanup |
| `166` | preserving native failure semantics, with recoverable digests |
| `167` | making template and search elision explicitly recoverable |

### The five in-code deferrals that were cut

Each was a real design decision with a real trigger. They were the only record of
themselves, sitting in shipped comments where nothing would ever pick them up:

1. **`sidecar-store.js`** — directory mtime is the liveness signal, so a session that
   wrote no sidecar for a full day would be swept as stale. *If that ever matters: a
   heartbeat file the compress hook touches on every write.*
2. **`precompact-summary.js`** — the parked-file listing is capped. *If a session ever
   parks enough that this bites: list them all, or fold the listing into the directory
   reference alone.*
3. **`compress-tool-output.js`** — a rewrite rejected downstream leaves its persisted
   copy behind unread. *If it ever matters: size-check against the prospective path
   first, since the file name is a pure function of the content.*
4. **`compress-tool-output.js`** — with two sidecar-sized fields the record names only
   the last one. *A per-field record list would fix it; every digest already carries
   its own file pointer inline, so nothing is unreachable today.*
5. **`transform-manifest.js`** — the manifest merge is shallow by design, top-level
   keys only. *A transform that rewrites a nested field would need a deep merge.*

### One cross-repo fact the deleted comment carried

`hush/hooks/lib/safe-write.js` and its twin in the sibling plugin were byte-identical
at hush `96370e3` and now differ in the header comment only. **Any functional change
to `safeWriteFileSync` must be mirrored into both copies in the same commit.**
---

## 5. Traps a new session must know

1. **`hush/output-styles/hush.md` is the measured product.** Every number in the
   README was produced by that exact file. An edit there is a product change, not a
   wording change, and it invalidates the published figures. Its frontmatter also
   carries `force-for-plugin: true` and `keep-coding-instructions: true` — both are
   load-bearing.
2. **The style's name is a cross-repo contract.** Frontmatter `name: Hush` binds as
   the plugin-namespaced `hush:Hush`. Both `benchmarks/hush/settings-hush.json` and
   `benchmarks/foreman/settings-trio.json` pin that exact string, so renaming hush's
   style silently breaks foreman's trio benchmark. `scripts/activate-style.js` strips
   a bare `"Hush"` pin on activation and leaves the namespaced one alone — which is
   why the README teaches the namespaced form.
3. **`scripts/verify-style.js` pins literal phrases lifted out of the canonical style
   file.** Reword the canonical file and the verifier silently goes stale rather than
   failing. Run `node --test tests/verify_style.test.js` after any style edit. It also
   now requires a style's description to *end with* one of two exact sentences —
   `Unmeasured variant of Hush.` for a crafted style, `Unmeasured preset shipped with
   Hush.` for a bundled preset — because `list-styles.js` and `activate-style.js` key
   on those literals. Merely mentioning "unmeasured" no longer passes.
4. **The canonical style fails its own verifier, by design.** `verify-style.js` run
   against `output-styles/hush.md` itself reports `force-for-plugin must not be
   copied`, and a test asserts exactly that. A red result there is not a regression.
5. **`scripts/git-hooks/check-reference-names.js` is byte-synced across four repos** —
   the parent and all three plugins — and the parent's own
   `check-reference-names.test.js` asserts it in a `mirrored copies` block, skipping
   any plugin that is not checked out. Never edit one copy alone. `pre-commit` is
   *not* in that contract and legitimately differs per repo: the parent's carries the
   marketplace-sync check, the plugins' carry the plugin template. Verified
   2026-08-18: all four `check-reference-names.js` copies are identical.
6. **A rate-limited batch silently blocks the readiness gate, and the gate does not
   say why.** Point 8 reports only `the check itself failed: no records to publish`.
   The cause is that the gate requires *every* directory under `records/` to carry a
   generated `published/claims.md`, and `runner/publish.js` throws on a batch whose
   runs are all error stubs. A session that hits `You've hit your session limit`
   mid-batch leaves exactly that: 24 files of `"error": "rate limited: ..."` with no
   cost, no usage and no `finalText`. Points 8 and 10 then read NOT MET and a release
   is blocked, with nothing in the output pointing at the dead batch. **After any
   batch, run `node runner/publish.js --records records/<batch>`** — the runner prints
   that command for you. If it throws, the batch is dead: back it up and remove the
   directory, because it can never satisfy the gate. Hit on 2026-08-18 by
   `t31sonnet-ecc50178`; backup and reasoning in
   `D:/Projects/Personal/Backups/claude-plugins/2026-08-18_hush-benchmark-records/`.

   **The other half of the same trap, found 2026-08-19: `--resume` repairs
   `results/`, never `records/`.** A rate-limited run retains an error stub, and
   `records.js:166` writes with `wx` — write-once, on purpose, because evidence that
   can be quietly rewritten is not evidence. So the retry's real run hits `EEXIST`,
   the runner prints `RETAIN-SKIP <key>` and carries on, and the stub stays. The
   batch then reads clean in `results/<tag>/runs` and half-dead in
   `records/<batch>` — and every scorer, `publish.js` and the readiness gate read
   `records/`. `capfixB-1f14a1b6` hit it with 15 stubs against 36 clean runs.
   **Check both directories after any batch that logged a rate limit**, not just the
   one the runner prints. The repair is the one `records.js` names in its own
   comment — delete the file by hand, then write the run: back the stub up, clear its
   `0444` mode, unlink it, and re-write from `results/` through the exported
   `writeRecord`, which re-sanitizes and re-hashes it exactly as the runner would.
   `docs/hush/research/scripts/hush-repair-records.js` does that, dry by default and `--apply` to
   commit; stubs are copied to
   `D:/Projects/Personal/Backups/claude-plugins/2026-08-19_hush-record-stubs/` first.
   Re-run `publish.js` afterwards — the claim set generated from the stubbed batch is
   wrong and `published/` has to be removed before it will regenerate.
7. **`benchmarks/hush/` lives in the parent repo, not in the plugin.** Its
   `records/`, `records-archive/` and `results/` are gitignored by
   `benchmarks/hush/.gitignore`. Never `git add` any of them; the readiness gate reads
   records from disk, not from git.
8. **`hush/.claude-plugin/plugin.json` carries no `version` field.** Version and
   `source.sha` live only in the root `marketplace.json`, enforced by the parent's
   pre-commit hook and by CI.
9. **Any commit inside `hush/` moves the submodule off its pinned `source.sha`.**
   Working ahead of the pin is the normal state between releases; cutting the release
   is a separate, owner-approved step.
10. **`/docs/*` is gitignored in the parent.** Every research document, every ADR and
   the whole `docs/codex/` dossier is local-only and never reaches a clone. This
   document is one of them.
11. **`ROADMAP.jsonl` is gitignored and is written only through
   `foreman/scripts/roadmap.js`.** A guard hook blocks `Edit` and `Write`, and direct
   writes corrupt id computation. Use `correct` for stale descriptions and `annotate`
   for a dated breadcrumb; `notes` is append-only.
12. **Competitor and sibling-plugin names are allowed only inside a plugin's
    `README.md`.** Anywhere else in a plugin repo — comments, tests, CHANGELOG,
    manifests, commit messages — the commit gate blocks them, and this pass removed
    the ones that had accumulated in hush's runtime comments.

---

## 6. Open decisions — five decided 2026-08-18, three still cost money

The owner delegated every decision that did not need a paid batch. Those are ruled
below. The three that need money are unchanged and still waiting.

1. **The hero poster — DECIDED: disclose.** `assets/hero.svg` stays, plotted from
   the retired 17-task suite, and its caption now names that suite beside the
   `HUSH_NUDGE=max` setting it already disclosed. **ADR 0005** supersedes ADR 0001's
   same-records clause; ADR 0001's Status and Consequences point at it. Retiring the
   poster was not available — ADR 0001 makes the name-as-metaphor hero a permanent
   house rule. Redrawing it on the current six-job suite is item 4 below.
2. **The retention number — DECIDED: leave unpublished.** 95.7% stays in the harness
   and out of the README. Its keys were authored after that session saw its own
   outputs, and the clean pre-registered batch that would fix that costs money, which
   the ask-before-batches rule reserves to the owner. Publishing a measured number
   with a disclosed provenance defect is also exactly what the no-auto-publish rule
   forbids. Re-open it by authorising the clean batch, not by arguing.
3. **hush's Codex port — DECIDED: closed, not built.** `docs/codex/hush/adr/0001`
   is now `status: closed` and the dossier README says so at the top. Three reasons:
   nothing asks for it; the dossier's own Verdict says a Codex port cannot truthfully
   promise the forced single-final-message style, which is the whole product; and
   every hush-side claim in it is a 2026-07-20 snapshot, so building it would start
   by re-deriving the entire capability matrix. Reopening is a fresh decision.
4. **The paid batches, priced on Sonnet and Opus.** T1.2 is off this list — it was
   scorable offline and is measured. **Haiku is off the whole harness**: the owner
   retired it from measurement on 2026-08-18 because it is not a gen-5 model, so
   `benchmarks/hush/config.json` now defaults to `sonnet` and the harness README
   teaches `--model sonnet|opus`.

   Per-run cost, from the retained batches themselves. Sonnet on the current six-job
   suite is **$0.375** (`v18`, 60 runs, `$22.51`). Opus has never run on this suite,
   but it ran twice on the older one beside Sonnet — `cost3` `$0.305` against
   `$0.184`, `confirm` `$0.362` against `$0.188` — so Opus costs about **1.8×**
   Sonnet like-for-like, or roughly **$0.67** a run here. **An earlier estimate in
   this pass put Opus at 4–5× Sonnet; that was wrong and made T1.3 look three times
   more expensive than it is.**

   | # | Batch | Arms × tasks × reps | Model | Runs | Est. |
   | --- | --- | --- | --- | --- | --- |
   | a | **Style arms** `nextfact`, `combo`, `parts` + control (T2.4) | 4 × 6 × 2 | Sonnet | 48 | **~$18** |
   | a′ | the same, cross-checked | 4 × 6 × 2 | Opus | 48 | **~$32** |
   | b | **T3.1** resident style file vs hook-delivered — **RUN 2026-08-19, $9.11** | 2 × 6 × 2 | Sonnet | 24 | ~$9 |
   | b′ | the same, cross-checked — **RUN, $10.48 on 2026-08-18 + a resume on 2026-08-19** | 2 × 6 × 2 | Opus | 24 | ~$16 |
   | c | **T3.4** does marker trust move behaviour | 2 × 6 × 2 | Sonnet | 24 | **~$9** |
   | d | **T1.3** `lookfurther` re-run at 3 reps, on the model that found it | 2 × 6 × 3 | Opus | 36 | **~$24** |
   | e | **Hero redraw**, `HUSH_NUDGE=max` + baseline, 6 reps | 2 × 6 × 6 | Sonnet | 72 | **~$27** |
   | e′ | the same at the poster's original density, 14 reps | 2 × 6 × 14 | Sonnet | 168 | **~$63** |
   | f | **T1.2** word-cap fix A/B — **RUN 2026-08-18, $8.70** | 2 × 6 × 2 | Sonnet | 24 | ~$9 |
   | f′ | the same at 3 reps, the powered confirm — **RUN 2026-08-19, $13.03** | 2 × 6 × 3 | Sonnet | 36 | ~$14 |
   | g | **Opus cross-check row**, replacing the orphaned Haiku one | 2 × 6 × 2 | Opus | 24 | **~$16** |

   **Item `g` was new, and its premise is now closed for free (hush `915cd0e`).**
   `hush/README.md` published "On Haiku, the cross-check model, hush costs about 11%
   more…". With Haiku retired from the harness, that named a cross-check a reader
   could no longer run. The framing was the defect, not the number: retiring Haiku
   from measurement did not change how hush behaves on Haiku, so the 11%, the two
   slips and the two missed correctness checks are all still true and still useful to
   a Haiku user. The three words `the cross-check model` are gone and everything else
   stayed. **`g` is now optional**, not a repair — run it only if an Opus cross-check
   row is wanted on the page for its own sake.

   **AUTHORISED AND RUN, 2026-08-18: the honest-defect bundle, `d` + `f`. Estimated
   ~$33, actual $29.58.** Both landed the same afternoon. `f` (`capfixA-04ec9758`,
   Sonnet, 24 runs, $8.70) says the word-cap fix works. `d` (`lf3A-f962e07d`, Opus,
   36 runs, $20.88) **refutes its own item** — the control scored 18/18 ground truth,
   so there was no gap for `lookfurther` to close, and the cost objection that shelved
   it did not reproduce. Results in T1.2 and T1.3. The estimates held: Sonnet came in
   at $0.363 a run against $0.375 predicted, Opus at $0.580 against $0.67.

   **AUTHORISED 2026-08-18: the honest-defect bundle, `d` + `f`, ~$33.** The owner
   picked the two items that are defects against claims hush publishes today, over
   the improvements. `f` needed a candidate arm, which did not exist: over-cap
   sentences in `v18` cluster on the two causal-chain tasks (13 in
   `incident-forensics`, 12 in `log-triage` of 35), and 19 of the 35 are only 11–15
   words. The pattern is a conjunction gluing two facts together, which is what the
   style's own "one fact per sentence" rule already forbids — hush's longest sentence
   in that batch joins two facts with `, and separately,`. So the arm extends the one
   Register step that demonstrably works: hush scores **0** semicolons and 6–8
   parenthetical asides against 21–44 for every other arm, because step 4 tells it to
   *search* for those marks. `secondfact` adds a comma before `and`, `so`, `but`,
   `which` or `because` to that same search. Arm at
   `docs/hush/research/rival-arms-2026-08-07/edits-secondfact.json`.

   Sensible bundles, cheapest first:

   - **Cross-check bundle, ~$41** — `g` + `b` + `b′`. Settles the biggest open lever
     on both models and adds an Opus row to the page. Since `g`'s repair was made for
     free, `b` + `b′` alone at **~$25** buys the lever without the row.
   - **Honest-defect bundle, ~$33** — `d` + `f`. The two items that are real defects
     against hush's own claims rather than improvements.
   - **Visible bundle, ~$27** — `e`. The only item that changes what a visitor sees.
   - **Everything except `a′` and `e′`, ~$112.**

   The two claim-judging items, **T2.1** and **T2.3**, are not in this table because
   they are a build plus a sub-dollar judge pass, not a session batch. Price them
   when the build is scoped.

5. **The three built-but-unrun style arms — DECIDED: kept, not deleted.**
   `nextfact`, `combo` and `parts` stay in `docs/research/rival-arms-2026-08-07/`.
   `nextfact` is the exact follow-up the head-to-head report asked for, and deleting
   a written arm to tidy a backlog throws away the cheaper half of a future run.
   Running them is a paid batch and joins item 4.
6. **The two frozen cross-plugin files — one is now unfrozen.**
   `scripts/git-hooks/check-reference-names.js` explained its records exemption with
   the retired committed-records rationale. The trigger this item named — the next
   three-plugin change — fired on 2026-08-18, and the comment was corrected in all
   four copies (hush `7b814ae`); the `mirrored copies` test confirms they are still
   byte-identical. **Still frozen:** `scripts/git-hooks/pre-commit` claims to be the
   canonical source of a template it is actually a copy of. That file is not in the
   byte-identity contract and differs per repo by design, so correcting it means
   editing each copy on its own terms. Correct it the next time a three-plugin change
   is happening anyway.

---

## 7. What was refuted, and stays refuted

The audit's adversarial pass killed ten candidate findings outright. They are not
listed individually here because none survived; the point is that the confirmed set
in §4 is what remained after a verifier whose default was to refute. Two patterns
recurred and are worth naming, because they will recur again:

- **A preset that differs from stock is not a defect.** Glyph caps at 12 lines and 8
  words, Rock at 8 lines, and Sensei has no length cap at all. Those are the presets
  doing their job. The defect is any document claiming they all share stock's caps.
- **A competitor or sibling name inside a plugin's `README.md` is allowed.** Only the
  other files are covered by the rule.

---

## 8. The second pass, 2026-08-18 (evening)

The audit pass left two behaviour changes unreleased and six owner decisions open.
This pass released the first and ruled on every one of the second that did not cost
money. The owner delegated the rulings and chose, at the top of the pass, to keep
the public benchmark harness public, keep the parent's dev tooling public, hold the
scope to hush plus the parent surfaces, and cut the release.

**Nothing was leaking.** The cleanliness sweep is the first thing worth recording,
because it found no work to do. `git ls-files -i -c --exclude-standard` is empty in
all four repos: nothing gitignored is tracked anywhere. `docs/`, `plugins/`,
`ROADMAP.jsonl`, `.foreman/`, `.scratch/` and every `records/`, `records-archive/`
and `results/` directory are ignored and untracked. Every public file that mentions
`docs/research/` mentions it to say the private notes live there — the policy, not
the content. Git history still holds the pre-ADR-0004 records under
`benchmarks/hush/benchmarks/records/`; erasing that needs a force-push and was
deliberately not done.

**Released as 1.6.3** (hush `6bd1ea5`, parent `d521440`, both pushed): the audit
pass's two behaviour changes finally have their release note — the `Grep`
passthrough record reaching the debug manifest, and `verify-style.js` requiring a
description to end with the exact shelf marker. The poster caption change rides with
them.

**One real defect fixed.** The suite read hush's own flags out of the developer's
shell. `HUSH_DISABLE=1` exported turned 83 of 497 tests red, and nine flags moved
some part of the suite. `tests/helpers.js` now clears every `HUSH_*` key at load,
before any test file touches a hook — which covers spawned hooks and in-process
requires in one place, because every test file requires that module first. A flag a
test sets afterwards still binds, which is load-bearing: `compress_tool_output.test.js`
sets `HUSH_SIDECAR=off` at file scope on purpose. A new conformance test spawns a
child with the flag exported and asserts it is gone; mutating the clearing loop kills
that test and restoring it revives it, so the oracle is real. Suite 497 → 498, and
green with all eleven flags exported at once. This was T4.3's oldest candidate,
surfaced 2026-07-28 and carried unfiled through five wave blocks.

**Style-slot state is gitignored.** Activating a style writes
`output-styles/hush.md.stock` and `hush.md.active.json` into the plugin tree, where
they showed as untracked files for anyone activating inside a clone. Same treatment
the parent already gives other plugins' run-time state.

**T2.2 was computable and is now computed** — see the entry itself. The headline: the
follow rate is not near-zero, so the constants do not get frozen, and the record
needs one more field before an exact rate exists.

**The cleanliness sweep, in full.** The goal was a repo carrying only what hush
ships, with everything used to *develop* it local. Five checks, all clean:

1. Every tracked file in both public repos falls into a deliberate class —
   runtime, README art, community docs, tests, git hooks, CI, `.gitignore`. Zero
   files landed outside those classes in either repo.
2. `git ls-files -i -c --exclude-standard` is empty in all four repos: nothing
   gitignored is tracked anywhere.
3. `git status --untracked-files=all` shows nothing untracked and unignored in
   hush or the parent.
4. No tracked file carries run data or a reference name. Every hit for batch ids,
   record paths and rival names is the harness code that *writes or ignores* run
   data, or `.claude/rules/` explaining the policy — never the data itself, and
   never a name outside a `README.md`.
5. No editor backups, no `.orig`/`.rej`/`.bak`, no empty directories, no zero-byte
   files anywhere in the tree.

**Nothing was deleted, so nothing was backed up.** The owner offered a backup
location for anything unrecoverable. Nothing qualified: this pass added and edited,
and the only removal was one README caption line replaced by another, which git
holds. Git history still contains the pre-ADR-0004 records; erasing that needs a
force-push and was deliberately not done.

**T1.2 and T2.2 were both measurable for free**, and both are measured — see their
entries. The lesson is worth keeping: **two of this document's own cost labels were
wrong, in both directions.** T1.2 was filed as needing a paid batch and its scorer's
header says it costs nothing; T2.1 was filed as free and its scorer spawns a judge
model. Check the scorer before pricing the finding.

**The cross-check bundle was authorised and is running, 2026-08-18.** The owner
picked it from the priced menu: item `g` (an Opus cross-check row) plus `b` and `b′`
(T3.1 on both models), about `$41`. What went in before the money did:

- **Opus smoke test first**, one task one rep, `smokeopus-5483ae26`: 2/2 ground
  truth, `$0.478` and `$0.470` a run, 29s and 39s. So Opus on this suite is nearer
  **$0.48** a run than the `$0.67` the 1.8× scaling predicted, and it is *fast*.
- **The T3.1 arm had to be built** — the item was never runnable as filed, because
  no hook-delivered arm existed. `docs/hush/research/rival-arms-2026-08-07/mkdeliverarm.js`
  builds `t31deliver`: a full copy of hush under a non-colliding plugin name, with
  `output-styles/` **deleted** and `silence-nudge.js` patched so the first
  `UserPromptSubmit` of a session carries the whole 10,335-byte style body as
  `additionalContext` and later turns carry the ordinary reminder. Its settings file
  pins no output style. Stock hush is the control, so the only difference between
  the arms is the delivery channel. The builder self-tests both halves of the
  once-per-session claim before it writes anything.

### Item `g` — the Opus cross-check, RUN 2026-08-18

Batch `opuscheck-6e0e4c50`, 6 jobs x baseline+hush x 2 reps, Opus, 24 runs,
**$16.17**, all 24 passing ground truth. Run data local as always.

| | baseline | hush |
| --- | --- | --- |
| Ground truth | 12/12 | 12/12 |
| Cost, mean per session | `$0.598` | `$0.749` — **+25%** |
| Output tokens | 7,183 | 6,625 — −8% |
| Narration words, mean | 47 | **2** |
| Sessions with zero narration | **0 of 12** | **8 of 12** |
| Final message words | 467 | **79** |
| Over the 10-word cap | 54.7% | **14.8%** |
| Over the 12-line cap | 7 | **0** |
| Semicolons / asides | 19 / 37 | **0 / 0** |

**Read it as the Haiku row's replacement, because it says the same thing.** On Opus
hush is a silence-and-brevity tool, not a savings tool: it costs about a quarter more
per session and gives back near-total silence and a fifth of the words. By segment it
wins where it is built to win — noisy output **−9.1%** median cost with a 100% win
rate — and loses on the search-heavy job, where `repo-sweep` output tokens run
**+139%**. Long sessions are within noise at **+5.4%**.

**And it moves T1.2 materially.** hush breaks its own word cap on **14.8%** of units
on Opus against 42-48% on Sonnet, with zero line-cap breaches, zero semicolons and
zero parenthetical asides. The 42-48% figure is a *Sonnet* number, not a property of
the style. Anyone proposing a style edit to close that gap should know the larger
model already obeys the cap 85% of the time.

**Haiku is retired from measurement, 2026-08-18.** The owner ruled it out mid-pass:
it is not a gen-5 model, so the cross-check pair is now **Sonnet + Opus**. Applied
here: `benchmarks/hush/config.json` now defaults to `sonnet` rather than `haiku`,
which also removes a standing inconsistency — every published number is Sonnet while
the harness default was Haiku. The harness README's three example commands and its
`--model` flag doc now teach `sonnet|opus`. No runner code changed; `--model` is
passed straight through to `claude -p`, so Opus already works. Suite still 168/168
and the gate still 10 of 10. Two consequences are recorded rather than acted on:
`hush/README.md`'s Haiku cross-check paragraph is now an orphaned row, which item
`g` in §6.4 exists to replace, and the memory rule that named Sonnet-and-Haiku as
the mandatory pair now names Sonnet-and-Opus.

**Concurrency note.** Another session was working in the parent repo during this
pass; razor 1.2.0 was released underneath it, and foreman's submodule sits on an
in-progress branch with uncommitted work. Neither was touched. Only hush's gitlink
and hush's `marketplace.json` entry moved.

---

## 9. The cleanliness proof, written out

The owner's second criterion was a clean repo: only what hush ships reaches GitHub,
and everything used to *develop* it stays local. That was verified rather than
assumed, and the checks are recorded here because "I looked and it seemed fine" is
not a result a later session can trust.

| Check | Command | Result |
| --- | --- | --- |
| Nothing gitignored is tracked | `git ls-files -i -c --exclude-standard` | **0** in all four repos |
| Nothing untracked is waiting to be committed by accident | `git ls-files --others --exclude-standard` | **0** in all four repos |
| The *published* tree carries no dev path | `git ls-tree -r --name-only origin/main` | no `docs/`, `plugins/`, `ROADMAP.jsonl`, `.foreman/`, `.claude/`, `records/`, `records-archive/` or `results/` in either repo |
| hush publishes only product | same | **59 files**: manifest, CI, four community docs, four assets, seven hooks and five lib modules, the style, four scripts, two skills, four presets, the tests |
| No secrets or personal data | regex sweep for `sk-`, `ghp_`, `AKIA`, private-key headers, emails | every hit is a synthetic test fixture or the owner's own published contact |
| No local-machine paths | regex sweep for drive letters, `/home/`, the user name, `AppData` | every hit is a public GitHub URL or a comment's worked example |
| No editor or scratch artefacts | sweep for `*.bak`, `*.orig`, `*.rej`, `*~`, `*.tmp`, `*.swp`, `*.old`, `.DS_Store`, `Thumbs.db` | none tracked anywhere |
| Today's new run data stays local | `git check-ignore` on both new batches | `records/capfixA-04ec9758`, `records/lf3A-f962e07d` and `results/` all ignored |

**One misreading to head off.** `git status` in the parent shows ` M foreman` and
` M hush`. Those are **submodule gitlink pointers**, not modified files —
`git diff --submodule=short` shows a one-line `Subproject commit` move and nothing
else, and the parent has zero modified tracked files. A plugin's checkout sitting
ahead of its recorded pin is the documented normal state between releases (trap 8).
Reading those two lines as uncommitted dirt is the single easiest mistake to make
about this repo's status output.

**What was already leaked stays leaked, by instruction.** Git history on the parent
still contains the pre-ADR-0004 records under
`benchmarks/hush/benchmarks/records/`. Erasing that needs a force-push, the owner
ruled it out for this pass, and nothing in the current tree reaches it.

---

## 10. The paid menu, RUN 2026-08-19 — §6.4 is now empty

**Status: every batch the owner had left to authorise has run.** Four batches, 261
sessions, **$110.51** billed plus about $5 of judge calls, against a $121 estimate.
Measured at hush `cadf367` (1.6.4, unreleased, 5 commits ahead of the pin). Nothing
was released and nothing was pushed — the standing no-push instruction held.

**The consolidation rule that made it three batches instead of seven.** `run.js`
takes one `--model` and one `--reps` per batch and any number of arms. So everything
at Sonnet/2-reps merged into one batch, everything at Opus/2-reps into a second, and
only the 6-rep hero stayed separate. That deduplicated three separate control arms
down to one and paid for a sixth Opus arm the original menu did not have.

| batch | model | reps | arms | runs | cost | covered |
| --- | --- | --- | --- | --- | --- | --- |
| `bindsmoke-6bc0e178` | sonnet | 1 | 9 | 9 | $2.32 | proves every arm binds its style |
| `s1-4b510954` | sonnet | 2 | 9 | 108 | $37.11 | `a`, `c`, README re-measure, T2.3 |
| `o1-79a3ce8c` | opus | 2 | 6 | 72 | $44.80 | `a′`, `g`, plus a cross-check for `c` |
| `hero-31a025f9` | sonnet | 6 | 2 | 72 | $26.29 | `e` |

### 10.1 T2.4 — all three arms REJECTED, and `nextfact` is why the rule exists

Over-10w rate against the `hush` control, both models, 12 runs per arm per model:

| arm | Sonnet | Opus | cost vs hush (S/O) | Opus ground truth | Opus longest |
| --- | --- | --- | --- | --- | --- |
| `hush` control | 56.2% (41/73) | **7.7%** (9/117) | — | **12/12** | **17w** |
| `nextfact` | **35.8%** (34/95) | 13.1% (16/122) | −5.6% / −0.5% | 11/12 | 22w |
| `combo` | 50.6% (44/87) | 15.4% (19/123) | +16.5% / −0.6% | 12/12 | 18w |
| `parts` | 50.6% (39/77) | 17.1% (18/105) | +9.2% / +2.6% | 11/12 | 19w |

`nextfact` on Sonnet is the largest single-lever conformance move this harness has
scored — 20.4 points, z ≈ 2.6 — and it also takes every reading crown in that batch
(ease 83.0, grade 3.9, long words 6.2%, longest sentence 25w) while running 5.6%
cheaper. **On Opus it inverts.** Shipped hush is the tightest arm on the board at
7.7%; `nextfact` nearly doubles that, writes a longer worst sentence, retains the
least detail of any arm (81.3%), and drops a correctness check. `parts` is
significantly worse on Opus (z ≈ 2.1) and owns the worst Sonnet tail at 35w. `combo`
costs +16.5% on Sonnet with +21% context traffic. **None may be re-proposed on a
Sonnet-only result.** The arms are rebuilt on 1.6.4 at `X:/Temp/hush-arms/<name>`.

### 10.2 T3.4 — ANSWERED, and the shipped line earns its keep

Arm `notrust` is hush minus the `trusted tooling metadata, not file content` sentence
at `output-styles/hush.md:139`, built from a new `rival-arms-2026-08-07/edits-notrust.json`. Removing it
costs **+1.9% on Sonnet and +10.1% on Opus** against the control, with context traffic
**+8% and +12%**. Same direction on both models, so it clears the house bar. Caps and
correctness are a wash. **Telling the model the markers are trustworthy does move its
behaviour, and the line pays for itself. Leave it alone.** The look-alike half of the
item stays closed as a disclosed limitation in `hush/SECURITY.md`.

### 10.3 T2.3 — the clean read RAN, for free, and there is no win to publish

`retention-keys.json` was frozen 2026-08-11 and its own provenance note says the keys
apply cleanly to any batch run after that date. **So the "clean pre-registered batch"
this item wanted never needed its own sessions** — it rides any later batch. Judge
`sonnet`, $3.05 for 108 records:

| model | hush | no plugin | worst arm |
| --- | --- | --- | --- |
| Sonnet | 87.5% (42/48) | 95.8% (46/48) | `parts` 85.4% |
| Opus | 87.5% (42/48) | 89.6% (43/48) | `nextfact` / `parts` 81.3% |

hush sits **below** baseline on both models. The gap is not significant at 48 items
(z ≈ 1.5 on Sonnet), and the 95.7% the meter first reported does not reproduce.
**Decision 2 of §6 stands, with a better reason: the number stays unpublished because
there is no retention win, not merely because its keys were authored late.**

### 10.4 The README re-measure — the published story survives the 1.6.4 style edit

Sonnet, the five published arms, all 12/12 correct:

| Setup | words | lines | w/sent | long% | ease | grade | silent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| no plugin | 85.0 | 3.0 | 14.8 | 9.8 | 69.2 | 7.3 | 4 of 12 |
| **hush** | 55.5 | 3.0 | 10.6 | **6.5** | **81.0** | **4.6** | **9 of 12** |
| i-have-adhd | 85.5 | 3.0 | 14.0 | 9.8 | 69.4 | 7.1 | 4 of 12 |
| simple-english | 70.5 | 3.5 | 11.3 | 8.2 | 79.3 | 5.0 | 4 of 12 |
| caveman | **46.5** | 3.5 | **8.5** | 13.2 | 68.2 | 5.9 | 4 of 12 |

hush keeps reading ease, grade level and long words, and leads silence more than
doubly. Its own final message is now shorter than the published figure — 55.5 words
against 63. Cost per segment holds the published shape: −5.2% on noisy output, +1.3%
on search-heavy, −6% suite-wide. **Nothing on the page is falsified by the comma rule.**
Publishing an update is still the owner's call under the no-auto-publish rule.

### 10.5 The hero redraw — redrawable, on a weaker claim

`HUSH_NUDGE=max` against baseline, 36 paired sessions, 72/72 correct: **silent in 26
of 36**, worst run 37 narration words, cost +4% against baseline. The retired 17-task
poster claims 81 of 85 and nothing over 24 words. The records to redraw now exist, so
ADR 0005's disclosure is no longer forced — but a redraw trades a disclosed caption
for a softer number. **Owner call, and no longer a defect either way.**

### 10.6 Two traps, one new and one confirmed the hard way

1. **Two batches in parallel WILL hit the session limit.** `s1` and `o1` were launched
   together, burned the window, and left **47 error stubs** — 29 and 18, all in the
   queue tail. `--resume` with the same `--seed` refilled `results/` completely and
   left every stub in `records/` behind `RETAIN-SKIP`, exactly as trap 6b predicts.
   `node docs/hush/research/scripts/hush-repair-records.js <tag> <batchDir> --apply` repaired all 47
   with zero orphans, and the gate went back to 10 of 10. **Run batches sequentially.**
2. **The runner's stdout line for a rate-limited run is just `ERR  <key>  cost=$?`.**
   The words "rate limit" appear only inside the record's `error` field, so a monitor
   grepping stdout for them never fires. Grep `^ERR ` instead. Related: a smoke batch
   needs `publish.js` run on it too, or point 8 of the readiness gate fails on it.

### 10.7 What is left after this pass

Nothing in §6.4 is unrun. `e′` was deliberately skipped as the denser alternative to
`e`. What remains for hush is the T2.1 claim rescorer, which is a build rather than a
batch and can score `s1`'s 108 retained records afterwards for the price of a judge
pass; competitor items 7, 8 and 9; the frozen `pre-commit` docstring; and the release
of 1.6.4 itself, which the owner is holding.

---

## 11. The close-out pass, 2026-08-19 — §10.7 is now empty

**Status: every item §10.7 named is built, closed, or handed back as an owner
decision.** Nothing was pushed; the standing no-push instruction held, and the
1.6.4 release is cut locally and waiting.

| Item | Disposition |
| --- | --- |
| **T2.1 — the claim rescorer** | **BUILT.** `benchmarks/hush/runner/truth.js`, 8 new unit tests. Not yet run — a judge pass is a paid batch, §11.3 |
| **Competitor item 7 — table-ifying JSON tool results** | **CUT.** Its target left scope: the `PostToolUse` matcher is `^(Bash\|PowerShell\|Read\|Grep)$`, so hush never sees the output the idea was about. Re-open only if hush ever starts rewriting that surface again |
| **Competitor item 8 — proactive sidecar surfacing** | **CUT, on the probe it was waiting for.** §11.2 |
| **Competitor item 9 — harness upgrades** | **CLOSED, already covered.** Every one of its four parts is in the shipped suite: the adversarial no-op cases (a 20 KB single-line minified JSON payload, a dense multi-line base64 blob) are `tests/hush_debug_manifest.test.js:221,244`; the passthrough invariant is `tests/transform_properties.test.js` "a shipped rewrite is always smaller than what it replaced", anti-vacuity assertion included; `rejected-not-smaller` is a named boundary reason and the same file asserts every dropped rewrite carries one. The "does the model Read the sidecar" half was answered by T2.2's 855 retrievals, not by an eval |
| **The frozen `pre-commit` docstring** | **FIXED in hush's copy** (`f86fa04`). It now says it is the installed copy and names `scripts/git-hooks/plugin-pre-commit-template.js` as canonical. No test compares these copies — only `check-reference-names.js` is under the byte-identity contract — so this was a hush-local edit. **`foreman` and `razor` still carry the old wording**, and `foreman`'s copy had already drifted from the template on its own; correct both the next time a three-plugin change is happening anyway |
| **The 1.6.4 release** | **CUT LOCALLY, UNPUSHED.** hush `f86fa04`, parent `9981909`, `marketplace.json` at `1.6.4` with `source.sha` bumped in the same commit. hush 519/519, harness 182/182, readiness gate 10 of 10 |

### 11.1 The truth meter

The gap T2.1 named: words, cost, cap conformance, reading ease and blind
retention all reward a confident wrong conclusion that names the right
identifiers. `runner/truth.js` closes it by reading the **same frozen
`retention-keys.json`** the other way round — no second key file to keep in
sync, and the retention meter's freeze discipline and provenance note carry
over unchanged. A blind judge marks each true statement `agrees`,
`contradicts`, or `silent`.

Two choices worth keeping:

- **The wrong rate is a share of what a run asserted, not of the key list.**
  Silence is retention's business. Scoring it as error here would just
  re-measure retention and would punish exactly the terser arm hush ships.
  `clean%` — runs that asserted nothing false — is the number a README reader
  would care about.
- **The cache key carries a `PROMPT_VERSION`.** `retention.js`'s cache key does
  not, so rewording *its* prompt would silently reuse verdicts the old wording
  produced. That trap is now avoided in the new meter and still live in the old
  one.

Judge plumbing (`judgeOnce`, `readRecordsDir`, `keysHash`) is reused from
`retention.js` rather than copied; the only change to that file is its export
line.

### 11.2 Item 8's probe: the signal is thin, and the channel is the wrong one

Every local `HUSH_DEBUG` manifest was swept for the question the item itself
set — would surfacing parked sidecars at the turn boundary ever have prevented
a re-run? Proxy: a tool output whose `(tool, bytesIn, linesIn)` signature
repeats inside one session after that signature was parked.

| corpus | sessions | records | parks | sidecar reads | repeats after a park |
| --- | --- | --- | --- | --- | --- |
| all manifests | 7,027 | 41,694 | 6,771 | 855 | 2,434 |
| sessions with a real (UUID) id | 53 | 9,714 | 365 | 16 | 29, in 10 sessions |

**Read the second row only.** The corpus is 6,974 test and benchmark sessions
against 53 real ones, and synthetic sessions re-run identical fixtures on
purpose, so the headline 2,434 measures the suite, not a user.

Three reasons this closes rather than proceeds:

1. **The signal is 29 events across 53 sessions**, and the manifest carries no
   timestamp, so a same-turn re-run and a next-turn one cannot be told apart.
   Only the second kind is even reachable from a turn-boundary hook.
2. **The information is already delivered, at the better moment.** The digest
   marker names the parked path inline, in the tool result, the instant the
   output is cut. A list at the next user prompt repeats it later and with less
   context.
3. **The channel is measured.** An unconditional `UserPromptSubmit` injection
   sits on the cost-vs-coverage curve the nudge work already priced; `react` —
   fire only on an observed leak — is the one arm that beat it, and it is the
   default since 1.5.0. This item proposes going back to unconditional for a
   29-event payoff.

### 11.3 The whole hush board, in four parts

Everything hush has, in one place: open, standing, moved elsewhere, and closed
with its reason. **Nothing about hush lives outside this table.**

**Rewritten 2026-08-20 on the owner's decision.** The board went from fifteen
open items to **one thread in three steps**. Ten were closed outright against
scope, simplicity, benefit and YAGNI; one was handed to razor; one converted
from work into a number to look at later. The reasons are in D and every one of
them is challengeable there — closed is not the same as wrong.

**A — the one open thread, in the order it has to happen.**

| # | Item | What it is | Cost |
| --- | --- | --- | --- |
| **1** | **Roadmap `254`'s re-measure** | one batch on the rebuilt eight-job suite, **now six arms**: the five published ones plus `concise`, Claude Code's own built-in style (§11.9). 6 × 8 × 2 = 96 runs, Sonnet. The free half is built at `83c90d9`, the turn-cap fix at `87a9016`, the built-in-style arm at `65bfae5`. **Two reps is the right size — §11.8 shows more reps cannot buy a cost claim, and the reading and compression tables are already stable at two** | **~`$38`** |
| **2** | **Regenerate the published page** | `hush/README.md`'s benchmark section and `assets/bench-cuts.svg`, from that batch, plus the crossover stated in plain words | free, needs 1 |
| **3** | **Push one release** | merge `worktree-hush-final` and push — hush `e35b37a`, parent `8f0be28` + `88580ea` + `83c90d9` | free, needs 2 |

**Why this is the only thread that matters.** The published page promises
sessions "about 15% cheaper" in its TL;DR and prints **−15%** in its cost table.
**Seven retained Sonnet batches read −3.0%, +1.3%, 0.0%, −14.9%, −6.1%, −1.1%
and +4.2% — a mean near −3%, and `v18`, the batch the page cites, is the
outlier.** Drop one task from `v18` and its −14.9% becomes −3.0%. §11.8 carries
the full sensitivity analysis. That claim is the one thing on this board that
costs something to leave alone, and the honest replacement is the null one:
the bill comes out about the same.

**The ordering is not a preference.** The unpushed rewrite at `e35b37a` says
"six fixed jobs" three times, and the harness in the same tree now has eight.
Pushing before the re-measure ships a page that contradicts the repo it sits in;
doing 1 → 2 → 3 reverses the headline once instead of twice.

**B — standing, free, not work.**

| Item | What it is | When to look |
| --- | --- | --- |
| **Sidecar retrieval rate** | does the parked full copy ever actually get read? 1.6.4 records `sidecarPath` in the debug manifest so it becomes countable. On 2026-08-19 it stood at **0 of 41,743**, because every retained record was written by 1.6.3 | after real 1.6.4 use has accumulated. It answers whether parking earns its keep — a product question, not a task |

**C — moved off hush's board, and since fixed.**

| Item | Where it went |
| --- | --- |
| **The `pre-commit` docstring in razor** — **DONE 2026-08-20**, razor `852ba63` + marketplace `0743ed1`. The cause was the template's own header, which is now written to survive being copied | razor's board, where it is now closed. razor's copy had inherited the template's own header verbatim, and that header was written from the template's point of view — so a faithful copy carried a false first sentence. hush's was hand-fixed at `f86fa04` and foreman's was already correct, which fixed the symptom twice and left the cause once. Both the template and razor's copy now carry a header that reads true in either place, and the two files are byte-identical again |

**D — closed, with the reason. Challenge these here.**

Closed 2026-08-20 by the owner's sweep:

| Item | Why it is closed |
| --- | --- |
| **Redraw the hero** from `hero-31a025f9` | the records exist now, but the plot they give is **weaker** than the poster already up: 26 of 36 silent against 81 of 85. ADR 0005 already lets the current poster stand on a retired run with a disclosing caption. Redrawing trades an honest caption for a worse claim |
| **T4.1 + T4.2 — six style candidates** (`~$88`) | the arms were never built, and the prior is bad: every voice candidate measured this month came back rejected — `nextfact`, `combo`, `parts`, and all three of the held prompting changes. `$88` to most likely hear no again. Re-file only against a specific complaint about the voice |
| **e′ full-density hero** (`~$63`) | a denser waveform is a prettier picture of the same finding. `e` already ran and the poster is redrawable from it |
| **Item `g` — an Opus cross-check row** (`~$16`) | the gap it was meant to fill — the orphaned Haiku row — was already closed for free at `915cd0e` |
| **A truth re-score under `truth-2`** (`~$3`) | its own entry said it changes no conclusion. hush and baseline were clean under `truth-1`, and the cleared false alarms sit on rival and rejected arms |
| **T3.3 subagent multiplier** | prices hush under fan-out, which nobody has reported as a problem, and it needs a new task built before it can price anything. Textbook YAGNI |
| **T3.2 turn-boundary hook** | the tax half died with T3.1 (a style that is not resident does not bind). The reminder half is already answered: `react` — fire only on an observed mid-turn leak — has been the measured default since 1.5.0 and beat every unconditional injection on the cost-vs-coverage curve |
| **T4.4 — five in-code deferrals** | they are comments, not a backlog. Each is a design ceiling with its own trigger written beside it, and leaving them costs nothing. Re-checked 2026-08-20: four are live in the shipped code — the shared `unknown/` sidecar directory (`sidecar-store.js:43`), the 24-hour `STALE_MS` sweep against a session that parks nothing new (`sidecar-store.js:34`), the not-smaller-rejected rewrite that orphans an already-written sidecar (`transform-manifest.js:127-134`), and the tool results that produce no manifest record (Grep in `files_with_matches`/`count` mode, content-less Reads). **The fifth, a `recoveryBytesAtMost` upper bound, no longer exists under that name in the current code** — so T4.4 is four, not five |
| **Two residual `truth-2` false alarms** | both are judge misreads on one record, both hand-checked, and the finding is already written down correctly: the truth meter is a **screen, not a number**. §11.4 |
| **One unreproduced hush test failure** | 516 of 519, once, on 2026-08-19, straight after a judge pass; three later runs including the same chained command were 519 of 519, and no failing test name was captured. Nothing to act on |
| **Roadmap `060` — harness-capture rig for other agent CLIs** | dropped 2026-08-20: **hush is Claude Code only**, so the trigger will never fire. Re-filing needs a fresh entry |

Closed by the 2026-08-19 pass:

| Item | Why it is closed |
| --- | --- |
| **Version the retention judge's cache key** | done at `88580ea` — a `PROMPT_VERSION` constant, empty on purpose so every cached verdict stays byte-identical and only a future bump invalidates. Pinned by a test |
| **The `mid-work slips` column** | dropped from the page inside `e35b37a`. No shipped runner computes it and no record field carries it; two reconstructions both returned baseline 50 / hush 21 against a published 36 / 7 |
| **T2.1 claim rescorer** | built, run, and validated in both directions. No arm asserted anything false. §11.4 |
| **A clean README re-measure** | RUN 2026-08-19, `$22.58`. It came back a wash and took the cost headline off the page. §11.6 |
| **Release 1.6.4** | cut and **pushed** — hush `f86fa04`, parent `badb151`, both CI green. It also cleared a `Validate marketplace` failure that had been red on the parent since the foreman 1.4.0 push |
| **Competitor item 7 — table-ifying JSON tool results** | the surface left scope: the `PostToolUse` matcher is `^(Bash\|PowerShell\|Read\|Grep)$` |
| **Competitor item 8 — proactive sidecar surfacing** | 29 repeats of a parked output's signature across the 53 real sessions, no timestamp to place them, and the digest marker already names the path inline. §11.2 |
| **Competitor item 9 — harness upgrades** | all four parts already in the shipped suite |
| **hush's own `pre-commit` docstring** | fixed at `f86fa04` |
| **Roadmap `057` and `059`** | both built inside 1.6.4 — the one-file Claude Code surface and the golden contract suite |
| **T3.1 — hook-delivered style** | rejected on both models. The resident tax is the price of the style working at all |
| **T3.4 — marker trust** | answered. Deleting the line costs +1.9% Sonnet and +10.1% Opus |
| **T2.3 — the retention number** | no win to publish; hush sits below baseline on both models |
| **T2.4 — `nextfact`, `combo`, `parts`** | all rejected on the cross-model rule |
| **T1.1 / T1.2 / T1.3** | disclosed by ADR 0005 / shipped as the comma rule / refuted at 3 reps |
| **hush's Codex port, T4.5, T4.6** | closed, retired, closed |

### 11.4 The truth meter RAN, and the first thing it measured was itself

**Batch `s1-4b510954`, 108 retained records, judge `sonnet`, `$3.78` all in**
(`$0.43` smoke, `$0.20` negative control, `$2.83` full pass, `$0.32` re-validation).

| arm | runs | clean runs | statements asserted | contradictions |
| --- | --- | --- | --- | --- |
| **hush** | 12 | **12** | 43 | **0** |
| baseline | 12 | 12 | 46 | 0 |
| adhd | 12 | 12 | 47 | 0 |
| nextfact | 12 | 12 | 44 | 0 |
| parts | 12 | 12 | 41 | 0 |
| caveman | 12 | 11 | 43 | 1 |
| combo | 12 | 11 | 47 | 1 |
| ste | 12 | 11 | 46 | 1 |
| notrust | 12 | 11 | 45 | 2 |

**The headline, checked by hand: no arm asserted anything false.** All five raw
contradictions were read against the record and all five are judge misreads.
That is the result worth keeping, and it is the one that closes T2.1's question:
hush says *less* than the control — 43 statements against 46 — and gets none of
it wrong. The retention meter's 87.5% now means what it should: hush is **silent**
on the rest, not wrong about it.

**What the five misreads were, because they set the meter's ceiling:**

| flagged | what the report actually said | verdict |
| --- | --- | --- |
| `dep-bump-warnings#2` on `combo`, `ste` | `ste` wrote "Added a case that treats `undefined` as disabled", which is the key verbatim; `combo` was merely vague | misread |
| `dep-bump-warnings#4` on `notrust` | "Build now finishes with 8 warnings, 0 errors" against a key that says "finishes clean, with no errors" | misread |
| `dep-bump-warnings#2` on `notrust` | "backoff just checks for `true` instead of demanding a boolean" — the same rule, stated as an implementation | misread |
| `repo-sweep#1` on `caveman` | the vendored adapter, deliberately left on the old call and explained as such. **This is the exact failure `retention-keys.json`'s own provenance note already records, happening again** | misread |

**The meter was validated in both directions before any of that was reported.**
Three records were rewritten to assert a wrong root cause, a red suite called
green, and a failing verification called passing. All four planted falsehoods
were caught, on both prompt versions — sensitivity is not the weak side.
Precision is. `truth-2` narrows what counts as a contradiction and breaks the tie
towards silence; on the four records that produced false alarms it clears three
of them and keeps the two on `notrust`, which are also misreads. **A full re-score
under `truth-2` would change no conclusion** — every arm that mattered was already
clean — so it is priced in §11.3 and left unrun.

**The rule this earns: run the truth meter as a screen, never as a published
number.** Its own header now says so, with these numbers behind it.

### 11.5 The README re-measure does NOT survive contact with the page

§10.4 concluded "nothing on the page is falsified by the comma rule". That is
true of the *reading* claims and **not** of the section as a whole, which is why
the swap this pass was asked to make was not made. Three findings, in order of
how much they matter.

**1. The cost story does not transfer, and `s1` is the wrong batch to transfer
it from.** The page's cost table comes from `v18-c827bd6f`, a five-arm batch.
`s1` is a nine-arm batch built to compare style candidates.

| segment | published (`v18`) | `s1` |
| --- | --- | --- |
| noisy builds and logs | +0.3%, "a wash" | **−5.2%** |
| search-heavy | +0.3%, "a wash" | **+1.3%** |
| long drifting sessions | **−13.3%** | **+9.6%** |
| whole suite (mean) | **−14.9%** | **−6.1%** |

The long-session row inverts. But the *baseline* also moved 26% between the two
batches on that segment (`$0.5049` → `$0.3732`) while hush moved 7%, on n=4 —
two tasks, two reps. That is noise at this sample, not a hush regression, and
the page already discloses it in its own words: "a single row can swing 10 to 20
points — read the direction, not the decimal." **So `s1` neither confirms nor
falsifies the published cost table, and publishing `s1`'s cost numbers would
replace a purpose-built five-arm A/B with a by-product of a style bake-off.**

**2. The `mid-work slips` column cannot be regenerated.** The page publishes
baseline 36 / hush 7 / adhd 18 / ste 30 / caveman 11. No shipped runner computes
that column, no record field carries it, and two independent reconstructions
from the retained transcripts — text blocks per session, and text blocks per
real user turn — both return baseline 50 / hush 21 / adhd 32 / ste 44 /
caveman 25 on the very batch the page cites. **The definition behind the
published number is lost.** Any re-publish either drops the column or replaces it
with one the harness can defend, e.g. mean narration words per session, which is
a record field: `v18` baseline 56.1 / hush 12.2, `s1` baseline 46.8 / hush 7.1.

**3. A swap would break the section's own provenance sentences.** "Same six
jobs, same run", "One real final message from this run", and the slips sentence
all tie the section to one batch. Swapping half the numbers makes those false.

**What `s1` does say, and it is all in hush's favour.** Measured on the 1.6.4
build the release ships:

| Setup | words | lines | w/sent | long% | ease | grade | silent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| no plugin | 85.0 | 3.0 | 14.8 | 9.8 | 69.2 | 7.3 | 4 of 12 |
| **hush** | 55.5 | 3.0 | 10.6 | **6.5** | **81.0** | **4.6** | **9 of 12** |
| i-have-adhd | 85.5 | 3.0 | 14.0 | 9.8 | 69.4 | 7.1 | 4 of 12 |
| simple-english | 70.5 | 3.5 | 11.3 | 8.2 | 79.3 | 5.0 | 4 of 12 |
| caveman | 46.5 | 3.5 | 8.5 | 13.2 | 68.2 | 5.9 | 4 of 12 |

hush keeps every reading crown, goes silent more often than the page claims
(9 of 12 against the published 8), and writes a shorter final message than the
page claims (55.5 words against 63). The one number that moves against it is the
runnable-output share: 75% here against the published 73%, but the baseline is
100% here against the published 91%. **The live page therefore understates 1.6.4
everywhere except cost, which is why shipping the release with it unchanged is
safe.**

**Three ways to close it, in the order this pass would pick them:**

1. **Push 1.6.4 with the page unchanged and re-measure later.** Free. The page
   is not falsified, its own caveat covers the movement, and every reading claim
   on it is conservative for this build.
2. **Authorise a clean re-measure — the five published arms, six jobs, two reps,
   Sonnet, `~$22`.** Same geometry as the batch the page cites, run on 1.6.4, so
   the whole section regenerates from one batch: cost table, reading table,
   `bench-cuts.svg`, the verbatim example, and a slips column replaced by one the
   harness can compute. This is the only option that ends with a single-source,
   ADR-clean page.
3. **Publish the reading table from `s1` alone and leave cost on `v18`.** Not
   recommended. It is the cheapest, and it puts two runs in one section while
   making three provenance sentences false.

### 11.6 The clean re-measure RAN — and it took the cost headline off the page

**Batch `rm164-0003b8d4`, 2026-08-19. 5 arms × 6 jobs × 2 reps, Sonnet, seed
`1787201216892`, 60 runs, 0 errors, `$22.58`.** Same geometry as
`v18-c827bd6f`, the batch the page cited, and measured on the build 1.6.4
actually ships. Every arm 12 of 12 correct.

**Every tool used here was validated by reproducing the published page first.**
Before a single new number was written down, the cost table, the reading table
and the chart were all regenerated from `v18` and matched the live page exactly
— which is also what proved, a second time, that `mid-work slips` is the one
column nothing in the harness can produce.

#### The cost claim does not replicate, and that is now three batches deep

| segment | `v18` (published) | `s1` | `rm164` |
| --- | --- | --- | --- |
| noisy builds and logs | +0.3%, "a wash" | −5.2% | **+10%** |
| search-heavy | +0.3%, "a wash" | +1.3% | **−4%** |
| long drifting sessions | **−13.3%** | +9.6% | **a wash** |
| **whole suite (mean)** | **−14.9%** | −6.1% | **−1.3%** |

Job by job on `rm164` the swings are enormous and they cancel: log-triage
**−36%**, incident-forensics **−24%**, repo-sweep −4%, failing-suite +11%,
dep-bump-warnings +23%, feature-drift **+44%**. The mean is −1.3% because the
two big wins pay for the big loss, not because nothing moved.

**The honest reading: hush's cost effect on this suite is a wash, and the −15%
that has been on the front page since 1.6.0 was one batch's luck.** Nothing in
1.6.4 can explain it — the golden contract suite proves the hook refactor moved
zero bytes, and the comma rule makes the final message *shorter*. What changed
between batches is the model and the day.

**One number got worse in a way worth naming:** output tokens went from −8% on
`v18` to **+13%** here. hush's final message is short, but the sessions it runs
are not always shorter. That row is now a neutral pill on the chart rather than
a green one.

#### What did survive, completely

| claim | `v18` | `rm164` |
| --- | --- | --- |
| tool output cut | −49% | **−46%** |
| chatter before the answer | −79% | **−84%** |
| silent sessions, hush | 8 of 12 | **8 of 12** |
| silent sessions, plain Claude | 2 of 12 | **2 of 12** |
| reading ease | 81.2 (best) | **81.0 (best)** |
| grade level | 4.3 (best) | **5.0 (best)** |
| long words | 7.0% (best) | **5.8% (best)** |
| correctness | 12 of 12 every arm | **12 of 12 every arm** |

**The moat is exactly where the project already said it was.** §3 of this
document has held "cost-wins-everywhere is unreachable — silence is the moat"
since the 3,566-token prompt tax was measured. The page had not caught up.

#### What was written, and what is deliberately NOT pushed

hush `e35b37a`, parent `8f0be28`, both **committed and unpushed**. Contents:

- The whole Benchmarks section regenerated from `rm164` — chart, cost table,
  reading table, the verbatim final message, and the prose around them.
- `mid-work slips` **dropped**. `silent sessions` says the same thing and can be
  regenerated; the slips figure cannot.
- The TL;DR rewritten: it now sells quiet and readable, and says in plain words
  that the bill came out the same. `plugin.json` and `marketplace.json`
  descriptions follow it — "so long, noisy work stays quiet and readable".
- A plain-language pass over the whole README: `hook`, `slot`, `binds`, `stock`
  and `no-tool` are gone, **output style** is glossed once where it first
  appears, and "Hard caps: 12 lines, 10 words a sentence" became "it aims for",
  which is what T1.2 measured to be true.
- `runner/retention.js` cache key now carries a prompt version, empty so every
  cached verdict stays valid.

**The push is held on purpose.** The owner authorised the re-measure, not a
reversal of the product's headline claim; a page that stops promising a
discount is their call to make, not this pass's. Everything else is done and
the merge is one command.

Suite 519/519, harness 184/184 (28 of them the two judge meters), readiness
gate 10 of 10 with the new batch in `records/`.

### 11.7 Roadmap 254: the suite now spans the size range, and the small jobs are small on purpose

**Built 2026-08-19 in the parent worktree `hush-final`. Free half only — no
batch was run and none is authorised.** The suite goes from six tasks to
eight.

#### The diagnosis changed while the fixtures were being sized

§11.6 read the wash as "three of the six jobs are below the size where hush can
compress anything". That is true of what *reaches the session*, but it is not
true of the fixtures, and the difference decides what to build.

`dep-bump-warnings`' build prints **36,084 characters**. Only **6,836** of them
reached the session on `rm164`. The model pipes and greps rather than dumping
the build; when the whole thing is fed to the shipped hook it cuts **88%**. So
that job is small because of model *behaviour*, not because the fixture is a
miniature — and inflating the fixture would not move it, because the model
would filter harder.

**The rule that follows, and the rule both new tasks are built on: tool output
lands in a session when the question needs the whole artifact, not a match
inside it.** `log-triage` asks what happened and the model reads all 57KB;
`failing-suite` asks what is broken and the model greps for `FAIL`. That is why
the two jobs the page called the same shape behave nothing alike.

#### What was added

| | `release-digest` | `rename-scope` |
| --- | --- | --- |
| segment | noisy build and test output | search-heavy work |
| the artifact | `history/commits.log` — 380 commits, 53,253 chars | 97 files where `account_id` matches **1,082 lines** |
| the question | what actually changed for the people using this | how big is the rename, and where must it not happen |
| what makes it unfilterable | three user-visible changes wear `refactor:`, `feat:` and `fix:` prefixes among dependency bumps; no grep finds "user-visible" | the answer is three exclusions — a vendored SDK overwritten on refresh, migrations that already ran, and `account_id` as a frozen field in the openapi contract |
| rubric | 2 of 3 | 2 of 3 |

Nothing was deleted. `dep-bump-warnings` and `failing-suite` stay exactly as
they are: they are the honest loss case, and the finding above is the reason
they are worth keeping rather than a reason to shrink from them.

#### It fires — checked for free, before any batch

The shipped `compress-tool-output.js` was run against the realistic tool result
for each fixture. No model, no cost.

| what a session actually runs | in | out | cut | sidecar |
| --- | --- | --- | --- | --- |
| `rename-scope` — `grep -rn account_id .` | 113,246 | 6,539 | **−94%** | written |
| `release-digest` — `Read history/commits.log` | 53,253 | 5,014 | **−91%** | written |
| `release-digest` — `cat history/commits.log` | 53,253 | 5,026 | **−91%** | written |
| `log-triage` — `Read logs/app.log` *(yardstick)* | 57,326 | 4,426 | −92% | written |
| `dep-bump-warnings` — `node build.js` *(never lands)* | 36,084 | 4,225 | −88% | written |

Both new tasks bite exactly as hard as the job that already wins. What remains
unproven without a batch is whether the model lets the artifact land — that is
a behavioural question, and it is what the re-measure buys.

#### Also corrected, because this pass had to touch it

The harness README told the reader a default run costs **$2–4**. Summed from
`rm164-0003b8d4`'s own records, the two default arms over six tasks and two
reps billed **$9.37**. The warning now says $12–16 for the eight-task suite and
points at `--tasks` for a cheap first look. Under-quoting a reader's bill by
two and a half times is not a number worth protecting.

#### Guards, so the suite cannot quietly shrink back

Four tests, all local and free (`tests/benchmark_evidence.test.js`):

- `commits.log` stays over 40,000 chars, and each of the three planted subjects
  appears exactly once.
- `rename-scope` keeps over 800 matching lines, both protected files keep their
  mentions, and at least ten applied migrations survive.
- **No keyword rubric passes on an empty answer** — run through the shipped
  `runCheck` against each fixture, so a check the fixture itself satisfies
  fails the suite.
- **The new rubrics separate a right answer from a wrong one** — literal
  reports through the same `runCheck`; a size-only answer and a churn listing
  both fail, a two-of-three answer passes.

Harness **189/189**, readiness gate **10 of 10**.

#### What is still open on 254, and the coupling nobody should miss

1. **One re-measure batch, paid.** 5 arms × 8 jobs × 2 reps = 80 runs, about
   **$30** on Sonnet at `rm164`'s per-run rate. The 2-arm default is $12–16.
2. **Regenerate the page from it** — `hush/README.md`'s benchmark section and
   `assets/bench-cuts.svg`, then state the crossover in plain words.

**The coupling:** hush's unpushed README rewrite at `e35b37a` was generated
from `rm164`, which is the **old six-task suite**. It cannot be merged as-is
once the suite changes — the page would cite a batch the harness can no longer
reproduce. Either push it first and regenerate afterwards, or hold it and
regenerate once. Holding is cheaper and is what §11.6 already recommended.

### 11.8 Why the cost win vanished and the silence rate fell — both answers are the task suite, and neither is a hush regression

**Investigated 2026-08-20 from retained records only. No model calls, no cost.**
547 Sonnet runs of a hush arm across 35 batches, plus 489 baseline runs, plus a
leave-one-task-out sensitivity on all four current-suite batches.

#### The cost never went up. It was never measured precisely enough to have gone down.

Every Sonnet read of hush-vs-baseline suite cost, oldest first:

| batch | date | suite | hush vs baseline |
| --- | --- | --- | --- |
| `claims2-sonnet` | 08-06 | 17 tasks | **−3.0%** |
| `h2h-sonnet` | 08-06 | 17 tasks | **+1.3%** |
| `cost3-sonnet` | 08-07 | 17 tasks | **0.0%** |
| `v18-c827bd6f` | 08-11 | 6 tasks | **−14.9%** ← the published figure |
| `s1-4b510954` | 08-19 | 6 tasks | **−6.1%** |
| `rm164-0003b8d4` | 08-19 | 6 tasks | **−1.1%** |
| `hero-31a025f9` | 08-19 | 6 tasks, max nudge | **+4.2%** |

Mean of the seven: **about −3%**. **`v18` is the outlier, not `rm164`.** Five of
the seven sit between −6% and +4%.

**Leave one task out and every headline changes.** This is the finding that
matters, and it applies to all four current-suite batches:

| batch | headline | drop one task and it ranges |
| --- | --- | --- |
| `v18` | −14.9% | **−22.5% to −3.0%** — without `incident-forensics` alone it is −3.0% |
| `s1` | −6.1% | −9.0% to −0.3% |
| `rm164` | −1.1% | **−12.1% to +5.6%** — without `feature-drift` alone it is −12.1% |
| `hero` | +4.2% | −3.8% to +8.8% |

**Twelve of the published fifteen points came from one task.** Drop
`incident-forensics` from `v18` and the −14.9% headline is −3.0%, which is
exactly what the three 17-task batches had already said a week earlier.

The per-run cause is visible in the raw cells. `v18`'s two baseline runs of
`incident-forensics` cost `$0.817` and `$0.533` — a 1.53× spread inside one
cell — while hush's two came in at 464k and 582k tokens of traffic against the
baseline's 1,336k and 781k. **At two reps per cell, one wandering session owns
the batch mean.** Six reps does not fix it either: `hero`'s six
`log-triage`/`hushmax` runs ranged `$0.149` to `$0.355`, a 2.38× spread.

**What did NOT change, across every batch: the compression.** Tool output cut
reads −59.3%, −47.1%, −51.6%, −48.9%, −46.4%, −46.4%. hush removes what it
always removed. The cost headline moved because the arithmetic downstream of it
is dominated by session-level variance, not because hush stopped working.

#### The silence rate fell because the suite got longer, and the effect is a clean dose–response

Silence is scored per session as an all-or-nothing flag: one leaked mid-turn
line and the session is not silent. So the rate has to fall as sessions get
longer, and it does. Pooled over **547 Sonnet runs of a hush arm, 35 batches**:

| tool calls in the session | n | silent | narration words |
| --- | --- | --- | --- |
| 0 | 35 | **100%** | 0.0 |
| 1–3 | 48 | **100%** | 0.0 |
| 4–6 | 71 | 93% | 1.5 |
| 7–10 | 215 | 83% | 3.4 |
| 11–15 | 83 | 77% | 3.8 |
| 16–25 | 29 | 79% | 6.6 |
| **26+** | 66 | **24%** | 25.8 |

Baseline over the same bins, for scale: 81% at 1–3, **11% at 7–10**, 9% at 26+.
**hush beats plain Claude at every single length.** Its advantage is widest in
the middle — 83% against 11% at 7–10 calls — and narrows at the extreme, 24%
against 9% past 26.

**The two suites sample completely different parts of that curve.**

| | 0 calls | 1–10 | 11–25 | 26+ |
| --- | --- | --- | --- | --- |
| old 17-task suite | 35 runs | 164 | 22 | **0** |
| current 6-task suite | 0 | 48 | 14 | **10** |

The old suite had 35 sessions with **no tool calls at all** and nothing above 25.
It could not test hush where hush breaks. The current suite can.

**One task carries the whole drop.** Current suite, hush arms, by task:

| task | tool calls | silent |
| --- | --- | --- |
| `log-triage` | 3.6 | **12/12 — 100%** |
| `dep-bump-warnings` | 8.8 | 6/12 — 50% |
| `incident-forensics` | 9.2 | 10/12 — 83% |
| `failing-suite` | 9.3 | 10/12 — 83% |
| `feature-drift` | 13.6 | **12/12 — 100%** |
| **`repo-sweep`** | **39.3** | **1/12 — 8%** |

Without `repo-sweep` the current suite reads **50 of 60, 83% silent**. With it,
51 of 72, 71%. **The retired poster's 81 of 85 and today's 26 of 36 are the same
plugin measured on sessions of very different length.**

#### What this means for roadmap 254's batch, before it is authorised

1. **A −15%-shaped cost claim cannot be bought at any rep count this project
   would pay for.** The per-cell spread is 1.5–2.4× on cost, so a few points of
   suite-wide difference is inside the noise. The claim the evidence supports is
   the null one — *the bill comes out about the same* — and a null claim is
   robust to exactly the variance that kills the other one.
2. **The reading and compression claims do not need more reps.** Reading ease
   held at 81.2 and 81.0 across batches; the tool-output cut held between −46%
   and −59% across seven. Two reps is enough for those tables.
3. **So the batch does not need to grow.** 5 arms × 8 jobs × 2 reps, ~`$30`,
   still buys everything the page should print. Spending ~`$57` on six reps of
   baseline-plus-hush would buy precision for a claim that should not be made.
4. **Silence should be reported against session length, not as one number.**
   A single "silent in N of M" hides a 100%-to-8% range that is entirely
   explained by how long the session ran. The honest form names the curve, or at
   least names `repo-sweep` as the hard case.

#### Follow-up, same day: one real defect in `repo-sweep`, and it is not the one to fix by softening the task

The question "how do we stop hush failing at `repo-sweep`" has a wrong answer
and a right one. The wrong one is to make the task easier: it is the **only**
task in the suite that probes past 26 tool calls, which is precisely where the
silence rate falls from 83% to 24%, so softening it deletes the measurement
rather than improving it. That is the flattering-mean failure roadmap 254 exists
to avoid.

The right one came out of the records. **All nine turn-cap kills across 3,159
retained records are on `repo-sweep`, and every one shares an exact signature:
`apiCalls === 40 === CONFIG.maxTurns`.**

| | the nine guillotined runs |
| --- | --- |
| `narrationWords` | 18, 31, 38, 63, 68, 101, 127, 137, 0 |
| `finalWords` | 0, 4, 5, 10, 10, 11, 14, 15, 23 |
| arms | hush ×4, baseline ×3, adhd ×1, core-only ×1 |
| cost | `$0.83`–`$1.19` against a repo-sweep median of `$0.61` |

**A cut-off session never reaches its final message, so everything it wrote
counts as mid-turn text.** Measured, it is indistinguishable from a total
silence failure — and `assertUsableRun` was letting all nine into the averages,
on the one task already sitting lowest on the silence curve.

The split is behavioural, not random: a run that edits its call sites **one per
round trip** exhausts 40 API calls and dies; a run that **batches** finishes in
7–12 API calls while still making 53–60 tool calls. Successful `repo-sweep` runs
reach 61 `numTurns`. No other task's `apiCalls` comes near the cap.

**Fixed at `87a9016`, both halves together:**

1. `config.json` `maxTurns` **40 → 60**. Cost impact is negligible — capped runs
   already cost near the top of the range, and only ~4% of `repo-sweep` runs
   ever reach it.
2. `assertUsableRun` now refuses `resultSubtype: 'error_max_turns'`, alongside
   the rate-limited reply and the zero-cost call. A guillotined run becomes an
   `ERR` line the operator can see rather than a poisoned mean.

Harness **191/191**, two new tests: one pins the refusal, one pins the cap at 60
or more so it cannot quietly drift back under what the longest task needs.

**What this does NOT fix, and the evidence says nothing will.** More reminding
makes it worse, not better. Silence past 26 tool calls, pooled over every Sonnet
run: **default `hush` 26% (n=62), `hushmax` — a reminder on every single tool
result — 0% (n=4)**. So T3.2's reminder-cadence idea stays closed; the leak on a
50-call grind is not a dosage problem. `repo-sweep` should keep failing hush
some of the time, because that is a true fact about the product on very long
turns, and the page should report silence against session length rather than as
one number that hides a 100%-to-8% range.

### 11.9 Claude Code shipped a built-in `Concise` style, and it lands on hush's own design

**Found 2026-08-20 by reading the binary. Claude Code `2.1.237` carries a
built-in output style named `Concise`. The previous build on this machine did
not** — `claude.exe` was replaced at `2026-08-20T02:52:18Z`, and the retained
`.old` binary has `Proactive`, `Explanatory` and `Learning` but no `Concise`.

Its definition, verbatim from the binary:

```
Concise: {
  name: "Concise",
  source: "built-in",
  description: "Claude responds tersely, leading with results and skipping
                preamble and narration",
  keepCodingInstructions: true,
  prompt: `You are an interactive CLI tool that helps users with software
           engineering tasks. Keep your responses short and direct while doing
           the work just as thoroughly.

           # Concise Style Active
           <body>`,
  turnReminder: "Be concise: lead with the result, skip preamble and
                 narration, keep only what the user needs."
}
```

The body, in full:

> The user chose brevity over narration. You should:
>
> 1. **Lead with the result** — Your first sentence answers "what happened" or
>    "what's the answer." No preamble ("Let me...", "Now I'll...") and no
>    closing recap of what you already said.
> 2. **Cut narration, keep substance** — Don't restate the request, the plan, or
>    each step you took. Report outcomes, decisions, and anything the user must
>    act on.
> 3. **Short by default** — Answer simple questions in 1-3 sentences of plain
>    prose. Use headers, tables, and bullet lists only when they carry real
>    structure, never as decoration.
> 4. **State things plainly** — Skip hedging boilerplate. Mention a caveat only
>    when it changes what the user should do next.
> 5. **Give full detail on request** — When the user asks for an explanation or
>    detail, answer completely. Conciseness never means withholding requested
>    information.
> 6. **Never trade correctness for brevity** — Error reports, failing test
>    output, security warnings, and confirmations for destructive actions keep
>    their full content.
>
> Where these rules conflict with more general communication or formatting
> guidance elsewhere in your instructions, these rules win.

#### The convergence is specific, not vague

Independent arrival at the same design is the interesting part, and it goes
clause by clause:

| `Concise` | hush |
| --- | --- |
| No preamble — "Let me...", "Now I'll..." | "skip self-narration ('Let me...', 'Now I'll...')" — the same two examples |
| No closing recap | "End on the last fact. No summary paragraph, no restating" |
| Errors, failing tests, security warnings, destructive confirmations keep full content | §Never compress: the same four categories |
| "Conciseness never means withholding requested information" | "requested depth is the deliverable" |
| A `turnReminder` injected each turn | hush's turn-top reminder, same channel |
| `keepCodingInstructions: true` | `keep-coding-instructions: true` |
| "these rules win" over conflicting guidance | §Mid-turn silence overrides the harness's narration mandate by name |

hush's own history explains why both landed there: the harness's coding
instructions mandate narration, `keep-coding-instructions: false` is a dead
lever (probe-confirmed), so a style that wants silence has to override the rule
**in its own prose**. `Concise` does exactly that in its last line.

#### What it cannot do, and why hush is not obsolete

`Concise` is a prompt. It has no hooks, so:

- **No tool-output compression.** A style cannot change what a tool returns.
  hush's `compress-tool-output.js` cuts **46%–59%** of it before it enters
  context, across all seven Sonnet batches.
- **No parked copy.** Nothing to recover the dropped detail from.
- **No mid-turn silence rule and nothing enforcing one.** `Concise` shapes the
  *reply*; hush says "Emit no text between tool calls" and backs it with a
  leak-triggered nudge. Measured: **83% silent at 7–10 tool calls against plain
  Claude's 11%** (§11.8).
- **No line or word caps, and no plain-word voice.**
- **None of the other six hooks** — compaction summaries, exit-code
  preservation, subagent briefs, session cleanup, post-compact re-arm.

But it is free, it ships in the CLI, and its prompt is roughly a tenth of the
size of hush's style body. **So the honest open question is not "is hush
obsolete" — it is "does hush's much larger style file still earn its 3,566-token
tax on the final message alone".** Nobody knows. That is worth buying.

#### Built at `65bfae5`: the suite can now race a built-in style

Racing it is a rival arm with **no plugin directory** — the style lives in the
CLI, so a settings file selects it. The rival loop was driven by `--rival-dir`,
so a settings-only rival could not be expressed. Now:

- `addArm` leaves `pluginDirs` empty when no directory is given.
- The loop runs over whichever flag list is longest, so `--rival-name`,
  `--rival-settings` and `--rival-env` still pair up by position.
- `settings-concise.json` holds the one line that selects it.

```bash
node runner/run.js --tag native \
  --rival-name concise --rival-settings settings-concise.json
```

Verified free through the shipped runner: `--dry-run` queues 48 runs over 8
tasks × 3 arms × 2 reps with `concise` interleaved beside `baseline` and `hush`,
displacing neither. Harness **194/194**, gate 10 of 10.

**Effect on the pending 254 batch: six arms instead of five, 96 runs instead of
80, about `$38` instead of `$32`.** The extra `$6` buys the only number that can
settle whether hush's style file is still worth carrying.
