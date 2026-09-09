# hush benchmark — generated claims

Generated from 64 retained run records · batch `rm300-93b2a811` · model `opus` · seed `1787995285960` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.8126 | 0.8791 | 0.7335–1.0265 | 0.7137–1.0444 | — | — | — |
| long-session | hush | 8 | 0.6691 | 0.6655 | 0.6316–0.6829 | 0.6333–0.6977 | -17.7% | 100% | — |
| noisy-output | baseline | 16 | 0.3029 | 0.4338 | 0.2736–0.5745 | 0.3272–0.5403 | — | — | — |
| noisy-output | hush | 16 | 0.2802 | 0.3384 | 0.2543–0.3623 | 0.2764–0.4004 | -7.5% | 100% | — |
| search-heavy | baseline | 8 | 0.6894 | 0.7035 | 0.5278–0.8769 | 0.5516–0.8553 | — | — | — |
| search-heavy | hush | 8 | 0.4859 | 0.5576 | 0.4035–0.6622 | 0.3995–0.7156 | -29.5% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 615509 | 589870 | 519387–650181 | 533454–646286 | — | — | — |
| long-session | hush | 8 | 513209 | 531024 | 434555–591943 | 454559–607489 | -16.6% | 50% | feature-drift +0.0% |
| noisy-output | baseline | 16 | 168663 | 203368 | 140915–233628 | 161891–244845 | — | — | — |
| noisy-output | hush | 16 | 167947 | 180813 | 149719–193642 | 159030–202595 | -0.4% | 50% | dep-bump-warnings +3.6% |
| search-heavy | baseline | 8 | 318839 | 343080 | 278620–419871 | 278436–407724 | — | — | — |
| search-heavy | hush | 8 | 283677 | 268488 | 220374–320879 | 215382–321593 | -11.0% | 100% | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 26258 | 27840 | 24784–30435 | 24967–30713 | — | — | — |
| long-session | hush | 8 | 26032 | 26187 | 25571–26665 | 25697–26677 | -0.9% | 50% | feature-drift +7.3% |
| noisy-output | baseline | 16 | 21542 | 24985 | 20714–25366 | 21425–28545 | — | — | — |
| noisy-output | hush | 16 | 23588 | 24125 | 21406–25282 | 22664–25587 | +9.5% | 25% | failing-suite +9.0% |
| search-heavy | baseline | 8 | 29271 | 29791 | 25329–33996 | 26158–33424 | — | — | — |
| search-heavy | hush | 8 | 30089 | 30295 | 25166–34783 | 26046–34544 | +2.8% | 50% | repo-sweep +2.5% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 11250 | 12317 | 7363–16868 | 8366–16267 | — | — | — |
| long-session | hush | 8 | 7583 | 7586 | 5813–8611 | 6305–8866 | -32.6% | 100% | — |
| noisy-output | baseline | 16 | 3866 | 4565 | 2917–6525 | 3559–5571 | — | — | — |
| noisy-output | hush | 16 | 2133 | 2756 | 1801–3416 | 1980–3532 | -44.8% | 100% | — |
| search-heavy | baseline | 8 | 9692 | 10240 | 7368–13993 | 7632–12848 | — | — | — |
| search-heavy | hush | 8 | 4672 | 6515 | 3899–7811 | 3571–9460 | -51.8% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 9 | 13 | 7–19 | 7–20 | — | — | — |
| long-session | hush | 8 | 0 | 2 | 0–2 | -1–4 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 25 | 33 | 12–38 | 18–48 | — | — | — |
| noisy-output | hush | 16 | 7 | 5 | 0–7 | 3–7 | -73.5% | 100% | — |
| search-heavy | baseline | 8 | 55 | 72 | 40–77 | 31–112 | — | — | — |
| search-heavy | hush | 8 | 6 | 4 | 0–6 | 2–6 | -90.0% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 1.0 | 1.5 | 1.0–2.0 | 1.0–2.0 | — | — | — |
| long-session | hush | 8 | 0.0 | 0.3 | 0.0–0.3 | -0.1–0.6 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 2.0 | 2.1 | 1.0–3.0 | 1.7–2.6 | — | — | — |
| noisy-output | hush | 16 | 1.0 | 0.6 | 0.0–1.0 | 0.4–0.9 | -50.0% | 100% | — |
| search-heavy | baseline | 8 | 4.5 | 4.9 | 3.5–5.3 | 2.9–6.9 | — | — | — |
| search-heavy | hush | 8 | 1.0 | 0.6 | 0.0–1.0 | 0.3–1.0 | -77.8% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.00 | 0.38 | 0.00–1.00 | 0.02–0.73 | — | — | — |
| long-session | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | 100% | — |
| noisy-output | baseline | 16 | 1.00 | 0.69 | 0.00–1.00 | 0.45–0.92 | — | — | — |
| noisy-output | hush | 16 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 8 | 1.00 | 1.00 | 1.00–1.00 | 1.00–1.00 | — | — | — |
| search-heavy | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 32 | 0.6125 | 0.6111 | 334922 | 100% | 105 |
| hush | 32 | 0.4750 | 0.4859 | 290284 | 100% | 67 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 524 | 0.6941 | 0.6635 |
| dep-bump-warnings | noisy-output | 1070 | 0.2707 | 0.2437 |
| log-triage | noisy-output | 1619 | 0.4272 | 0.3024 |
| incident-forensics | long-session | 1619 | 1.0640 | 0.6675 |
| failing-suite | noisy-output | 1625 | 0.2749 | 0.2670 |
| rename-scope | search-heavy | 1918 | 0.5237 | 0.3937 |
| repo-sweep | search-heavy | 3030 | 0.8832 | 0.7215 |
| release-digest | noisy-output | 7494 | 0.7623 | 0.5407 |

