# hush benchmark — generated claims

Generated from 72 retained run records · batch `rm320-99a236ff` · model `opus` · seed `1788058431828` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.8864 | 0.9401 | 0.7789–1.0394 | 0.7972–1.0830 | — | — | — |
| long-session | hush | 8 | 0.6678 | 0.6704 | 0.5992–0.7288 | 0.6046–0.7362 | -24.7% | 100% | — |
| noisy-output | baseline | 16 | 0.3141 | 0.4513 | 0.2749–0.6285 | 0.3236–0.5791 | — | — | — |
| noisy-output | hush | 16 | 0.2702 | 0.3707 | 0.2495–0.4788 | 0.2876–0.4538 | -14.0% | 50% | log-triage +1.7% |
| search-heavy | baseline | 12 | 0.5027 | 0.5040 | 0.1688–0.7448 | 0.3299–0.6782 | — | — | — |
| search-heavy | hush | 12 | 0.3849 | 0.4139 | 0.1871–0.4006 | 0.2501–0.5777 | -23.4% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 660979 | 645660 | 564222–730297 | 543320–748000 | — | — | — |
| long-session | hush | 8 | 553105 | 550956 | 389887–661783 | 435571–666342 | -16.3% | 100% | — |
| noisy-output | baseline | 16 | 171513 | 233497 | 152179–279572 | 173556–293437 | — | — | — |
| noisy-output | hush | 16 | 169664 | 206553 | 158877–239478 | 166369–246737 | -1.1% | 50% | failing-suite +14.2% |
| search-heavy | baseline | 12 | 255600 | 240527 | 84892–330664 | 160068–320987 | — | — | — |
| search-heavy | hush | 12 | 197440 | 200742 | 126374–200905 | 131670–269814 | -22.8% | 67% | plan-apply +22.3% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 27350 | 28857 | 25552–29551 | 25545–32169 | — | — | — |
| long-session | hush | 8 | 26194 | 26365 | 25695–27439 | 25579–27152 | -4.2% | 50% | feature-drift +5.0% |
| noisy-output | baseline | 16 | 21297 | 26413 | 20213–27297 | 21531–31296 | — | — | — |
| noisy-output | hush | 16 | 23337 | 24967 | 21393–26090 | 22627–27308 | +9.6% | 25% | log-triage +10.6% |
| search-heavy | baseline | 12 | 24324 | 25346 | 17865–31761 | 21345–29347 | — | — | — |
| search-heavy | hush | 12 | 24680 | 26095 | 19435–26397 | 21596–30594 | +1.5% | 33% | plan-apply +9.0% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 12421 | 12908 | 8978–15974 | 9629–16187 | — | — | — |
| long-session | hush | 8 | 6874 | 7040 | 6280–7952 | 6179–7900 | -44.7% | 100% | — |
| noisy-output | baseline | 16 | 4253 | 4684 | 2875–6876 | 3589–5780 | — | — | — |
| noisy-output | hush | 16 | 2082 | 2914 | 1785–3967 | 1994–3835 | -51.1% | 100% | — |
| search-heavy | baseline | 12 | 7432 | 7244 | 2136–9527 | 4456–10032 | — | — | — |
| search-heavy | hush | 12 | 4074 | 4746 | 1439–4632 | 2304–7188 | -45.2% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 16 | 19 | 7–29 | 9–29 | — | — | — |
| long-session | hush | 8 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 41 | 41 | 15–59 | 27–55 | — | — | — |
| noisy-output | hush | 16 | 0 | 2 | 0–2 | 0–3 | -100.0% | 100% | — |
| search-heavy | baseline | 12 | 44 | 56 | 15–54 | 25–87 | — | — | — |
| search-heavy | hush | 12 | 0 | 2 | 0–6 | 0–4 | -100.0% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 1.5 | 1.9 | 1.0–2.3 | 1.1–2.7 | — | — | — |
| long-session | hush | 8 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 3.0 | 3.0 | 1.8–4.3 | 2.2–3.8 | — | — | — |
| noisy-output | hush | 16 | 0.0 | 0.3 | 0.0–0.3 | 0.0–0.5 | -100.0% | 100% | — |
| search-heavy | baseline | 12 | 3.0 | 3.4 | 1.0–4.0 | 1.8–5.0 | — | — | — |
| search-heavy | hush | 12 | 0.0 | 0.3 | 0.0–1.0 | 0.1–0.6 | -100.0% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.50 | 0.50 | 0.00–1.00 | 0.13–0.87 | — | — | — |
| long-session | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 1.00 | 0.75 | 0.75–1.00 | 0.53–0.97 | — | — | — |
| noisy-output | hush | 16 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 12 | 1.00 | 0.67 | 0.00–1.00 | 0.39–0.95 | — | — | — |
| search-heavy | hush | 12 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 36 | 0.5775 | 0.5278 | 327432 | 100% | 103 |
| hush | 36 | 0.4517 | 0.3970 | 281150 | 100% | 63 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 560 | 0.8131 | 0.7154 |
| plan-apply | search-heavy | 732 | 0.1625 | 0.1648 |
| dep-bump-warnings | noisy-output | 881 | 0.2888 | 0.2396 |
| log-triage | noisy-output | 1279 | 0.3860 | 0.3554 |
| failing-suite | noisy-output | 1526 | 0.2629 | 0.2732 |
| incident-forensics | long-session | 1680 | 1.0671 | 0.6253 |
| rename-scope | search-heavy | 1745 | 0.4850 | 0.3821 |
| repo-sweep | search-heavy | 3247 | 0.8647 | 0.6948 |
| release-digest | noisy-output | 7815 | 0.8676 | 0.6146 |

