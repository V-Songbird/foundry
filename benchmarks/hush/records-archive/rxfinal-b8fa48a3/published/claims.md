# hush benchmark — generated claims

Generated from 54 retained run records · batch `rxfinal-b8fa48a3` · model `sonnet` · seed `1786466028185` · arms: adhd, hush, hushstock.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 6 | 0.4305 | 0.4515 | 0.3908–0.4930 | 0.3841–0.5189 | — | — | — |
| long-session | hush | 6 | 0.5726 | 0.5213 | 0.4087–0.6328 | 0.4076–0.6350 | — | — | — |
| long-session | hushstock | 6 | 0.4800 | 0.4852 | 0.4052–0.5420 | 0.4083–0.5621 | — | — | — |
| noisy-output | adhd | 9 | 0.2015 | 0.2342 | 0.1866–0.2831 | 0.1990–0.2694 | — | — | — |
| noisy-output | hush | 9 | 0.1971 | 0.2019 | 0.1961–0.2066 | 0.1925–0.2112 | — | — | — |
| noisy-output | hushstock | 9 | 0.2108 | 0.2204 | 0.1950–0.2198 | 0.1881–0.2527 | — | — | — |
| search-heavy | adhd | 3 | 0.5550 | 0.5620 | 0.5390–0.5815 | 0.5135–0.6105 | — | — | — |
| search-heavy | hush | 3 | 0.7119 | 0.7258 | 0.6436–0.8011 | 0.5470–0.9046 | — | — | — |
| search-heavy | hushstock | 3 | 0.6257 | 0.6848 | 0.6079–0.7322 | 0.5327–0.8369 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 6 | 604453 | 683618 | 593626–619829 | 496760–870477 | — | — | — |
| long-session | hush | 6 | 800099 | 733908 | 645576–808450 | 603023–864792 | — | — | — |
| long-session | hushstock | 6 | 612154 | 618450 | 575419–648426 | 566239–670661 | — | — | — |
| noisy-output | adhd | 9 | 235668 | 247793 | 207858–240471 | 190197–305390 | — | — | — |
| noisy-output | hush | 9 | 245529 | 213052 | 156652–249800 | 168885–257220 | — | — | — |
| noisy-output | hushstock | 9 | 255390 | 226533 | 111255–306568 | 166463–286603 | — | — | — |
| search-heavy | adhd | 3 | 346355 | 336749 | 310994–367308 | 272332–401166 | — | — | — |
| search-heavy | hush | 3 | 465511 | 878936 | 412891–1138269 | -36451–1794323 | — | — | — |
| search-heavy | hushstock | 3 | 367258 | 761138 | 363770–961566 | -17714–1539989 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 6 | 4419 | 5690 | 3544–6934 | 3320–8060 | — | — | — |
| long-session | hush | 6 | 8471 | 8067 | 3342–12517 | 3818–12316 | — | — | — |
| long-session | hushstock | 6 | 6817 | 7094 | 3871–9585 | 3931–10257 | — | — | — |
| noisy-output | adhd | 9 | 1424 | 1384 | 1125–1589 | 1135–1634 | — | — | — |
| noisy-output | hush | 9 | 1521 | 1302 | 1100–1599 | 1039–1565 | — | — | — |
| noisy-output | hushstock | 9 | 1473 | 1480 | 1331–1673 | 1249–1711 | — | — | — |
| search-heavy | adhd | 3 | 9803 | 10205 | 9728–10482 | 9266–11145 | — | — | — |
| search-heavy | hush | 3 | 10853 | 10626 | 10281–11085 | 9690–11562 | — | — | — |
| search-heavy | hushstock | 3 | 11041 | 10939 | 10734–11196 | 10407–11472 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 6 | 46 | 50 | 7–74 | 9–91 | — | — | — |
| long-session | hush | 6 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | hushstock | 6 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | adhd | 9 | 12 | 20 | 0–26 | 4–36 | — | — | — |
| noisy-output | hush | 9 | 0 | 3 | 0–0 | -1–7 | — | — | — |
| noisy-output | hushstock | 9 | 0 | 5 | 0–10 | 1–8 | — | — | — |
| search-heavy | adhd | 3 | 48 | 58 | 48–63 | 38–78 | — | — | — |
| search-heavy | hush | 3 | 65 | 54 | 48–66 | 31–77 | — | — | — |
| search-heavy | hushstock | 3 | 34 | 30 | 28–35 | 22–39 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 18 | 0.3613 | 0.3424 | 407894 | 100% | 48 |
| hush | 18 | 0.3957 | 0.2787 | 497651 | 100% | 42 |
| hushstock | 18 | 0.3861 | 0.3646 | 446273 | 100% | 50 |
