# hush benchmark — generated claims

Generated from 36 retained run records · batch `rxconfirm-582378d3` · model `sonnet` · seed `1786464568411` · arms: adhd, hush, hushstock.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 4 | 0.5120 | 0.5024 | 0.4801–0.5342 | 0.4370–0.5678 | — | — | — |
| long-session | hush | 4 | 0.4819 | 0.4922 | 0.4254–0.5486 | 0.4145–0.5698 | — | — | — |
| long-session | hushstock | 4 | 0.4920 | 0.4922 | 0.4630–0.5211 | 0.4418–0.5425 | — | — | — |
| noisy-output | adhd | 6 | 0.1931 | 0.2204 | 0.1887–0.2682 | 0.1745–0.2663 | — | — | — |
| noisy-output | hush | 6 | 0.2032 | 0.2257 | 0.1966–0.2133 | 0.1768–0.2747 | — | — | — |
| noisy-output | hushstock | 6 | 0.2039 | 0.2151 | 0.1979–0.2343 | 0.1909–0.2392 | — | — | — |
| search-heavy | adhd | 2 | 0.5193 | 0.5193 | 0.5076–0.5310 | 0.4735–0.5650 | — | — | — |
| search-heavy | hush | 2 | 0.6893 | 0.6893 | 0.6529–0.7257 | 0.5468–0.8318 | — | — | — |
| search-heavy | hushstock | 2 | 0.6009 | 0.6009 | 0.5991–0.6026 | 0.5941–0.6077 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 4 | 758309 | 781358 | 722454–817213 | 695536–867181 | — | — | — |
| long-session | hush | 4 | 729410 | 678292 | 664849–742853 | 563155–793429 | — | — | — |
| long-session | hushstock | 4 | 578489 | 628866 | 558793–648562 | 502029–755703 | — | — | — |
| noisy-output | adhd | 6 | 203269 | 195716 | 158707–229281 | 162281–229151 | — | — | — |
| noisy-output | hush | 6 | 237088 | 227447 | 172094–272947 | 160030–294863 | — | — | — |
| noisy-output | hushstock | 6 | 231526 | 237157 | 170979–286180 | 156127–318186 | — | — | — |
| search-heavy | adhd | 2 | 343987 | 343987 | 327754–360220 | 280354–407620 | — | — | — |
| search-heavy | hush | 2 | 812743 | 812743 | 576911–1048574 | -111718–1737203 | — | — | — |
| search-heavy | hushstock | 2 | 340424 | 340424 | 337967–342881 | 330793–350055 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 4 | 4060 | 5482 | 3883–5659 | 2302–8662 | — | — | — |
| long-session | hush | 4 | 7134 | 7377 | 4027–10485 | 3131–11624 | — | — | — |
| long-session | hushstock | 4 | 5695 | 6025 | 3978–7742 | 3476–8573 | — | — | — |
| noisy-output | adhd | 6 | 1240 | 1171 | 842–1400 | 803–1540 | — | — | — |
| noisy-output | hush | 6 | 1273 | 1360 | 1141–1515 | 1091–1628 | — | — | — |
| noisy-output | hushstock | 6 | 1486 | 1456 | 998–1837 | 993–1919 | — | — | — |
| search-heavy | adhd | 2 | 10156 | 10156 | 9991–10321 | 9509–10803 | — | — | — |
| search-heavy | hush | 2 | 10650 | 10650 | 10391–10909 | 9635–11665 | — | — | — |
| search-heavy | hushstock | 2 | 10714 | 10714 | 10387–11042 | 9430–11998 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 4 | 19 | 16 | 16–19 | 9–23 | — | — | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | hushstock | 4 | 0 | 13 | 0–13 | -12–38 | — | — | — |
| noisy-output | adhd | 6 | 10 | 9 | 1–14 | 2–15 | — | — | — |
| noisy-output | hush | 6 | 0 | 2 | 0–0 | -1–4 | — | — | — |
| noisy-output | hushstock | 6 | 6 | 8 | 0–15 | 1–15 | — | — | — |
| search-heavy | adhd | 2 | 54 | 54 | 50–57 | 41–66 | — | — | — |
| search-heavy | hush | 2 | 26 | 26 | 25–28 | 20–32 | — | — | — |
| search-heavy | hushstock | 2 | 36 | 36 | 34–37 | 31–40 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 12 | 0.3642 | 0.3533 | 415642 | 100% | 44 |
| hush | 12 | 0.3918 | 0.3870 | 475278 | 100% | 54 |
| hushstock | 12 | 0.3717 | 0.3464 | 384938 | 100% | 57 |
