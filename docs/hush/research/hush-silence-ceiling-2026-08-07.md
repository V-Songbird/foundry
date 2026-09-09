# hush on the frontier models: where the silence budget actually runs out

**Date:** 2026-08-07
**Question:** using the `cost3-*` batches as the starting point, find the smallest
change that makes hush better at keeping Sonnet and Opus quiet and at producing
more useful answers. Not a feature — the YAGNI that meets the goal.
**Spend:** $16.06 on two Opus probes (52 runs), plus the confirm batch below.
**Status of the repo:** nothing shipped, nothing committed. `hush` is at `9363d50`
(1.2.2). All experiment arms live outside the repo in `X:/Temp/hush-arms/`.
**Status 2026-08-18:** HISTORICAL. The repo line above was true on 2026-08-07 only —
hush is at 1.6.2 today. The verdict (SHIP NOTHING; between-call silence is solved;
three mechanisms failed against the turn-opening line) is the durable part and
should not be re-spent. `lookfurther` remains the one measured correctness lever and
was shelved on cost, unre-run; that call sits in `hush-consolidation-2026-08-18.md`.

---

## 1. Silence has to be measured by position, not by count

The record's `narrationWords` field is one number per run. It cannot tell you
*where* the model broke silence, and on multi-turn tasks it only reflects the
final turn. Splitting the transcript on `{"type":"system","subtype":"init"}` gives
true turn boundaries, and each turn's non-final assistant text can then be sorted
into two piles:

- **opening line** — text emitted before the turn's first tool call
- **between calls** — text emitted after a tool call has already been made

Counted that way, from the committed `cost3-*` records (51 runs per arm per model):

| arm | Opus opening | Opus between | Sonnet opening | Sonnet between | Haiku opening | Haiku between |
| --- | --- | --- | --- | --- | --- | --- |
| no plugin | 43/51 (486w) | 34/51 (1310w) | 10/51 (137w) | 29/51 (1628w) | 34/51 (665w) | 25/51 (2368w) |
| caveman | 31/51 (187w) | 15/51 (222w) | 0/51 | 28/51 (753w) | 3/51 (14w) | 21/51 (815w) |
| **hush** | **13/51 (93w)** | **0/51** | **0/51** | **5/51 (115w)** | **0/51** | **1/51 (12w)** |

This total agrees exactly with the records' own silent-run counts — 38/51 Opus,
46/51 Sonnet, 50/51 Haiku — so the split is sound, not a second opinion.

**The finding: the between-call surface is finished.** hush is at 0/51 on Opus and
5/51 on Sonnet, against a no-plugin baseline of 1310 and 1628 words. There is no
headroom left there and no reason to spend on it again.

**The one gap left is Opus opening a turn before its first tool call.** The lines
are short and formulaic:

```
I'll dig into the pricing tests.
I'll start by exploring the project.
I'll take a look around the repo.
I'll sweep the repo for `formatAmount` call sites.
```

It concentrates in four tasks — `coupon-currency-flaky` 3/3, `incident-pool-leak`
3/3, `noisy-build` 2/3, `repo-summary` 2/3 — which is 10 of the 13 breaks. Sonnet
and Haiku never do it under hush. No plugin at all, Opus does it in 43 of 51 runs,
so hush already removes 81% of those words. The residue is 93 words across 51
sessions, under two words per session.

---

## 2. Two probes on the mechanism

Both probes ran Opus on the four worst tasks, which is a stress set rather than a
representative one — a win here means more than a win on the full suite.

**Probe 1 — `probe-opener-ce0bd038`, 16 runs, $4.83.** Change the style's own topic
sentence from `Emit no text between tool calls.` to `Emit no text before or
between tool calls.` Result: 5/8 control against 2/8. Directional, n too small.

**Probe 2 — `probe-nudge-04a7a3df`, 36 runs, $11.22.** hush's own hook file records
the relevant prior: *"style wording changes measured flat, while the same rule
delivered here cut mid-turn narration by roughly 90%."* The hook has two strings.
`STEP` fires between calls, is positional, and its surface is at 0/51. `TURN` fires
at the top of the turn, is abstract, and its surface is the one that leaks. So:
reword `TURN` into `STEP`'s shape, once and twice.

| arm | opening line | words |
| --- | --- | --- |
| `hush` control | 9/12 | 64 |
| `firstcall` — `TURN` reworded once | **5/12** | 34 |
| `firstcall2` — `TURN` stated twice | 12/12 | 94 |

Per task, `firstcall` against control: `repo-summary` 1/3 → 0/3, `noisy-build`
2/3 → 1/3, `coupon-currency-flaky` 3/3 → 1/3, `incident-pool-leak` 3/3 → 3/3.

### Refutation: doubling the turn nudge backfires

`firstcall2` measured **worse than doing nothing** — 12/12 against a 9/12 control.
This inverts the result recorded in `silence-nudge.js` for the PostToolUse string,
where twice roughly halved the leak and three times was worse than twice.
Repetition helps between calls and hurts at the top of a turn. Do not retry it.

---

## 3. Refutation: `runnable%` does not measure usefulness

`readability.js` reports `runnablePct`, and hush loses it to no-plugin on both
models — 90.2 against 98.0 on Opus, 80.4 against 92.2 on Sonnet. That looks like a
usefulness gap and it is not one.

The detector is `` /```|`[^`\n]*\s[^`\n]*`/ `` — a fenced block, or any inline code
containing a space. Phrases like `git log`, `npm ls ioredis` and `--no-ff` all
score, whether or not the reader is meant to run them.

The gap concentrates in two places. On Sonnet's `explain-rebase`, hush scores 0/3
and no-plugin 3/3 — but the prompt is *"what's the actual difference between git
rebase and merge, and when should I reach for each?"*, hush answers both halves in
123 words including the one hard rule about shared branches, and no-plugin spends
286 words and scores only because it name-drops `git log` and `--no-ff` in passing.
On Opus's `coupon-currency-flaky`, hush scores 0/3 by naming the fix in prose while
no-plugin scores by pasting the buggy lines.

Optimising this metric would push hush toward gratuitous identifier-dropping, which
its own style forbids: *"Say what a file says instead of pointing at it."*
**Treat `runnablePct` as descriptive only. It is not a quality target.**

---

## 4. The real usefulness defect: hush stops searching early

`incident-followup` is hush's only ground-truth gap anywhere — Sonnet 2/3 reps
fail, Haiku 3/3, Opus passes. The third turn asks for *"root cause, impact window,
and the ioredis version we're on"*, and the rubric wants `redis`, `5.4.1`, and a
timestamp. hush delivers two of the three.

The cause is not compression of the report. In the failing Sonnet runs the string
`5.4.1` **never appears anywhere in the transcript** — hush never opened
`package.json`. It found no lockfile, wrote *"couldn't confirm... if you point me
to the right repo or a `package.json`, I'll get the exact version"*, and stopped.
No plugin at all reads the file every time. The one passing hush rep reads it and
scores.

That is economy pressure leaking out of the report and into the work, against two
rules the style already states — *"Silence is not speed"* and *"Incomplete answer →
look further, don't shorten."* The candidate fix sharpens the second one where it
already lives, in Thoroughness:

> A fact you did not look for is not a fact that is missing.

---

## 5. Cost of change, against hush's 482-test suite

| change | file | suite |
| --- | --- | --- |
| reword `TURN` | `hooks/silence-nudge.js` | **482/482**, zero churn |
| add the Thoroughness sentence | `output-styles/hush.md` | **482/482**, zero churn |
| `Emit no text before or between tool calls.` | `output-styles/hush.md` | **breaks 5** |

The style's `Emit no text between tool calls` is a required core phrase in
`scripts/verify-style.js`, so editing it drags `verify_style.test.js` and
`activate_style.test.js` with it. The two candidate fixes do not.

The nudge tests import `TURN` by symbol rather than by literal, and the *"the
reminder never names the behavior it is preventing"* test still passes for
positional wording — it bans `narrat|preface|commentary|do not write|don't write`,
none of which appear in `your first output this turn is a tool call`.

---

## 6. Opus context traffic is not a new defect

hush's Opus context traffic is +15% over no plugin — 211,204 against 183,785 —
while Sonnet is −2% and Haiku −6%. That is arithmetic, not a regression: the fixed
prompt tax of 3,566 tok/session is re-read on each of ~7.1 API calls, which is
about 25,000 tokens, or 88% of the gap.

The reason Sonnet absorbs the same tax and Opus does not is that Opus reads more
narrowly to begin with. Baseline tool-output volume is 9,398 chars on Opus against
15,771 on Sonnet, so hush's compression takes −14% on Opus where it takes −52% on
Sonnet. There is less for it to cut. See the cost-ceiling report for why
cost-wins-everywhere is unreachable.

---

## 7. Confirm batch

`confirm-sonnet-0ebc013e` and `confirm-opus-*` — full 17-task suite, Sonnet and
Opus, 3 arms x 2 reps, 102 runs per model.

- `hush` — 1.2.2, control
- `firstcall` — `TURN` reworded, one line in `hooks/silence-nudge.js`
- `lookfurther` — one sentence added to Thoroughness in `output-styles/hush.md`

Each arm changes exactly one thing, so a win lands on a lever rather than on "the
plugin". Guards: `explain-rebase` must stay at 0 tool calls in every arm, ground
truth must not fall, and Sonnet's between-call count must not rise — Sonnet has no
opening-line problem to fix, so the reword can only cost it something there.

### Side finding: the style's lexical ban list does not bind

Sonnet's only persistent between-call leak is `refactor-rename`, in every arm. The
text is the phase-transition shape at a batch boundary:

```
Now I'll rename `calcTotal` to `computeTotal` across all source files.
Now let's confirm no stray references remain and run the tests.
```

`Now I'll...` is one of the two phrases the style's Register section names
explicitly — *"skip self-narration ("Let me...", "Now I'll...")"* — and Sonnet
writes it verbatim anyway. A named-phrase list is not a constraint the model
applies to itself while working. This corroborates the wording-lessons rule that a
backfiring clause usually needs fewer words rather than a longer blacklist.

### Sonnet — `confirm-sonnet-0ebc013e`, 102 runs, $19.14

| arm | silent | ground truth | mean cost | mean out tok | median words | ease | grade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`hush`** | **32/34** | 32/34 | 0.1860 | 1410 | 72 | 78.2 | 5.8 |
| `firstcall` | 30/34 | 30/34 | 0.1889 | 1329 | 84 | 79.5 | 5.4 |
| `lookfurther` | 31/34 | **33/34** | 0.1881 | 1469 | 88.5 | 79.7 | 5.1 |

**Neither variant beats the control on Sonnet.** `firstcall` costs two silent runs
and two correctness points. `lookfurther` trades one silent run for one correctness
point, and writes 23% more words in the final message.

This is the expected shape for `firstcall`: Sonnet has no opening-line problem to
fix — 0/51 in `cost3` and 0/34 here — so a turn-opening nudge can only cost it
something. Ground-truth failures by arm: `firstcall` lost `coupon-currency-flaky`,
`explain-rerender`, `incident-followup`, `sidecar-follow`; `hush` lost
`explain-rerender` and `incident-followup`; `lookfurther` lost `incident-followup`.

Guards held everywhere. `explain-rebase` ran 0 tool calls in all three arms, so the
`your first output this turn is a tool call` wording does **not** provoke spurious
tool calls. Cost is a three-way wash.

At 2 reps a 32-versus-30 difference out of 34 is not a powered result. Read these
as "no variant is clearly better here", not as a measured regression.

### Opus — `confirm-opus-be7861e6`, 102 runs, $36.94

| arm | silent | opening lines | ground truth | mean cost | mean out tok | median words | ease |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`hush`** | 25/34 | 9 | 32/34 | **0.3343** | **2361** | 97 | 88.9 |
| `firstcall` | 26/34 | 8 | 32/34 | 0.3504 | 2812 | 84 | 91.5 |
| `lookfurther` | 26/34 | 8 | **34/34** | 0.4018 | 3536 | 95 | 89.3 |

## 8. Verdict: ship neither

### `firstcall` is refuted

The probe's 9/12 → 5/12 **did not replicate**. On the full suite the reworded turn
nudge saved **one opening line out of 34** — 8 against 9. On Sonnet it was actively
worse, 30/34 silent against 32/34 and 30/34 correct against 32/34. It also costs
+19% output tokens and +4.8% money on Opus.

And it breaks the guard. On `explain-rebase`, a question with nothing to look up,
Opus ran **1 tool call in both `firstcall` reps** and 0 in `hush` and `lookfurther`.
Telling a model its first output is a tool call makes it reach for a tool it does
not need. That is a real harm, cleanly reproduced, for a benefit of one run in 34.

This is now the third mechanism tried against the Opus opening line — style topic
sentence, nudge reworded, nudge doubled — and none of them moves it. Treat the
opening line as **out of reach with the levers hush has**, and stop spending on it.

### `lookfurther` works and costs too much

It is the only arm that improved anything at scale: **34/34 ground truth on Opus**
against the control's 32/34, and 33/34 on Sonnet against 32/34. The mechanism is
real — it is the only arm that got `coupon-currency-flaky` right 2/2 on Opus.

The price is wrong for this product. On Opus it costs **+20% money and +50% output
tokens** (3536 against 2361), writes a longer final message, and drops `runnable%`
from 91.2 to 85.3. hush is sold as less noise for less money. Buying two correctness
points with half again as many output tokens inverts the pitch.

### What to do

**Ship nothing. hush 1.2.2 stands.** That is the YAGNI answer the goal asked for,
and it is now measured rather than assumed: on Sonnet and Opus the control arm won
or tied on silence, matched on correctness, and was the cheapest arm on both models.

If the correctness gap is ever worth paying for, `lookfurther` is the lever — but it
should be re-run at 3+ reps first, since a 34-against-32 difference at 2 reps is not
a powered result.

---

## 9. Reproducing the arms

`docs/research/rival-arms-2026-08-07/` holds `rival-arms-2026-08-07/mkarm.js` and one `edits-*.json` per
arm. `rival-arms-2026-08-07/mkarm.js` copies `hush/` to `X:/Temp/hush-arms/<arm>/`, applies the edits,
and gives the copy a **unique plugin name and output-style name**. That last part
is not cosmetic: an arm whose plugin name collides with a globally enabled plugin
silently fails to bind its style, and the batch then measures the wrong thing.
Always check the records' `outputStyle` field before trusting a batch.
