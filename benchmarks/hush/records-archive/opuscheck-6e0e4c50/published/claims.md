# hush benchmark — generated claims

Generated from 24 retained run records · batch `opuscheck-6e0e4c50` · model `opus` · seed `1787067448103` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.9432 | 0.9629 | 0.9360–0.9700 | 0.9179–1.0080 | — | — | — |
| long-session | hush | 4 | 0.9937 | 0.9212 | 0.9072–1.0076 | 0.7489–1.0934 | +5.4% | 50% | incident-forensics +8.4% |
| noisy-output | baseline | 6 | 0.3327 | 0.3801 | 0.2925–0.3540 | 0.2520–0.5081 | — | — | — |
| noisy-output | hush | 6 | 0.3024 | 0.3259 | 0.2949–0.3646 | 0.2878–0.3639 | -9.1% | 100% | — |
| search-heavy | baseline | 2 | 0.5238 | 0.5238 | 0.5068–0.5409 | 0.4570–0.5907 | — | — | — |
| search-heavy | hush | 2 | 1.6747 | 1.6747 | 1.4177–1.9316 | 0.6673–2.6820 | +219.7% | 0% | repo-sweep +219.7% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 669253 | 705197 | 564420–810029 | 513853–896540 | — | — | — |
| long-session | hush | 4 | 769091 | 738053 | 689461–817683 | 569720–906386 | +14.9% | 50% | incident-forensics +39.4% |
| noisy-output | baseline | 6 | 204275 | 207076 | 176736–232003 | 176800–237352 | — | — | — |
| noisy-output | hush | 6 | 204209 | 215991 | 200034–216489 | 188272–243709 | -0.0% | 33% | log-triage +11.2% |
| search-heavy | baseline | 2 | 309739 | 309739 | 294025–325452 | 248141–371336 | — | — | — |
| search-heavy | hush | 2 | 390309 | 390309 | 337513–443104 | 183351–597266 | +26.0% | 0% | repo-sweep +26.0% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 12813 | 12894 | 10445–15261 | 9844–15943 | — | — | — |
| long-session | hush | 4 | 10678 | 10435 | 8314–12799 | 7608–13262 | -16.7% | 100% | — |
| noisy-output | baseline | 6 | 3943 | 4097 | 2791–4979 | 2699–5494 | — | — | — |
| noisy-output | hush | 6 | 2313 | 2291 | 1461–2369 | 1283–3300 | -41.3% | 100% | — |
| search-heavy | baseline | 2 | 5018 | 5018 | 4975–5061 | 4849–5187 | — | — | — |
| search-heavy | hush | 2 | 12004 | 12004 | 11825–12184 | 11300–12708 | +139.2% | 0% | repo-sweep +139.2% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 35 | 34 | 8–61 | 3–65 | — | — | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| noisy-output | baseline | 6 | 41 | 45 | 33–58 | 22–69 | — | — | — |
| noisy-output | hush | 6 | 0 | 2 | 0–5 | -1–5 | -100.0% | 100% | — |
| search-heavy | baseline | 2 | 79 | 79 | 75–83 | 63–95 | — | — | — |
| search-heavy | hush | 2 | 6 | 6 | 6–6 | 6–6 | -92.4% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.5983 | 0.5238 | 390227 | 100% | 78 |
| hush | 12 | 0.7491 | 0.5243 | 419064 | 100% | 95 |
