# Foreman "Lesson Ledger" — verified design for a workflow-fed knowledge layer

Date: 2026-08-11. Local design record — not for publication (public docs carry
behavior, never process; this file is process).

> **ACCEPTED by the owner, 2026-08-18.** Open item 1 (approve the direction) and
> open item 2 (the SCOPE.md amendment wording, quoted verbatim below) are both
> settled. The build plan is on the roadmap as entries 239-247, of which 239 (the P0 probe) is already done. Open item 3 —
> the P1 and P2 measurement batches — is untouched by this acceptance and still
> needs its own go, with arms × tasks × reps and a cost estimate, per the
> standing rule.
>
> One design change is folded in, forced by the P0 result at the foot of this
> file: R1's serving window is a flat ≤6 records ranked by path overlap, not
> ≤2 areas × ≤3 records. Selection was always path-level and is unchanged.

## Provenance

Origin: owner idea thread — "foreman builds a map over time as tasks are
created and closed", refined to "harvest, don't build" (sessions already pay
the mapping cost; capture the residue at close), with the constraint that we
will NOT depend on the external tool graft (`D:\Projects\Knowledge\graft`,
MIT, mined 2026-08-11) and will not rebuild its parser layer.

Method: 14-agent workflow (`wf_d62445a4-d9f`), ultracode. Seven parallel
specialists (handoff pipeline, hooks, CLI/config, graft freshness engine,
lifecycle failure hunt, knowledge-quality failure hunt, prior-evidence audit
over 5 research reports + TRIALS/SCOPE/PRODUCT-STRATEGY), three independent
designers (minimal-diff / area-first / reliability-first), one judge, three
adversarial verifiers (feasibility, economics, failure coverage).

Verdict: **reliability-first design ("Lesson Ledger") wins 55/60** vs 47
(minimal-diff) and 45 (area-first). All three verifiers returned ADJUSTED —
zero REFUTED, zero fabricated code surfaces. Every adjustment is folded into
the design below. Raw agent outputs:
`X:\Temp\claude\D--Projects-Personal-SoftwareDevelopment-claude-plugins\60c9652a-a1b8-44c8-8178-f9c8841d9c95\scratchpad\wf-out\`
(session-scratch; this file is the durable record).

## Why this shape won

The hunts reduced "reliable task handling" to three measured failures:

1. **Stale pointers already ship.** Handoffs already quote old knowledge
   (prior-work recall, planned_touches-seeded content) with zero freshness
   signal, and the house has measured that a hard-repeated stale path anchors
   the destination on the decoy (codekeel anchor1 fixture; vibe 0/4
   moved-file; haiku mismatch-named 0/4).
2. **Blind handoffs.** Non-rederivable lessons (what was tried, which test
   helper is mandatory, why a shape was chosen) evaporate at close.
3. **Instructional closes run ~63%** (codekeel A7 measurement), so any
   design whose *correctness* depends on an ask is broken by construction —
   a skipped ask must degrade to silence, never corruption.

The losing designs built a new knowledge channel while leaving the existing
stale-quote harm untouched. The winner fixes the shipping channel first
(Task 1, zero new files), then adds the ledger behind probe gates, with the
upgraded existing channel as the control arm the ledger must beat.

Explicitly rejected (with reasons, from the hunts and prior evidence):

- **"What the area does" prose fields** — platitude/poison vector; only
  navigation facts + lessons carry positive expected value.
- **Backfill/init seeding of prose** — untested-by-work knowledge is the
  exact codelore failure this thesis exists to avoid; a misread seed poisons
  haiku 4/4 with 0/4 self-report. If seeding ever ships it is anchors-only
  (paths + sha, zero prose), skip-if-exists, ancestry-checked.
- **File-watching** — hooks can't see out-of-session edits; verify at read.
- **Co-change blast-radius stats** — SCOPE never-list adjacency, poisoning
  risk, no measured reliability payoff. Only the reach-ceiling filter stays.
- **SessionStart digest, per-prompt injection, next-candidates surfacing** —
  measured cost curves / hard prior rulings.
- **Per-record confidence fields, content-keyed dedup** — both refuted lines.

## The design (v1, all verifier adjustments folded)

### Artifact: `.foreman/notes.jsonl`

Committed, in-repo, CLI-owned, **append-only** (never rewritten by sessions;
merges line-by-line; no record ids → no count-derived merge collisions).
First line format marker `{"foreman_notes_format":1}`, recognized by shape,
refuse-on-newer, registered in `migrateIfNeeded` with backup-before-rewrite.
One record per close-with-lesson:

```json
{"area":"src/auth","paths":["src/Auth/session.js","test/helpers/clock.js"],
 "entry":142,"anchor":{"kind":"commit","sha":"a1b2c3d8"},"date":"2026-08-11",
 "lesson":"token refresh lives in src/Auth/session.js refresh(); tests MUST fake time via test/helpers/clock.js — real timers hang CI"}
```

- `paths`: separator/prefix-normalized but **case-preserved** (H1 fix:
  `normalizedTouch` lowercases — that stays a compare-key transform only;
  storing lowercased paths would read false-fresh on case-sensitive
  filesystems and false-dead in existsSync). Derived at close:
  derivedTouches ∪ `add_touches`, minus bookkeeping (`ROADMAP.jsonl`,
  `.foreman/**`, `docs/foreman/**`). Empty → record refused with a countable
  reason; the close itself never fails.
- `anchor.kind`: `"commit"` (close passed a sha) | `"entry"` (staged close —
  sha unknowable at write; resolved lazily via the trailer index) |
  `"none"` (no git → always serves as staleness-unknown).
- `lesson`: **≤500 chars, hard refuse** (advisory caps under-comply ~35%).
- `area`: derived by the CLI (dominant top-level prefix by file count) —
  cosmetic grouping key only; selection is always path-level. No `model`
  field (graft 9: no consumer → not stored).

New modules: `scripts/area-notes.js` (append/read/fold/dominantArea,
fail-soft parse, torn-final-line skip, conflict-markered file → null +
doctor finding), `scripts/note-staleness.js`, `scripts/area-notes-config.js`
(clone of decision-log-config.js, env override for tests). No markdown tier,
no per-area files, no new hooks. Zero new dependencies.

### Write moment (the only one)

`roadmap.js update-status` reaching a terminal/awaiting close, inside the
existing `withRoadmapLock` hold (roadmap.js:946-948, body 950-1112) — new
optional `--lesson "<text>"` / `lesson` input. One `appendFileSync` line.
On staged closes the notes file is staged alongside (extend
`stageRoadmapFile`, roadmap.js:860-870 — it is hard-coded to ROADMAP.jsonl
today) **and `filesStagedIn`'s keep filter (roadmap.js:822) must also drop
`.foreman/notes.jsonl`**, or an aborted staged close pollutes the *next*
close's observed_touches permanently (real gap found by feasibility
verification, worth fixing even without this feature).

Close JSON gains `lesson: {stored:true, area, paths_count}` or
`{stored:false, reason:"over_500_chars"|"no_observed_paths"|"disabled"}`.
Feature disabled but flag passed → the prose is **appended to the entry's
own notes** with a machine prefix (graft 1 — never silently dropped), and
that prefix is added to `MACHINE_NOTE_RE` (craft-handoff.js:248-249) so it
can never leak into recall excerpts (feasibility fix 2). Enabled closes also
append a one-line provenance note to the entry ("lesson recorded:
.foreman/notes.jsonl, area <key>") through the same guarded channel
(graft 2; same MACHINE_NOTE_RE requirement).

Telemetry: `lesson_present` trial event per enabled close and
`lesson_quoted` per crafted handoff (graft 7) — both only where
`trialLog:true` (trial-log record() is a no-op otherwise; the "free counter"
claim holds for opted-in projects, which includes our dogfood).

No hook writes the store — `task-created.js` stays the only writing hook.
No TaskCompleted block: forcing a lesson manufactures platitudes, and only
`decision:"block"` lands on that event anyway.

### The close ask, verbatim (emitted only when enabled)

> If this task taught you one durable fact about this code area that a
> future task would need, add `--lesson "one sentence, naming the file or
> symbol it concerns"` to the close command. If nothing generalizes beyond
> this task, omit the flag — that is a valid outcome.

Two sentences, single-purpose, in `entryParagraphText` + pick.md's close
commands. ~63% compliance is acceptable by design: a missing lesson is
silence, and the counter measures the real rate from day one. Boundary
guidance (roadmap-schema.md, model-facing): lessons cite decision docs
rather than restate them; project-wide facts belong in CLAUDE.md; one-file
facts belong in the file; entry-specific findings stay in entry notes.

### Read moments

**R1 — handoff.** New `areaNotesText(root, entry)` beside `priorWorkText`
(craft-handoff.js:590), emitted as a second untagged block inside
`<background>` (craft-handoff.js:622-628) — present in BOTH profiles,
passes check-prompt untouched (verified: the background gate only requires
non-empty `<relevant_files>`), and **never fed to `computeSignals`** (the
reinforced-promotion trap documented at craft-handoff.js:219-224).
Selection: `touchesOverlap(planned_touches, record.paths)`; drop records
whose only match is a path appearing in >20% of closed entries'
observed_touches (RECALL_MAX_REACH discipline); ≤2 areas × ≤3 records
(newest-first serving window); total ≤1000 chars including the fixed header
and closer, enforced by whole-record drops. Every served record discloses
why it matched ("matched: planned src/auth ↔ recorded src/Auth/session.js").

Header (descriptive, never imperative): "Lessons recorded by earlier closed
tasks touching these files — recorded claims, verify against the code:".
Closer (H4 fix — routes correction through a channel that exists in v1):
"If a Lessons line above proved wrong, note the mismatch in your close
notes and record the corrected fact with --lesson on your close." A
corrective record is newest-first, so it serves above and displaces the
wrong one. (The judge's original "survey repairs notes" wording promised a
stage-2 channel; do not ship that sentence in v1.)

Staleness gates serving. **v1 possibly-stale default = the graded rule**
(H5 pin): keep dated lesson lines, drop any line naming a changed file,
always label — `[entry 130, 2026-07-02, at 9f81e2b — possibly stale: 3 of
its 5 files changed since]`. Fresh = full prose + stamp. Unknown = paths
only + label. All paths gone = suppressed + craft warning. Anchors-only for
possibly-stale stays the pre-designed fallback if P2's haiku bar fails.

**R1b — Task 1, ships first, zero new files.** The existing prior-work
recall leads get the same three-valued staleness stamp (sha per lead via
`resolveEntryEvidence`, one `git diff --name-only -z <sha> -- <observed>`
per lead, ≤3 leads). This alone attacks the measured decoy-anchoring harm
on the channel that already ships. Implementation notes from verification:
widen `priorWorkText`'s signature (root is in scope at the call site), and
bump `RECALL_MAX_CHARS` 1000 → ~1200 once, or the third lead silently
evicts when labels land (3 × ~330-char leads + labels > 1000).

**R2 — explicit pull.** `node scripts/roadmap.js notes [--paths ...]
[--area <prefix>]`. Economics caps (required by verification): an
unfiltered call serves at most 10 areas (most recently fed), with a counted
overflow line ("+K more areas — filter with --area/--paths"), and staleness
resolution runs only on the served subset under a total git-call ceiling
(~30); beyond it, anchors-only. Output = O(min(areas,10)), never O(store).

**R3 — doctor.** Four codes appended in `allFindings`: `notes_unreadable`
(error), `notes_unsupported_format` (error), `notes_invalid_record`
(warning), `notes_dead_record` (info). **Dead/invalid findings aggregate
into ONE finding each** ("N dead records across M areas; oldest <date>",
truncated id list) — per-record findings would grow doctor output forever
(economics cap 2). Doctor stays fs-only (no git) on these paths.
`CONFIG_SPEC` gains the `areaNotes:{enabled:BOOL}` group.

**Not read anywhere else.** Nothing in `list`/`next-candidates`/menu (the
forever-reread surfaces stay zero-byte), no SessionStart, no per-prompt
channel, decision-anchors read-back deferred to stage 2.

### Staleness resolver (`note-staleness.js`; all fail-soft to "unknown", never to "fresh")

Runs only for records already selected for serving (≤6/handoff — the fast
pick path and next-candidates pay nothing). Per record:

1. Resolve sha: commit-kind → record sha; entry-kind → `trailerShasFor(id)`
   picking the **newest trailer sha that passes the ancestry check** (H3
   multi-sha rule); a commit-kind sha that fails step 2 falls back to
   trailer resolution (rebase splits sha from trailer). No resolution →
   "anchor unresolvable — staleness unknown (recorded <date>)".
2. `git rev-parse --verify --quiet <sha>^{commit}` — existence.
3. `git merge-base --is-ancestor <sha> HEAD` — off the current history line
   → unknown (divergent branch / squash-merge cases).
4. `git diff --name-only -z <sha> -- <paths>` with cwd from the
   `repoScopes`/`resolveSha` scope walk; **input pathspecs are de-prefixed
   to scope-relative when the resolved scope is a submodule** (H2 fix —
   `filesFromGit` only re-prefixes output; without de-prefixing, submodule
   diffs match nothing and read fresh forever), output re-prefixed as
   `filesFromGit` does; a record path outside the scope counts via the
   changed-gitlink rule. `-z` defeats core.quotepath. **No `-M`** — the
   design's original rename rationale was inverted (feasibility fix 3):
   without `-M` a renamed anchor path already reports as deleted, which is
   the correct "changed" signal here.
5. `fs.existsSync` per stored (case-preserved) path: ALL absent → suppress
   from serving + aggregated doctor info. Rename re-anchoring is stage-2
   survey work, never pick-path work.

Craft-time cost: ≤30 subprocess spawns ≈ 1.5-4.5 s, post-pick, off the fast
path. Batching diffs per unique sha is a noted optimization, not required.

### Reassign-id interaction (H3)

For entry-kind records the entry id is load-bearing (it is the anchor).
`cmdReassignId` renumbers holders while immutable trailers keep naming the
old id — so when `.foreman/notes.jsonl` exists, reassign-id **rewrites
`anchor` ids (and display `entry`) for renumbered holders' records** through
the registered backup-then-rewrite path. The store being CLI-owned is what
makes this safe; loose markdown could not honor it.

### Config

`.foreman/config.json` → `areaNotes: {"enabled": true}` — single key,
default off, every constant in code (500/1000/window 3/reach 0.2/notes-CLI
caps), no consumer-less keys. First-relevant-moment ask (settings.md
doctrine): on the first pick where ≥1 closed entry overlaps the picked
entry's planned_touches AND the key is absent, one AskUserQuestion; a
written `false` prevents re-asking. craft-handoff surfaces the "overlap
exists + key absent" fact to pick.md via its result/warnings (small unstated
plumbing, flagged by feasibility). Disabled/absent = total no-op: no
writes, no quotes, no git calls, no doctor findings beyond file corruption.

### Guard / lock

`guard-roadmap-edit.js` gains the exact project-relative path
`.foreman/notes.jsonl` (archive.jsonl pattern); deny message names
`update-status --lesson` and `notes`; Bash stays the corrupt-file escape
hatch. No new lock: writes ride the close's lock; reads are lock-free
(append-only + torn-line-skip parser).

### SCOPE.md amendment (owner sign-off required — ships as a decision entry)

"Only the selected task's detailed notes should enter a handoff"
(SCOPE.md:134) becomes "... — plus capped, staleness-labeled lesson lines
from closed tasks whose observed files intersect the task's planned files".
Positioning (graft 8): task-adjacent project memory — served only on
planned-file intersection, bounded, staleness-declared; NOT the never-listed
knowledge base (no taxonomy, no search, no browsable map; co-change graphs
stay cut). Dogfood note: build-plan task 7 should itself be a
`kind:"decision"` roadmap entry producing a decision doc under foreman's
own decision log — the feature's charter change is recorded by the
mechanism it extends.

## Economics summary (verified)

- Handoff channel is **age-flat**: worst case ≈ +410 output-side tokens
  (ask 58 + block ≤310 + R1b labels 45) at every project size; lifetime
  spend scales with work done, not store size — the correct scaling law.
- `list`/`next-candidates`/menu gain zero bytes at any age.
- The 500-char refuse cap is stronger than the schema's advisory warns.
- Store growth (≈120 KB at 400 closed tasks) reaches token surfaces only
  through the two capped pull/diagnostic moments above; stage-2 prune
  (graft 5, survey-gated, user-approved per finding) is disk hygiene, not a
  token requirement.

## Measurement plan (probes precede shipping; ask-before-batches; run data local per ADR 0004)

- **P0 (free, first):** script over the flagship ROADMAP.jsonl + archive —
  what fraction of closed entries' notes already contain a
  path-naming, generalizing line? Plus graft 4: do closed entries actually
  cluster by dominant top-level prefix (directly tests the admitted
  weak point: unvalidated area grouping)? Yield ≈ 0 → ship Task 1 only.
- **P1 (gates Task 1):** moved-file-decoy fixture; current recall vs
  labeled recall; sonnet + haiku; ~48 runs. Bar: labeled ≤ control decoy
  rate on BOTH models, cost delta <5%.
- **P2 (gates Tasks 3-7):** arms per H5: no-notes control / fresh /
  graded-labeled-stale / unlabeled-stale (deliberate harm arm — the product
  thesis is the labeled-vs-unlabeled delta); both models. Bar: fresh helps
  ≥1 model at equal correctness AND graded-stale does not poison haiku
  ("no poison on haiku" is the acceptance bar, not "helps on Sonnet").
  Fallback if the haiku bar fails: anchors-only for possibly-stale.
- **P3 (dogfood):** ~20 closes on foreman's own repo with trialLog on —
  lesson_present rate, rejection reasons, zero-path-lesson rate; decides
  whether the write-side path-token refusal hardens and whether the ask
  rewords.
- **P4:** count destination references to quoted lessons in P2 transcripts;
  near-zero → freeze all constants, build nothing further.

Honest risk (the winning design's own admission): the write side may prove
dead weight — if P0 yield is ~0 or the upgraded-recall control wins P2, the
shipped feature collapses to Task 1 (~40 lines) and that is the designed
outcome, not a failure of the plan.

## Build plan (roadmap-entry-sized; filenames verified against the real tree)

1. Staleness labels on prior-work recall + P1 fixture. touches:
   `scripts/craft-handoff.js`, `scripts/commit-evidence.js`,
   `tests/craft-handoff.test.js`, `prompt-template.md`. Includes the
   `RECALL_MAX_CHARS` bump decision.
2. P0 yield + clustering script (local, uncommitted).
3. Notes store core: `scripts/area-notes.js`, `--lesson` on update-status
   inside the lock, staged-close staging + `filesStagedIn` keep-filter fix,
   `lesson_present`, refusal reasons, graft-1/2 fallback + provenance notes
   + `MACHINE_NOTE_RE` additions. touches: `scripts/roadmap.js`,
   `scripts/area-notes.js`, `scripts/craft-handoff.js`,
   `tests/area-notes.test.js`, `tests/roadmap.test.js`.
4. Config + guard + doctor (aggregated findings): `scripts/area-notes-config.js`,
   `scripts/roadmap-doctor.js`, `hooks/guard-roadmap-edit.js`,
   `scripts/roadmap.js`, `settings.md`, `tests/roadmap_doctor.test.js`,
   `tests/guard_roadmap_edit.test.js` (underscore names are the real
   convention).
5. Staleness resolver + `notes` CLI with the R2 caps:
   `scripts/note-staleness.js`, `scripts/roadmap.js`,
   `tests/note-staleness.test.js`.
6. Handoff quoting + close ask + first-relevant-moment config ask:
   `scripts/craft-handoff.js`, `skills/roadmap/pick.md`,
   `prompt-template.md`, `tests/craft-handoff.test.js`.
7. Docs + charter: SCOPE.md amendment as a `kind:"decision"` entry with its
   decision doc, `roadmap-schema.md` (record shape, overlap rules,
   reassign-id note), README one-liner. Owner sign-off.
8. P2/P3 harness + runs (local; ship gate for 3-7).
9. Stage 2 (only if P2/P3 pass and P4 is nonzero): survey stale-note
   verdict + `note-supersede`, prune verb (survey AskUserQuestion-gated),
   decision-anchors area-note read-back, reassign-id anchor rewrite if not
   landed in task 3's scope.

## Open items for the owner

1. ~~Approve the direction at all (nothing is on any roadmap yet).~~
   **ACCEPTED 2026-08-18.** On the roadmap as entries 239-247.
2. ~~SCOPE.md amendment wording (task 7) — charter change, owner-only.~~
   **ACCEPTED 2026-08-18** as the wording quoted in the amendment section above.
   It still ships as a `kind:"decision"` entry with its own decision doc, so the
   charter change is recorded by the mechanism it extends.
3. **STILL OPEN — P1/P2 batch approvals when reached** (arms × tasks × reps +
   est. cost proposed per the standing rule). Accepting the direction did not
   accept the spend. P1 gates task 1 shipping; P2 gates tasks 3-7 shipping.
   Both build first, measure second.

---

## P0 probe result — run 2026-08-18

The free probe this document's measurement plan puts first. Script kept local
(`scratchpad/p0-probe.js`); it reads `ROADMAP.jsonl` and `.foreman/archive.jsonl`
only, makes no model calls, and costs nothing. 183 closed entries examined.

### P0.1 — does the write side already happen by hand?

| Measure | Closed entries | Share |
| --- | --- | --- |
| notes naming any path | 153 | 83.6% |
| notes carrying a generalizing marker | 75 | 41.0% |
| **both on the same line** | **69** | **37.7%** |

The design's collapse condition — yield ≈ 0, ship Task 1 only — **does not fire on
this number**. But the number is an upper bound and it is inflated. Reading the
hits, most are implementation logs that happen to contain a normative word:
*"Implemented hush/hooks/lib/safe-write.js per Spec 3 … lstat symlink refusal on…"*
is a record of what was built, not a rule for next time.

**The real P0.1 finding is that the question cannot be answered mechanically.** A
keyword proxy cannot separate a lesson from a log, so "does this already happen by
hand" needs a model pass over the 69 hits, not a script. That is a cheap follow-up
if the direction is ever approved, and it is the honest state today: unresolved. On the sample read, the write side is not obviously already happening by hand.

### P0.2 — do closed entries cluster by area? (graft 4)

This is the design's own admitted weak point, and the answer is **no, not for
Foreman**.

Overall, **60 of 177** closed entries with recorded touches — 33.9% — have 60% or
more of their touches inside a single top-level area prefix, spread across 29
distinct areas. Two thirds of closed work does not sit in one area.

The split by plugin is the part that matters, because Foreman is what a ledger
would serve:

| Area | Entries | 60%+ in one area | Mean share |
| --- | --- | --- | --- |
| `foreman` (top level) | 43 | 7 | 47% |
| `foreman/skills` | 16 | 6 | 56% |
| `foreman/tests` | 13 | 1 | 47% |
| `foreman/scripts` | 12 | 3 | 49% |
| `foreman/hooks` | 9 | 3 | 62% |
| `hush/hooks` | 21 | 13 | 76% |
| `benchmarks/hush` | 3 | 3 | 96% |

Foreman entries cluster **worst** of anything measured. That is not noise, it is the
shape of the product: an ordinary Foreman change edits an instruction file, the
script that assembles it, and the test that pins it, in one entry. hush clusters
well because hush is hook-shaped and a hook change stays in its hook.

### What this means for the design

Less than a first reading suggests, because **selection was never area-based**.
The design already says so: `area` is a "cosmetic grouping key only; selection is
always path-level", and R1 selects with
`touchesOverlap(planned_touches, record.paths)`. P0.2 does not touch that. The
retrieval spine survives intact.

What P0.2 does invalidate is every place `area` is load-bearing:

| Use of `area` | Verdict |
| --- | --- |
| R1 serving window, "≤2 areas × ≤3 records" | **Change it.** Area diversity is meaningless when two thirds of entries have no dominant area. It would drop a genuinely relevant record to make room for an area that is an artifact of the prefix rule. |
| `notes --area <prefix>` filter | Keep, but demote. It will match poorly. `--paths` is the useful filter here. |
| Doctor aggregation "N dead records across M areas" | Harmless. Cosmetic in a diagnostic line. |
| Stored `area` field | Keep. It is one derived string, it costs nothing, and it is the only thing that makes the `notes` overflow line readable. |

**The one design change P0 forces:** replace the `≤2 areas × ≤3 records`
serving window with a flat **≤6 records, newest-first, ranked by path-overlap
count**, still under the same ≤1000-char cap and the same RECALL_MAX_REACH
filter. Everything else in R1 stands.

The economics do not move — the window size and the char cap are unchanged, so
the age-flat guarantee holds.
