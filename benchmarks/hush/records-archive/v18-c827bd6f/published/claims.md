# hush benchmark — generated claims

Generated from 60 retained run records · batch `v18-c827bd6f` · model `sonnet` · seed `1786468472317` · arms: baseline, adhd, caveman, hush, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.5049 | 0.5699 | 0.4711–0.6038 | 0.4053–0.7345 | — | — | — |
| long-session | adhd | 4 | 0.3694 | 0.3874 | 0.3493–0.4074 | 0.3311–0.4437 | -26.8% | 100% | — |
| long-session | caveman | 4 | 0.3045 | 0.3246 | 0.2863–0.3428 | 0.2474–0.4017 | -39.7% | 100% | — |
| long-session | hush | 4 | 0.4376 | 0.4502 | 0.3560–0.5319 | 0.3105–0.5900 | -13.3% | 50% | feature-drift +21.0% |
| long-session | ste | 4 | 0.4544 | 0.4620 | 0.3682–0.5482 | 0.3504–0.5735 | -10.0% | 100% | — |
| noisy-output | baseline | 6 | 0.2048 | 0.2539 | 0.1982–0.2896 | 0.1744–0.3334 | — | — | — |
| noisy-output | adhd | 6 | 0.2138 | 0.2321 | 0.1889–0.2782 | 0.1822–0.2820 | +4.4% | 67% | failing-suite +13.2% |
| noisy-output | caveman | 6 | 0.1873 | 0.2404 | 0.1726–0.2683 | 0.1550–0.3259 | -8.5% | 100% | — |
| noisy-output | hush | 6 | 0.2053 | 0.2007 | 0.1903–0.2118 | 0.1895–0.2120 | +0.3% | 33% | failing-suite +12.0% |
| noisy-output | ste | 6 | 0.2177 | 0.2379 | 0.2061–0.2829 | 0.1956–0.2803 | +6.3% | 33% | failing-suite +6.2% |
| search-heavy | baseline | 2 | 0.7649 | 0.7649 | 0.7176–0.8121 | 0.5795–0.9502 | — | — | — |
| search-heavy | adhd | 2 | 0.6192 | 0.6192 | 0.5686–0.6699 | 0.4207–0.8177 | -19.0% | 100% | — |
| search-heavy | caveman | 2 | 0.5577 | 0.5577 | 0.5166–0.5988 | 0.3966–0.7189 | -27.1% | 100% | — |
| search-heavy | hush | 2 | 0.7671 | 0.7671 | 0.7079–0.8264 | 0.5348–0.9995 | +0.3% | 0% | repo-sweep +0.3% |
| search-heavy | ste | 2 | 0.6628 | 0.6628 | 0.6611–0.6645 | 0.6561–0.6695 | -13.3% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 768862 | 832513 | 681875–919500 | 472846–1192179 | — | — | — |
| long-session | adhd | 4 | 590674 | 559786 | 511360–639101 | 431900–687672 | -23.2% | 100% | — |
| long-session | caveman | 4 | 422287 | 486858 | 389888–519257 | 328271–645444 | -45.1% | 100% | — |
| long-session | hush | 4 | 640737 | 635440 | 552551–723626 | 494498–776382 | -16.7% | 50% | feature-drift +23.3% |
| long-session | ste | 4 | 594884 | 605177 | 389032–811029 | 339978–870376 | -22.6% | 100% | — |
| noisy-output | baseline | 6 | 214802 | 222855 | 199955–235457 | 198642–247068 | — | — | — |
| noisy-output | adhd | 6 | 221644 | 213020 | 200631–241621 | 182400–243639 | +3.2% | 100% | — |
| noisy-output | caveman | 6 | 207548 | 204701 | 201431–224091 | 178618–230785 | -3.4% | 100% | — |
| noisy-output | hush | 6 | 256655 | 221348 | 148004–272049 | 151401–291295 | +19.5% | 33% | dep-bump-warnings +34.5% |
| noisy-output | ste | 6 | 222898 | 214689 | 158145–267063 | 164626–264752 | +3.8% | 67% | dep-bump-warnings +17.3% |
| search-heavy | baseline | 2 | 1110196 | 1110196 | 817306–1403085 | -37930–2258321 | — | — | — |
| search-heavy | adhd | 2 | 832378 | 832378 | 583697–1081060 | -142453–1807209 | -25.0% | 100% | — |
| search-heavy | caveman | 2 | 321431 | 321431 | 316229–326632 | 301040–341821 | -71.0% | 100% | — |
| search-heavy | hush | 2 | 1082781 | 1082781 | 751942–1413621 | -214110–2379672 | -2.5% | 100% | — |
| search-heavy | ste | 2 | 505589 | 505589 | 485906–525273 | 428430–582748 | -54.5% | 100% | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 6383 | 7118 | 5159–8342 | 4046–10190 | — | — | — |
| long-session | adhd | 4 | 5171 | 5644 | 3575–7241 | 3022–8267 | -19.0% | 100% | — |
| long-session | caveman | 4 | 3239 | 3505 | 2617–4127 | 2200–4810 | -49.3% | 100% | — |
| long-session | hush | 4 | 5969 | 7094 | 3000–10063 | 2018–12170 | -6.5% | 50% | feature-drift +20.1% |
| long-session | ste | 4 | 6306 | 6319 | 4444–8181 | 4138–8500 | -1.2% | 100% | — |
| noisy-output | baseline | 6 | 1786 | 1730 | 1371–2064 | 1409–2051 | — | — | — |
| noisy-output | adhd | 6 | 1393 | 1312 | 1092–1557 | 1024–1599 | -22.0% | 67% | failing-suite +7.9% |
| noisy-output | caveman | 6 | 1150 | 1172 | 1006–1406 | 937–1407 | -35.6% | 100% | — |
| noisy-output | hush | 6 | 1222 | 1185 | 1069–1441 | 923–1448 | -31.6% | 100% | — |
| noisy-output | ste | 6 | 1779 | 1742 | 1667–1909 | 1554–1930 | -0.4% | 33% | failing-suite +20.7% |
| search-heavy | baseline | 2 | 11349 | 11349 | 11037–11660 | 10126–12571 | — | — | — |
| search-heavy | adhd | 2 | 9983 | 9983 | 9853–10112 | 9474–10491 | -12.0% | 100% | — |
| search-heavy | caveman | 2 | 10090 | 10090 | 9875–10306 | 9245–10935 | -11.1% | 100% | — |
| search-heavy | hush | 2 | 10538 | 10538 | 10287–10788 | 9557–11518 | -7.1% | 100% | — |
| search-heavy | ste | 2 | 10627 | 10627 | 10431–10822 | 9859–11394 | -6.4% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 20 | 28 | 17–30 | 6–50 | — | — | — |
| long-session | adhd | 4 | 32 | 48 | 14–66 | -7–102 | +64.1% | 50% | feature-drift +138.9% |
| long-session | caveman | 4 | 4 | 5 | 0–8 | -1–10 | -82.1% | 100% | — |
| long-session | hush | 4 | 0 | 8 | 0–8 | -8–24 | -100.0% | 100% | — |
| long-session | ste | 4 | 65 | 58 | 53–70 | 30–85 | +230.8% | 0% | incident-forensics +110.3% |
| noisy-output | baseline | 6 | 51 | 52 | 8–75 | 10–93 | — | — | — |
| noisy-output | adhd | 6 | 16 | 14 | 2–26 | 4–25 | -69.6% | 100% | — |
| noisy-output | caveman | 6 | 5 | 6 | 0–12 | 1–12 | -90.2% | 100% | — |
| noisy-output | hush | 6 | 0 | 1 | 0–0 | -1–2 | -100.0% | 100% | — |
| noisy-output | ste | 6 | 28 | 36 | 20–48 | 12–59 | -45.1% | 50% | failing-suite +9.8% |
| search-heavy | baseline | 2 | 126 | 126 | 113–138 | 77–174 | — | — | — |
| search-heavy | adhd | 2 | 67 | 67 | 63–72 | 49–85 | -46.6% | 100% | — |
| search-heavy | caveman | 2 | 30 | 30 | 30–30 | 30–30 | -76.1% | 100% | — |
| search-heavy | hush | 2 | 55 | 55 | 50–59 | 38–71 | -56.6% | 100% | — |
| search-heavy | ste | 2 | 131 | 131 | 107–155 | 37–225 | +4.4% | 0% | repo-sweep +4.4% |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.4444 | 0.4407 | 573964 | 100% | 49 |
| adhd | 12 | 0.3484 | 0.3311 | 431835 | 100% | 41 |
| caveman | 12 | 0.3214 | 0.2952 | 318208 | 100% | 35 |
| hush | 12 | 0.3783 | 0.2575 | 502951 | 100% | 43 |
| ste | 12 | 0.3834 | 0.3311 | 393335 | 100% | 49 |
