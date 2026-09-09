# hush benchmark — generated claims

Generated from 32 retained run records · batch `sn280-adf3c9cf` · model `sonnet` · seed `1787864013128` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.3285 | 0.3139 | 0.2858–0.3566 | 0.2542–0.3735 | — | — | — |
| long-session | hush | 4 | 0.3288 | 0.3142 | 0.2816–0.3613 | 0.2475–0.3809 | +0.1% | 50% | feature-drift +36.6% |
| noisy-output | baseline | 8 | 0.2144 | 0.2531 | 0.1295–0.3208 | 0.1473–0.3589 | — | — | — |
| noisy-output | hush | 8 | 0.1431 | 0.1941 | 0.1291–0.2212 | 0.1193–0.2688 | -33.3% | 75% | failing-suite +20.2% |
| search-heavy | baseline | 4 | 0.2117 | 0.2148 | 0.1383–0.2882 | 0.1253–0.3042 | — | — | — |
| search-heavy | hush | 4 | 0.2373 | 0.2408 | 0.1453–0.3328 | 0.1211–0.3604 | +12.1% | 0% | repo-sweep +17.4% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 744527 | 729926 | 709824–764629 | 658879–800974 | — | — | — |
| long-session | hush | 4 | 854043 | 810301 | 624936–1039408 | 529148–1091455 | +14.7% | 50% | feature-drift +46.4% |
| noisy-output | baseline | 8 | 260521 | 319940 | 222169–364681 | 201746–438134 | — | — | — |
| noisy-output | hush | 8 | 271880 | 276828 | 185229–320234 | 176788–376868 | +4.4% | 75% | failing-suite +27.6% |
| search-heavy | baseline | 4 | 264024 | 277755 | 199879–341899 | 186662–368847 | — | — | — |
| search-heavy | hush | 4 | 303277 | 301695 | 248685–356286 | 194956–408433 | +14.9% | 0% | rename-scope +11.4% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 44521 | 44437 | 36059–52899 | 34515–54359 | — | — | — |
| long-session | hush | 4 | 40286 | 42011 | 39534–42763 | 37814–46207 | -9.5% | 50% | feature-drift +12.9% |
| noisy-output | baseline | 8 | 36901 | 42649 | 32811–50385 | 33987–51310 | — | — | — |
| noisy-output | hush | 8 | 34553 | 38250 | 34062–37361 | 32590–43910 | -6.4% | 50% | failing-suite +5.0% |
| search-heavy | baseline | 4 | 34893 | 35343 | 33313–36923 | 32888–37798 | — | — | — |
| search-heavy | hush | 4 | 37910 | 39400 | 34269–43041 | 32946–45855 | +8.6% | 0% | repo-sweep +19.3% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 4354 | 4298 | 4044–4608 | 3782–4813 | — | — | — |
| long-session | hush | 4 | 4123 | 4164 | 2804–5483 | 2466–5862 | -5.3% | 50% | feature-drift +32.9% |
| noisy-output | baseline | 8 | 1806 | 4529 | 1388–4234 | 629–8429 | — | — | — |
| noisy-output | hush | 8 | 1581 | 3176 | 1094–3754 | 693–5659 | -12.5% | 75% | failing-suite +16.1% |
| search-heavy | baseline | 4 | 6727 | 6670 | 3408–9989 | 2699–10641 | — | — | — |
| search-heavy | hush | 4 | 6820 | 6925 | 2977–10767 | 2286–11563 | +1.4% | 50% | repo-sweep +8.4% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 14 | 13 | 6–21 | 2–24 | — | — | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| noisy-output | baseline | 8 | 49 | 53 | 26–84 | 23–83 | — | — | — |
| noisy-output | hush | 8 | 0 | 3 | 0–3 | -1–8 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 43 | 52 | 11–85 | -3–108 | — | — | — |
| search-heavy | hush | 4 | 0 | 10 | 0–10 | -9–28 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.2587 | 0.2807 | 411890 | 100% | 51 |
| hush | 16 | 0.2358 | 0.2111 | 416413 | 100% | 50 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 851 | 0.2679 | 0.3660 |
| dep-bump-warnings | noisy-output | 1326 | 0.1421 | 0.1273 |
| failing-suite | noisy-output | 1673 | 0.1168 | 0.1404 |
| rename-scope | search-heavy | 2457 | 0.1361 | 0.1370 |
| repo-sweep | search-heavy | 2495 | 0.2934 | 0.3445 |
| incident-forensics | long-session | 3988 | 0.3598 | 0.2623 |
| release-digest | noisy-output | 7865 | 0.4702 | 0.3539 |
| log-triage | noisy-output | 16034 | 0.2832 | 0.1546 |

