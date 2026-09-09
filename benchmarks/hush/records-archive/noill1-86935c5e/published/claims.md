# hush benchmark — generated claims

Generated from 36 retained run records · batch `noill1-86935c5e` · model `opus` · seed `1788038063484` · arms: hush, noill.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 3 | 0.6505 | 0.6731 | 0.6157–0.7193 | 0.5538–0.7924 | — | — | — |
| long-session | noill | 3 | 0.6470 | 0.6431 | 0.6324–0.6558 | 0.6164–0.6699 | — | — | — |
| noisy-output | hush | 9 | 0.3458 | 0.3840 | 0.2603–0.5230 | 0.2908–0.4772 | — | — | — |
| noisy-output | noill | 9 | 0.2926 | 0.3630 | 0.2534–0.4934 | 0.2722–0.4538 | — | — | — |
| search-heavy | hush | 6 | 0.4317 | 0.5144 | 0.3829–0.4772 | 0.2918–0.7369 | — | — | — |
| search-heavy | noill | 6 | 0.5975 | 0.6462 | 0.4285–0.8853 | 0.4347–0.8578 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 3 | 618042 | 639830 | 577927–690839 | 510285–769374 | — | — | — |
| long-session | noill | 3 | 612807 | 615552 | 598083–631649 | 577474–653630 | — | — | — |
| noisy-output | hush | 9 | 162229 | 194900 | 150285–221846 | 154306–235493 | — | — | — |
| noisy-output | noill | 9 | 162233 | 185709 | 149958–207316 | 150590–220829 | — | — | — |
| search-heavy | hush | 6 | 231799 | 271325 | 198976–258363 | 149791–392860 | — | — | — |
| search-heavy | noill | 6 | 274396 | 314999 | 236645–408712 | 223066–406932 | — | — | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 3 | 25752 | 26212 | 25681–26512 | 25168–27255 | — | — | — |
| long-session | noill | 3 | 26020 | 26009 | 25692–26332 | 25284–26733 | — | — | — |
| noisy-output | hush | 9 | 23176 | 25388 | 21553–30145 | 22499–28277 | — | — | — |
| noisy-output | noill | 9 | 23187 | 24964 | 21803–29617 | 22352–27575 | — | — | — |
| search-heavy | hush | 6 | 28514 | 29887 | 24641–30978 | 23868–35907 | — | — | — |
| search-heavy | noill | 6 | 29062 | 30743 | 25581–36087 | 25630–35856 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 3 | 5809 | 6113 | 5434–6641 | 4715–7511 | — | — | — |
| long-session | noill | 3 | 5532 | 5586 | 5487–5658 | 5385–5787 | — | — | — |
| noisy-output | hush | 9 | 1961 | 2926 | 1724–4964 | 1691–4162 | — | — | — |
| noisy-output | noill | 9 | 2370 | 2952 | 1323–3968 | 1695–4208 | — | — | — |
| search-heavy | hush | 6 | 3725 | 5409 | 3167–5432 | 2235–8582 | — | — | — |
| search-heavy | noill | 6 | 8154 | 8371 | 4636–11706 | 4942–11799 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 3 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | noill | 3 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | hush | 9 | 7 | 5 | 0–7 | 2–7 | — | — | — |
| noisy-output | noill | 9 | 0 | 2 | 0–7 | 0–5 | — | — | — |
| search-heavy | hush | 6 | 7 | 6 | 6–8 | 3–9 | — | — | — |
| search-heavy | noill | 6 | 5 | 4 | 1–6 | 1–7 | — | — | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 3 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| long-session | noill | 3 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| noisy-output | hush | 9 | 1.0 | 0.7 | 0.0–1.0 | 0.3–1.0 | — | — | — |
| noisy-output | noill | 9 | 0.0 | 0.3 | 0.0–1.0 | 0.0–0.7 | — | — | — |
| search-heavy | hush | 6 | 1.0 | 0.8 | 1.0–1.0 | 0.5–1.2 | — | — | — |
| search-heavy | noill | 6 | 1.0 | 0.7 | 0.3–1.0 | 0.3–1.1 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| hush | 18 | 0.4756 | 0.4317 | 294530 | 100% | 61 |
| noill | 18 | 0.5041 | 0.4731 | 300446 | 100% | 75 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | hush | noill |
|---|---|---|---|---|
| dep-bump-warnings | — | — | 0.3198 | 0.3003 |
| failing-suite | — | — | 0.2683 | 0.2489 |
| feature-drift | — | — | 0.6731 | 0.6431 |
| release-digest | — | — | 0.5638 | 0.5397 |
| rename-scope | — | — | 0.3856 | 0.4157 |
| repo-sweep | — | — | 0.6431 | 0.8768 |

