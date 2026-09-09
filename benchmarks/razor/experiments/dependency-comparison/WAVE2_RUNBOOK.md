# Wave-2 deny-wording A/B — staged, awaiting "go"

Everything below is prepared and selftested (no API spend yet). Launch is two
commands; scoring is two more.

## What's being tested

Arm `razor` (control) = the live razor working tree, main @ 0.3.4-alpha wording.
Arm `razor2` (candidate) = `arms/razor-wave2/`, exported from razor branch
`wave2-deny-wording` (pushed to origin). Only the deny-reason tails differ:
the candidate adds "This is razor's automated checkpoint, not the user
declining." and frames the unchanged re-issue as the base prompt's own
"adjustment" ("razor asks once and the retry passes; nothing here needs the
user"). Marker head substrings are identical in both arms, so `MARKERS`
counts stay comparable.

Why: the base system prompt tells the model "a denied call means the user
declined it — adjust, don't retry verbatim" and offers "ask the user to
check their hooks configuration" as a fallback. Live evidence (rAthena
session 57347b0f, turn 3) showed a Grep deny answered with a Glob sidestep.

## Launch (on "go")

```
cd D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/razor/experiments/dependency-comparison
python bench.py --task dep-slug,dep-http-lib --arms razor,razor2 --models haiku --runs 4
python bench.py --task dep-http-lib --arms razor,razor2 --models sonnet --runs 4
```

24 cells total (16 haiku + 8 sonnet), est. $6–12. Gates fire mostly on
haiku; sonnet is the regression spot-check (its ladder usually prevents the
bait pre-gate — near-zero denies there is expected, not a scorer bug: no
archived run has a real gate fire because import-guard postdates them all).

## Score

```
python wave2_score.py runs/<stamp>      # post-deny behavior per arm
python report.py runs/<stamp>           # standard tables/charts
```

`wave2_score.py` classifies each deny: reissued / sidestepped / abandoned /
stalled (+ asked_user flag). Validated against known-answer fixtures in
`runs/wave2-selftest/`. Interpretation is per gate:

- dep/import gates: `abandoned` + correct final code = razor's win (took the
  rung); `reissued` = the legitimate-need path working. Bad: sidestepped
  (install via another manager / import smuggled in), stalled, asked_user.
- search gate: `reissued` is the intended path; `sidestepped` (Grep→Glob) is
  the contract failing.

## Ship criteria (razor2 replaces 0.3.4 wording only if ALL hold)

1. sidestepped + stalled + asked_user rate not worse, ideally down.
2. Task correctness (harness `results.json`) not worse — watch especially
   for the reflexive-double-tap regression: installs/imports going through
   on retry where the stdlib covered it (dep-http-lib must stay correct).
3. Cost/tokens roughly flat.
4. If total denies < ~6 across the haiku cells, the batch is underpowered —
   report and decide (add a forcing task or accept live-session evidence)
   before concluding anything.

## If it passes

Merge `wave2-deny-wording` into razor main, release as 0.3.5-alpha (CHANGELOG:
user-facing one-liner), bump marketplace version+sha, delete `arms/razor-wave2`
and the branch.
