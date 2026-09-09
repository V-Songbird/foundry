# hush benchmark — generated claims

Generated from 72 retained run records · batch `noill2-a202e087` · model `opus` · seed `1788039179332` · arms: hush, noill.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 0.6811 | 0.6803 | 0.6114–0.7375 | 0.6079–0.7527 | — | — | — |
| long-session | noill | 6 | 0.6782 | 0.6700 | 0.6563–0.6904 | 0.6286–0.7113 | — | — | — |
| noisy-output | hush | 18 | 0.2664 | 0.3542 | 0.2491–0.5167 | 0.2886–0.4198 | — | — | — |
| noisy-output | noill | 18 | 0.2623 | 0.3402 | 0.2512–0.4538 | 0.2817–0.3986 | — | — | — |
| search-heavy | hush | 12 | 0.4825 | 0.5550 | 0.4162–0.6077 | 0.4324–0.6776 | — | — | — |
| search-heavy | noill | 12 | 0.5213 | 0.6471 | 0.4691–0.8889 | 0.5121–0.7821 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 653634 | 665272 | 580540–711168 | 578644–751901 | — | — | — |
| long-session | noill | 6 | 636361 | 636687 | 600284–679006 | 590107–683266 | — | — | — |
| noisy-output | hush | 18 | 163179 | 191492 | 149771–224068 | 164493–218491 | — | — | — |
| noisy-output | noill | 18 | 164585 | 182026 | 153358–200559 | 164509–199543 | — | — | — |
| search-heavy | hush | 12 | 262180 | 265040 | 183463–294973 | 214354–315726 | — | — | — |
| search-heavy | noill | 12 | 266142 | 299902 | 242297–382681 | 249195–350608 | — | — | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 26147 | 26185 | 25767–26607 | 25616–26754 | — | — | — |
| long-session | noill | 6 | 26397 | 26316 | 26057–26530 | 25792–26840 | — | — | — |
| noisy-output | hush | 18 | 23429 | 24955 | 21451–28456 | 23194–26716 | — | — | — |
| noisy-output | noill | 18 | 23512 | 24680 | 21487–27887 | 23122–26239 | — | — | — |
| search-heavy | hush | 12 | 28353 | 30060 | 25636–34919 | 27077–33043 | — | — | — |
| search-heavy | noill | 12 | 28276 | 31064 | 26455–36900 | 27707–34422 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 6215 | 5894 | 5250–6499 | 5099–6688 | — | — | — |
| long-session | noill | 6 | 6119 | 6062 | 5956–6397 | 5554–6570 | — | — | — |
| noisy-output | hush | 18 | 2003 | 2967 | 1672–4506 | 2098–3836 | — | — | — |
| noisy-output | noill | 18 | 1965 | 2727 | 1468–4229 | 1970–3485 | — | — | — |
| search-heavy | hush | 12 | 4782 | 6512 | 3813–7608 | 4339–8685 | — | — | — |
| search-heavy | noill | 12 | 6961 | 8406 | 5454–12383 | 6238–10574 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | noill | 6 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | hush | 18 | 7 | 7 | 7–7 | 6–7 | — | — | — |
| noisy-output | noill | 18 | 0 | 3 | 0–7 | 2–5 | — | — | — |
| search-heavy | hush | 12 | 7 | 8 | 5–7 | 4–12 | — | — | — |
| search-heavy | noill | 12 | 6 | 5 | 3–7 | 3–6 | — | — | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| long-session | noill | 6 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | — | — | — |
| noisy-output | hush | 18 | 1.0 | 0.9 | 1.0–1.0 | 0.8–1.1 | — | — | — |
| noisy-output | noill | 18 | 0.0 | 0.4 | 0.0–1.0 | 0.2–0.7 | — | — | — |
| search-heavy | hush | 12 | 1.0 | 1.1 | 1.0–1.0 | 0.7–1.5 | — | — | — |
| search-heavy | noill | 12 | 1.0 | 0.8 | 1.0–1.0 | 0.6–1.1 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| hush | 36 | 0.4755 | 0.4688 | 294972 | 100% | 65 |
| noill | 36 | 0.4974 | 0.4825 | 297095 | 100% | 71 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | hush | noill |
|---|---|---|---|---|
| dep-bump-warnings | — | — | 0.2500 | 0.2466 |
| failing-suite | — | — | 0.2682 | 0.2664 |
| feature-drift | — | — | 0.6803 | 0.6700 |
| release-digest | — | — | 0.5443 | 0.5075 |
| rename-scope | — | — | 0.4140 | 0.4596 |
| repo-sweep | — | — | 0.6959 | 0.8347 |

