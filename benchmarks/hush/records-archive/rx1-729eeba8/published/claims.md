# hush benchmark — generated claims

Generated from 12 retained run records · batch `rx1-729eeba8` · model `sonnet` · seed `1786462846047` · arms: adhd, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 0.3646 | 0.3646 | 0.3213–0.4078 | 0.1951–0.5340 | — | — | — |
| long-session | hush | 2 | 0.5375 | 0.5375 | 0.5277–0.5472 | 0.4993–0.5756 | — | — | — |
| noisy-output | adhd | 3 | 0.2938 | 0.2648 | 0.2458–0.2983 | 0.1989–0.3307 | — | — | — |
| noisy-output | hush | 3 | 0.2450 | 0.2610 | 0.2349–0.2791 | 0.2086–0.3134 | — | — | — |
| search-heavy | adhd | 1 | 0.5588 | 0.5588 | 0.5588–0.5588 | — | — | — | — |
| search-heavy | hush | 1 | 0.6548 | 0.6548 | 0.6548–0.6548 | — | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 527213 | 527213 | 480499–573926 | 344097–710328 | — | — | — |
| long-session | hush | 2 | 610588 | 610588 | 593727–627449 | 544493–676683 | — | — | — |
| noisy-output | adhd | 3 | 234464 | 206925 | 190181–237439 | 147023–266826 | — | — | — |
| noisy-output | hush | 3 | 287055 | 271392 | 199515–351101 | 99170–443614 | — | — | — |
| search-heavy | adhd | 1 | 344761 | 344761 | 344761–344761 | — | — | — | — |
| search-heavy | hush | 1 | 500230 | 500230 | 500230–500230 | — | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 5469 | 5469 | 4132–6807 | 226–10712 | — | — | — |
| long-session | hush | 2 | 6976 | 6976 | 5221–8731 | 96–13856 | — | — | — |
| noisy-output | adhd | 3 | 1218 | 1215 | 963–1469 | 642–1787 | — | — | — |
| noisy-output | hush | 3 | 1665 | 1679 | 1534–1817 | 1358–2000 | — | — | — |
| search-heavy | adhd | 1 | 9770 | 9770 | 9770–9770 | — | — | — | — |
| search-heavy | hush | 1 | 11166 | 11166 | 11166–11166 | — | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | adhd | 2 | 39 | 39 | 20–59 | -37–115 | — | — | — |
| long-session | hush | 2 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | adhd | 3 | 14 | 19 | 7–29 | -6–44 | — | — | — |
| noisy-output | hush | 3 | 0 | 13 | 0–20 | -12–38 | — | — | — |
| search-heavy | adhd | 1 | 85 | 85 | 85–85 | — | — | — | — |
| search-heavy | hush | 1 | 44 | 44 | 44–44 | — | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| adhd | 6 | 0.3470 | 0.2983 | 336660 | 100% | 39 |
| hush | 6 | 0.4188 | 0.4156 | 422597 | 100% | 53 |
