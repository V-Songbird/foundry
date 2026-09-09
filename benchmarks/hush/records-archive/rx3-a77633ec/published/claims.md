# hush benchmark — generated claims

Generated from 12 retained run records · batch `rx3-a77633ec` · model `sonnet` · seed `1786463572387` · arms: adhd, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 0.3850 | 0.3850 | 0.3559–0.4140 | 0.2711–0.4989 | — | — | — |
| long-session | hush | 2 | 0.4861 | 0.4861 | 0.4747–0.4976 | 0.4413–0.5309 | — | — | — |
| noisy-output | adhd | 3 | 0.2103 | 0.2180 | 0.1973–0.2349 | 0.1748–0.2612 | — | — | — |
| noisy-output | hush | 3 | 0.2070 | 0.2039 | 0.2023–0.2071 | 0.1977–0.2101 | — | — | — |
| search-heavy | adhd | 1 | 0.6107 | 0.6107 | 0.6107–0.6107 | — | — | — | — |
| search-heavy | hush | 1 | 0.7669 | 0.7669 | 0.7669–0.7669 | — | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 475260 | 475260 | 410722–539797 | 222272–728247 | — | — | — |
| long-session | hush | 2 | 643171 | 643171 | 642496–643846 | 640525–645817 | — | — | — |
| noisy-output | adhd | 3 | 207958 | 216580 | 173981–254868 | 124658–308502 | — | — | — |
| noisy-output | hush | 3 | 217217 | 227459 | 202744–247054 | 176322–278596 | — | — | — |
| search-heavy | adhd | 1 | 418162 | 418162 | 418162–418162 | — | — | — | — |
| search-heavy | hush | 1 | 1238654 | 1238654 | 1238654–1238654 | — | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 4507 | 4507 | 3535–5478 | 699–8314 | — | — | — |
| long-session | hush | 2 | 6409 | 6409 | 4619–8198 | -607–13424 | — | — | — |
| noisy-output | adhd | 3 | 1091 | 1231 | 934–1459 | 621–1841 | — | — | — |
| noisy-output | hush | 3 | 1186 | 1256 | 993–1484 | 695–1816 | — | — | — |
| search-heavy | adhd | 1 | 11115 | 11115 | 11115–11115 | — | — | — | — |
| search-heavy | hush | 1 | 10557 | 10557 | 10557–10557 | — | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 41 | 41 | 37–44 | 26–55 | — | — | — |
| long-session | hush | 2 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | adhd | 3 | 29 | 24 | 21–30 | 12–36 | — | — | — |
| noisy-output | hush | 3 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| search-heavy | adhd | 1 | 49 | 49 | 49–49 | — | — | — | — |
| search-heavy | hush | 1 | 70 | 70 | 70–70 | — | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 6 | 0.3391 | 0.2932 | 336403 | 100% | 41 |
| hush | 6 | 0.3918 | 0.3352 | 534562 | 100% | 49 |
