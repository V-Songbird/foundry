# Does the hush 1.9.0 voice hold up as plain text? — 2026-08-28

Roadmap 265. Gate on roadmap 264 (refresh flint after hush 1.9.0).

## The question

flint ships hush's output style as a plain file plus a `CLAUDE.md` fragment. No
plugin, no hooks, no compression, no turn nudge, no `[hush ...]` telemetry. The
1.9.0 voice was written and measured with all of that present. Nothing showed it
survives without it.

## Arm construction

`benchmarks/hush/runner/run.js` has `--rival-overlay <dir>`, which `cpSync`s a
directory over the fixture workspace after the fixture lands (`run.js:347`). The
flint arm is:

- `<overlay>/CLAUDE.md` — `flint/fragments/razor-hush.md` verbatim
- `<overlay>/.claude/output-styles/hush.md` — `hush/output-styles/hush.md` with
  the `force-for-plugin: true` frontmatter key and the `Notes like [hush ...]`
  paragraph removed
- `--rival-settings` pinning `{"outputStyle": "Hush"}`

Records confirm the style bound: the flint arm's `outputStyle` field reads
`Hush`, against `hush:Hush` for the plugin arm and `default` for baseline.

Note: `hush/scripts/verify-style.js` can never pass flint's copy. It requires the
telemetry clause and an "unmeasured variant" description marker, both of which
only make sense inside the plugin. Not a defect; the wrong tool for this file.

## Batch 1 — does it hold standalone

`records/flint265-4e1aa75d`. Opus 5, medium effort, 8 tasks x 3 arms x 2 reps =
48 runs, $22.63. 48/48 passed ground truth.

| Meter | baseline | flint | hush |
|---|---|---|---|
| Final words | 474.9 | 75.8 | 75.9 |
| Narration words (mean) | 28.6 | 2.9 | 2.8 |
| Silent runs | 0/16 | 9/16 | 9/16 |
| Cost | $8.56 | $7.12 | $6.95 |
| Context traffic | 349,444 | 302,417 | 303,971 |
| Ground truth | 16/16 | 16/16 | 16/16 |

caps.js (`8 lines`, `8 words per unit`):

| | baseline | flint | hush |
|---|---|---|---|
| Units over 8 words | 62.6% | 25.9% | 29.9% |
| Runs over 8 lines | 10 | 3 | 4 |
| Semicolons | 24 | 0 | 0 |
| Parenthetical asides | 67 | 0 | 0 |
| Longest sentence | 46w | 21w | 20w |

readability.js:

| | baseline | flint | hush |
|---|---|---|---|
| Words | 378.5 | 67.0 | 71.0 |
| Words per sentence | 13.4 | 6.9 | 7.2 |
| Flesch ease | 69.7 | 86.8 | 86.6 |
| Grade | 6.9 | 2.9 | 3.0 |
| Answer first | 100% | 100% | 100% |

structure.js:

| | baseline | flint | hush |
|---|---|---|---|
| Bold marks | 10.13 | 1.00 | 1.00 |
| Bold in band | 31.3% | 100% | 100% |
| **Links per message** | **0.00** | **0.81** | **1.31** |
| **Messages with a link** | **0.0%** | **62.5%** | **93.8%** |
| Blocks in band | 12.5% | 87.5% | 81.3% |

answerable.js (48 Sonnet judge calls, $2.38):

| | baseline | flint | hush |
|---|---|---|---|
| Fully answerable | 100% | 81.3% | 75.0% |
| Rubric facts recovered | 79.2% | 87.5% | 91.7% |

### Verdict

The bar agreed with the owner beforehand: flint within noise of hush on cap
conformance, narration and correctness, and clearly under baseline on length.
Met on every count. flint and hush land within one word of each other on reply
length (75.8 vs 75.9) and within 0.1 on narration.

**The one apparent difference was linking, and it did not survive a second look.**
flint put a markdown link in 62.5% of replies against hush's 93.8%, missing
entirely on `feature-drift`, `log-triage` and `rename-scope`. At two runs per
cell that is 5 messages against 10. See batch 2.

## Batch 2 — the linking gap was noise, and it reversed

`records/flintlink-6eaf5af5`. Opus 5 medium, the three jobs where flint missed,
flint vs hush x 4 reps = 24 runs, $9.54. 24/24 passed. First batch to carry the
new `effort` stamp.

| Task | flint | hush |
|---|---|---|
| `feature-drift` | 4/4 | 3/4 |
| `log-triage` | 1/4 | 1/4 |
| `rename-scope` | 3/4 | 0/4 |
| **Total** | **8/12** | **4/12** |

structure.js `linked%`: flint 66.7%, hush 33.3% — the **opposite** of batch 1,
where the same three jobs read flint 0/6 and hush 5/6. Final words 95.6 vs 87.3,
narration 2.0 vs 1.0, cost $4.63 vs $4.92.

**There is no linking gap.** Two runs per cell was not enough to see a rule that
fires on roughly half of these messages either way, and reading direction off
n=2 produced a confident answer that flipped on a fourth rep. Same lesson as
the `Concise` non-replication below and the razor corpus reversal: never quote one run as settled.

## Batch 3 — the README table

The owner chose to replace flint's published table rather than mix batches.

`records/flintreadme-0cd8a09a`. Opus 5, high effort, the same 4 jobs as the
retired `concise270` batch (`log-triage`, `failing-suite`, `repo-sweep`,
`incident-forensics`) x 3 arms x 2 reps = 24 runs, $11.19. 24/24 passed.

| Setup | Final words | Narration | Cost |
|---|---|---|---|
| plain Claude | 530 | 37 | $4.42 |
| built-in `Concise` | 344 | 9 | $3.37 |
| flint (both files) | 75 | 4 | $3.40 |

### `Concise` did not replicate

`concise270` (2026-08-26, same 4 jobs, high effort) measured plain Claude at 411
words and `Concise` at 386 — a 6% cut, which is the number flint's README has
been publishing. Today the same jobs put plain Claude at 530 and `Concise` at
344, a 35% cut. Nothing about `Concise` changed between the two runs.

This is the razor corpus reversal again: **never quote a single run as settled.**
The README now says "about a third" and carries the non-replication as a caveat
in its own words.

## What shipped into flint

- `output-styles/hush.md` — the 1.9.0 body, stripped as above
- `output-styles/hush-deprecated.md` — the old style, renamed `Hush (deprecated)`
- `DEPRECATED.md` — why it was replaced, what changed, how to install it, and the
  retired `concise270` table kept whole
- `README.md` — new "The style was rewritten" section, TL;DR and table replaced

`prompts/install.md` needs no change: the current style keeps the `hush.md`
filename, so the raw URL it fetches still resolves.

## Cost

| Batch | Runs | Spend |
|---|---|---|
| `flintsmoke-c085c86e` | 3 | $1.34 |
| `flint265-4e1aa75d` | 48 | $22.63 |
| answerable judge | 48 | $2.38 |
| `flintreadme-0cd8a09a` | 24 | $11.19 |
| `flintlink-6eaf5af5` | 24 | $9.54 |
| **Total** | | **$47.08** |
