# hush benchmark — generated claims

Generated from 8 retained run records · batch `sn291-a1dafbca` · model `sonnet` · seed `1787887694776` · arms: baseline, hush.

Segments: noisy-output.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 4 | 0.2098 | 0.2043 | 0.1268–0.2874 | 0.1089–0.2997 | — | — | — |
| noisy-output | hush | 4 | 0.1488 | 0.1599 | 0.1297–0.1790 | 0.1175–0.2023 | -29.1% | 50% | dep-bump-warnings +5.9% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 4 | 201146 | 199635 | 197666–203114 | 193078–206191 | — | — | — |
| noisy-output | hush | 4 | 247018 | 217356 | 201975–262399 | 144019–290694 | +22.8% | 50% | dep-bump-warnings +26.6% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 4 | 37177 | 39152 | 33674–42655 | 30971–47333 | — | — | — |
| noisy-output | hush | 4 | 34642 | 34965 | 33471–36137 | 33138–36792 | -6.8% | 50% | dep-bump-warnings +1.3% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 4 | 1707 | 1679 | 1483–1903 | 1344–2013 | — | — | — |
| noisy-output | hush | 4 | 1698 | 2008 | 1599–2107 | 1231–2785 | -0.5% | 50% | log-triage +64.5% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 4 | 29 | 38 | 0–67 | -8–84 | — | — | — |
| noisy-output | hush | 4 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 4 | 0.2043 | 0.2098 | 199635 | 100% | 26 |
| hush | 4 | 0.1599 | 0.1488 | 217356 | 100% | 28 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| dep-bump-warnings | noisy-output | 1912 | 0.1205 | 0.1276 |
| log-triage | noisy-output | 13572 | 0.2881 | 0.1922 |

