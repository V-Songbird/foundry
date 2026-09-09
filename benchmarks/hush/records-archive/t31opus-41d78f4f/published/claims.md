# hush benchmark — generated claims

Generated from 24 retained run records · batch `t31opus-41d78f4f` · model `opus` · seed `1787068393443` · arms: hush, t31deliver.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 0.8970 | 0.9909 | 0.7975–1.0904 | 0.6863–1.2954 | — | — | — |
| long-session | t31deliver | 4 | 1.0222 | 0.9861 | 0.9326–1.0757 | 0.8142–1.1580 | — | — | — |
| noisy-output | hush | 6 | 0.3207 | 0.3260 | 0.3070–0.3282 | 0.3030–0.3489 | — | — | — |
| noisy-output | t31deliver | 6 | 0.3293 | 0.3280 | 0.3149–0.3432 | 0.2956–0.3605 | — | — | — |
| search-heavy | hush | 2 | 0.9655 | 0.9655 | 0.6987–1.2323 | -0.0804–2.0114 | — | — | — |
| search-heavy | t31deliver | 2 | 1.0724 | 1.0724 | 0.7623–1.3826 | -0.1433–2.2882 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 755092 | 802671 | 665020–892743 | 550433–1054909 | — | — | — |
| long-session | t31deliver | 4 | 809313 | 831508 | 727787–913034 | 683085–979930 | — | — | — |
| noisy-output | hush | 6 | 201401 | 212737 | 192145–227050 | 189633–235840 | — | — | — |
| noisy-output | t31deliver | 6 | 227066 | 216608 | 181994–240246 | 183892–249324 | — | — | — |
| search-heavy | hush | 2 | 335145 | 335145 | 288880–381409 | 153787–516502 | — | — | — |
| search-heavy | t31deliver | 2 | 360438 | 360438 | 331377–389498 | 246521–474354 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 9364 | 9894 | 6964–12294 | 6045–13742 | — | — | — |
| long-session | t31deliver | 4 | 12053 | 11808 | 8793–15068 | 7909–15707 | — | — | — |
| noisy-output | hush | 6 | 2626 | 2505 | 1628–3213 | 1698–3312 | — | — | — |
| noisy-output | t31deliver | 6 | 2894 | 2699 | 1823–3311 | 1834–3565 | — | — | — |
| search-heavy | hush | 2 | 8863 | 8863 | 6228–11497 | -1464–19189 | — | — | — |
| search-heavy | t31deliver | 2 | 8440 | 8440 | 6325–10554 | 150–16729 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 6 | 5 | 5–6 | 2–8 | — | — | — |
| long-session | t31deliver | 4 | 7 | 7 | 6–7 | 6–7 | — | — | — |
| noisy-output | hush | 6 | 7 | 6 | 6–7 | 3–9 | — | — | — |
| noisy-output | t31deliver | 6 | 7 | 7 | 6–7 | 6–9 | — | — | — |
| search-heavy | hush | 2 | 3 | 3 | 2–5 | -3–9 | — | — | — |
| search-heavy | t31deliver | 2 | 9 | 9 | 9–10 | 7–11 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| hush | 12 | 0.6542 | 0.4058 | 429783 | 100% | 64 |
| t31deliver | 12 | 0.6714 | 0.4196 | 445546 | 100% | 68 |
