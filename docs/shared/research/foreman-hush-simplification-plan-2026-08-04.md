# foreman + hush simplification wave — brief for the executing session (2026-08-04)

**Status:** EXECUTED — closed 2026-08-18. Entries 218–228 are all `done`. (Entry 229
was added after this brief was written and is not described here.) The "Working
rules" below governed that one wave and no longer bind: in particular rule 4's
`hush/output-styles/hush.md` stays byte-untouched **is lifted** — the file was
rewritten by hush 1.6.0 (`50bda3b`) and 1.6.2 (`00aeb6b`). It is still the only
benchmarked artifact, so an edit costs a re-measured publish batch before the README
numbers can stand; it is not forbidden. Rule 6's pointer to the ship plan's §4 still
holds, with the two rows corrected in that file. The current account of hush's open
work is `../../hush/research/hush-consolidation-2026-08-18.md`.

**Executing model: Fable 5.** This is the handoff brief for ROADMAP.jsonl entries
**218–228**. It was produced by a 9-agent audit (code inventories, doctrine
extraction, over-engineering hunt, adversarial verification) of both plugins at
their 1.0.0 state. Every entry below survived adversarial refutation; the
refuted candidates are listed so they are not rediscovered.

## State snapshot (verified 2026-08-04)

- foreman 1.0.0 at `89ecf97`, hush 1.0.0 at `fdb3ec6`, parent release commits
  `d428435`/`1845881`. **Nothing is pushed** (parent 3 ahead, foreman 83, hush 33).
  Pushing is **out of scope** for this wave — the user did not authorize it.
- hush entries 210–217 are `done` (user accepted 2026-08-04).
- Both plugins already executed their big simplification programmes
  (hush v1 ship plan 2026-08-01; foreman waves 0–3 of product-review-2026-07-28).
  This wave is the residue the audit confirmed, nothing more.
- Suites: `cd foreman && node --test tests/*.test.js` (1000+ pass);
  `cd hush && node --test tests/*.test.js` (485 pass). Green before every commit.

## Working rules

1. Roadmap access only via `node foreman/scripts/roadmap.js` (the guard hook
   denies direct edits). Open with `update-status` → `in_progress`; close with
   the commit sha to `awaiting_acceptance` and findings in `notes`. Only the
   user writes `done`.
2. One commit per entry, on a branch **inside the owning submodule**, squash-merged.
   Never report a list of `task n/N` shas.
3. Nothing is pushed, published, or released. The paid batch (228) is the only
   entry that spends money and it is pre-approved at its stated tier only.
4. ~~`hush/output-styles/hush.md` stays byte-untouched.~~ **LIFTED 2026-08-18** —
   the file was rewritten by hush 1.6.0 and 1.6.2; an edit now costs a re-measured
   publish batch, it is not forbidden. The Voices surface (pick-style, craft-style,
   styles/) stayed untouched in this wave.
5. After two failed fix attempts on any check, stop and report — never widen a
   change to make a check pass.
6. Read `docs/hush/research/hush-v1-ship-plan-2026-08-01.md` §4 before touching any
   hush hook — it is the binding do-not-cut list.

## Suggested order

Foreman chain (serial, shared files): 219 → 220 → 221 → 218 → 222 → 223 → 224.
Hush chain (serial): 225 → 226 → 227 → 228 (228 depends on 226).
The two chains are independent of each other.

## The entries (detail lives in each entry's `what`)

| Id | Task | Kind |
|---|---|---|
| 218 | decision-anchors.js: exit before the 512KB read when no ADR dir exists | simplify |
| 219 | fold orphaned `scripts/sprint.js` (177 lines, one consumer) into safe-commit.js | merge |
| 220 | one `.foreman/config.json` reader replacing five parse sites, per-caller channels kept | merge |
| 221 | shared `readInput()`/`projectDir()` for the six hooks (latches stay local) | merge |
| 222 | adjudicated doc fixes: settings.md one-shot gate wording + stale "Call 2b" comment | doc |
| 223 | dedupe the two verbatim prose blocks shared by pick.md and craft-prompt | simplify |
| 224 | move `foreman/benchmarks/` to parent `benchmarks/foreman` — **design first** | cut |
| 225 | hush: dead `SIDECAR_DIR` const + stale postcompact-rearm header | cleanup |
| 226 | hush doc gaps: Standup line in the 0.15.0-alpha section, HUSH_WRAP cross-ref | doc |
| 227 | hush: measure-then-decide the `HUSH_TOOLRESULTS` Read route | cut-if-dead |
| 228 | hush claims benchmark batch (sonnet+haiku, 2 arms, ~$37) + README regeneration | evidence |

### Entry-specific cautions

- **219**: `sprint.js` is library-only; the wave3 "keep sprint" decision covered
  the sprint *feature*, which 1.0.0 already cut — this is only the leftover module.
- **220**: `render-sections.js:34-37` explains why its warning exists while the
  hook readers stay silent. Preserve both behaviors byte-for-byte.
- **223**: only the destination-question block and the fableEnabled-gating
  paragraph are verbatim copies. The model question differs between the two
  files — do not merge it. If a measured skill file changes, supersede the
  R-00x instruction-load record with recomputed numbers in the same commit
  (edit-then-recompute is the established supersede pattern).
- **224**: not a clean cut. `settings.md:34-39` cites `benchmarks/health/TRIALS.md`
  as the shipped trialLog privacy contract, and five test files import
  benchmark modules. Decide TRIALS.md's home first, then move.
- **227**: methodology mirrors shipped entry 212 — evidence from retained
  manifests/records, delete on zero firings, keep-with-numbers otherwise.
  Either outcome closes the entry.
- **228**: ONE batch, arms interleaved, never spliced or re-rolled; a
  rate-limited headless call returns cost 0 with the limit message as the
  answer — treat as fatal, not data. Benchmarks run with `HUSH_WRAP=1`; the
  README's failing-command disclosure must stay true. Every published number
  traces to a committed record; `runner/publish.js` is the only claims path.

## Refuted candidates — do not re-propose

From this audit's adversarial pass (on top of the standing lists in
`../../hush/research/hush-v1-ship-plan-2026-08-01.md` §4 and the critique evaluations):

- **foreman `fableEnabled` cut** — deliberately kept; survived two prior removal passes.
- **foreman `scripts/git-hooks/` move** — it is the contributor test gate, documented convention.
- **foreman trial-log writer-less event definitions cut** — conflicts with accepted entries 208/209.
- **deleting the R-004 draft** — it is gitignored, not committed; working as intended.
- **hush per-hook flags (`HUSH_NUDGE`/`HUSH_SUBAGENT`/`HUSH_COMPACT`) cut** — changelog-documented history; doctrine keeps them working, undocumented.
- **hush `intEnv` knobs inlined** — entry 215 decided keep-working-stop-documenting.
- **a shared latch module for foreman's five tmpdir latches** — key semantics differ; only `readInput`/`projectDir` are genuinely shared (that is entry 221).

## Out of scope

Pushing or releasing anything; ranking changes (entry 147, replay-gated);
trial-log B2 (entry 209, deliberately deferred); anything on foreman
`../../../foreman/docs/adr/SCOPE.md`'s never-list; hush activation redesign; any edit to
`output-styles/hush.md`.
