# hush benchmark — generated claims

Generated from 24 retained run records · batch `v17h-a8acdae2` · model `haiku` · seed `1786438732942` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.1467 | 0.1556 | 0.1449–0.1575 | 0.1338–0.1774 | — | — | — |
| long-session | hush | 4 | 0.1738 | 0.1985 | 0.1336–0.2387 | 0.0932–0.3039 | +18.4% | 50% | feature-drift +91.7% |
| noisy-output | baseline | 6 | 0.0754 | 0.0773 | 0.0747–0.0792 | 0.0741–0.0805 | — | — | — |
| noisy-output | hush | 6 | 0.0593 | 0.0610 | 0.0379–0.0678 | 0.0362–0.0858 | -21.3% | 67% | failing-suite +8.0% |
| search-heavy | baseline | 2 | 0.1562 | 0.1562 | 0.1534–0.1589 | 0.1454–0.1669 | — | — | — |
| search-heavy | hush | 2 | 0.1886 | 0.1886 | 0.1668–0.2103 | 0.1034–0.2738 | +20.8% | 0% | repo-sweep +20.8% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 678549 | 670427 | 648046–700931 | 616233–724621 | — | — | — |
| long-session | hush | 4 | 678927 | 788602 | 437273–1030257 | 344633–1232572 | +0.1% | 50% | feature-drift +64.5% |
| noisy-output | baseline | 6 | 316333 | 243923 | 135286–323804 | 138622–349223 | — | — | — |
| noisy-output | hush | 6 | 224780 | 213360 | 94242–271087 | 97720–329000 | -28.9% | 67% | failing-suite +1.7% |
| search-heavy | baseline | 2 | 557520 | 557520 | 503205–611834 | 344606–770433 | — | — | — |
| search-heavy | hush | 2 | 423733 | 423733 | 363176–484289 | 186352–661113 | -24.0% | 100% | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 5656 | 5457 | 4056–7057 | 3581–7332 | — | — | — |
| long-session | hush | 4 | 6290 | 6290 | 3465–9115 | 2880–9700 | +11.2% | 50% | feature-drift +31.1% |
| noisy-output | baseline | 6 | 2614 | 2119 | 1397–2669 | 1402–2837 | — | — | — |
| noisy-output | hush | 6 | 1906 | 1972 | 1078–2153 | 918–3025 | -27.1% | 67% | failing-suite +18.5% |
| search-heavy | baseline | 2 | 10545 | 10545 | 10181–10909 | 9118–11972 | — | — | — |
| search-heavy | hush | 2 | 10510 | 10510 | 9751–11270 | 7533–13487 | -0.3% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 35 | 49 | 23–61 | 4–93 | — | — | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| noisy-output | baseline | 6 | 93 | 65 | 23–94 | 24–106 | — | — | — |
| noisy-output | hush | 6 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| search-heavy | baseline | 2 | 76 | 76 | 55–96 | -4–155 | — | — | — |
| search-heavy | hush | 2 | 10 | 10 | 5–14 | -9–28 | -87.4% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.1165 | 0.1122 | 438357 | 100% | 51 |
| hush | 12 | 0.1281 | 0.1074 | 440170 | 83% | 58 |
