# Anchor absorb experiment — action-first levers, 2026-07-21

**Status:** HISTORICAL, HOST DELETED — banner added 2026-08-18. Everything below
reasons about `hush/styles/anchor.md`, and the Anchor preset was deleted at hush
commit `4c0d45a` ("Aim the stock style at tired and ADHD readers"). All three
clauses went with it — none of them, including clause 3 (spiral), the doc's own
ranked winner, exists anywhere in the shipped tree. The surviving presets are
glyph, pirate, rock and sensei. The measurements below are real and were never
refuted; they are simply homeless. Whether clause 3 gets re-homed into a surviving
preset or retired with its host is an open call recorded in
`hush-consolidation-2026-08-18.md`.

Can Hush Anchor absorb the three reader-ergonomics ideas mined from
`i-have-adhd` (github.com/ayghri/i-have-adhd, MIT, cloned at
`D:\Projects\Knowledge\i-have-adhd`) without losing hush's core features
(mid-turn silence, terse finals, correctness)? Headless A/B, Sonnet + Haiku,
88 paid runs.

## The three candidate clauses

Added to a copy of `hush/styles/anchor.md` (arm `aabs`); control is Anchor
verbatim (arm `actl`). Both arms are full hush plugin copies — hooks included —
with the style in the forced slot, pinned via `outputStyle: hush:Hush Anchor`.

1. **Next-action ender** — replaces "End on the last fact" lead:
   > End on the next action when work remains for the reader: one step, doable
   > in under two minutes, starting with the verb. When nothing remains, end on
   > the last fact. No summary paragraph, no restating, no offer of more help.
2. **Carry the position** — new chunk rule:
   > When the turn advances a multi-step plan, the opening line ends with the
   > position: step n of N done, next step named.
3. **Third try on the same failure** — new chunk rule:
   > From the third consecutive turn spent on one unresolved failure, the
   > message states the assumption being relied on and asks one diagnostic
   > question.

Wording was written against the prompt-wording checklist (no failure
descriptions, overridden rule named in place, no unscoped carve-outs).

## Design

- Main batch (`anchor-s`, `anchor-h`): 2 arms × 4 tasks (explain-rerender,
  explain-rebase, bugfix-expiry, noisy-build) × 4 reps × 2 models = 64 runs.
  Guards: narrationWords, finalWords, cost, ground-truth pass.
- Probes (`aprobe-s`, `aprobe-h`): 2 new multi-turn tasks × 2 arms × 3 reps ×
  2 models = 24 sessions, using the runner's existing `prompts`/`--continue`
  chain.
  - `probe-steps` fixture: a stated 3-step plan (slugify impl → tests →
    README), "Do step 1 only", then "Continue." ×2. Grades clause 2.
  - `probe-spiral` fixture: repo whose tests pass locally while the user
    reports the same `TypeError` three turns running. Grades clause 3.
- One interleaved batch per model per tag; costs never compared across batches.

## Results

### Core features — intact

- Ground truth: 64/64 pass, both arms, both models. Probes 24/24.
- Silence: narration 0 in 63/64 main runs. The one leak (`aabs` sonnet
  bugfix-expiry r4, 26 words) is a single mid-turn diagnosis sentence — same
  class as stock's known rare sonnet leak, content unrelated to any added
  clause. 1/32 vs 0/32 is not signal at this n.
- Terseness: `aabs` final words equal or shorter than control in every
  task×model cell (e.g. sonnet explain-rerender 207 vs 225). Cost flat.

### Clause 1 — next-action ender: inert, and safely so

On all four single-prompt tasks both arms end on facts; the ender never fired
and never invented busywork on completed work. Both arms treated pure-Q&A
answers as "nothing remains". Unproven-positive: needs a task that genuinely
leaves the reader work (none in this suite leaves any).

### Clause 2 — carry the position: weak positive on Sonnet, null on Haiku

- Sonnet `aabs` put the position in the opener ("**Step 1 done: …**", "step 2
  of the plan", "step 3, completing the plan") — r3 clean on all three turns,
  r1/r2 partial. Control carried the same information, but variably and in
  trailing lines ("Stopping here per the plan — steps 2 and 3 are not done").
- Haiku: null. Identical openers in both arms, and both arms broke the
  one-step cadence at turn 2 (did steps 2+3 together) and closed turn 3 with
  "What's next?" — a model behavior, not clause-driven.
- The literal regex `step \d of \d` matched 0/72 turns — models always
  paraphrase the position. Graders must read semantically.

### Clause 3 — third try on the same failure: the real win

- **Haiku** control guess-patched every turn of every rep — 9–10 edits over 3
  sessions, churning through guard → default param → `filter(Boolean)` →
  optional chaining, each announced as "Fixed". `aabs` cut edits to ~6 and
  asked a diagnostic question mid-spiral in 2/3 reps ("Could you share the
  exact output…"), r3 holding out two full turns before caving once.
- **Sonnet** control already resists guess-patching (2/3 held with zero edits).
  `aabs` additionally produced the clause's exact shape — an explicit "the
  assumption I'm relying on" statement plus one diagnostic question — in 2/3
  reps. Cave rates: `aabs` 1/3 at turn 3 vs control 1/3 at turn 1.
- Haiku spiral sessions were also cheaper under `aabs` (~$0.21 vs ~$0.29 avg) —
  less churn — but n=3, directional only.

## Caveats

- Probes are n=3 per cell: directional, not proven (the n≤4 lesson applies).
- The ender clause was never observed firing; its safety is proven (64 runs, no
  false fire), its benefit is not.
- Nothing shipped: the `aabs` style exists only in the session scratchpad and
  `.benchmarks` arm config (`actl`/`aabs` arms + `settings-anchor.json` +
  `probe-steps`/`probe-spiral` fixtures remain for reruns).

## Addendum — ender-open probe (same day, tags ender-s/ender-h)

Shipped the three clauses into `hush/styles/anchor.md` (hush `158f097`), then
closed the clause-1 measurement gap with a new fixture, `ender-open`: an
env-var typo (`STRIPEKEY` read, `STRIPE_KEY` documented and configured) whose
prompt asks "tell me what I still need to do on my side". 2 arms × 4 reps × 2
models = 16 runs, 16/16 pass.

- Sonnet: the sharper analysis — both arms correctly conclude ops' key was
  right all along. `aabs` ended on an imperative action ("Redeploy with this
  fix") 4/4; control ended on a no-action-needed statement 2/4. Weak positive
  for consistency.
- Haiku: null — both arms end with a user-side action 3/4, because the prompt
  itself demands one. Haiku in both arms hedges toward "verify ops named it
  right", unnecessary after the fix but harmless.
- New task-property observation: `ender-open` elicits a small mid-turn
  narration sentence on Sonnet in BOTH arms (aabs 23w+11w in 2/4, actl 12w in
  1/4) — task-specific leak class, not clause-attributable.
- Honest limit: any prompt that asks for the user-side step makes the control
  comply too; a clean isolation needs remaining work the prompt doesn't
  mention, which then depends on model judgment of "work remains". The clause
  buys consistency, not capability.

## Verdict

Anchor can absorb all three clauses with no measured loss of silence,
terseness, or correctness. Ranked by evidence: clause 3 (spiral) earns its
place — it visibly rescues Haiku from guess-patch churn; clause 2 helps Sonnet
openers and is inert on Haiku; clause 1 is safe but unproven. If shipped, they
belong in the Anchor preset (attention-reader surface), not stock Hush, and
preset conformance should be re-run afterwards.
