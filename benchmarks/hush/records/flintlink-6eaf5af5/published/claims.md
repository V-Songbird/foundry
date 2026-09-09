# hush benchmark — generated claims

Generated from 24 retained run records · batch `flintlink-6eaf5af5` · model `opus` · seed `1787936805467` · arms: flint, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | flint | 4 | 0.5653 | 0.5678 | 0.5535–0.5795 | 0.5450–0.5905 | — | — | — |
| long-session | hush | 4 | 0.6080 | 0.6104 | 0.5936–0.6247 | 0.5883–0.6325 | — | — | — |
| noisy-output | flint | 4 | 0.2727 | 0.2849 | 0.2542–0.3033 | 0.2263–0.3435 | — | — | — |
| noisy-output | hush | 4 | 0.3233 | 0.3120 | 0.2579–0.3774 | 0.2225–0.4015 | — | — | — |
| search-heavy | flint | 4 | 0.2944 | 0.3040 | 0.2828–0.3156 | 0.2669–0.3410 | — | — | — |
| search-heavy | hush | 4 | 0.2974 | 0.3070 | 0.2690–0.3355 | 0.2572–0.3569 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | flint | 4 | 558056 | 559688 | 547188–570556 | 536977–582399 | — | — | — |
| long-session | hush | 4 | 567651 | 574257 | 556249–585660 | 538918–609596 | — | — | — |
| noisy-output | flint | 4 | 150507 | 149914 | 138683–161737 | 132454–167373 | — | — | — |
| noisy-output | hush | 4 | 138077 | 130304 | 125387–142995 | 111239–149369 | — | — | — |
| search-heavy | flint | 4 | 141955 | 148367 | 141319–149003 | 135240–161493 | — | — | — |
| search-heavy | hush | 4 | 146390 | 146112 | 132114–160389 | 118426–173798 | — | — | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | flint | 4 | 25339 | 25149 | 24872–25617 | 24515–25784 | — | — | — |
| long-session | hush | 4 | 25804 | 25803 | 25605–26002 | 25560–26046 | — | — | — |
| noisy-output | flint | 4 | 23189 | 23030 | 22447–23772 | 21904–24156 | — | — | — |
| noisy-output | hush | 4 | 23013 | 22567 | 21747–23832 | 20957–24177 | — | — | — |
| search-heavy | flint | 4 | 23659 | 24728 | 23553–24834 | 22540–26916 | — | — | — |
| search-heavy | hush | 4 | 24394 | 24217 | 22953–25658 | 22559–25875 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | flint | 4 | 4466 | 4513 | 4389–4590 | 4349–4676 | — | — | — |
| long-session | hush | 4 | 5287 | 5329 | 5229–5387 | 5127–5531 | — | — | — |
| noisy-output | flint | 4 | 1265 | 1281 | 1227–1318 | 1202–1359 | — | — | — |
| noisy-output | hush | 4 | 1461 | 1522 | 1348–1635 | 1264–1779 | — | — | — |
| search-heavy | flint | 4 | 2503 | 2389 | 2326–2566 | 2026–2752 | — | — | — |
| search-heavy | hush | 4 | 2302 | 2583 | 2198–2686 | 1795–3370 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | flint | 4 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | flint | 4 | 0 | 2 | 0–2 | -1–4 | — | — | — |
| noisy-output | hush | 4 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| search-heavy | flint | 4 | 6 | 5 | 3–7 | 1–8 | — | — | — |
| search-heavy | hush | 4 | 3 | 3 | 0–6 | -0–6 | — | — | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | flint | 4 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| long-session | hush | 4 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| noisy-output | flint | 4 | 0.0 | 0.3 | 0.0–0.3 | -0.2–0.7 | — | — | — |
| noisy-output | hush | 4 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| search-heavy | flint | 4 | 1.0 | 0.8 | 0.8–1.0 | 0.3–1.2 | — | — | — |
| search-heavy | hush | 4 | 0.5 | 0.5 | 0.0–1.0 | -0.1–1.1 | — | — | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | flint | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| long-session | hush | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| noisy-output | flint | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| noisy-output | hush | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| search-heavy | flint | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| search-heavy | hush | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| flint | 12 | 0.3855 | 0.3295 | 285989 | 100% | 37 |
| hush | 12 | 0.4098 | 0.3705 | 283558 | 100% | 39 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | flint | hush |
|---|---|---|---|---|
| feature-drift | — | — | 0.5678 | 0.6104 |
| log-triage | — | — | 0.2849 | 0.3120 |
| rename-scope | — | — | 0.3040 | 0.3070 |

