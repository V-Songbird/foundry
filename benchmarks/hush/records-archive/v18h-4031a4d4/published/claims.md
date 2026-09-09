# hush benchmark — generated claims

Generated from 24 retained run records · batch `v18h-4031a4d4` · model `haiku` · seed `1786469667454` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.1414 | 0.1431 | 0.1342–0.1503 | 0.1270–0.1591 | — | — | — |
| long-session | hush | 4 | 0.1612 | 0.1757 | 0.1346–0.2023 | 0.0997–0.2518 | +14.0% | 50% | feature-drift +74.4% |
| noisy-output | baseline | 6 | 0.0772 | 0.0771 | 0.0676–0.0816 | 0.0643–0.0900 | — | — | — |
| noisy-output | hush | 6 | 0.0682 | 0.0825 | 0.0611–0.0911 | 0.0573–0.1078 | -11.7% | 33% | failing-suite +46.1% |
| search-heavy | baseline | 2 | 0.1567 | 0.1567 | 0.1562–0.1572 | 0.1547–0.1586 | — | — | — |
| search-heavy | hush | 2 | 0.1527 | 0.1527 | 0.1521–0.1534 | 0.1503–0.1552 | -2.5% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 619736 | 604610 | 580719–643627 | 521188–688032 | — | — | — |
| long-session | hush | 4 | 610982 | 712892 | 370696–953177 | 274868–1150915 | -1.4% | 50% | feature-drift +61.6% |
| noisy-output | baseline | 6 | 220103 | 192872 | 97088–265127 | 109017–276728 | — | — | — |
| noisy-output | hush | 6 | 264182 | 248905 | 93219–332892 | 103119–394690 | +20.0% | 33% | failing-suite +49.0% |
| search-heavy | baseline | 2 | 404562 | 404562 | 304575–504548 | 12615–796508 | — | — | — |
| search-heavy | hush | 2 | 170881 | 170881 | 170694–171068 | 170148–171614 | -57.8% | 100% | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 5006 | 4898 | 3921–5982 | 3596–6199 | — | — | — |
| long-session | hush | 4 | 4804 | 4703 | 3213–6294 | 2870–6535 | -4.0% | 50% | feature-drift +4.8% |
| noisy-output | baseline | 6 | 2256 | 2004 | 1454–2504 | 1449–2559 | — | — | — |
| noisy-output | hush | 6 | 2325 | 2912 | 1221–3762 | 1110–4715 | +3.0% | 33% | failing-suite +109.3% |
| search-heavy | baseline | 2 | 10368 | 10368 | 10126–10609 | 9420–11315 | — | — | — |
| search-heavy | hush | 2 | 10583 | 10583 | 10500–10667 | 10256–10910 | +2.1% | 0% | repo-sweep +2.1% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 31 | 32 | 24–39 | 20–43 | — | — | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| noisy-output | baseline | 6 | 79 | 74 | 23–114 | 28–119 | — | — | — |
| noisy-output | hush | 6 | 0 | 18 | 0–29 | -6–41 | -100.0% | 100% | — |
| search-heavy | baseline | 2 | 101 | 101 | 100–103 | 95–107 | — | — | — |
| search-heavy | hush | 2 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.1124 | 0.1146 | 365400 | 100% | 50 |
| hush | 12 | 0.1253 | 0.1195 | 390563 | 83% | 58 |
