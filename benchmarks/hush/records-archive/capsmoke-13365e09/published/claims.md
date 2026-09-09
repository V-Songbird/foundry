# hush benchmark — generated claims

Generated from 2 retained run records · batch `capsmoke-13365e09` · model `sonnet` · seed `1787082794097` · arms: hush, secondfact.

Segments: noisy-output.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | hush | 1 | 0.3202 | 0.3202 | 0.3202–0.3202 | — | — | — | — |
| noisy-output | secondfact | 1 | 0.3172 | 0.3172 | 0.3172–0.3172 | — | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | hush | 1 | 224472 | 224472 | 224472–224472 | — | — | — | — |
| noisy-output | secondfact | 1 | 224291 | 224291 | 224291–224291 | — | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | hush | 1 | 1222 | 1222 | 1222–1222 | — | — | — | — |
| noisy-output | secondfact | 1 | 1139 | 1139 | 1139–1139 | — | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | hush | 1 | 0 | 0 | 0–0 | — | — | — | — |
| noisy-output | secondfact | 1 | 0 | 0 | 0–0 | — | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| hush | 1 | 0.3202 | 0.3202 | 224472 | 100% | 25 |
| secondfact | 1 | 0.3172 | 0.3172 | 224291 | 100% | 28 |
