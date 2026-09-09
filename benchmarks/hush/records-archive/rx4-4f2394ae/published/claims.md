# hush benchmark — generated claims

Generated from 12 retained run records · batch `rx4-4f2394ae` · model `sonnet` · seed `1786463924622` · arms: adhd, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 0.4263 | 0.4263 | 0.3982–0.4545 | 0.3159–0.5367 | — | — | — |
| long-session | hush | 2 | 0.5187 | 0.5187 | 0.4969–0.5406 | 0.4331–0.6044 | — | — | — |
| noisy-output | adhd | 3 | 0.2259 | 0.2362 | 0.2114–0.2558 | 0.1849–0.2874 | — | — | — |
| noisy-output | hush | 3 | 0.2006 | 0.2019 | 0.1936–0.2095 | 0.1839–0.2198 | — | — | — |
| search-heavy | adhd | 1 | 0.7402 | 0.7402 | 0.7402–0.7402 | — | — | — | — |
| search-heavy | hush | 1 | 0.6429 | 0.6429 | 0.6429–0.6429 | — | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 732363 | 732363 | 639337–825388 | 367702–1097023 | — | — | — |
| long-session | hush | 2 | 602112 | 602112 | 572649–631576 | 486615–717609 | — | — | — |
| noisy-output | adhd | 3 | 239836 | 258204 | 216534–290690 | 172380–344027 | — | — | — |
| noisy-output | hush | 3 | 245542 | 205242 | 178434–252201 | 112895–297589 | — | — | — |
| search-heavy | adhd | 1 | 1379552 | 1379552 | 1379552–1379552 | — | — | — | — |
| search-heavy | hush | 1 | 429783 | 429783 | 429783–429783 | — | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 4452 | 4452 | 3966–4939 | 2545–6359 | — | — | — |
| long-session | hush | 2 | 7609 | 7609 | 5233–9985 | -1705–16923 | — | — | — |
| noisy-output | adhd | 3 | 1815 | 1634 | 1520–1839 | 1232–2036 | — | — | — |
| noisy-output | hush | 3 | 1293 | 1380 | 1187–1531 | 982–1779 | — | — | — |
| search-heavy | adhd | 1 | 10322 | 10322 | 10322–10322 | — | — | — | — |
| search-heavy | hush | 1 | 11704 | 11704 | 11704–11704 | — | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 27 | 27 | 25–28 | 20–33 | — | — | — |
| long-session | hush | 2 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | adhd | 3 | 24 | 24 | 12–36 | -3–51 | — | — | — |
| noisy-output | hush | 3 | 9 | 14 | 5–21 | -5–32 | — | — | — |
| search-heavy | adhd | 1 | 124 | 124 | 124–124 | — | — | — | — |
| search-heavy | hush | 1 | 14 | 14 | 14–14 | — | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 6 | 0.3836 | 0.3279 | 603148 | 100% | 47 |
| hush | 6 | 0.3810 | 0.3467 | 374956 | 100% | 46 |
