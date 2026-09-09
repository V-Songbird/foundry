# hush benchmark — generated claims

Generated from 60 retained run records · batch `v17-fcdb6bfc` · model `sonnet` · seed `1786437406817` · arms: baseline, adhd, caveman, hush, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.4351 | 0.4492 | 0.3488–0.5355 | 0.3198–0.5786 | — | — | — |
| long-session | adhd | 4 | 0.3718 | 0.3839 | 0.3264–0.4293 | 0.2962–0.4716 | -14.6% | 100% | — |
| long-session | caveman | 4 | 0.3154 | 0.3149 | 0.3117–0.3186 | 0.3068–0.3231 | -27.5% | 100% | — |
| long-session | hush | 4 | 0.4348 | 0.4628 | 0.3981–0.4994 | 0.3350–0.5906 | -0.1% | 50% | incident-forensics +11.0% |
| long-session | ste | 4 | 0.3980 | 0.4376 | 0.3218–0.5138 | 0.2919–0.5833 | -8.5% | 100% | — |
| noisy-output | baseline | 6 | 0.2115 | 0.2301 | 0.1781–0.2864 | 0.1778–0.2825 | — | — | — |
| noisy-output | adhd | 6 | 0.2431 | 0.2550 | 0.2249–0.2955 | 0.2174–0.2925 | +15.0% | 33% | failing-suite +44.6% |
| noisy-output | caveman | 6 | 0.2005 | 0.2183 | 0.1931–0.2094 | 0.1797–0.2569 | -5.2% | 67% | failing-suite +20.2% |
| noisy-output | hush | 6 | 0.1974 | 0.1934 | 0.1715–0.2168 | 0.1616–0.2252 | -6.6% | 33% | failing-suite +17.4% |
| noisy-output | ste | 6 | 0.2436 | 0.2569 | 0.2226–0.2993 | 0.2175–0.2963 | +15.2% | 0% | failing-suite +33.7% |
| search-heavy | baseline | 2 | 0.7750 | 0.7750 | 0.7355–0.8145 | 0.6202–0.9298 | — | — | — |
| search-heavy | adhd | 2 | 0.4764 | 0.4764 | 0.4360–0.5169 | 0.3179–0.6350 | -38.5% | 100% | — |
| search-heavy | caveman | 2 | 0.3300 | 0.3300 | 0.3029–0.3572 | 0.2235–0.4366 | -57.4% | 100% | — |
| search-heavy | hush | 2 | 0.6186 | 0.6186 | 0.6079–0.6293 | 0.5767–0.6605 | -20.2% | 100% | — |
| search-heavy | ste | 2 | 0.6124 | 0.6124 | 0.5955–0.6293 | 0.5461–0.6787 | -21.0% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 707717 | 701592 | 530938–878372 | 487647–915538 | — | — | — |
| long-session | adhd | 4 | 566227 | 613013 | 519854–659386 | 470929–755097 | -20.0% | 50% | incident-forensics +7.5% |
| long-session | caveman | 4 | 472309 | 472675 | 447706–497278 | 425787–519564 | -33.3% | 100% | — |
| long-session | hush | 4 | 597013 | 595459 | 501316–691156 | 434612–756306 | -15.6% | 50% | incident-forensics +16.0% |
| long-session | ste | 4 | 584063 | 668105 | 518050–734117 | 447149–889060 | -17.5% | 50% | incident-forensics +0.2% |
| noisy-output | baseline | 6 | 246076 | 251967 | 200048–303705 | 201569–302366 | — | — | — |
| noisy-output | adhd | 6 | 334470 | 313395 | 219985–400996 | 232264–394527 | +35.9% | 0% | failing-suite +67.3% |
| noisy-output | caveman | 6 | 282260 | 261132 | 212205–300615 | 208935–313329 | +14.7% | 67% | failing-suite +22.8% |
| noisy-output | hush | 6 | 288461 | 254829 | 188335–313065 | 177938–331720 | +17.2% | 33% | failing-suite +17.2% |
| noisy-output | ste | 6 | 316209 | 304039 | 216119–366522 | 223624–384454 | +28.5% | 0% | failing-suite +49.3% |
| search-heavy | baseline | 2 | 1499024 | 1499024 | 1352469–1645580 | 924526–2073522 | — | — | — |
| search-heavy | adhd | 2 | 503054 | 503054 | 452421–553686 | 304575–701532 | -66.4% | 100% | — |
| search-heavy | caveman | 2 | 465450 | 465450 | 414147–516753 | 264342–666558 | -68.9% | 100% | — |
| search-heavy | hush | 2 | 428039 | 428039 | 413135–442942 | 369618–486459 | -71.4% | 100% | — |
| search-heavy | ste | 2 | 631724 | 631724 | 529820–733629 | 232258–1031190 | -57.9% | 100% | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 6170 | 6941 | 4116–8995 | 3311–10571 | — | — | — |
| long-session | adhd | 4 | 5202 | 5277 | 2953–7525 | 2602–7951 | -15.7% | 100% | — |
| long-session | caveman | 4 | 3700 | 4025 | 3082–4643 | 2819–5231 | -40.0% | 100% | — |
| long-session | hush | 4 | 5664 | 5852 | 2936–8579 | 2231–9472 | -8.2% | 100% | — |
| long-session | ste | 4 | 6537 | 6909 | 3771–9675 | 3220–10598 | +6.0% | 50% | feature-drift +2.3% |
| noisy-output | baseline | 6 | 1850 | 1790 | 1436–2124 | 1454–2125 | — | — | — |
| noisy-output | adhd | 6 | 1654 | 1543 | 1063–1703 | 1018–2068 | -10.6% | 67% | failing-suite +62.0% |
| noisy-output | caveman | 6 | 1373 | 1359 | 1198–1543 | 1111–1607 | -25.8% | 67% | failing-suite +7.9% |
| noisy-output | hush | 6 | 1376 | 1346 | 988–1705 | 942–1751 | -25.6% | 67% | failing-suite +6.3% |
| noisy-output | ste | 6 | 1856 | 1908 | 1787–2069 | 1637–2180 | +0.3% | 67% | failing-suite +36.5% |
| search-heavy | baseline | 2 | 11090 | 11090 | 10695–11486 | 9540–12640 | — | — | — |
| search-heavy | adhd | 2 | 6608 | 6608 | 4954–8262 | 124–13092 | -40.4% | 100% | — |
| search-heavy | caveman | 2 | 3856 | 3856 | 3582–4129 | 2782–4929 | -65.2% | 100% | — |
| search-heavy | hush | 2 | 11208 | 11208 | 10711–11704 | 9260–13155 | +1.1% | 0% | repo-sweep +1.1% |
| search-heavy | ste | 2 | 8787 | 8787 | 7687–9886 | 4477–13096 | -20.8% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0 | 26 | 0–26 | -24–75 | — | — | — |
| long-session | adhd | 4 | 110 | 92 | 86–115 | 48–135 | — | 0% | feature-drift +114.7% |
| long-session | caveman | 4 | 11 | 14 | 0–25 | -3–31 | — | 100% | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | — | 100% | — |
| long-session | ste | 4 | 57 | 64 | 15–106 | -1–129 | — | 0% | feature-drift +131.4% |
| noisy-output | baseline | 6 | 28 | 26 | 6–39 | 7–44 | — | — | — |
| noisy-output | adhd | 6 | 25 | 31 | 9–45 | 9–53 | -10.7% | 50% | failing-suite +93.7% |
| noisy-output | caveman | 6 | 10 | 11 | 3–21 | 3–20 | -64.3% | 100% | — |
| noisy-output | hush | 6 | 0 | 1 | 0–0 | -1–4 | -100.0% | 100% | — |
| noisy-output | ste | 6 | 54 | 51 | 31–61 | 25–78 | +91.1% | 0% | dep-bump-warnings +81.5% |
| search-heavy | baseline | 2 | 118 | 118 | 109–128 | 81–155 | — | — | — |
| search-heavy | adhd | 2 | 107 | 107 | 76–137 | -12–225 | -9.7% | 100% | — |
| search-heavy | caveman | 2 | 52 | 52 | 48–57 | 34–70 | -55.9% | 100% | — |
| search-heavy | hush | 2 | 29 | 29 | 28–29 | 28–29 | -75.8% | 100% | — |
| search-heavy | ste | 2 | 85 | 85 | 82–87 | 76–93 | -28.4% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.3940 | 0.3170 | 609685 | 92% | 53 |
| adhd | 12 | 0.3349 | 0.3115 | 444877 | 92% | 47 |
| caveman | 12 | 0.2691 | 0.2901 | 365699 | 100% | 40 |
| hush | 12 | 0.3541 | 0.2911 | 397241 | 100% | 47 |
| ste | 12 | 0.3764 | 0.3194 | 480008 | 100% | 54 |
