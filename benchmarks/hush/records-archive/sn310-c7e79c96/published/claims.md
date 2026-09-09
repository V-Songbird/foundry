# hush benchmark — generated claims

Generated from 32 retained run records · batch `sn310-c7e79c96` · model `sonnet` · seed `1788055943053` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.2802 | 0.3025 | 0.2657–0.3170 | 0.2442–0.3608 | — | — | — |
| long-session | hush | 4 | 0.2498 | 0.2649 | 0.1978–0.3168 | 0.1852–0.3445 | -10.9% | 50% | feature-drift +20.0% |
| noisy-output | baseline | 8 | 0.1818 | 0.2174 | 0.1250–0.2840 | 0.1392–0.2956 | — | — | — |
| noisy-output | hush | 8 | 0.1559 | 0.1670 | 0.1152–0.2014 | 0.1255–0.2084 | -14.3% | 75% | failing-suite +4.8% |
| search-heavy | baseline | 4 | 0.1967 | 0.2085 | 0.1326–0.2726 | 0.1085–0.3085 | — | — | — |
| search-heavy | hush | 4 | 0.1986 | 0.2014 | 0.1183–0.2818 | 0.0960–0.3069 | +1.0% | 50% | repo-sweep +0.3% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 661525 | 654880 | 621678–694726 | 562873–746887 | — | — | — |
| long-session | hush | 4 | 603129 | 641758 | 427809–817077 | 389458–894057 | -8.8% | 50% | feature-drift +29.6% |
| noisy-output | baseline | 8 | 184632 | 236678 | 169909–296823 | 160198–313157 | — | — | — |
| noisy-output | hush | 8 | 192660 | 184177 | 166424–205792 | 152344–216011 | +4.3% | 75% | failing-suite +2.7% |
| search-heavy | baseline | 4 | 220420 | 246469 | 179914–286975 | 131578–361359 | — | — | — |
| search-heavy | hush | 4 | 222752 | 210591 | 161573–271770 | 130170–291012 | +1.1% | 100% | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 32963 | 36826 | 32046–37743 | 27608–46044 | — | — | — |
| long-session | hush | 4 | 33404 | 33853 | 32908–34349 | 32322–35385 | +1.3% | 50% | feature-drift +10.7% |
| noisy-output | baseline | 8 | 33237 | 36022 | 28486–42239 | 29991–42052 | — | — | — |
| noisy-output | hush | 8 | 29905 | 30834 | 28248–32839 | 28491–33176 | -10.0% | 75% | failing-suite +2.7% |
| search-heavy | baseline | 4 | 29289 | 29971 | 27648–31613 | 26886–33057 | — | — | — |
| search-heavy | hush | 4 | 31571 | 31614 | 29213–33971 | 27939–35289 | +7.8% | 0% | repo-sweep +6.7% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 4707 | 4831 | 4539–4999 | 4253–5408 | — | — | — |
| long-session | hush | 4 | 4184 | 4125 | 3061–5247 | 2609–5641 | -11.1% | 50% | feature-drift +14.9% |
| noisy-output | baseline | 8 | 1927 | 3783 | 1390–4085 | 1051–6515 | — | — | — |
| noisy-output | hush | 8 | 1386 | 2791 | 1285–2735 | 828–4754 | -28.1% | 100% | — |
| search-heavy | baseline | 4 | 6417 | 6744 | 3284–9877 | 2207–11282 | — | — | — |
| search-heavy | hush | 4 | 6144 | 6364 | 2020–10488 | 1278–11449 | -4.3% | 50% | repo-sweep +2.3% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 11 | 12 | 6–17 | 2–21 | — | — | — |
| long-session | hush | 4 | 14 | 22 | 4–32 | -4–47 | +27.3% | 0% | feature-drift +96.9% |
| noisy-output | baseline | 8 | 58 | 64 | 34–107 | 29–99 | — | — | — |
| noisy-output | hush | 8 | 0 | 1 | 0–0 | -1–2 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 61 | 67 | 29–99 | 14–120 | — | — | — |
| search-heavy | hush | 4 | 0 | 6 | 0–6 | -6–17 | -100.0% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 1.0 | 1.0 | 0.8–1.3 | 0.2–1.8 | — | — | — |
| long-session | hush | 4 | 1.0 | 1.5 | 0.8–1.8 | -0.2–3.2 | +0.0% | 50% | feature-drift +66.7% |
| noisy-output | baseline | 8 | 2.0 | 1.8 | 0.8–3.0 | 0.9–2.6 | — | — | — |
| noisy-output | hush | 8 | 0.0 | 0.1 | 0.0–0.0 | -0.1–0.4 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 3.0 | 3.3 | 1.8–4.5 | 1.1–5.4 | — | — | — |
| search-heavy | hush | 4 | 0.0 | 0.5 | 0.0–0.5 | -0.5–1.5 | -100.0% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.00 | 0.25 | 0.00–0.25 | -0.24–0.74 | — | — | — |
| long-session | hush | 4 | 0.00 | 0.25 | 0.00–0.25 | -0.24–0.74 | — | 100% | — |
| noisy-output | baseline | 8 | 1.00 | 0.63 | 0.00–1.00 | 0.27–0.98 | — | — | — |
| noisy-output | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 4 | 1.00 | 0.75 | 0.75–1.00 | 0.26–1.24 | — | — | — |
| search-heavy | hush | 4 | 0.00 | 0.25 | 0.00–0.25 | -0.24–0.74 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.2364 | 0.2561 | 343676 | 100% | 53 |
| hush | 16 | 0.2001 | 0.1954 | 305176 | 100% | 38 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 1266 | 0.2767 | 0.3319 |
| failing-suite | noisy-output | 1858 | 0.1135 | 0.1189 |
| rename-scope | search-heavy | 2301 | 0.1251 | 0.1102 |
| repo-sweep | search-heavy | 2497 | 0.2919 | 0.2926 |
| dep-bump-warnings | noisy-output | 2764 | 0.1502 | 0.1123 |
| incident-forensics | long-session | 3013 | 0.3283 | 0.1978 |
| release-digest | noisy-output | 9035 | 0.3815 | 0.2459 |
| log-triage | noisy-output | 16048 | 0.2244 | 0.1907 |

