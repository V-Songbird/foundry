# hush benchmark — generated claims

Generated from 36 retained run records · batch `sn320-a9885078` · model `sonnet` · seed `1788060607179` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.2577 | 0.2634 | 0.2452–0.2758 | 0.2250–0.3017 | — | — | — |
| long-session | hush | 4 | 0.2509 | 0.2919 | 0.2132–0.3296 | 0.1767–0.4071 | -2.6% | 50% | feature-drift +31.1% |
| noisy-output | baseline | 8 | 0.1835 | 0.2190 | 0.1189–0.2841 | 0.1346–0.3033 | — | — | — |
| noisy-output | hush | 8 | 0.1274 | 0.1588 | 0.1238–0.1906 | 0.1227–0.1950 | -30.6% | 50% | failing-suite +6.9% |
| search-heavy | baseline | 6 | 0.1288 | 0.1607 | 0.0809–0.2405 | 0.0794–0.2420 | — | — | — |
| search-heavy | hush | 6 | 0.1277 | 0.1693 | 0.0857–0.2460 | 0.0800–0.2587 | -0.9% | 33% | repo-sweep +7.8% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 624474 | 627633 | 560555–691552 | 479911–775356 | — | — | — |
| long-session | hush | 4 | 599837 | 684842 | 454521–830158 | 365599–1004086 | -3.9% | 50% | feature-drift +26.9% |
| noisy-output | baseline | 8 | 200318 | 251582 | 164007–265695 | 149833–353331 | — | — | — |
| noisy-output | hush | 8 | 206046 | 203677 | 181339–223976 | 155879–251475 | +2.9% | 50% | dep-bump-warnings +18.0% |
| search-heavy | baseline | 6 | 169958 | 183163 | 106086–252104 | 112918–253408 | — | — | — |
| search-heavy | hush | 6 | 186717 | 196866 | 119982–258856 | 124210–269522 | +9.9% | 0% | rename-scope +9.9% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 32617 | 32531 | 31756–33391 | 31270–33792 | — | — | — |
| long-session | hush | 4 | 33931 | 38080 | 33403–38608 | 29481–46680 | +4.0% | 0% | feature-drift +30.2% |
| noisy-output | baseline | 8 | 32534 | 36589 | 27083–43927 | 28649–44529 | — | — | — |
| noisy-output | hush | 8 | 28986 | 30485 | 28729–30625 | 28149–32821 | -10.9% | 50% | failing-suite +8.0% |
| search-heavy | baseline | 6 | 28197 | 28508 | 24808–32168 | 25090–31927 | — | — | — |
| search-heavy | hush | 6 | 28710 | 30681 | 26433–33261 | 25996–35367 | +1.8% | 0% | repo-sweep +12.7% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 4362 | 4447 | 4036–4772 | 3909–4984 | — | — | — |
| long-session | hush | 4 | 4036 | 3957 | 3189–4803 | 2941–4973 | -7.5% | 50% | feature-drift +6.8% |
| noisy-output | baseline | 8 | 1610 | 3497 | 1380–3831 | 943–6050 | — | — | — |
| noisy-output | hush | 8 | 1718 | 2682 | 1119–2739 | 920–4444 | +6.7% | 100% | — |
| search-heavy | baseline | 6 | 2903 | 4880 | 1531–8838 | 1180–8580 | — | — | — |
| search-heavy | hush | 6 | 2640 | 4543 | 1123–8348 | 870–8216 | -9.1% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 9 | 10 | 5–14 | 1–18 | — | — | — |
| long-session | hush | 4 | 7 | 8 | 0–15 | -1–17 | -17.6% | 50% | feature-drift +88.2% |
| noisy-output | baseline | 8 | 41 | 42 | 12–73 | 18–67 | — | — | — |
| noisy-output | hush | 8 | 0 | 7 | 0–14 | -0–13 | -100.0% | 100% | — |
| search-heavy | baseline | 6 | 19 | 28 | 4–33 | -0–56 | — | — | — |
| search-heavy | hush | 6 | 0 | 10 | 0–16 | -3–24 | -100.0% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 1.0 | 0.8 | 0.8–1.0 | 0.3–1.2 | — | — | — |
| long-session | hush | 4 | 0.5 | 0.5 | 0.0–1.0 | -0.1–1.1 | -50.0% | 100% | — |
| noisy-output | baseline | 8 | 1.5 | 1.6 | 0.8–2.3 | 0.6–2.6 | — | — | — |
| noisy-output | hush | 8 | 0.0 | 0.4 | 0.0–1.0 | 0.0–0.7 | -100.0% | 100% | — |
| search-heavy | baseline | 6 | 1.0 | 1.3 | 0.3–2.5 | 0.2–2.4 | — | — | — |
| search-heavy | hush | 6 | 0.0 | 0.8 | 0.0–1.5 | -0.2–1.9 | -100.0% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| long-session | hush | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| noisy-output | baseline | 8 | 0.50 | 0.50 | 0.00–1.00 | 0.13–0.87 | — | — | — |
| noisy-output | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 6 | 0.00 | 0.33 | 0.00–0.75 | -0.08–0.75 | — | — | — |
| search-heavy | hush | 6 | 0.00 | 0.33 | 0.00–0.75 | -0.08–0.75 | — | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 18 | 0.2094 | 0.2344 | 312343 | 100% | 39 |
| hush | 18 | 0.1919 | 0.1532 | 308332 | 100% | 35 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| plan-apply | search-heavy | 530 | 0.0672 | 0.0718 |
| feature-drift | long-session | 1027 | 0.2845 | 0.3730 |
| incident-forensics | long-session | 1366 | 0.2422 | 0.2107 |
| failing-suite | noisy-output | 1608 | 0.1164 | 0.1244 |
| dep-bump-warnings | noisy-output | 1734 | 0.1176 | 0.1256 |
| rename-scope | search-heavy | 2478 | 0.1288 | 0.1277 |
| repo-sweep | search-heavy | 2879 | 0.2861 | 0.3085 |
| release-digest | noisy-output | 8054 | 0.3917 | 0.2376 |
| log-triage | noisy-output | 17553 | 0.2501 | 0.1478 |

