# hush benchmark — generated claims

Generated from 12 retained run records · batch `rx7-1490c981` · model `sonnet` · seed `1786465735558` · arms: adhd, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 0.4060 | 0.4060 | 0.3871–0.4250 | 0.3317–0.4803 | — | — | — |
| long-session | hush | 2 | 0.4817 | 0.4817 | 0.4450–0.5183 | 0.3379–0.6254 | — | — | — |
| noisy-output | adhd | 3 | 0.1854 | 0.2151 | 0.1746–0.2407 | 0.1348–0.2953 | — | — | — |
| noisy-output | hush | 3 | 0.2066 | 0.2079 | 0.2035–0.2117 | 0.1985–0.2174 | — | — | — |
| search-heavy | adhd | 1 | 0.5857 | 0.5857 | 0.5857–0.5857 | — | — | — | — |
| search-heavy | hush | 1 | 0.5995 | 0.5995 | 0.5995–0.5995 | — | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 551927 | 551927 | 468792–635063 | 226036–877818 | — | — | — |
| long-session | hush | 2 | 658281 | 658281 | 612361–704201 | 478275–838287 | — | — | — |
| noisy-output | adhd | 3 | 197837 | 183910 | 171877–202907 | 146237–221583 | — | — | — |
| noisy-output | hush | 3 | 249674 | 238728 | 200871–282059 | 146232–331225 | — | — | — |
| search-heavy | adhd | 1 | 357147 | 357147 | 357147–357147 | — | — | — | — |
| search-heavy | hush | 1 | 304301 | 304301 | 304301–304301 | — | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 6213 | 6213 | 5372–7053 | 2917–9508 | — | — | — |
| long-session | hush | 2 | 6689 | 6689 | 4784–8593 | -778–14155 | — | — | — |
| noisy-output | adhd | 3 | 1160 | 1168 | 1004–1328 | 802–1534 | — | — | — |
| noisy-output | hush | 3 | 1110 | 1219 | 995–1388 | 761–1676 | — | — | — |
| search-heavy | adhd | 1 | 9875 | 9875 | 9875–9875 | — | — | — | — |
| search-heavy | hush | 1 | 9651 | 9651 | 9651–9651 | — | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 30 | 30 | 23–36 | 5–54 | — | — | — |
| long-session | hush | 2 | 4 | 4 | 2–5 | -3–10 | — | — | — |
| noisy-output | adhd | 3 | 17 | 16 | 14–18 | 11–20 | — | — | — |
| noisy-output | hush | 3 | 0 | 2 | 0–4 | -2–7 | — | — | — |
| search-heavy | adhd | 1 | 60 | 60 | 60–60 | — | — | — | — |
| search-heavy | hush | 1 | 35 | 35 | 35–35 | — | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 6 | 0.3405 | 0.3321 | 335455 | 100% | 48 |
| hush | 6 | 0.3644 | 0.3126 | 389508 | 100% | 49 |
