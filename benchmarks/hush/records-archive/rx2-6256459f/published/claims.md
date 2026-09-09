# hush benchmark — generated claims

Generated from 12 retained run records · batch `rx2-6256459f` · model `sonnet` · seed `1786463213439` · arms: adhd, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 0.4561 | 0.4561 | 0.4008–0.5114 | 0.2394–0.6728 | — | — | — |
| long-session | hush | 2 | 0.6957 | 0.6957 | 0.6840–0.7073 | 0.6500–0.7414 | — | — | — |
| noisy-output | adhd | 3 | 0.2078 | 0.2409 | 0.2019–0.2633 | 0.1643–0.3175 | — | — | — |
| noisy-output | hush | 3 | 0.2076 | 0.2171 | 0.2021–0.2273 | 0.1871–0.2471 | — | — | — |
| search-heavy | adhd | 1 | 0.5101 | 0.5101 | 0.5101–0.5101 | — | — | — | — |
| search-heavy | hush | 1 | 0.6095 | 0.6095 | 0.6095–0.6095 | — | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 648929 | 648929 | 534048–763809 | 198598–1099259 | — | — | — |
| long-session | hush | 2 | 889656 | 889656 | 871174–908138 | 817207–962105 | — | — | — |
| noisy-output | adhd | 3 | 241236 | 238389 | 224563–253639 | 205368–271410 | — | — | — |
| noisy-output | hush | 3 | 256223 | 242338 | 183715–307904 | 101148–383529 | — | — | — |
| search-heavy | adhd | 1 | 447926 | 447926 | 447926–447926 | — | — | — | — |
| search-heavy | hush | 1 | 393995 | 393995 | 393995–393995 | — | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 4910 | 4910 | 4170–5650 | 2009–7811 | — | — | — |
| long-session | hush | 2 | 9201 | 9201 | 6658–11743 | -765–19166 | — | — | — |
| noisy-output | adhd | 3 | 1491 | 1448 | 1267–1652 | 1011–1886 | — | — | — |
| noisy-output | hush | 3 | 1772 | 1659 | 1439–1935 | 1087–2231 | — | — | — |
| search-heavy | adhd | 1 | 9379 | 9379 | 9379–9379 | — | — | — | — |
| search-heavy | hush | 1 | 10496 | 10496 | 10496–10496 | — | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 54 | 54 | 52–55 | 49–58 | — | — | — |
| long-session | hush | 2 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | adhd | 3 | 12 | 12 | 6–18 | -1–25 | — | — | — |
| noisy-output | hush | 3 | 0 | 3 | 0–5 | -3–9 | — | — | — |
| search-heavy | adhd | 1 | 62 | 62 | 62–62 | — | — | — | — |
| search-heavy | hush | 1 | 29 | 29 | 29–29 | — | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 6 | 0.3575 | 0.3322 | 410158 | 100% | 50 |
| hush | 6 | 0.4420 | 0.4283 | 483387 | 100% | 63 |
