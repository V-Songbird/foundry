# hush benchmark — generated claims

Generated from 36 retained run records · batch `capfixB-1f14a1b6` · model `sonnet` · seed `1787120586579` · arms: hush, secondfact.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 0.4845 | 0.4777 | 0.3912–0.5514 | 0.3887–0.5668 | — | — | — |
| long-session | secondfact | 6 | 0.4564 | 0.4499 | 0.3761–0.5263 | 0.3528–0.5471 | — | — | — |
| noisy-output | hush | 9 | 0.2096 | 0.2249 | 0.1968–0.2291 | 0.1935–0.2563 | — | — | — |
| noisy-output | secondfact | 9 | 0.2104 | 0.2178 | 0.2033–0.2172 | 0.1959–0.2396 | — | — | — |
| search-heavy | hush | 3 | 0.5674 | 0.5677 | 0.5555–0.5798 | 0.5403–0.5952 | — | — | — |
| search-heavy | secondfact | 3 | 0.5970 | 0.5920 | 0.5845–0.6021 | 0.5715–0.6125 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 670221 | 703307 | 630017–806332 | 581245–825369 | — | — | — |
| long-session | secondfact | 6 | 630679 | 625894 | 565590–693453 | 500189–751599 | — | — | — |
| noisy-output | hush | 9 | 218872 | 204519 | 113279–253707 | 153936–255101 | — | — | — |
| noisy-output | secondfact | 9 | 247949 | 205323 | 146613–249945 | 164451–246196 | — | — | — |
| search-heavy | hush | 3 | 336697 | 353088 | 317826–380155 | 280751–425425 | — | — | — |
| search-heavy | secondfact | 3 | 343872 | 342215 | 338354–346905 | 332404–352027 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 5777 | 6396 | 2865–8966 | 3131–9661 | — | — | — |
| long-session | secondfact | 6 | 6102 | 6628 | 3173–9755 | 3443–9812 | — | — | — |
| noisy-output | hush | 9 | 1173 | 1194 | 986–1405 | 920–1467 | — | — | — |
| noisy-output | secondfact | 9 | 1340 | 1371 | 1290–1709 | 1038–1704 | — | — | — |
| search-heavy | hush | 3 | 10050 | 10038 | 9987–10096 | 9914–10162 | — | — | — |
| search-heavy | secondfact | 3 | 10004 | 10005 | 9981–10028 | 9951–10058 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | secondfact | 6 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | hush | 9 | 0 | 3 | 0–0 | -2–8 | — | — | — |
| noisy-output | secondfact | 9 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| search-heavy | hush | 3 | 46 | 38 | 29–52 | 12–65 | — | — | — |
| search-heavy | secondfact | 3 | 39 | 48 | 37–55 | 25–71 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| hush | 18 | 0.3663 | 0.3251 | 395543 | 100% | 46 |
| secondfact | 18 | 0.3575 | 0.2896 | 368329 | 94% | 46 |
