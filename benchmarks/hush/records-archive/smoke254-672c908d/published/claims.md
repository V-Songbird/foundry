# hush benchmark — generated claims

Generated from 6 retained run records · batch `smoke254-672c908d` · model `sonnet` · seed `1787245204197` · arms: baseline, adhd, caveman, concise, hush, ste.

Segments: noisy-output.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 0.3057 | 0.3057 | 0.3057–0.3057 | — | — | — | — |
| noisy-output | adhd | 1 | 0.2117 | 0.2117 | 0.2117–0.2117 | — | -30.8% | 100% | — |
| noisy-output | caveman | 1 | 0.2181 | 0.2181 | 0.2181–0.2181 | — | -28.7% | 100% | — |
| noisy-output | concise | 1 | 0.1733 | 0.1733 | 0.1733–0.1733 | — | -43.3% | 100% | — |
| noisy-output | hush | 1 | 0.3200 | 0.3200 | 0.3200–0.3200 | — | +4.7% | 0% | failing-suite +4.7% |
| noisy-output | ste | 1 | 0.3160 | 0.3160 | 0.3160–0.3160 | — | +3.4% | 0% | failing-suite +3.4% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 233691 | 233691 | 233691–233691 | — | — | — | — |
| noisy-output | adhd | 1 | 238100 | 238100 | 238100–238100 | — | +1.9% | 0% | failing-suite +1.9% |
| noisy-output | caveman | 1 | 282746 | 282746 | 282746–282746 | — | +21.0% | 0% | failing-suite +21.0% |
| noisy-output | concise | 1 | 199471 | 199471 | 199471–199471 | — | -14.6% | 100% | — |
| noisy-output | hush | 1 | 219489 | 219489 | 219489–219489 | — | -6.1% | 100% | — |
| noisy-output | ste | 1 | 237289 | 237289 | 237289–237289 | — | +1.5% | 0% | failing-suite +1.5% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 33384 | 33384 | 33384–33384 | — | — | — | — |
| noisy-output | adhd | 1 | 34014 | 34014 | 34014–34014 | — | +1.9% | 0% | failing-suite +1.9% |
| noisy-output | caveman | 1 | 35343 | 35343 | 35343–35343 | — | +5.9% | 0% | failing-suite +5.9% |
| noisy-output | concise | 1 | 33245 | 33245 | 33245–33245 | — | -0.4% | 100% | — |
| noisy-output | hush | 1 | 36582 | 36582 | 36582–36582 | — | +9.6% | 0% | failing-suite +9.6% |
| noisy-output | ste | 1 | 33898 | 33898 | 33898–33898 | — | +1.5% | 0% | failing-suite +1.5% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 1391 | 1391 | 1391–1391 | — | — | — | — |
| noisy-output | adhd | 1 | 1271 | 1271 | 1271–1271 | — | -8.6% | 100% | — |
| noisy-output | caveman | 1 | 1267 | 1267 | 1267–1267 | — | -8.9% | 100% | — |
| noisy-output | concise | 1 | 996 | 996 | 996–996 | — | -28.4% | 100% | — |
| noisy-output | hush | 1 | 1260 | 1260 | 1260–1260 | — | -9.4% | 100% | — |
| noisy-output | ste | 1 | 1564 | 1564 | 1564–1564 | — | +12.4% | 0% | failing-suite +12.4% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 31 | 31 | 31–31 | — | — | — | — |
| noisy-output | adhd | 1 | 22 | 22 | 22–22 | — | -29.0% | 100% | — |
| noisy-output | caveman | 1 | 14 | 14 | 14–14 | — | -54.8% | 100% | — |
| noisy-output | concise | 1 | 21 | 21 | 21–21 | — | -32.3% | 100% | — |
| noisy-output | hush | 1 | 0 | 0 | 0–0 | — | -100.0% | 100% | — |
| noisy-output | ste | 1 | 66 | 66 | 66–66 | — | +112.9% | 0% | failing-suite +112.9% |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 1 | 0.3057 | 0.3057 | 233691 | 100% | 23 |
| adhd | 1 | 0.2117 | 0.2117 | 238100 | 100% | 21 |
| caveman | 1 | 0.2181 | 0.2181 | 282746 | 100% | 22 |
| concise | 1 | 0.1733 | 0.1733 | 199471 | 100% | 19 |
| hush | 1 | 0.3200 | 0.3200 | 219489 | 100% | 22 |
| ste | 1 | 0.3160 | 0.3160 | 237289 | 100% | 24 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | adhd | caveman | concise | hush | ste |
|---|---|---|---|---|---|---|---|---|
| failing-suite | noisy-output | 2146 | 0.3057 | 0.2117 | 0.2181 | 0.1733 | 0.3200 | 0.3160 |

