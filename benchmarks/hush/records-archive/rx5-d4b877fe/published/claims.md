# hush benchmark — generated claims

Generated from 12 retained run records · batch `rx5-d4b877fe` · model `sonnet` · seed `1786464273166` · arms: adhd, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 0.3658 | 0.3658 | 0.3458–0.3857 | 0.2875–0.4441 | — | — | — |
| long-session | hush | 2 | 0.4070 | 0.4070 | 0.3564–0.4577 | 0.2085–0.6056 | — | — | — |
| noisy-output | adhd | 3 | 0.1869 | 0.2215 | 0.1849–0.2407 | 0.1498–0.2931 | — | — | — |
| noisy-output | hush | 3 | 0.1945 | 0.1983 | 0.1942–0.2006 | 0.1901–0.2066 | — | — | — |
| search-heavy | adhd | 1 | 0.8838 | 0.8838 | 0.8838–0.8838 | — | — | — | — |
| search-heavy | hush | 1 | 0.6527 | 0.6527 | 0.6527–0.6527 | — | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 530294 | 530294 | 527908–532681 | 520939–539649 | — | — | — |
| long-session | hush | 2 | 598230 | 598230 | 527231–669228 | 319916–876543 | — | — | — |
| noisy-output | adhd | 3 | 208718 | 196554 | 177318–221873 | 144745–248363 | — | — | — |
| noisy-output | hush | 3 | 216283 | 202463 | 163834–248003 | 106260–298667 | — | — | — |
| search-heavy | adhd | 1 | 1782265 | 1782265 | 1782265–1782265 | — | — | — | — |
| search-heavy | hush | 1 | 449588 | 449588 | 449588–449588 | — | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 5197 | 5197 | 4116–6278 | 959–9435 | — | — | — |
| long-session | hush | 2 | 5483 | 5483 | 3907–7059 | -695–11661 | — | — | — |
| noisy-output | adhd | 3 | 1203 | 1164 | 977–1371 | 716–1612 | — | — | — |
| noisy-output | hush | 3 | 1551 | 1414 | 1309–1588 | 1070–1757 | — | — | — |
| search-heavy | adhd | 1 | 11026 | 11026 | 11026–11026 | — | — | — | — |
| search-heavy | hush | 1 | 10761 | 10761 | 10761–10761 | — | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 35 | 35 | 33–36 | 28–41 | — | — | — |
| long-session | hush | 2 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | adhd | 3 | 24 | 21 | 18–26 | 11–31 | — | — | — |
| noisy-output | hush | 3 | 0 | 5 | 0–8 | -5–15 | — | — | — |
| search-heavy | adhd | 1 | 68 | 68 | 68–68 | — | — | — | — |
| search-heavy | hush | 1 | 31 | 31 | 31–31 | — | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 6 | 0.3800 | 0.3102 | 572086 | 100% | 40 |
| hush | 6 | 0.3436 | 0.2562 | 375573 | 100% | 43 |
