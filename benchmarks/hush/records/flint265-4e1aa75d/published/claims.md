# hush benchmark — generated claims

Generated from 48 retained run records · batch `flint265-4e1aa75d` · model `opus` · seed `1787932829339` · arms: baseline, flint, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.7122 | 0.7729 | 0.6515–0.8336 | 0.5964–0.9494 | — | — | — |
| long-session | flint | 4 | 0.5754 | 0.5851 | 0.5092–0.6514 | 0.4836–0.6867 | -19.2% | 50% | feature-drift +3.5% |
| long-session | hush | 4 | 0.5950 | 0.5749 | 0.5360–0.6339 | 0.4821–0.6677 | -16.4% | 100% | — |
| noisy-output | baseline | 8 | 0.3052 | 0.4253 | 0.2818–0.4798 | 0.2640–0.5866 | — | — | — |
| noisy-output | flint | 8 | 0.3565 | 0.3920 | 0.2658–0.5011 | 0.2879–0.4961 | +16.8% | 75% | log-triage +28.6% |
| noisy-output | hush | 8 | 0.2797 | 0.3444 | 0.2615–0.3574 | 0.2464–0.4425 | -8.3% | 100% | — |
| search-heavy | baseline | 4 | 0.4671 | 0.5173 | 0.4365–0.5479 | 0.3527–0.6820 | — | — | — |
| search-heavy | flint | 4 | 0.3042 | 0.4100 | 0.2936–0.4206 | 0.1859–0.6341 | -34.9% | 100% | — |
| search-heavy | hush | 4 | 0.3753 | 0.4746 | 0.3513–0.4986 | 0.2370–0.7122 | -19.6% | 50% | repo-sweep +1.1% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 642476 | 616895 | 593918–665453 | 534453–699336 | — | — | — |
| long-session | flint | 4 | 566809 | 599420 | 446965–719264 | 418670–780169 | -11.8% | 50% | feature-drift +17.1% |
| long-session | hush | 4 | 526192 | 526126 | 404012–648306 | 357956–694296 | -18.1% | 50% | feature-drift +4.1% |
| noisy-output | baseline | 8 | 218622 | 254788 | 207104–263210 | 191112–318464 | — | — | — |
| noisy-output | flint | 8 | 198216 | 200639 | 160475–239397 | 170322–230956 | -9.3% | 75% | failing-suite +0.4% |
| noisy-output | hush | 8 | 188864 | 226558 | 182342–210853 | 159332–293784 | -13.6% | 75% | dep-bump-warnings +4.8% |
| search-heavy | baseline | 4 | 273861 | 271304 | 260216–284950 | 248262–294346 | — | — | — |
| search-heavy | flint | 4 | 196347 | 208970 | 168704–236612 | 143133–274806 | -28.3% | 100% | — |
| search-heavy | hush | 4 | 218212 | 236642 | 202242–252612 | 174084–299200 | -20.3% | 100% | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 31504 | 32243 | 29906–33841 | 29305–35180 | — | — | — |
| long-session | flint | 4 | 30508 | 30553 | 29798–31264 | 29666–31440 | -3.2% | 50% | feature-drift +4.8% |
| long-session | hush | 4 | 30603 | 30274 | 29876–31001 | 29043–31505 | -2.9% | 50% | feature-drift +4.2% |
| noisy-output | baseline | 8 | 26980 | 31511 | 25849–32217 | 24937–38085 | — | — | — |
| noisy-output | flint | 8 | 33277 | 34187 | 28785–39324 | 29603–38772 | +23.3% | 25% | log-triage +44.4% |
| noisy-output | hush | 8 | 29290 | 30151 | 28528–31370 | 28074–32228 | +8.6% | 25% | log-triage +14.2% |
| search-heavy | baseline | 4 | 30689 | 32011 | 30010–32690 | 28656–35367 | — | — | — |
| search-heavy | flint | 4 | 30157 | 31621 | 29314–32464 | 27724–35518 | -1.7% | 50% | repo-sweep +1.6% |
| search-heavy | hush | 4 | 31406 | 33424 | 30207–34622 | 28332–38516 | +2.3% | 0% | repo-sweep +5.5% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 8620 | 9616 | 6246–11990 | 5411–13820 | — | — | — |
| long-session | flint | 4 | 4549 | 4365 | 4344–4571 | 3978–4753 | -47.2% | 100% | — |
| long-session | hush | 4 | 5093 | 5317 | 4951–5459 | 4481–6153 | -40.9% | 100% | — |
| noisy-output | baseline | 8 | 3265 | 3824 | 2444–5386 | 2584–5063 | — | — | — |
| noisy-output | flint | 8 | 1302 | 1369 | 937–1775 | 957–1781 | -60.1% | 100% | — |
| noisy-output | hush | 8 | 1677 | 2237 | 1316–2035 | 970–3504 | -48.6% | 100% | — |
| search-heavy | baseline | 4 | 5865 | 6830 | 5309–7386 | 3429–10231 | — | — | — |
| search-heavy | flint | 4 | 2125 | 4345 | 1969–4501 | -165–8856 | -63.8% | 100% | — |
| search-heavy | hush | 4 | 3217 | 5125 | 2886–5455 | 767–9482 | -45.2% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 12 | 12 | 7–16 | 6–17 | — | — | — |
| long-session | flint | 4 | 0 | 2 | 0–2 | -1–4 | -100.0% | 100% | — |
| long-session | hush | 4 | 0 | 2 | 0–2 | -2–6 | -100.0% | 100% | — |
| noisy-output | baseline | 8 | 30 | 35 | 19–52 | 18–52 | — | — | — |
| noisy-output | flint | 8 | 0 | 2 | 0–6 | 0–5 | -100.0% | 100% | — |
| noisy-output | hush | 8 | 0 | 3 | 0–6 | 0–5 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 31 | 33 | 24–40 | 21–45 | — | — | — |
| search-heavy | flint | 4 | 6 | 6 | 4–8 | 1–10 | -80.3% | 100% | — |
| search-heavy | hush | 4 | 6 | 4 | 4–6 | 1–7 | -82.0% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 1.5 | 1.5 | 1.0–2.0 | 0.9–2.1 | — | — | — |
| long-session | flint | 4 | 0.0 | 0.3 | 0.0–0.3 | -0.2–0.7 | -100.0% | 100% | — |
| long-session | hush | 4 | 0.0 | 0.3 | 0.0–0.3 | -0.2–0.7 | -100.0% | 100% | — |
| noisy-output | baseline | 8 | 2.5 | 2.4 | 1.8–3.0 | 1.6–3.1 | — | — | — |
| noisy-output | flint | 8 | 0.0 | 0.4 | 0.0–1.0 | 0.0–0.7 | -100.0% | 100% | — |
| noisy-output | hush | 8 | 0.0 | 0.4 | 0.0–1.0 | 0.0–0.7 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 3.0 | 3.0 | 2.8–3.3 | 2.2–3.8 | — | — | — |
| search-heavy | flint | 4 | 1.0 | 1.0 | 0.8–1.3 | 0.2–1.8 | -66.7% | 100% | — |
| search-heavy | hush | 4 | 1.0 | 0.8 | 0.8–1.0 | 0.3–1.2 | -66.7% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.50 | 0.50 | 0.00–1.00 | -0.07–1.07 | — | — | — |
| long-session | flint | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| long-session | hush | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| noisy-output | baseline | 8 | 1.00 | 0.75 | 0.75–1.00 | 0.43–1.07 | — | — | — |
| noisy-output | flint | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| noisy-output | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 1.00 | 1.00 | 1.00–1.00 | 1.00–1.00 | — | — | — |
| search-heavy | flint | 4 | 0.00 | 0.25 | 0.00–0.25 | -0.24–0.74 | -100.0% | 100% | — |
| search-heavy | hush | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.5352 | 0.4671 | 349444 | 100% | 83 |
| flint | 16 | 0.4448 | 0.4508 | 302417 | 100% | 33 |
| hush | 16 | 0.4346 | 0.3753 | 303971 | 100% | 50 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | flint | hush |
|---|---|---|---|---|---|
| feature-drift | long-session | 582 | 0.6471 | 0.6700 | 0.6437 |
| dep-bump-warnings | noisy-output | 1207 | 0.2671 | 0.2476 | 0.2528 |
| log-triage | noisy-output | 1216 | 0.3505 | 0.4508 | 0.3094 |
| incident-forensics | long-session | 1469 | 0.8987 | 0.5003 | 0.5061 |
| failing-suite | noisy-output | 1530 | 0.2857 | 0.2759 | 0.2680 |
| rename-scope | search-heavy | 2165 | 0.4671 | 0.2887 | 0.3753 |
| repo-sweep | search-heavy | 2958 | 0.5676 | 0.5312 | 0.5738 |
| release-digest | noisy-output | 8782 | 0.7977 | 0.5937 | 0.5474 |

