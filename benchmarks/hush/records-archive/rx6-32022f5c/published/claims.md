# hush benchmark — generated claims

Generated from 12 retained run records · batch `rx6-32022f5c` · model `sonnet` · seed `1786465409125` · arms: adhd, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 0.4361 | 0.4361 | 0.4259–0.4463 | 0.3960–0.4762 | — | — | — |
| long-session | hush | 2 | 0.5929 | 0.5929 | 0.5689–0.6168 | 0.4990–0.6867 | — | — | — |
| noisy-output | adhd | 3 | 0.2107 | 0.2289 | 0.1893–0.2593 | 0.1477–0.3101 | — | — | — |
| noisy-output | hush | 3 | 0.2459 | 0.2535 | 0.2131–0.2901 | 0.1660–0.3409 | — | — | — |
| search-heavy | adhd | 1 | 0.6518 | 0.6518 | 0.6518–0.6518 | — | — | — | — |
| search-heavy | hush | 1 | 0.6780 | 0.6780 | 0.6780–0.6780 | — | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 564669 | 564669 | 542099–587240 | 476193–653145 | — | — | — |
| long-session | hush | 2 | 695184 | 695184 | 665648–724720 | 579403–810965 | — | — | — |
| noisy-output | adhd | 3 | 198409 | 215888 | 187755–235283 | 159443–272333 | — | — | — |
| noisy-output | hush | 3 | 278276 | 250287 | 194849–319720 | 106344–394229 | — | — | — |
| search-heavy | adhd | 1 | 409170 | 409170 | 409170–409170 | — | — | — | — |
| search-heavy | hush | 1 | 475239 | 475239 | 475239–475239 | — | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 5611 | 5611 | 4295–6928 | 450–10772 | — | — | — |
| long-session | hush | 2 | 6494 | 6494 | 4650–8337 | -732–13719 | — | — | — |
| noisy-output | adhd | 3 | 1371 | 1323 | 1166–1504 | 937–1709 | — | — | — |
| noisy-output | hush | 3 | 1228 | 1272 | 932–1591 | 525–2020 | — | — | — |
| search-heavy | adhd | 1 | 10092 | 10092 | 10092–10092 | — | — | — | — |
| search-heavy | hush | 1 | 10678 | 10678 | 10678–10678 | — | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 73 | 73 | 66–80 | 46–100 | — | — | — |
| long-session | hush | 2 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | adhd | 3 | 25 | 17 | 13–26 | 0–34 | — | — | — |
| noisy-output | hush | 3 | 0 | 1 | 0–2 | -1–4 | — | — | — |
| search-heavy | adhd | 1 | 55 | 55 | 55–55 | — | — | — | — |
| search-heavy | hush | 1 | 53 | 53 | 53–53 | — | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 6 | 0.3684 | 0.3618 | 364362 | 100% | 43 |
| hush | 6 | 0.4374 | 0.4396 | 436078 | 100% | 51 |
