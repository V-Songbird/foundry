# hush benchmark — generated claims

Generated from 24 retained run records · batch `t31sonnet-ecc50178` · model `sonnet` · seed `1787069058061` · arms: hush, t31deliver.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 0.5055 | 0.4703 | 0.4593–0.5165 | 0.3726–0.5679 | — | — | — |
| long-session | t31deliver | 4 | 0.4482 | 0.4863 | 0.4284–0.5061 | 0.3843–0.5883 | — | — | — |
| noisy-output | hush | 6 | 0.2145 | 0.2168 | 0.2023–0.2348 | 0.1981–0.2354 | — | — | — |
| noisy-output | t31deliver | 6 | 0.1798 | 0.1814 | 0.1726–0.1942 | 0.1654–0.1975 | — | — | — |
| search-heavy | hush | 2 | 0.6213 | 0.6213 | 0.6005–0.6420 | 0.5399–0.7026 | — | — | — |
| search-heavy | t31deliver | 2 | 0.8266 | 0.8266 | 0.7331–0.9201 | 0.4601–1.1932 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 697539 | 673164 | 594527–776175 | 541786–804541 | — | — | — |
| long-session | t31deliver | 4 | 646917 | 647804 | 621795–672925 | 584370–711238 | — | — | — |
| noisy-output | hush | 6 | 249663 | 237657 | 236149–275260 | 184985–290329 | — | — | — |
| noisy-output | t31deliver | 6 | 214879 | 198379 | 161894–239893 | 149774–246983 | — | — | — |
| search-heavy | hush | 2 | 325424 | 325424 | 311731–339116 | 271748–379099 | — | — | — |
| search-heavy | t31deliver | 2 | 741132 | 741132 | 534242–948021 | -69876–1552139 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 6335 | 6278 | 3051–9561 | 2349–10206 | — | — | — |
| long-session | t31deliver | 4 | 7337 | 7676 | 4891–10121 | 3898–11453 | — | — | — |
| noisy-output | hush | 6 | 1437 | 1363 | 1320–1588 | 1111–1615 | — | — | — |
| noisy-output | t31deliver | 6 | 1669 | 1664 | 1637–1823 | 1448–1880 | — | — | — |
| search-heavy | hush | 2 | 10404 | 10404 | 10306–10501 | 10020–10787 | — | — | — |
| search-heavy | t31deliver | 2 | 10853 | 10853 | 10534–11172 | 9603–12103 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | t31deliver | 4 | 0 | 5 | 0–5 | -5–16 | — | — | — |
| noisy-output | hush | 6 | 0 | 7 | 0–13 | -2–16 | — | — | — |
| noisy-output | t31deliver | 6 | 8 | 12 | 0–20 | 0–23 | — | — | — |
| search-heavy | hush | 2 | 10 | 10 | 10–11 | 8–12 | — | — | — |
| search-heavy | t31deliver | 2 | 41 | 41 | 40–41 | 38–43 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| hush | 12 | 0.3687 | 0.2847 | 397454 | 100% | 42 |
| t31deliver | 12 | 0.3906 | 0.3089 | 438646 | 100% | 54 |
