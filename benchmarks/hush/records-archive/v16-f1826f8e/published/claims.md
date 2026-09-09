# hush benchmark — generated claims

Generated from 60 retained run records · batch `v16-f1826f8e` · model `sonnet` · seed `1786435613981` · arms: baseline, adhd, caveman, hush, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 6 | 0.5584 | 0.5538 | 0.4163–0.6690 | 0.4269–0.6808 | — | — | — |
| long-session | adhd | 6 | 0.4620 | 0.4246 | 0.3251–0.5112 | 0.3179–0.5314 | -17.3% | 100% | — |
| long-session | caveman | 6 | 0.3792 | 0.4089 | 0.3128–0.5035 | 0.3164–0.5015 | -32.1% | 100% | — |
| long-session | hush | 6 | 0.7896 | 0.6527 | 0.4386–0.8333 | 0.4415–0.8640 | +41.4% | 33% | feature-drift +46.9% |
| long-session | ste | 6 | 0.4877 | 0.5237 | 0.4073–0.5803 | 0.3820–0.6655 | -12.7% | 67% | marathon-audit +4.4% |
| noisy-output | baseline | 4 | 0.2114 | 0.2079 | 0.2010–0.2183 | 0.1873–0.2285 | — | — | — |
| noisy-output | adhd | 4 | 0.2077 | 0.2074 | 0.2028–0.2123 | 0.1985–0.2162 | -1.7% | 50% | failing-suite +10.5% |
| noisy-output | caveman | 4 | 0.1991 | 0.1972 | 0.1923–0.2041 | 0.1845–0.2099 | -5.8% | 50% | failing-suite +0.8% |
| noisy-output | hush | 4 | 0.2124 | 0.2131 | 0.2063–0.2191 | 0.2052–0.2210 | +0.5% | 50% | failing-suite +6.5% |
| noisy-output | ste | 4 | 0.2106 | 0.2123 | 0.2041–0.2188 | 0.1952–0.2294 | -0.4% | 50% | failing-suite +4.8% |
| search-heavy | baseline | 2 | 0.5513 | 0.5513 | 0.5262–0.5763 | 0.4530–0.6495 | — | — | — |
| search-heavy | adhd | 2 | 0.2589 | 0.2589 | 0.2555–0.2622 | 0.2456–0.2721 | -53.0% | 100% | — |
| search-heavy | caveman | 2 | 0.4643 | 0.4643 | 0.3488–0.5797 | 0.0117–0.9169 | -15.8% | 100% | — |
| search-heavy | hush | 2 | 0.7581 | 0.7581 | 0.7532–0.7631 | 0.7387–0.7775 | +37.5% | 0% | repo-sweep +37.5% |
| search-heavy | ste | 2 | 0.4294 | 0.4294 | 0.3883–0.4706 | 0.2680–0.5908 | -22.1% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 6 | 841349 | 790657 | 645892–979960 | 599190–982124 | — | — | — |
| long-session | adhd | 6 | 661502 | 637190 | 469810–754025 | 456939–817441 | -21.4% | 100% | — |
| long-session | caveman | 6 | 573243 | 670327 | 489158–846088 | 486516–854137 | -31.9% | 100% | — |
| long-session | hush | 6 | 911001 | 813784 | 535738–1052003 | 571150–1056417 | +8.3% | 33% | feature-drift +27.9% |
| long-session | ste | 6 | 651396 | 765032 | 610771–877968 | 548438–981626 | -22.6% | 67% | marathon-audit +11.5% |
| noisy-output | baseline | 4 | 338555 | 331279 | 315700–354134 | 295076–367482 | — | — | — |
| noisy-output | adhd | 4 | 318094 | 326362 | 301431–343025 | 294060–358665 | -6.0% | 50% | failing-suite +11.5% |
| noisy-output | caveman | 4 | 299492 | 306867 | 296866–309492 | 286907–326826 | -11.5% | 100% | — |
| noisy-output | hush | 4 | 310939 | 296353 | 292986–314306 | 264576–328130 | -8.2% | 100% | — |
| noisy-output | ste | 4 | 298625 | 297915 | 259682–336858 | 241620–354211 | -11.8% | 100% | — |
| search-heavy | baseline | 2 | 363211 | 363211 | 308572–417851 | 149024–577398 | — | — | — |
| search-heavy | adhd | 2 | 399489 | 399489 | 397823–401154 | 392959–406018 | +10.0% | 0% | repo-sweep +10.0% |
| search-heavy | caveman | 2 | 387723 | 387723 | 356359–419086 | 264777–510668 | +6.7% | 0% | repo-sweep +6.7% |
| search-heavy | hush | 2 | 773124 | 773124 | 706503–839744 | 511970–1034277 | +112.9% | 0% | repo-sweep +112.9% |
| search-heavy | ste | 2 | 419298 | 419298 | 355810–482787 | 170423–668173 | +15.4% | 0% | repo-sweep +15.4% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 6 | 9924 | 9619 | 8008–11741 | 6763–12475 | — | — | — |
| long-session | adhd | 6 | 6760 | 6481 | 4014–8817 | 3966–8996 | -31.9% | 100% | — |
| long-session | caveman | 6 | 5578 | 5154 | 3561–6366 | 3675–6632 | -43.8% | 100% | — |
| long-session | hush | 6 | 10446 | 9108 | 4622–12911 | 4777–13439 | +5.3% | 67% | feature-drift +24.5% |
| long-session | ste | 6 | 9320 | 8648 | 5349–9978 | 5339–11957 | -6.1% | 67% | marathon-audit +4.4% |
| noisy-output | baseline | 4 | 1977 | 1894 | 1719–2153 | 1551–2238 | — | — | — |
| noisy-output | adhd | 4 | 1555 | 1600 | 1531–1624 | 1483–1717 | -21.4% | 100% | — |
| noisy-output | caveman | 4 | 1477 | 1396 | 1347–1525 | 1183–1608 | -25.3% | 100% | — |
| noisy-output | hush | 4 | 1683 | 1632 | 1400–1915 | 1286–1977 | -14.9% | 100% | — |
| noisy-output | ste | 4 | 1870 | 2129 | 1700–2299 | 1274–2984 | -5.4% | 50% | monorepo-build +23.0% |
| search-heavy | baseline | 2 | 10039 | 10039 | 9796–10282 | 9086–10992 | — | — | — |
| search-heavy | adhd | 2 | 1917 | 1917 | 1783–2052 | 1390–2444 | -80.9% | 100% | — |
| search-heavy | caveman | 2 | 6353 | 6353 | 4020–8685 | -2790–15495 | -36.7% | 100% | — |
| search-heavy | hush | 2 | 10818 | 10818 | 10716–10919 | 10421–11214 | +7.8% | 0% | repo-sweep +7.8% |
| search-heavy | ste | 2 | 7262 | 7262 | 5889–8634 | 1880–12643 | -27.7% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 6 | 68 | 69 | 16–89 | 14–124 | — | — | — |
| long-session | adhd | 6 | 80 | 78 | 32–108 | 26–130 | +17.8% | 50% | marathon-audit +85.2% |
| long-session | caveman | 6 | 6 | 15 | 0–18 | -3–32 | -91.1% | 100% | — |
| long-session | hush | 6 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| long-session | ste | 6 | 47 | 73 | 10–102 | 4–141 | -30.4% | 50% | marathon-audit +94.8% |
| noisy-output | baseline | 4 | 73 | 83 | 29–127 | 20–146 | — | — | — |
| noisy-output | adhd | 4 | 34 | 35 | 30–39 | 22–48 | -54.1% | 100% | — |
| noisy-output | caveman | 4 | 23 | 25 | 6–41 | 0–49 | -69.2% | 100% | — |
| noisy-output | hush | 4 | 17 | 15 | 7–24 | 3–26 | -77.4% | 100% | — |
| noisy-output | ste | 4 | 47 | 59 | 37–69 | 27–90 | -35.6% | 50% | failing-suite +24.1% |
| search-heavy | baseline | 2 | 70 | 70 | 66–74 | 54–86 | — | — | — |
| search-heavy | adhd | 2 | 74 | 74 | 70–77 | 59–88 | +5.0% | 0% | repo-sweep +5.0% |
| search-heavy | caveman | 2 | 35 | 35 | 31–38 | 22–47 | -50.7% | 100% | — |
| search-heavy | hush | 2 | 45 | 45 | 44–47 | 39–51 | -35.7% | 100% | — |
| search-heavy | ste | 2 | 89 | 89 | 74–103 | 31–146 | +26.4% | 0% | repo-sweep +26.4% |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.4381 | 0.4421 | 566290 | 100% | 83 |
| adhd | 12 | 0.3246 | 0.2589 | 493964 | 100% | 44 |
| caveman | 12 | 0.3476 | 0.3009 | 502073 | 100% | 58 |
| hush | 12 | 0.5238 | 0.5384 | 634530 | 100% | 79 |
| ste | 12 | 0.4042 | 0.3646 | 551704 | 100% | 70 |
