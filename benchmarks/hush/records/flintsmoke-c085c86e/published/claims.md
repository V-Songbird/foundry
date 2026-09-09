# hush benchmark — generated claims

Generated from 3 retained run records · batch `flintsmoke-c085c86e` · model `opus` · seed `1787932757118` · arms: baseline, flint, hush.

Segments: noisy-output.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 0.4930 | 0.4930 | 0.4930–0.4930 | — | — | — | — |
| noisy-output | flint | 1 | 0.4349 | 0.4349 | 0.4349–0.4349 | — | -11.8% | 100% | — |
| noisy-output | hush | 1 | 0.4127 | 0.4127 | 0.4127–0.4127 | — | -16.3% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 254568 | 254568 | 254568–254568 | — | — | — | — |
| noisy-output | flint | 1 | 180544 | 180544 | 180544–180544 | — | -29.1% | 100% | — |
| noisy-output | hush | 1 | 170949 | 170949 | 170949–170949 | — | -32.8% | 100% | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 28285 | 28285 | 28285–28285 | — | — | — | — |
| noisy-output | flint | 1 | 30091 | 30091 | 30091–30091 | — | +6.4% | 0% | failing-suite +6.4% |
| noisy-output | hush | 1 | 28492 | 28492 | 28492–28492 | — | +0.7% | 0% | failing-suite +0.7% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 2678 | 2678 | 2678–2678 | — | — | — | — |
| noisy-output | flint | 1 | 1023 | 1023 | 1023–1023 | — | -61.8% | 100% | — |
| noisy-output | hush | 1 | 1115 | 1115 | 1115–1115 | — | -58.4% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 105 | 105 | 105–105 | — | — | — | — |
| noisy-output | flint | 1 | 0 | 0 | 0–0 | — | -100.0% | 100% | — |
| noisy-output | hush | 1 | 0 | 0 | 0–0 | — | -100.0% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 3.0 | 3.0 | 3.0–3.0 | — | — | — | — |
| noisy-output | flint | 1 | 0.0 | 0.0 | 0.0–0.0 | — | -100.0% | 100% | — |
| noisy-output | hush | 1 | 0.0 | 0.0 | 0.0–0.0 | — | -100.0% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| noisy-output | baseline | 1 | 1.00 | 1.00 | 1.00–1.00 | — | — | — | — |
| noisy-output | flint | 1 | 0.00 | 0.00 | 0.00–0.00 | — | -100.0% | 100% | — |
| noisy-output | hush | 1 | 0.00 | 0.00 | 0.00–0.00 | — | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 1 | 0.4930 | 0.4930 | 254568 | 100% | 55 |
| flint | 1 | 0.4349 | 0.4349 | 180544 | 100% | 22 |
| hush | 1 | 0.4127 | 0.4127 | 170949 | 100% | 32 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | flint | hush |
|---|---|---|---|---|---|
| failing-suite | noisy-output | 1448 | 0.4930 | 0.4349 | 0.4127 |

