# hush benchmark — generated claims

Generated from 96 retained run records · batch `rm280-7e554675` · model `opus` · seed `1787842957640` · arms: baseline, adhd, caveman, concise, hush, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.8588 | 0.8487 | 0.8368–0.8707 | 0.8056–0.8919 | — | — | — |
| long-session | adhd | 4 | 0.6659 | 0.6678 | 0.6214–0.7123 | 0.5853–0.7503 | -22.5% | 100% | — |
| long-session | caveman | 4 | 0.5970 | 0.6287 | 0.5423–0.6833 | 0.4968–0.7605 | -30.5% | 100% | — |
| long-session | concise | 4 | 0.5522 | 0.5630 | 0.5436–0.5716 | 0.5324–0.5936 | -35.7% | 100% | — |
| long-session | hush | 4 | 0.6361 | 0.6003 | 0.5820–0.6544 | 0.4999–0.7006 | -25.9% | 100% | — |
| long-session | ste | 4 | 0.7151 | 0.7251 | 0.6040–0.8362 | 0.5835–0.8667 | -16.7% | 100% | — |
| noisy-output | baseline | 8 | 0.3811 | 0.4699 | 0.2699–0.5659 | 0.2860–0.6539 | — | — | — |
| noisy-output | adhd | 8 | 0.3205 | 0.4104 | 0.2599–0.5471 | 0.2726–0.5481 | -15.9% | 75% | failing-suite +4.7% |
| noisy-output | caveman | 8 | 0.2932 | 0.3997 | 0.2646–0.5384 | 0.2722–0.5271 | -23.1% | 75% | failing-suite +1.1% |
| noisy-output | concise | 8 | 0.3233 | 0.4094 | 0.2424–0.5281 | 0.2654–0.5534 | -15.2% | 100% | — |
| noisy-output | hush | 8 | 0.2619 | 0.3276 | 0.2538–0.3403 | 0.2391–0.4162 | -31.3% | 100% | — |
| noisy-output | ste | 8 | 0.3227 | 0.4269 | 0.2738–0.5800 | 0.2876–0.5662 | -15.3% | 75% | failing-suite +5.1% |
| search-heavy | baseline | 4 | 0.4372 | 0.6120 | 0.4102–0.6390 | 0.2311–0.9929 | — | — | — |
| search-heavy | adhd | 4 | 0.4040 | 0.4072 | 0.3793–0.4319 | 0.3649–0.4495 | -7.6% | 50% | rename-scope +10.2% |
| search-heavy | caveman | 4 | 0.3974 | 0.3937 | 0.3655–0.4255 | 0.3553–0.4320 | -9.1% | 50% | rename-scope +6.6% |
| search-heavy | concise | 4 | 0.3398 | 0.3404 | 0.3010–0.3792 | 0.2835–0.3974 | -22.3% | 100% | — |
| search-heavy | hush | 4 | 0.3862 | 0.6256 | 0.3791–0.6327 | 0.1490–1.1022 | -11.7% | 50% | repo-sweep +5.3% |
| search-heavy | ste | 4 | 0.4166 | 0.4175 | 0.3672–0.4669 | 0.3520–0.4830 | -4.7% | 50% | rename-scope +7.6% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 743514 | 752540 | 605519–890535 | 534042–971038 | — | — | — |
| long-session | adhd | 4 | 546305 | 523321 | 438904–630722 | 386270–660371 | -26.5% | 100% | — |
| long-session | caveman | 4 | 518414 | 505905 | 374125–650193 | 337142–674668 | -30.3% | 100% | — |
| long-session | concise | 4 | 527838 | 522004 | 427428–622414 | 394395–649612 | -29.0% | 100% | — |
| long-session | hush | 4 | 638039 | 610829 | 550484–698384 | 468989–752669 | -14.2% | 100% | — |
| long-session | ste | 4 | 636134 | 584646 | 580602–640178 | 475551–693741 | -14.4% | 100% | — |
| noisy-output | baseline | 8 | 193270 | 259581 | 176527–284857 | 164274–354887 | — | — | — |
| noisy-output | adhd | 8 | 210669 | 240118 | 187479–246070 | 181137–299098 | +9.0% | 75% | failing-suite +23.7% |
| noisy-output | caveman | 8 | 202602 | 235758 | 187089–282420 | 184066–287449 | +4.8% | 50% | failing-suite +13.7% |
| noisy-output | concise | 8 | 181542 | 218555 | 164488–241086 | 160857–276252 | -6.1% | 75% | dep-bump-warnings +2.4% |
| noisy-output | hush | 8 | 189575 | 228397 | 182186–239501 | 171345–285449 | -1.9% | 75% | failing-suite +11.4% |
| noisy-output | ste | 8 | 202041 | 220913 | 185409–216088 | 175696–266131 | +4.5% | 50% | failing-suite +12.2% |
| search-heavy | baseline | 4 | 234642 | 252161 | 200594–286209 | 184437–319884 | — | — | — |
| search-heavy | adhd | 4 | 221690 | 235764 | 215244–242210 | 197441–274087 | -5.5% | 50% | rename-scope +25.6% |
| search-heavy | caveman | 4 | 219237 | 222244 | 203768–237713 | 199126–245362 | -6.6% | 50% | rename-scope +14.3% |
| search-heavy | concise | 4 | 185163 | 185729 | 152707–218185 | 144551–226907 | -21.1% | 50% | rename-scope +11.4% |
| search-heavy | hush | 4 | 252750 | 270567 | 235387–287930 | 213689–327445 | +7.7% | 0% | rename-scope +16.3% |
| search-heavy | ste | 4 | 253601 | 256290 | 242294–267597 | 236520–276060 | +8.1% | 50% | rename-scope +30.2% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 31773 | 31859 | 31324–32308 | 30575–33142 | — | — | — |
| long-session | adhd | 4 | 29625 | 29936 | 29454–30107 | 29089–30783 | -6.8% | 100% | — |
| long-session | caveman | 4 | 30397 | 30487 | 29923–30962 | 29737–31238 | -4.3% | 50% | feature-drift +0.4% |
| long-session | concise | 4 | 29433 | 29409 | 29310–29531 | 29237–29581 | -7.4% | 100% | — |
| long-session | hush | 4 | 30355 | 29936 | 29257–31033 | 28357–31514 | -4.5% | 50% | feature-drift +0.4% |
| long-session | ste | 4 | 30554 | 31593 | 30135–32011 | 29062–34123 | -3.8% | 100% | — |
| noisy-output | baseline | 8 | 27697 | 33187 | 25862–39065 | 26247–40126 | — | — | — |
| noisy-output | adhd | 8 | 27984 | 31853 | 26783–35206 | 26302–37403 | +1.0% | 75% | log-triage +9.3% |
| noisy-output | caveman | 8 | 29060 | 33221 | 28358–36635 | 27914–38528 | +4.9% | 25% | log-triage +13.5% |
| noisy-output | concise | 8 | 28902 | 32681 | 27161–37848 | 27351–38012 | +4.4% | 50% | log-triage +6.8% |
| noisy-output | hush | 8 | 28346 | 29776 | 27203–30385 | 27032–32519 | +2.3% | 50% | dep-bump-warnings +4.6% |
| noisy-output | ste | 8 | 29533 | 33389 | 27977–39223 | 28017–38762 | +6.6% | 25% | log-triage +9.4% |
| search-heavy | baseline | 4 | 31136 | 32102 | 28656–34582 | 27486–36718 | — | — | — |
| search-heavy | adhd | 4 | 30329 | 30538 | 29448–31420 | 29195–31882 | -2.6% | 50% | rename-scope +3.5% |
| search-heavy | caveman | 4 | 33403 | 33047 | 32843–33606 | 31819–34274 | +7.3% | 50% | rename-scope +15.1% |
| search-heavy | concise | 4 | 30896 | 30815 | 30225–31486 | 29291–32339 | -0.8% | 50% | rename-scope +11.4% |
| search-heavy | hush | 4 | 32577 | 34818 | 31403–35991 | 28551–41084 | +4.6% | 0% | rename-scope +8.8% |
| search-heavy | ste | 4 | 30906 | 32233 | 30287–32852 | 28681–35784 | -0.7% | 50% | rename-scope +7.1% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 8969 | 9602 | 7348–11222 | 6713–12490 | — | — | — |
| long-session | adhd | 4 | 7889 | 7817 | 5817–9888 | 5337–10296 | -12.0% | 100% | — |
| long-session | caveman | 4 | 5908 | 5893 | 5062–6739 | 4739–7047 | -34.1% | 100% | — |
| long-session | concise | 4 | 5774 | 5743 | 4607–6911 | 4142–7344 | -35.6% | 100% | — |
| long-session | hush | 4 | 4965 | 4985 | 4670–5280 | 4283–5686 | -44.6% | 100% | — |
| long-session | ste | 4 | 7172 | 7696 | 5965–8902 | 4834–10557 | -20.0% | 100% | — |
| noisy-output | baseline | 8 | 2597 | 3716 | 2330–4820 | 2126–5306 | — | — | — |
| noisy-output | adhd | 8 | 2715 | 3316 | 2184–3916 | 2180–4452 | +4.5% | 75% | failing-suite +12.6% |
| noisy-output | caveman | 8 | 2322 | 2521 | 1894–2978 | 1730–3312 | -10.6% | 100% | — |
| noisy-output | concise | 8 | 1993 | 2492 | 1466–3046 | 1471–3514 | -23.3% | 100% | — |
| noisy-output | hush | 8 | 1597 | 1887 | 1219–2098 | 1244–2530 | -38.5% | 100% | — |
| noisy-output | ste | 8 | 2637 | 3109 | 1999–3676 | 1974–4244 | +1.5% | 100% | — |
| search-heavy | baseline | 4 | 5462 | 6948 | 5047–7363 | 3141–10754 | — | — | — |
| search-heavy | adhd | 4 | 4700 | 4597 | 3333–5964 | 2989–6204 | -14.0% | 50% | rename-scope +9.9% |
| search-heavy | caveman | 4 | 3480 | 3480 | 2639–4321 | 2478–4483 | -36.3% | 100% | — |
| search-heavy | concise | 4 | 3028 | 3030 | 2392–3666 | 2307–3752 | -44.6% | 100% | — |
| search-heavy | hush | 4 | 3627 | 5614 | 3222–6018 | 938–10289 | -33.6% | 100% | — |
| search-heavy | ste | 4 | 3643 | 4089 | 3256–4475 | 2660–5517 | -33.3% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 9 | 11 | 8–12 | 5–16 | — | — | — |
| long-session | adhd | 4 | 7 | 7 | 7–7 | 6–8 | -22.2% | 100% | — |
| long-session | caveman | 4 | 3 | 3 | 0–5 | -0–5 | -72.2% | 100% | — |
| long-session | concise | 4 | 6 | 5 | 5–6 | 2–7 | -33.3% | 100% | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| long-session | ste | 4 | 8 | 11 | 8–11 | 5–17 | -11.1% | 50% | incident-forensics +14.3% |
| noisy-output | baseline | 8 | 33 | 35 | 19–42 | 18–52 | — | — | — |
| noisy-output | adhd | 8 | 30 | 31 | 17–43 | 17–46 | -9.2% | 75% | release-digest +6.3% |
| noisy-output | caveman | 8 | 6 | 9 | 0–9 | -0–18 | -83.1% | 100% | — |
| noisy-output | concise | 8 | 11 | 17 | 8–22 | 7–27 | -67.7% | 100% | — |
| noisy-output | hush | 8 | 0 | 3 | 0–6 | 0–5 | -100.0% | 100% | — |
| noisy-output | ste | 8 | 14 | 23 | 9–29 | 8–39 | -56.9% | 100% | — |
| search-heavy | baseline | 4 | 28 | 33 | 26–35 | 17–49 | — | — | — |
| search-heavy | adhd | 4 | 31 | 31 | 23–38 | 21–40 | +10.9% | 100% | — |
| search-heavy | caveman | 4 | 6 | 8 | 5–9 | -0–16 | -78.2% | 100% | — |
| search-heavy | concise | 4 | 11 | 12 | 5–18 | 4–20 | -61.8% | 100% | — |
| search-heavy | hush | 4 | 6 | 5 | 5–7 | 2–9 | -78.2% | 100% | — |
| search-heavy | ste | 4 | 14 | 22 | 12–25 | 1–43 | -49.1% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.6001 | 0.4869 | 380965 | 100% | 77 |
| adhd | 16 | 0.4739 | 0.4412 | 309830 | 100% | 69 |
| caveman | 16 | 0.4554 | 0.4268 | 299916 | 100% | 54 |
| concise | 16 | 0.4306 | 0.3897 | 286210 | 100% | 50 |
| hush | 16 | 0.4703 | 0.3862 | 334547 | 100% | 54 |
| ste | 16 | 0.4991 | 0.4739 | 320691 | 100% | 55 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | adhd | caveman | concise | hush | ste |
|---|---|---|---|---|---|---|---|---|
| feature-drift | long-session | 480 | 0.8386 | 0.7037 | 0.7265 | 0.5838 | 0.6625 | 0.7404 |
| dep-bump-warnings | noisy-output | 952 | 0.2660 | 0.2447 | 0.2587 | 0.2581 | 0.2502 | 0.2645 |
| incident-forensics | long-session | 1371 | 0.8588 | 0.6318 | 0.5308 | 0.5422 | 0.5381 | 0.7097 |
| failing-suite | noisy-output | 2530 | 0.2626 | 0.2749 | 0.2655 | 0.2375 | 0.2574 | 0.2759 |
| rename-scope | search-heavy | 2842 | 0.4002 | 0.4412 | 0.4268 | 0.3879 | 0.3835 | 0.4306 |
| repo-sweep | search-heavy | 3558 | 0.8238 | 0.3732 | 0.3606 | 0.2930 | 0.8677 | 0.4044 |
| log-triage | noisy-output | 3957 | 0.4869 | 0.4497 | 0.4639 | 0.4246 | 0.2689 | 0.4672 |
| release-digest | noisy-output | 8253 | 0.8643 | 0.6722 | 0.6107 | 0.7173 | 0.5341 | 0.7001 |

