# hush benchmark — generated claims

Generated from 32 retained run records · batch `sn300-b0703e71` · model `sonnet` · seed `1787997445063` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.2553 | 0.2668 | 0.2526–0.2696 | 0.2381–0.2955 | — | — | — |
| long-session | hush | 4 | 0.2801 | 0.2605 | 0.2548–0.2859 | 0.2154–0.3057 | +9.7% | 50% | feature-drift +1.7% |
| noisy-output | baseline | 8 | 0.1664 | 0.2378 | 0.1278–0.3104 | 0.1325–0.3432 | — | — | — |
| noisy-output | hush | 8 | 0.1237 | 0.1525 | 0.1184–0.1514 | 0.1096–0.1954 | -25.6% | 75% | failing-suite +2.5% |
| search-heavy | baseline | 4 | 0.1914 | 0.1935 | 0.1104–0.2746 | 0.0990–0.2880 | — | — | — |
| search-heavy | hush | 4 | 0.1944 | 0.1972 | 0.1025–0.2892 | 0.0883–0.3062 | +1.6% | 50% | repo-sweep +5.9% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 625955 | 636298 | 571164–691089 | 536917–735679 | — | — | — |
| long-session | hush | 4 | 628975 | 612756 | 524014–717717 | 476396–749116 | +0.5% | 50% | feature-drift +1.7% |
| noisy-output | baseline | 8 | 198674 | 293978 | 185977–326568 | 161808–426148 | — | — | — |
| noisy-output | hush | 8 | 203020 | 198974 | 154942–213553 | 147122–250826 | +2.2% | 100% | — |
| search-heavy | baseline | 4 | 206521 | 211525 | 136024–282022 | 125616–297434 | — | — | — |
| search-heavy | hush | 4 | 212411 | 219979 | 113505–318885 | 98798–341160 | +2.9% | 50% | repo-sweep +13.7% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 33582 | 33212 | 31946–34848 | 30976–35448 | — | — | — |
| long-session | hush | 4 | 33812 | 35465 | 33293–35983 | 30938–39992 | +0.7% | 0% | incident-forensics +9.4% |
| noisy-output | baseline | 8 | 31540 | 36442 | 28006–40076 | 28330–44555 | — | — | — |
| noisy-output | hush | 8 | 28952 | 30755 | 28576–30694 | 27904–33607 | -8.2% | 75% | failing-suite +4.9% |
| search-heavy | baseline | 4 | 28996 | 29545 | 27205–31336 | 26731–32359 | — | — | — |
| search-heavy | hush | 4 | 31286 | 31370 | 28376–34280 | 27959–34781 | +7.9% | 0% | repo-sweep +7.8% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 4294 | 4495 | 4230–4559 | 3991–5000 | — | — | — |
| long-session | hush | 4 | 3738 | 3642 | 2670–4709 | 2360–4923 | -13.0% | 50% | feature-drift +1.2% |
| noisy-output | baseline | 8 | 1751 | 4465 | 1605–4586 | 876–8053 | — | — | — |
| noisy-output | hush | 8 | 1606 | 2641 | 1284–2848 | 911–4370 | -8.3% | 75% | failing-suite +2.2% |
| search-heavy | baseline | 4 | 6127 | 6144 | 2159–10111 | 1634–10653 | — | — | — |
| search-heavy | hush | 4 | 5777 | 5772 | 1620–9929 | 924–10619 | -5.7% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 16 | 14 | 6–24 | 2–26 | — | — | — |
| long-session | hush | 4 | 0 | 6 | 0–6 | -5–16 | -100.0% | 100% | — |
| noisy-output | baseline | 8 | 45 | 74 | 18–59 | -2–150 | — | — | — |
| noisy-output | hush | 8 | 0 | 4 | 0–4 | -1–9 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 58 | 63 | 41–80 | 19–106 | — | — | — |
| search-heavy | hush | 4 | 9 | 14 | 0–23 | -4–33 | -85.3% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 1.0 | 1.0 | 0.8–1.3 | 0.2–1.8 | — | — | — |
| long-session | hush | 4 | 0.0 | 0.3 | 0.0–0.3 | -0.2–0.7 | -100.0% | 100% | — |
| noisy-output | baseline | 8 | 2.0 | 1.9 | 1.8–2.0 | 1.1–2.7 | — | — | — |
| noisy-output | hush | 8 | 0.0 | 0.3 | 0.0–0.3 | -0.1–0.6 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 3.0 | 3.0 | 1.8–4.3 | 1.2–4.8 | — | — | — |
| search-heavy | hush | 4 | 1.0 | 1.3 | 0.0–2.3 | -0.2–2.7 | -66.7% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.00 | 0.25 | 0.00–0.25 | -0.24–0.74 | — | — | — |
| long-session | hush | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | 100% | — |
| noisy-output | baseline | 8 | 1.00 | 0.75 | 0.75–1.00 | 0.43–1.07 | — | — | — |
| noisy-output | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 1.00 | 0.75 | 0.75–1.00 | 0.26–1.24 | — | — | — |
| search-heavy | hush | 4 | 0.50 | 0.50 | 0.00–1.00 | -0.07–1.07 | -50.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.2340 | 0.2505 | 358945 | 100% | 47 |
| hush | 16 | 0.1907 | 0.1596 | 307671 | 100% | 36 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 1035 | 0.2825 | 0.2873 |
| incident-forensics | long-session | 1451 | 0.2511 | 0.2338 |
| failing-suite | noisy-output | 1560 | 0.1215 | 0.1246 |
| dep-bump-warnings | noisy-output | 2269 | 0.1275 | 0.1176 |
| repo-sweep | search-heavy | 2631 | 0.2770 | 0.2933 |
| rename-scope | search-heavy | 2774 | 0.1101 | 0.1011 |
| release-digest | noisy-output | 6856 | 0.4705 | 0.2498 |
| log-triage | noisy-output | 13535 | 0.2318 | 0.1180 |

