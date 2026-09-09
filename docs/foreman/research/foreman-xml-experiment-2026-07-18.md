# Foreman XML-tag experiment — 2026-07-18

Private notes (gitignored dir). Question: do XML-tagged task prompts
outperform the same content in markdown headings or plain prose, for the
models foreman targets? User-approved batch (AskUserQuestion): 3 arms × 3
tasks × 6 reps on haiku AND sonnet = 108 paid runs, actual spend $10.53
(haiku $2.77, sonnet $7.76 summed from run records).

## Design

Private harness `benchmarks/foreman/experiments/handoff`, tags `xml1-haiku` /
`xml1-sonnet`, same-batch arms, frozen prompts:

- `foreman` — the existing XML-tagged template prompt.
- `foremanmd` — SAME text, each XML tag swapped for a markdown heading.
- `foremanprose` — SAME content flowed as plain prose (no tags/headings,
  bullets joined into sentences; two unavoidable wording deltas noted in
  the harness README).

Facts, guardrail content, verification command identical across arms —
the delta is markup only. All 108 records `resultSubtype: success` (no
truncation-fabricated runs).

## Results

Correctness (all trap checks): **100% in every cell, both models** — 54/54
haiku, 54/54 sonnet. Verification ran 100% everywhere. Violations 0.

Overall means (per run, pooled; report.md per tag has per-rep rows):

| model | arm | cost | out tok | reads pre-edit | turns |
|---|---|---|---|---|---|
| haiku | foreman | $0.0555 | 2350 | 3 (2–5) | 7 (6–9) |
| haiku | foremanmd | $0.0492 | 2217 | 3 (2–5) | 7 (6–9) |
| haiku | foremanprose | $0.0489 | 2235 | 3 (2–4) | 7 (6–8) |
| sonnet | foreman | $0.1545 | 894 | 3 (2–5) | 7 (5–9) |
| sonnet | foremanmd | $0.1383 | 972 | 3 (2–6) | 7 (5–10) |
| sonnet | foremanprose | $0.1385 | 1045 | 3 (2–5) | 7 (5–9) |

**The apparent 11% XML cost penalty is a cache-order artifact, not a
format effect.** The `foreman` arm's api-constraint reps 1–3 were the
first concurrency wave of each batch (cold prompt cache) and are outliers
in BOTH batches: haiku 0.077/0.072/0.075 vs 0.045–0.050 warm; sonnet
0.236/0.235/0.238 vs 0.119–0.139 warm. Excluding the cold wave,
api-constraint per-rep costs are flat across arms on both models
(haiku ~$0.046 everywhere; sonnet ~$0.126–0.134 everywhere). Every other
task×arm cell ran cache-warm and is flat.

Residual non-flat signal, one cell only: haiku moved-file `foreman`
out-tokens 2092–5308 (3 of 6 reps blew past 4k) vs md 2594–2848 / prose
2602–3309. Direction is anti-XML but the spreads overlap at n=6 —
recorded as a wobble, not a finding.

mismatchNamed (moved-file info signal): sonnet 6/6 in ALL three arms —
sonnet names the stale-brief mismatch regardless of markup. haiku 1/6,
0/6, 0/6 — noise, consistent with the haiku2/anchor1 campaigns.

## Conclusion

**Null result: markup format (XML vs markdown headings vs plain prose)
does not move correctness, trap compliance, verification, reads, or turns
on haiku or sonnet.** The template's measured value lives in its CONTENT
(facts, guardrail blocks, required verification) — consistent with the
earlier freeform/webtemplate campaigns where those arms lost on behavior,
not markup.

Decision: **keep the XML template — no change.** Grounds: the official
platform prompting guide still recommends XML tags for prompts mixing
instructions/context/examples; the mechanical gate (check-prompt.js) is
built on tag extraction and delivers the measured 2/12→12/12 haiku craft
rescue; and this experiment found no penalty to leaving it (the one
wobble is a single haiku cell with overlapping spread). Re-run trigger:
if a future template revision considers dropping tags for token savings,
the answer measured here is that markup choice is a wash — decide on
tooling grounds, not performance claims. No README/marketing claim about
XML superiority exists or should be added.

## Follow-up: per-model doctrine phase (same day)

Free diff phase against prompt-polish's doctrine files (themselves
distilled from the official guides; clone at
D:\Projects\Knowledge\foreman-knowledge\prompt-polish):

- **sonnet**: no doctrine file exists and no official sonnet-specific
  delete-list — diff EMPTY, nothing to measure.
- **opus** (opus-4-8.md free-by-default list): foreman's prompts contain
  none of the listed noise (no interim-status demands, no "be precise",
  no verbosity rules, no slop lectures, no think-step-by-step rituals) —
  diff EMPTY.
- **fable** (fable-5.md list + official page): REAL diff — the two
  read/run-first step bullets are "enumerated micro-steps" and the
  closing reason-through sentence is think-step-by-step-shaped. New
  frozen arm `foremanfable` (foreman-fable.md × 3 fixtures): those
  dropped, guardrails/facts/constraints/verification untouched, −18-20%
  chars. Persona KEPT (delete-list names inflated credentials only;
  cross-model official guidance endorses a single role sentence).
- **foremanfable2**: foremanfable minus the persona sentence — settles
  the role-line question empirically.

Craft-side changes shipped alongside (foreman 0.26.0-alpha): craft-prompt
Call 6 now also fires for clipboard handoffs, and a concrete answer
overrides `targetModel` for elaboration scoping (dispatch-time model wins
over the project declaration; the divergence gap is closed). Gate needs
no flag — check-prompt.js never reads targetModel.

**Paid phase RAN (user-approved floor plan, cut from the original 54-run
shape): smoke `fablesmoke` (2 runs, priced fable at $0.70-0.77/run) +
batch `fable1` (foreman vs foremanfable × moved-file × 4 reps, 8 runs).
Total spend $3.19 + $1.47 smoke. foremanfable2 (no-persona) built but
never run — persona question stays open.**

fable1 results (n=4/arm, all resultSubtype success, same batch):
- Correctness/traps: 4/4 both arms; reads 5,5,5,5 both; verification
  100% both; mismatchNamed 4/4 BOTH arms (fable names the stale-brief
  mismatch every time, like sonnet).
- Cost: foreman 0.444/0.453/0.445/0.449 (mean $0.448) vs foremanfable
  0.374/0.385/0.393/0.391 (mean $0.386) — **−13.8%, non-overlapping
  ranges**. Turns 9,9,9,9 vs 8,8,8,8 — one fewer turn every rep.
- Narration NUANCE: mid-turn narration words foreman 15,0,0,0 vs
  foremanfable 0,19,36,0 (smoke: 0 vs 24) — small absolute words, but
  the direction says the closing reason-through paragraph still bounds
  narration on fable. The tested variant cut bullets AND paragraph, so
  the two cuts aren't attributable separately from this data.

**Decision (user): bullets-only.** targetModel:fable guidance now drops
the read/run micro-step bullets and KEEPS the closing paragraph (its
narration-bounding signal, however small, survives on fable; the 0.14.x/
0.16.0 regressions it fixes were real). Shipped in foreman 0.27.0-alpha:
template fable sub-bullet + checklist line + README row. No gate change —
bullets aren't gate-checked; the paragraph and guardrails stay enforced
verbatim.

**Attribution probe `fable2` (same day, user-directed "do it here", 8
runs ≈ $3.10; caveat: compared against fable1 cells cross-batch, ~1h
apart, same day/model/fixture, all 16 runs resultSubtype success):**
- `foremanbullets` (bullets-only cut = the shipped 0.27.0 shape,
  moved-file-only prompt file): $0.388/0.405/0.382/0.387, mean **$0.390**
  vs foreman $0.448 and foremanfable $0.386 — **the bullets cut carries
  essentially the whole −13.8% saving** (paragraph cut adds ~1%, noise).
  Turns 8 every rep, 4/4 pass, mm 4/4, narration **0,0,0,0** — the best
  narration profile of any arm, bullets gone AND paragraph kept.
- `foremanfable2` (no persona, both cuts): $0.388 mean vs foremanfable
  $0.386 — the persona line costs nothing measurable and changes no
  behavior signal (4/4 pass, mm 4/4, narration 16,0,22,29 ≈ foremanfable's
  0,19,36,0 — paragraph absence, not persona, tracks the narration).
- Verdicts: shipped 0.27.0 guidance VALIDATED as capturing the full
  saving with the cleanest narration; closing-paragraph keep VALIDATED
  (cost-free, bounds narration); persona line is cost-neutral on fable —
  `usePersona` stays a style choice, never a cost lever. No further
  template change from this probe.

## Sonnet scaffolding probe `sonnetbullets1` (2026-07-19, user-directed)

Mirror of the fable probe: foreman vs foremanbullets, moved-file, n=4,
--model sonnet. 8/8 success, ~$1.58 spent.

- Correctness/traps/verify/mismatchNamed: 4/4 both arms, all identical.
- Turns: foreman 8,10,8,9 vs foremanbullets 8,7,7,7 — fewer, cache-free
  signal.
- **Narration: foreman 32,0,28,32 words vs foremanbullets 0,0,0,0** —
  on sonnet the read/run bullets themselves induce step narration (the
  0.14.x bullets-read-as-script mechanism), and removing them silences
  it with the closing paragraph present in both arms.
- Cost: foreman 0.276/0.294/0.272/**0.167** vs bullets 0.144/0.144/
  0.141/0.143 (mean $0.143). The foreman arm's first three reps are the
  batch's cold cache wave (the known first-arm artifact); the honest
  comparison is warm-only: foreman $0.167 (n=1) vs bullets $0.143 —
  ≈−14%, same direction and size as fable, but the warm anchor is a
  single rep.
- Caveats: single fixture, n=4, cold-contaminated anchor arm. No
  official sonnet doctrine backs the cut — this probe is the only
  ground, unlike fable's (guide + probe).

**Broadened probe `sonnetbullets2` (2026-07-19, user-approved, 16 runs
≈ $1.87, arm order ROTATED — foremanbullets first, so any cold-cache
penalty lands against the hypothesis; in the event both arms ran flat):**
- api-constraint: bullets $0.117 (0.117/0.116/0.116/0.117) vs foreman
  $0.122 — −4%; turns 6666 vs 6766; narration mixed (18,0,14,26 vs
  0,17,26,0); 4/4 pass, 0 violations, both arms.
- adjacent-mess: bullets $0.111 vs foreman $0.116 — −4%; turns 5554 vs
  5556; narration 0,0,0,0 vs 14,15,10,8; 4/4 pass, 0 violations, both.
- Aggregate across all three fixtures on sonnet: cut loses NOTHING
  (24/24 correct incl. every trap check), costs less in every cell
  (−4% clean fixtures, ~−14% moved-file warm-vs-warm), turns never
  higher, narration never worse and zeroed in 2 of 3 fixtures.

**Decision: HOLDS → shipped in foreman 0.28.0-alpha — targetModel
`sonnet` joins `fable` in the drop-the-micro-steps treatment; `opus`/
`inherit` keep today's default (opus untested for the trim).** Template
sub-bullets restructured accordingly; checklist + README row updated.

## Opus scaffolding probes `opusbullets1` + `opusbullets2` (2026-07-19)

Same mirror design, user-gated at each step. opusbullets1 (moved-file,
n=4, bullets arm FIRST — rotation put the cold-cache penalty against the
hypothesis): trimmed arm cold reps 0.338/0.349/0.337, warm rep $0.188 vs
foreman warm mean $0.202 — trimmed still cheapest warm-vs-warm; turns
8,8,7,8 vs 9,9,8,8; 4/4 pass and mm both arms. opusbullets2
(api-constraint + adjacent-mess, n=4, baseline first, both arms flat):
- api-constraint: foreman $0.156 vs bullets $0.149 (−4%); turns ≈equal;
  narration REVERSED here (foreman 0,0,0,21 vs bullets 36,26,25,16).
- adjacent-mess: foreman $0.171 vs bullets $0.140 (−18%); turns 6666 vs
  5555; narration 0 both.
- Aggregate opus, all 3 fixtures: 24/24 correct incl. every trap check,
  cost lower in every cell, turns never higher, narration a net wash
  (better 2 fixtures, worse 1).

**Decision: HOLDS → shipped in foreman 0.29.0-alpha — `opus` joins
`sonnet`/`fable`; only `haiku` (elaborate fully) and `inherit` (full
default shape) keep the read/run bullets.** Total probe spend this
follow-up arc ≈ $17.4 (fable $7.8, sonnet $3.5, opus $6.2 incl. smoke).
Cross-model summary: the read/run micro-step bullets are dead weight on
every frontier-tier target tested — same correctness and trap recovery,
fewer or equal turns, lower cost — and on sonnet they measurably induce
step narration. They stay for haiku (elaboration measurably helps clean
fixtures there) and inherit (no target to tune for).

## Harness deltas made for this experiment (kept, opt-in)

- run.js ARMS: `foremanmd` (prompt foreman-md.md), `foremanprose`
  (foreman-prose.md), opt-in via --arms, never in config.json defaults.
- 6 new frozen prompt files (3 fixtures × 2 arms).
- Known confound for future batches: the first concurrency wave of a
  batch pays cache-cold costs — compare warm reps across arms, or rotate
  arm order, before reading cost deltas.
