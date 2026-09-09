# hush benchmark — generated claims

Generated from 2 retained run records · batch `smokeopus-5483ae26` · model `opus` · seed `1787067375562` · arms: baseline, hush.

Segments: noisy-output.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 0.4699 | 0.4699 | 0.4699–0.4699 | — | — | — | — |
| noisy-output | hush | 1 | 0.4776 | 0.4776 | 0.4776–0.4776 | — | +1.7% | 0% | failing-suite +1.7% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 197321 | 197321 | 197321–197321 | — | — | — | — |
| noisy-output | hush | 1 | 221385 | 221385 | 221385–221385 | — | +12.2% | 0% | failing-suite +12.2% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 2538 | 2538 | 2538–2538 | — | — | — | — |
| noisy-output | hush | 1 | 1263 | 1263 | 1263–1263 | — | -50.2% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 113 | 113 | 113–113 | — | — | — | — |
| noisy-output | hush | 1 | 8 | 8 | 8–8 | — | -92.9% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 1 | 0.4699 | 0.4699 | 197321 | 100% | 39 |
| hush | 1 | 0.4776 | 0.4776 | 221385 | 100% | 29 |
