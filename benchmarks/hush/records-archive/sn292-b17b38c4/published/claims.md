# hush benchmark — generated claims

Generated from 32 retained run records · batch `sn292-b17b38c4` · model `sonnet` · seed `1787900636317` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.2564 | 0.3048 | 0.2333–0.3280 | 0.1601–0.4495 | — | — | — |
| long-session | hush | 4 | 0.3193 | 0.3201 | 0.3183–0.3211 | 0.3169–0.3234 | +24.5% | 50% | feature-drift +24.0% |
| noisy-output | baseline | 8 | 0.1816 | 0.2403 | 0.1276–0.3157 | 0.1391–0.3415 | — | — | — |
| noisy-output | hush | 8 | 0.2057 | 0.1978 | 0.1341–0.2200 | 0.1469–0.2487 | +13.3% | 50% | dep-bump-warnings +16.3% |
| search-heavy | baseline | 4 | 0.2469 | 0.2452 | 0.1109–0.3813 | 0.0897–0.4007 | — | — | — |
| search-heavy | hush | 4 | 0.2179 | 0.2244 | 0.1392–0.3032 | 0.1164–0.3325 | -11.7% | 50% | rename-scope +22.1% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 727718 | 770185 | 617561–880342 | 409505–1130865 | — | — | — |
| long-session | hush | 4 | 760014 | 760959 | 653163–867809 | 638095–883822 | +4.4% | 50% | feature-drift +19.5% |
| noisy-output | baseline | 8 | 229693 | 326971 | 203666–386124 | 184497–469445 | — | — | — |
| noisy-output | hush | 8 | 248366 | 235124 | 194031–278968 | 193751–276497 | +8.1% | 75% | failing-suite +14.2% |
| search-heavy | baseline | 4 | 318899 | 311235 | 155759–474375 | 124670–497800 | — | — | — |
| search-heavy | hush | 4 | 247914 | 254634 | 170986–331562 | 158738–350530 | -22.3% | 50% | rename-scope +16.1% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 36294 | 43472 | 35702–44063 | 28582–58363 | — | — | — |
| long-session | hush | 4 | 40180 | 40149 | 39600–40729 | 39426–40873 | +10.7% | 50% | feature-drift +11.4% |
| noisy-output | baseline | 8 | 37328 | 43125 | 33819–50448 | 34485–51765 | — | — | — |
| noisy-output | hush | 8 | 35145 | 37655 | 34310–37489 | 33464–41846 | -5.8% | 50% | failing-suite +6.7% |
| search-heavy | baseline | 4 | 38197 | 38993 | 32765–44425 | 31589–46397 | — | — | — |
| search-heavy | hush | 4 | 37419 | 38223 | 34197–41445 | 33339–43107 | -2.0% | 50% | rename-scope +4.6% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 3764 | 4070 | 3682–4152 | 3343–4796 | — | — | — |
| long-session | hush | 4 | 4162 | 4154 | 3464–4852 | 3210–5098 | +10.6% | 50% | feature-drift +31.7% |
| noisy-output | baseline | 8 | 1873 | 4068 | 1419–3971 | 855–7282 | — | — | — |
| noisy-output | hush | 8 | 1400 | 2646 | 1149–2894 | 808–4483 | -25.3% | 75% | failing-suite +3.5% |
| search-heavy | baseline | 4 | 6290 | 6417 | 2018–10689 | 1394–11440 | — | — | — |
| search-heavy | hush | 4 | 7205 | 6833 | 3899–10139 | 2575–11091 | +14.5% | 50% | rename-scope +62.3% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 4 | 6 | 0–10 | -2–14 | — | — | — |
| long-session | hush | 4 | 3 | 8 | 0–10 | -4–19 | -37.5% | 0% | feature-drift +20.0% |
| noisy-output | baseline | 8 | 77 | 73 | 50–97 | 36–110 | — | — | — |
| noisy-output | hush | 8 | 0 | 5 | 0–12 | 0–10 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 67 | 56 | 47–75 | 18–94 | — | — | — |
| search-heavy | hush | 4 | 14 | 14 | 0–27 | -2–29 | -79.7% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.2577 | 0.2288 | 433841 | 100% | 41 |
| hush | 16 | 0.2350 | 0.2229 | 371460 | 100% | 58 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 651 | 0.2564 | 0.3179 |
| failing-suite | noisy-output | 1626 | 0.1166 | 0.1332 |
| dep-bump-warnings | noisy-output | 2204 | 0.1428 | 0.1661 |
| incident-forensics | long-session | 2854 | 0.3532 | 0.3223 |
| rename-scope | search-heavy | 2987 | 0.1078 | 0.1316 |
| repo-sweep | search-heavy | 5101 | 0.3826 | 0.3172 |
| release-digest | noisy-output | 7143 | 0.4584 | 0.2861 |
| log-triage | noisy-output | 16034 | 0.2434 | 0.2057 |

