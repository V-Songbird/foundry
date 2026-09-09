# hush benchmark — generated claims

Generated from 36 retained run records · batch `lf3A-f962e07d` · model `opus` · seed `1787083453533` · arms: hush, lookfurther.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 0.8593 | 0.8943 | 0.8093–0.8924 | 0.7683–1.0203 | — | — | — |
| long-session | lookfurther | 6 | 0.8904 | 0.9236 | 0.7930–1.0766 | 0.7641–1.0830 | — | — | — |
| noisy-output | hush | 9 | 0.3288 | 0.3791 | 0.3176–0.3770 | 0.3133–0.4448 | — | — | — |
| noisy-output | lookfurther | 9 | 0.3231 | 0.3531 | 0.3090–0.3678 | 0.3032–0.4030 | — | — | — |
| search-heavy | hush | 3 | 0.5692 | 0.5727 | 0.5496–0.5941 | 0.5222–0.6232 | — | — | — |
| search-heavy | lookfurther | 3 | 0.5528 | 0.5557 | 0.5445–0.5654 | 0.5319–0.5795 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 769691 | 800441 | 644985–892369 | 609627–991254 | — | — | — |
| long-session | lookfurther | 6 | 774974 | 696958 | 590176–783596 | 582470–811445 | — | — | — |
| noisy-output | hush | 9 | 220546 | 238792 | 215866–261744 | 214490–263094 | — | — | — |
| noisy-output | lookfurther | 9 | 208653 | 224473 | 189535–232176 | 192871–256075 | — | — | — |
| search-heavy | hush | 3 | 385667 | 361336 | 334699–400138 | 283540–439131 | — | — | — |
| search-heavy | lookfurther | 3 | 371710 | 368672 | 348048–390816 | 320184–417160 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 8855 | 9053 | 7401–10586 | 7119–10987 | — | — | — |
| long-session | lookfurther | 6 | 11591 | 11356 | 6785–15751 | 7419–15293 | — | — | — |
| noisy-output | hush | 9 | 2258 | 2467 | 1675–3025 | 1818–3115 | — | — | — |
| noisy-output | lookfurther | 9 | 2752 | 2591 | 1477–3178 | 1888–3295 | — | — | — |
| search-heavy | hush | 3 | 4175 | 4275 | 3621–4880 | 2847–5703 | — | — | — |
| search-heavy | lookfurther | 3 | 3846 | 3844 | 3677–4012 | 3464–4223 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | hush | 6 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| long-session | lookfurther | 6 | 0 | 0 | 0–0 | 0–0 | — | — | — |
| noisy-output | hush | 9 | 0 | 3 | 0–7 | -0–7 | — | — | — |
| noisy-output | lookfurther | 9 | 0 | 2 | 0–7 | 0–5 | — | — | — |
| search-heavy | hush | 3 | 7 | 6 | 4–9 | -0–12 | — | — | — |
| search-heavy | lookfurther | 3 | 0 | 3 | 0–5 | -3–9 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| hush | 18 | 0.5831 | 0.5496 | 446432 | 100% | 65 |
| lookfurther | 18 | 0.5770 | 0.5305 | 406001 | 100% | 63 |
