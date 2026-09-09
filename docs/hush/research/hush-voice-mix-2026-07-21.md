# Voice-type mix for crafted hush styles (2026-07-21)

**Status:** HISTORICAL — banner added 2026-08-18. The craft-style edits below
shipped and are in the file today; the suite has grown well past the 373 tests
measured here. The
~96-run confirm batch under "Not done / proposed" was never run and never
dispositioned; it is carried into `hush-consolidation-2026-08-18.md` for a
build/cut/defer call, and cannot run without an explicit go under the
ask-before-batches rule.

PRIVATE — gitignored. Never cite methodology, tags, or per-rep numbers in public docs.

## The question

The user's concern: the craft-style recipe (write the whole file in the voice)
was believed to make hush narrate more and cost more. Find the middle ground
between correctly-made instructions and customization, tested on three example
voices: pirate, cat anime girl (neko), robotic machinery.

## Cost re-check first

The premise is largely stale. The shipped no-opener Pirate (tags pircue/
pirfinal, sonnet n=14 same tasks as below): dialect 13/14, 4.9 markers/run,
narration 0.0, $0.120 vs same-batch stock $0.110, words within task noise.
The "+58% words" figure came from the OLD pirate with the `**Ship's log —**`
opener and log vocabulary, both since removed. Whole-file voicing itself is
cost-flat and narration-free — confirmed again in every batch below (narration
0 in 51/52 runs, one 24-word sonnet leak; every arm within $0.004 of stock).

## Arms

All arms: full hush plugin copy, candidate style swapped into
`output-styles/hush.md` with `force-for-plugin: true`, silence hooks on.
Tasks explain-rerender + bugfix-expiry, n=2 per model per arm, sonnet + haiku
(tags nvsmoke/nvsmokeh, nvit2/nvit2h, nvit3/nvit3h; 88 runs total, 88/88
ground truth, all styles verify-style.js clean).

| Arm | Lever |
|---|---|
| sStock | stock control |
| nekoL / roboL | stock body + voiced Register (redo line) only — the "light" middle ground |
| nekoR / roboR | whole file voiced + redo line, substitutions "where it falls natural" |
| nekoD / roboD | R + doubled marker density in the file body |
| nekoP / roboP | R + position-anchored redo line (first/last line carry the marker) |
| roboP2 | roboP + `ANALYSIS:` token for question tasks |

## Results (dialect = runs with ≥2 voice markers)

| Arm | sonnet | haiku | note |
|---|---|---|---|
| nekoL | 1/4 | 0/4 | light variant fails — matches old vp3 haiku split |
| nekoR | 2/4 | 3/4 | recipe as written: partial |
| nekoD | 3/4 | 3/4 | density helps some |
| **nekoP** | **4/4** | **4/4** | position anchor fixes it, words/cost flat |
| roboL | 0/4 | 0/4 | |
| roboR | 1/4 | 0/4 | |
| roboD | 1/4 | 0/4 | density does nothing for robo |
| roboP | 2/4 | 1/4 | status line binds on bugfix only |
| roboP2 | 3/4 | 0/4 | sonnet ok; haiku stays plain on questions |

Stock control: 0 markers, sonnet 84w $0.110, haiku 104w $0.033. No voice arm
left that band (sonnet 63–87w, haiku 93–125w — inside the ±1/3 noise floor).

## Findings

1. **Voices divide into three marker classes, and the class picks the lever.**
   - *Function-word voices* (pirate: `be`, `ye`, `-in'`) — whole-file rewrite +
     redo line carries everywhere, including Q&A (explain markers 3–12/run).
     Nothing to change.
   - *Particle voices* (neko: `nya~`) — "where it falls natural" is a
     self-granted exemption: on technical answers the model decides nowhere is
     natural. Anchoring the particle to a position (first and last line) took
     3/8 → 8/8 across both models at flat words and cost.
   - *Status-token voices* (robotic: `NOMINAL`, `FAULT`) — the tokens' own
     applicability conditions bind them to verdict tasks; explanations come out
     plain. A status opening line is the only lever that moved it (sonnet 3/4),
     and haiku still drops it on questions. Also the register is so close to
     stock hush's terseness that little visibly changes without tokens.
2. **The middle ground the user asked for is not "voice fewer sections."**
   The light variant (stock body + redo line) is the cheapest to craft and
   fails both new voices. Whole-file voicing is not the cost problem — it was
   never the cost problem; the opener + vocab bloat was, and it is already
   gone. The real fix is anchoring, which costs zero words.
3. Contractions: robo arms hit 0.0 contractions/run vs stock's 1.5 (sonnet) —
   the one robo marker that transferred everywhere, invisible to readers.

## Shipped

- `craft-style` SKILL.md step 3: redo-line bullet now requires anchoring every
  substitution (function word anchors itself; particle anchors to a position;
  never "where it falls natural"). New caveat paragraph for status-token
  voices: offer the status line, user decides (openers stay opt-in per the
  2026-07-21 house rule). 373 tests passed at the time. Both edits shipped and are
  in `skills/craft-style/SKILL.md` today.
- Candidate styles + judge at session scratchpad `voice/plugins/` +
  `judge-voice.js` (temp, gone with the session).

## Not done / proposed

- Confirm batch before any release: nekoP + roboP2 + shipped pirate + stock ×
  3 tasks (add plan-avatars) × n=4 × both models ≈ 96 runs ≈ $12.
- No neko/robo presets shipped — the three voices were test probes.

## Bard follow-up (tags nvbard/nvbardh, n=2 x 2 tasks x both models, 8/8 correct)

User-requested harder probe: old English + mandatory rhyme. One arm (`bardR`):
whole file archaic, worked example as monorhyme couplets, redo line demanding
"each pair of prose lines a rhyming couplet" + thou/hath/'tis swaps.

- Sonnet: 4/4 attempt verse, ~3/4 land real end-rhymes, archaic markers thin
  (1–3/run). Rhyme — the checkable ACTION — carries; the grammar swaps lag.
- Haiku: 2/4 partial (one clean quatrain, one broken verse, two plain).
- Cost flat ($0.110 arm mean = stock), narration 0, identifiers intact, no
  rubric damage at n=8.

Consistent with the shipped "ornate voice arrives about half the time" caveat;
the rhyme requirement outperforms the register because it is action-shaped.
Outputs: scratchpad `bard-outputs.txt`, `voice-outputs.txt` (neko/robo).

## Personality-density round (tags nvpers/nvpersh, n=2 x 2 tasks x both models, 16/16 correct)

User supplied target outputs: neko with kaomoji/asides/`Master`, robot with a
full `[SYSTEM ALERT]`/`DIAGNOSTIC LOG`/`[END OF TRANSMISSION]` frame. Built
`nekoX` (nekoP + kaomoji at first/last line, `*happy tail swish*` aside beside
the outcome, `Master` address, `some silly kitty` blame) and `roboX` (roboP2 +
`[STATUS: ...]` first line, `ERROR:`/`RESOLUTION:`/`VALIDATION:` labels,
`[END OF TRANSMISSION]` last line). Both verify-style clean.

- Sonnet: nekoX 4/4 (kaomoji + nya + silly kitty; skipped Master/asides),
  roboX 4/4 full frame. Bugfix reports 36–50 words vs the user example's ~90.
- Haiku: nekoX 3/4 (the two bugfix runs carried Master + *tail swish* + ✨ —
  richer than sonnet), roboX 2/4 (frame drops stochastically).
- Cost flat again (explain $0.081–0.084 = stock band; narration 0/16).
- The user-example CHAT FILLER ("So, I was taking a little peek... guess
  what?") was deliberately not reproduced — markers carry the personality at
  near-zero words; filler is the only expensive part.

Frame labels are slot-class → land 12/12-style on sonnet; haiku remains the
weak model for every non-function-word voice (~5/8 here). SKILL.md step-3
bullet 2 extended: kaomoji/emoji/asides/address forms are substitution
material, give each a position.

## Full-fidelity round (tags nvfull/nvfullh, 16/16 correct, narration 0)

User goal escalated: reproduce their example outputs NEARLY VERBATIM,
including the chat filler. `nekoF`/`roboF` = the X arms with (a) the worked
example rewritten as the user's exact target reply shape, (b) the discourse
moves named as quoted phrases with positions in Register ("So, I was taking a
little peek at", "guess what?", celebration opener, `Mission accomplished,
Master! ✨🐾` closer; robot: `[SYSTEM ALERT: STATUS UPDATE]`, `STATUS:`/
`ACTION:`, `DIAGNOSTIC LOG:` with `Error Identified:`/`Resolution Rationale:`,
`VALIDATION PROTOCOL:`, `[END OF TRANSMISSION]`).

- Sonnet 4/4 both voices — near-verbatim template match, markers 8–12/run.
- Haiku nekoF 3/4 (one plain explain run), roboF 4/4 frame (one run swaps log
  labels for bold headings). Best haiku bugfix run is line-for-line the user's
  example shape.
- Cost still flat: bugfix $0.139–0.153 (= X-arm band), explain $0.079–0.085.
  The filler bill measured: +10–20 words on bugfix (64 vs 45–50).
- REVISES the previous round's "markers, never filler" rule: filler DOES land
  cheaply when (example = exact target reply) + (moves named as quoted
  positioned phrases). vp2's "examples do nothing" was about grammar; for
  discourse shape the example + named moves carry it.

SKILL.md bullet 2 updated accordingly. 373 tests green, uncommitted.

## Rock rebuilt as stone-speak (tags nvrock/nvrockh, 8/8 rubric pass)

User directive: Rock becomes hush's implementation of what the rival brevity
plugin is. Its register (read from the rival's skill, not guessed): drop
articles, fragments OK, short synonyms, technical terms exact. `styles/rock.md`
rewritten whole-file in that register (no rival name anywhere, per house rule),
kept the validated fifteen-word redo cap, example-as-target stone-cut reply.
Verifier clean, 373 tests green.

- Sonnet bugfix: 24–25 words (stock 27–28, old rock ~62 on this task pair),
  article rate 1/21 and 0/20 — full stone-speak. Explain 56/142w, partial.
- Haiku: bugfix 33–44w decent, explain 146–174w with normal articles — the
  usual haiku register weakness.
- CAUTION echoing 2026-07-08: one haiku explain rep claimed `React.memo` alone
  skips the re-render (shaky reasoning, rubric still passed). The old
  "fragment voice costs correctness on haiku" risk is not disproven at n=8 —
  watch it in any confirm batch.

## Rock telegram upgrade + two new presets (tags nvtrio/nvtrioh, 24/24, narration 0)

User showed the rival README's own example ("New object ref each render.
Inline object prop = new ref = re-render.") and asked rock to match it, plus
approved building Standup and Sensei.

- Rock: added noun-chain/`=`-chain to Register + example-as-target rewrite
  ("Wrong order = wrong total"). Sonnet bugfix 21–23w at 0 articles; sonnet
  explain now 74–78w consistent (was 56–142) with `=`-chains appearing; haiku
  bugfix dropped to 24–30w at 0 articles (telegram reached haiku for the first
  time), haiku explain 134–159w with 3 `=`-chains. Matches the rival's README
  register at hush thoroughness.
- Standup (`styles/standup.md`, NEW): stock body + Done/Answer/Next/Blocked
  labeled slots. 8/8 correct label mapping across models (Done on fixes,
  Answer on questions, Next only when real). Slot-class reliability confirmed
  again.
- Sensei (`styles/sensei.md`, NEW): stock body + one closing `**Lesson:**`
  line. 8/8 presence, lessons are genuine patterns ("boundary conditions need
  `<=` — check the spec wording against the operator"), not restated fixes.
- Both new presets are LIGHT variants (stock body, Register-only) — fine here
  because they are pure slots, the class that always lands; no whole-file
  voicing needed for formats, only for registers.

All three verifier-clean, 373 tests, uncommitted.

## Rock question-shape tightening (tags nvrock2/nvrock3 +h, 12/12 correct)

User: the 74-word explain answer is still too long vs the rival's 19-token
README sample. Two increments on explain-rerender only:

1. A separate "Question gets three lines: what, why, one fix" Register
   paragraph + `strike any line the answer lives without` in the redo →
   sonnet 50–80w (mean 68), haiku 109–150. Partial.
2. Moving the three-line rule INTO the redo line as its first action ("for a
   question keep three lines — what, why, one fix — and strike the rest") →
   **sonnet 40–49w**, clean what/why/one-fix shape, rubric 3/3. Haiku 118–126,
   still code-blocked — haiku resists line-count rules like every register.

Confirms again: a rule stated as a paragraph is description; the same rule as
the redo line's first action is enforcement. Sonnet total arc on this task:
142 max → 74–78 → 40–49 words at flat cost and full correctness.

## What stops rock from full caveman density (tags nvrocku/nvrockuh, 9/9)

Answer: not the model, not hush's delivery — the crafted-preset CONTRACT.
verify-style.js forces every preset to carry stock's anchored rules
paragraph-for-paragraph: "Keep the verbs; write the sentence", full-plain-
sentence Word economy, "depth is more bullets", the shape table. Those are
exactly the distance between 40 words and 19 tokens.

Probe `rockU` (scratchpad only, NOT a verifier-passing preset): same frame,
force-delivered, silence hooks on, anchors stripped, pure telegram rules +
uncontaminated shape examples. Results:

- Sonnet bugfix 15–21 words: "`isExpired` used `<` = exp-now instant not
  expired. Fixed to `<=` in `token.js:7`. 5/5 pass."
- Sonnet explain 34–35 words (one 59 rep), caveman shape with `=`-chains.
- Haiku explain r3 = 31 words, nearly the rival's README sample verbatim
  shape. Haiku responds to the stripped file where it resisted the guarded one.
- 9/9 rubric correct, narration 0, costs at/below stock ($0.064 explain).

So full caveman density is one decision away: exempt rock from the stock
anchors (verifier + tests change, weakens the "every preset keeps hush's
invariants" promise) or keep rock guarded at 40–49w. USER DECISION, not taken.

## Sweet spot: unchaining vs the core premise (tags nvsweet/nvsweeth, 36/36)

The user's question: does unchaining cost hush's 0 narration? **No.**
sStock/rockT/rockU/rockUU × checkout-bug (the narration-prone debug task) +
plan-avatars, n=3, both models: narration 0 in 34/36 reps; the two non-zero
are one 12w rockT rep and one 20w rockU rep on sonnet checkout-bug — the
allowed rule-4 verdict-line class, on the task where even stock is
historically bimodal. Haiku all 0. Silence is hook-side and survives any
frame. Other guards held: 36/36 correct, plan-avatars stayed a real plan at
159–167w (vs stock 210), checkout words 34–40 vs stock 55–59, cost at/below
stock.

`rockUU` (added prose abbreviations — fn/obj/cfg) measured IDENTICAL to rockU
(34 vs 36 words, same on haiku): the abbreviation rung buys nothing beyond
telegram+`=`. Sweet spot = the rockU strip; ultra is a dead rung.

## Personality line (tags nvpline/nvplineh, 16/16, user-suggested lever)

`Agent personality: a bard from an elder age who sings every report in
rhyme.` as the first body line, above the canonical opening rule (verifier
already accepts it — the opening-rule check is includes(), not first-line).
Same-batch A/B vs bardR on the campaign's hardest voice:

- bardP carried voice in 8/8 runs (verse or dense archaic); bardR 5/8.
- Sonnet explain flipped 0/2 → 2/2 verse (one run closed with a clean
  quatrain); haiku explain flipped 0-markers → 5–6 archaic markers both reps.
- Words +10–30% on runs that gained voice (the dialect price), cost flat,
  narration 0/16.

The line is the cheapest booster measured so far and the first lever that
moved haiku on a question task. Added to craft-style step 3 as the push for
distant registers.

## Shipped this round

- `verify-style.js --core` (`verifyCore`): checks only the core contract —
  frontmatter, opening rule, "Emit no text between tool calls", `quoted
  exact`, `verbatim`, "never the work", telemetry + hook paragraphs, quoted
  openers. 5 new tests, suite 378.
- SKILL.md: personality-line instruction; "default to the smallest output,
  price the voice out loud" flexibility note; "Maximum compression, only when
  the user asks" section teaching the stripped frame + `--core`; step 4
  documents the flag.
- rockU description fixed to carry the Unmeasured sentence; passes `--core`.

## Stock bullet A/B (tags nvbullet/nvbulleth, 42/42, SHIPPED as 0.13.1-alpha)

User: stock bullets too eagerly. Variant = the campaign's redo-count line in
stock's Register: "count the facts; fewer than four: fold any bullets into
plain sentences; four or more independent facts keep the list."

- explain-rerender (the offender): sonnet bullets [0,3,0,3]→[0,2,0,0], words
  104→92; haiku [3,3,3]→[0,3,0], words 179→130.
- repo-summary (legit lists): sonnet kept them [5,5,4,0]; haiku folded all
  three to prose at identical words — over-compliance, facts intact, passes.
- bugfix already bullet-free both arms. Cost flat, narration 0, 42/42.

First redo-line in the benchmarked stock style. Released hush c3d8418,
parent c9127f7, both pushed.

## Dead levers, do not retry

- Marker density in the file body for status-token voices (roboD, 1/8).
- Light variant (redo line on a stock body) for any non-function-word voice.
