# hush benchmark — generated claims

Generated from 64 retained run records · batch `rm310-91a1a5fd` · model `opus` · seed `1788051222717` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.8863 | 0.9170 | 0.6900–1.1306 | 0.7534–1.0807 | — | — | — |
| long-session | hush | 8 | 0.6426 | 0.6478 | 0.6316–0.6626 | 0.6030–0.6926 | -27.5% | 100% | — |
| noisy-output | baseline | 16 | 0.3189 | 0.4287 | 0.2629–0.5213 | 0.3166–0.5407 | — | — | — |
| noisy-output | hush | 16 | 0.2770 | 0.3632 | 0.2602–0.4792 | 0.2969–0.4294 | -13.1% | 50% | log-triage +5.9% |
| search-heavy | baseline | 8 | 0.5414 | 0.5944 | 0.4471–0.6719 | 0.4608–0.7281 | — | — | — |
| search-heavy | hush | 8 | 0.5104 | 0.6330 | 0.4633–0.8137 | 0.4687–0.7974 | -5.7% | 50% | repo-sweep +29.5% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 583088 | 592932 | 569696–613027 | 544581–641283 | — | — | — |
| long-session | hush | 8 | 544605 | 539190 | 401176–647731 | 436636–641744 | -6.6% | 50% | feature-drift +13.7% |
| noisy-output | baseline | 16 | 181675 | 219185 | 142480–240625 | 168713–269657 | — | — | — |
| noisy-output | hush | 16 | 175016 | 188521 | 146531–206376 | 157998–219043 | -3.7% | 50% | dep-bump-warnings +16.5% |
| search-heavy | baseline | 8 | 280686 | 289582 | 236668–327853 | 244988–334176 | — | — | — |
| search-heavy | hush | 8 | 280419 | 293067 | 236714–306823 | 234526–351609 | -0.1% | 50% | repo-sweep +9.8% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 26684 | 28023 | 24925–30288 | 25383–30662 | — | — | — |
| long-session | hush | 8 | 25897 | 25756 | 25074–26433 | 24936–26576 | -2.9% | 50% | feature-drift +6.4% |
| noisy-output | baseline | 16 | 20709 | 24532 | 20211–24626 | 20701–28363 | — | — | — |
| noisy-output | hush | 16 | 23276 | 24785 | 22346–26573 | 23109–26461 | +12.4% | 25% | log-triage +14.2% |
| search-heavy | baseline | 8 | 25983 | 28238 | 25135–30599 | 24820–31657 | — | — | — |
| search-heavy | hush | 8 | 29415 | 31504 | 25714–35949 | 26725–36282 | +13.2% | 0% | repo-sweep +15.6% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 12758 | 13825 | 8132–18633 | 9478–18171 | — | — | — |
| long-session | hush | 8 | 6766 | 6948 | 5878–7621 | 6007–7890 | -47.0% | 100% | — |
| noisy-output | baseline | 16 | 4214 | 5030 | 2840–7883 | 3690–6369 | — | — | — |
| noisy-output | hush | 16 | 2118 | 2779 | 1668–4231 | 1996–3561 | -49.8% | 100% | — |
| search-heavy | baseline | 8 | 7318 | 8139 | 5922–9774 | 5790–10489 | — | — | — |
| search-heavy | hush | 8 | 5652 | 8047 | 5262–12042 | 5289–10805 | -22.8% | 50% | repo-sweep +41.1% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 14 | 19 | 8–27 | 9–28 | — | — | — |
| long-session | hush | 8 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 28 | 33 | 21–40 | 22–45 | — | — | — |
| noisy-output | hush | 16 | 4 | 4 | 0–7 | 2–6 | -87.3% | 100% | — |
| search-heavy | baseline | 8 | 37 | 42 | 27–51 | 23–60 | — | — | — |
| search-heavy | hush | 8 | 6 | 5 | 4–6 | 3–7 | -83.8% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 1.5 | 1.9 | 1.0–2.3 | 1.1–2.7 | — | — | — |
| long-session | hush | 8 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 2.0 | 2.6 | 2.0–3.0 | 1.9–3.3 | — | — | — |
| noisy-output | hush | 16 | 0.5 | 0.5 | 0.0–1.0 | 0.2–0.8 | -75.0% | 100% | — |
| search-heavy | baseline | 8 | 2.5 | 2.9 | 1.8–3.3 | 1.5–4.2 | — | — | — |
| search-heavy | hush | 8 | 1.0 | 0.9 | 1.0–1.0 | 0.6–1.1 | -60.0% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.50 | 0.50 | 0.00–1.00 | 0.13–0.87 | — | — | — |
| long-session | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 1.00 | 0.81 | 1.00–1.00 | 0.61–1.01 | — | — | — |
| noisy-output | hush | 16 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 8 | 1.00 | 0.75 | 0.75–1.00 | 0.43–1.07 | — | — | — |
| search-heavy | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 32 | 0.5922 | 0.5414 | 330221 | 100% | 110 |
| hush | 32 | 0.5018 | 0.4982 | 302325 | 100% | 77 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 569 | 0.7076 | 0.6873 |
| dep-bump-warnings | noisy-output | 941 | 0.2668 | 0.2625 |
| failing-suite | noisy-output | 1185 | 0.2727 | 0.2535 |
| log-triage | noisy-output | 1428 | 0.3985 | 0.3852 |
| incident-forensics | long-session | 1502 | 1.1265 | 0.6083 |
| rename-scope | search-heavy | 1975 | 0.5338 | 0.4528 |
| repo-sweep | search-heavy | 3300 | 0.6551 | 0.8132 |
| release-digest | noisy-output | 5322 | 0.7768 | 0.5515 |

