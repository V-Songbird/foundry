# hush benchmark — generated claims

Generated from 54 retained run records · batch `binlev1-f9238a4c` · model `opus` · seed `1788042596052` · arms: blockcap, focus5, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcap | 3 | 0.7140 | 0.7014 | 0.6871–0.7221 | 0.6599–0.7429 | — | — | — |
| long-session | focus5 | 3 | 0.6302 | 0.6250 | 0.5947–0.6580 | 0.5532–0.6969 | — | — | — |
| long-session | hush | 3 | 0.7038 | 0.7006 | 0.6934–0.7095 | 0.6822–0.7191 | — | — | — |
| noisy-output | blockcap | 9 | 0.2513 | 0.3497 | 0.2492–0.5013 | 0.2502–0.4491 | — | — | — |
| noisy-output | focus5 | 9 | 0.2624 | 0.3431 | 0.2492–0.4451 | 0.2503–0.4359 | — | — | — |
| noisy-output | hush | 9 | 0.2724 | 0.3648 | 0.2574–0.4888 | 0.2659–0.4638 | — | — | — |
| search-heavy | blockcap | 6 | 0.3890 | 0.5750 | 0.3720–0.8167 | 0.3229–0.8271 | — | — | — |
| search-heavy | focus5 | 6 | 0.4471 | 0.5791 | 0.3843–0.7942 | 0.3625–0.7958 | — | — | — |
| search-heavy | hush | 6 | 0.4527 | 0.6016 | 0.4189–0.8069 | 0.3866–0.8165 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcap | 3 | 703853 | 658745 | 631105–708940 | 560196–757295 | — | — | — |
| long-session | focus5 | 3 | 545715 | 580629 | 539992–603810 | 500717–660541 | — | — | — |
| long-session | hush | 3 | 686375 | 691412 | 681519–698787 | 671257–711567 | — | — | — |
| noisy-output | blockcap | 9 | 158659 | 184850 | 150779–199448 | 146954–222746 | — | — | — |
| noisy-output | focus5 | 9 | 162097 | 184982 | 149796–194211 | 146610–223355 | — | — | — |
| noisy-output | hush | 9 | 188500 | 208614 | 150930–249409 | 167843–249384 | — | — | — |
| search-heavy | blockcap | 6 | 198808 | 276670 | 197059–372451 | 177607–375733 | — | — | — |
| search-heavy | focus5 | 6 | 228717 | 263117 | 197232–330679 | 188039–338194 | — | — | — |
| search-heavy | hush | 6 | 254613 | 285850 | 227839–365926 | 209757–361943 | — | — | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcap | 3 | 26588 | 26702 | 26517–26830 | 26331–27073 | — | — | — |
| long-session | focus5 | 3 | 25986 | 25968 | 25714–26231 | 25382–26554 | — | — | — |
| long-session | hush | 3 | 26399 | 26602 | 26370–26733 | 26146–27058 | — | — | — |
| noisy-output | blockcap | 9 | 22994 | 24801 | 21620–28493 | 22212–27390 | — | — | — |
| noisy-output | focus5 | 9 | 23157 | 24803 | 21546–27744 | 22233–27372 | — | — | — |
| noisy-output | hush | 9 | 23563 | 25322 | 21561–28462 | 22526–28117 | — | — | — |
| search-heavy | blockcap | 6 | 26630 | 30870 | 24632–37294 | 24051–37688 | — | — | — |
| search-heavy | focus5 | 6 | 28590 | 30907 | 24751–37613 | 25016–36799 | — | — | — |
| search-heavy | hush | 6 | 26704 | 30169 | 25665–34481 | 24906–35433 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcap | 3 | 6566 | 6582 | 6347–6810 | 6058–7106 | — | — | — |
| long-session | focus5 | 3 | 4764 | 5110 | 4619–5429 | 4132–6088 | — | — | — |
| long-session | hush | 3 | 5891 | 5951 | 5719–6153 | 5457–6445 | — | — | — |
| noisy-output | blockcap | 9 | 1940 | 2960 | 1352–5188 | 1628–4292 | — | — | — |
| noisy-output | focus5 | 9 | 2106 | 2847 | 1471–4094 | 1709–3984 | — | — | — |
| noisy-output | hush | 9 | 1995 | 3005 | 1762–5131 | 1809–4200 | — | — | — |
| search-heavy | blockcap | 6 | 4325 | 6761 | 3507–10737 | 2942–10579 | — | — | — |
| search-heavy | focus5 | 6 | 4600 | 7082 | 4186–10282 | 3642–10521 | — | — | — |
| search-heavy | hush | 6 | 5302 | 7450 | 5051–10692 | 4104–10797 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcap | 3 | 0 | 2 | 0–3 | -2–6 | — | — | — |
| long-session | focus5 | 3 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | hush | 3 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | blockcap | 9 | 7 | 5 | 0–8 | 3–7 | — | — | — |
| noisy-output | focus5 | 9 | 0 | 2 | 0–0 | -1–4 | — | — | — |
| noisy-output | hush | 9 | 7 | 5 | 0–8 | 3–8 | — | — | — |
| search-heavy | blockcap | 6 | 3 | 3 | 0–6 | 0–6 | — | — | — |
| search-heavy | focus5 | 6 | 5 | 4 | 3–6 | 2–6 | — | — | — |
| search-heavy | hush | 6 | 7 | 7 | 6–8 | 6–8 | — | — | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcap | 3 | 0.0 | 0.3 | 0.0–0.5 | -0.3–1.0 | — | — | — |
| long-session | focus5 | 3 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| long-session | hush | 3 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| noisy-output | blockcap | 9 | 1.0 | 0.7 | 0.0–1.0 | 0.3–1.0 | — | — | — |
| noisy-output | focus5 | 9 | 0.0 | 0.2 | 0.0–0.0 | -0.1–0.5 | — | — | — |
| noisy-output | hush | 9 | 1.0 | 0.7 | 0.0–1.0 | 0.3–1.0 | — | — | — |
| search-heavy | blockcap | 6 | 0.5 | 0.5 | 0.0–1.0 | 0.1–0.9 | — | — | — |
| search-heavy | focus5 | 6 | 1.0 | 0.8 | 1.0–1.0 | 0.5–1.2 | — | — | — |
| search-heavy | hush | 6 | 1.0 | 1.0 | 1.0–1.0 | 1.0–1.0 | — | — | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcap | 3 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| long-session | focus5 | 3 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| long-session | hush | 3 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| noisy-output | blockcap | 9 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| noisy-output | focus5 | 9 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| noisy-output | hush | 9 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| search-heavy | blockcap | 6 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| search-heavy | focus5 | 6 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| search-heavy | hush | 6 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| blockcap | 18 | 0.4834 | 0.3890 | 294439 | 100% | 65 |
| focus5 | 18 | 0.4688 | 0.4329 | 276968 | 100% | 68 |
| hush | 18 | 0.4997 | 0.4527 | 314826 | 100% | 77 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | blockcap | focus5 | hush |
|---|---|---|---|---|---|
| dep-bump-warnings | — | — | 0.2485 | 0.2531 | 0.2494 |
| failing-suite | — | — | 0.2507 | 0.2516 | 0.2849 |
| feature-drift | — | — | 0.7014 | 0.6250 | 0.7006 |
| release-digest | — | — | 0.5499 | 0.5246 | 0.5601 |
| rename-scope | — | — | 0.3644 | 0.3843 | 0.4399 |
| repo-sweep | — | — | 0.7856 | 0.7740 | 0.7633 |

