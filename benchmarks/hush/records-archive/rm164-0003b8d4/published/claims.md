# hush benchmark — generated claims

Generated from 60 retained run records · batch `rm164-0003b8d4` · model `sonnet` · seed `1787201216892` · arms: baseline, adhd, caveman, hush, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.5251 | 0.4945 | 0.4713–0.5482 | 0.3998–0.5892 | — | — | — |
| long-session | adhd | 4 | 0.4010 | 0.4235 | 0.3949–0.4295 | 0.3648–0.4821 | -23.6% | 100% | — |
| long-session | caveman | 4 | 0.3865 | 0.4072 | 0.3230–0.4707 | 0.2705–0.5440 | -26.4% | 50% | feature-drift +0.5% |
| long-session | hush | 4 | 0.5196 | 0.5342 | 0.4045–0.6493 | 0.3800–0.6883 | -1.0% | 50% | feature-drift +43.9% |
| long-session | ste | 4 | 0.5448 | 0.5478 | 0.4588–0.6338 | 0.3697–0.7258 | +3.8% | 50% | incident-forensics +29.3% |
| noisy-output | baseline | 6 | 0.1827 | 0.2417 | 0.1688–0.2940 | 0.1523–0.3311 | — | — | — |
| noisy-output | adhd | 6 | 0.2286 | 0.2467 | 0.2138–0.2903 | 0.2033–0.2900 | +25.1% | 33% | dep-bump-warnings +40.0% |
| noisy-output | caveman | 6 | 0.2164 | 0.2500 | 0.1941–0.2781 | 0.1774–0.3225 | +18.4% | 33% | dep-bump-warnings +15.4% |
| noisy-output | hush | 6 | 0.2017 | 0.2155 | 0.2006–0.2038 | 0.1821–0.2488 | +10.4% | 33% | dep-bump-warnings +23.4% |
| noisy-output | ste | 6 | 0.1904 | 0.2214 | 0.1754–0.2688 | 0.1719–0.2709 | +4.2% | 67% | dep-bump-warnings +15.7% |
| search-heavy | baseline | 2 | 0.6418 | 0.6418 | 0.6253–0.6584 | 0.5769–0.7067 | — | — | — |
| search-heavy | adhd | 2 | 0.6178 | 0.6178 | 0.6165–0.6192 | 0.6126–0.6231 | -3.7% | 100% | — |
| search-heavy | caveman | 2 | 0.5556 | 0.5556 | 0.5196–0.5916 | 0.4145–0.6967 | -13.4% | 100% | — |
| search-heavy | hush | 2 | 0.6160 | 0.6160 | 0.6138–0.6182 | 0.6074–0.6246 | -4.0% | 100% | — |
| search-heavy | ste | 2 | 0.5190 | 0.5190 | 0.5094–0.5285 | 0.4816–0.5564 | -19.1% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 721875 | 669465 | 605132–786207 | 465232–873697 | — | — | — |
| long-session | adhd | 4 | 506902 | 509005 | 373729–642178 | 340461–677549 | -29.8% | 100% | — |
| long-session | caveman | 4 | 557239 | 661464 | 381870–836832 | 297822–1025106 | -22.8% | 50% | feature-drift +25.2% |
| long-session | hush | 4 | 758051 | 756853 | 651436–863468 | 626648–887059 | +5.0% | 50% | feature-drift +41.1% |
| long-session | ste | 4 | 684277 | 727862 | 557369–854770 | 374580–1081144 | -5.2% | 50% | incident-forensics +34.6% |
| noisy-output | baseline | 6 | 199326 | 206294 | 196528–214941 | 192233–220356 | — | — | — |
| noisy-output | adhd | 6 | 231390 | 243638 | 215753–264377 | 209788–277489 | +16.1% | 0% | dep-bump-warnings +44.0% |
| noisy-output | caveman | 6 | 204070 | 209745 | 159186–257853 | 162003–257486 | +2.4% | 33% | dep-bump-warnings +15.6% |
| noisy-output | hush | 6 | 220120 | 193635 | 139445–241131 | 142478–244791 | +10.4% | 33% | dep-bump-warnings +21.6% |
| noisy-output | ste | 6 | 197801 | 193964 | 176460–216023 | 166036–221892 | -0.8% | 67% | dep-bump-warnings +12.4% |
| search-heavy | baseline | 2 | 374558 | 374558 | 345193–403924 | 259445–489671 | — | — | — |
| search-heavy | adhd | 2 | 335475 | 335475 | 327575–343374 | 304509–366440 | -10.4% | 100% | — |
| search-heavy | caveman | 2 | 287649 | 287649 | 283715–291583 | 272228–303070 | -23.2% | 100% | — |
| search-heavy | hush | 2 | 343759 | 343759 | 323843–363674 | 265689–421828 | -8.2% | 100% | — |
| search-heavy | ste | 2 | 288639 | 288639 | 278454–298824 | 248714–328564 | -22.9% | 100% | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 6008 | 6020 | 4284–7744 | 3919–8120 | — | — | — |
| long-session | adhd | 4 | 6730 | 7099 | 4533–9296 | 3891–10307 | +12.0% | 0% | feature-drift +25.0% |
| long-session | caveman | 4 | 4269 | 4465 | 3659–5075 | 2984–5946 | -29.0% | 100% | — |
| long-session | hush | 4 | 8229 | 8905 | 3952–13181 | 3062–14748 | +37.0% | 50% | feature-drift +77.4% |
| long-session | ste | 4 | 6653 | 7043 | 5634–8061 | 4585–9500 | +10.7% | 0% | incident-forensics +25.6% |
| noisy-output | baseline | 6 | 1593 | 1688 | 1462–1720 | 1329–2048 | — | — | — |
| noisy-output | adhd | 6 | 1366 | 1552 | 1306–1838 | 1274–1830 | -14.2% | 67% | dep-bump-warnings +16.6% |
| noisy-output | caveman | 6 | 1350 | 1330 | 897–1645 | 928–1733 | -15.2% | 67% | dep-bump-warnings +8.5% |
| noisy-output | hush | 6 | 1189 | 1159 | 840–1520 | 790–1527 | -25.4% | 100% | — |
| noisy-output | ste | 6 | 1560 | 1547 | 1246–1851 | 1276–1817 | -2.1% | 67% | dep-bump-warnings +8.4% |
| search-heavy | baseline | 2 | 10392 | 10392 | 10361–10422 | 10271–10512 | — | — | — |
| search-heavy | adhd | 2 | 10271 | 10271 | 10195–10346 | 9976–10565 | -1.2% | 100% | — |
| search-heavy | caveman | 2 | 10275 | 10275 | 10187–10364 | 9928–10622 | -1.1% | 100% | — |
| search-heavy | hush | 2 | 9906 | 9906 | 9418–10394 | 7993–11819 | -4.7% | 100% | — |
| search-heavy | ste | 2 | 10217 | 10217 | 10010–10423 | 9408–11025 | -1.7% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 68 | 84 | 19–133 | 5–163 | — | — | — |
| long-session | adhd | 4 | 25 | 25 | 0–49 | -3–53 | -64.0% | 50% | incident-forensics +36.1% |
| long-session | caveman | 4 | 23 | 20 | 12–31 | 5–36 | -66.2% | 100% | — |
| long-session | hush | 4 | 0 | 5 | 0–5 | -5–15 | -100.0% | 100% | — |
| long-session | ste | 4 | 23 | 28 | 14–37 | 1–56 | -66.2% | 50% | incident-forensics +138.9% |
| noisy-output | baseline | 6 | 36 | 34 | 8–55 | 10–59 | — | — | — |
| noisy-output | adhd | 6 | 33 | 37 | 4–56 | 6–69 | -8.3% | 50% | dep-bump-warnings +47.5% |
| noisy-output | caveman | 6 | 8 | 11 | 0–21 | 1–22 | -79.2% | 100% | — |
| noisy-output | hush | 6 | 0 | 4 | 0–8 | -1–10 | -100.0% | 100% | — |
| noisy-output | ste | 6 | 29 | 33 | 5–46 | 5–60 | -20.8% | 50% | dep-bump-warnings +36.6% |
| search-heavy | baseline | 2 | 57 | 57 | 55–60 | 47–67 | — | — | — |
| search-heavy | adhd | 2 | 69 | 69 | 68–69 | 68–69 | +20.2% | 0% | repo-sweep +20.2% |
| search-heavy | caveman | 2 | 23 | 23 | 21–24 | 18–27 | -60.5% | 100% | — |
| search-heavy | hush | 2 | 31 | 31 | 15–46 | -29–90 | -46.5% | 100% | — |
| search-heavy | ste | 2 | 78 | 78 | 62–95 | 13–143 | +36.8% | 0% | repo-sweep +36.8% |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.3927 | 0.3925 | 388728 | 100% | 48 |
| adhd | 12 | 0.3675 | 0.3488 | 347400 | 100% | 50 |
| caveman | 12 | 0.3533 | 0.3190 | 373302 | 100% | 39 |
| hush | 12 | 0.3885 | 0.3460 | 406395 | 100% | 48 |
| ste | 12 | 0.3798 | 0.3207 | 387709 | 100% | 46 |
