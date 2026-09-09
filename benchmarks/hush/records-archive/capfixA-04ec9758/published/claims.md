# hush benchmark — generated claims

Generated from 24 retained run records · batch `capfixA-04ec9758` · model `sonnet` · seed `1787082873870` · arms: hush, secondfact.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 0.4563 | 0.4898 | 0.4486–0.4975 | 0.4087–0.5709 | — | — | — |
| long-session | secondfact | 4 | 0.4075 | 0.4290 | 0.3845–0.4520 | 0.3618–0.4962 | — | — | — |
| noisy-output | hush | 6 | 0.2117 | 0.2196 | 0.2081–0.2300 | 0.2044–0.2348 | — | — | — |
| noisy-output | secondfact | 6 | 0.2193 | 0.2270 | 0.2061–0.2296 | 0.2012–0.2529 | — | — | — |
| search-heavy | hush | 2 | 0.5937 | 0.5937 | 0.5727–0.6147 | 0.5113–0.6761 | — | — | — |
| search-heavy | secondfact | 2 | 0.5775 | 0.5775 | 0.5425–0.6126 | 0.4401–0.7150 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 672584 | 654029 | 629919–696695 | 571099–736959 | — | — | — |
| long-session | secondfact | 4 | 598118 | 600683 | 540450–658351 | 491211–710155 | — | — | — |
| noisy-output | hush | 6 | 266111 | 253074 | 180584–314530 | 170300–335848 | — | — | — |
| noisy-output | secondfact | 6 | 258804 | 269404 | 174239–336767 | 162116–376692 | — | — | — |
| search-heavy | hush | 2 | 377788 | 377788 | 375936–379639 | 370531–385044 | — | — | — |
| search-heavy | secondfact | 2 | 458892 | 458892 | 410263–507521 | 268266–649518 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 5657 | 6983 | 3181–9459 | 2003–11963 | — | — | — |
| long-session | secondfact | 4 | 6206 | 6147 | 3178–9174 | 2656–9637 | — | — | — |
| noisy-output | hush | 6 | 1538 | 1519 | 1157–1901 | 1132–1906 | — | — | — |
| noisy-output | secondfact | 6 | 1466 | 1659 | 1216–2055 | 1088–2231 | — | — | — |
| search-heavy | hush | 2 | 10774 | 10774 | 10502–11045 | 9708–11839 | — | — | — |
| search-heavy | secondfact | 2 | 10199 | 10199 | 10091–10308 | 9774–10624 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | secondfact | 4 | 0 | 5 | 0–5 | -5–15 | — | — | — |
| noisy-output | hush | 6 | 0 | 1 | 0–0 | -1–4 | — | — | — |
| noisy-output | secondfact | 6 | 0 | 5 | 0–8 | -1–11 | — | — | — |
| search-heavy | hush | 2 | 23 | 23 | 12–35 | -22–68 | — | — | — |
| search-heavy | secondfact | 2 | 51 | 51 | 49–53 | 43–59 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| hush | 12 | 0.3720 | 0.3418 | 407511 | 100% | 52 |
| secondfact | 12 | 0.3528 | 0.3316 | 411412 | 100% | 52 |
