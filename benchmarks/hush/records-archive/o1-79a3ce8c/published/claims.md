# hush benchmark — generated claims

Generated from 72 retained run records · batch `o1-79a3ce8c` · model `opus` · seed `1787151737789` · arms: baseline, combo, hush, nextfact, notrust, parts.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.9886 | 1.0058 | 0.9521–1.0423 | 0.9127–1.0989 | — | — | — |
| long-session | combo | 4 | 1.0007 | 1.0290 | 0.8998–1.1298 | 0.8081–1.2500 | +1.2% | 50% | feature-drift +6.6% |
| long-session | hush | 4 | 0.9818 | 1.0148 | 0.9472–1.0494 | 0.8587–1.1709 | -0.7% | 50% | feature-drift +4.6% |
| long-session | nextfact | 4 | 0.9833 | 0.9365 | 0.8841–1.0356 | 0.7972–1.0757 | -0.5% | 100% | — |
| long-session | notrust | 4 | 1.1449 | 1.1651 | 1.0638–1.2462 | 1.0258–1.3045 | +15.8% | 0% | incident-forensics +19.1% |
| long-session | parts | 4 | 1.0206 | 1.0213 | 0.9065–1.1354 | 0.8254–1.2171 | +3.2% | 50% | feature-drift +8.9% |
| noisy-output | baseline | 6 | 0.3858 | 0.4213 | 0.3424–0.5161 | 0.3350–0.5076 | — | — | — |
| noisy-output | combo | 6 | 0.3423 | 0.3571 | 0.3376–0.3499 | 0.3257–0.3885 | -11.3% | 100% | — |
| noisy-output | hush | 6 | 0.3359 | 0.3842 | 0.3319–0.4126 | 0.3120–0.4565 | -12.9% | 100% | — |
| noisy-output | nextfact | 6 | 0.3670 | 0.4295 | 0.3385–0.4918 | 0.3241–0.5348 | -4.9% | 33% | failing-suite +7.2% |
| noisy-output | notrust | 6 | 0.3544 | 0.4015 | 0.3273–0.4151 | 0.3028–0.5003 | -8.1% | 100% | — |
| noisy-output | parts | 6 | 0.3347 | 0.3828 | 0.3154–0.4240 | 0.3023–0.4633 | -13.3% | 100% | — |
| search-heavy | baseline | 2 | 0.4870 | 0.4870 | 0.4862–0.4879 | 0.4836–0.4905 | — | — | — |
| search-heavy | combo | 2 | 0.4924 | 0.4924 | 0.4917–0.4931 | 0.4896–0.4951 | +1.1% | 0% | repo-sweep +1.1% |
| search-heavy | hush | 2 | 0.4605 | 0.4605 | 0.4473–0.4737 | 0.4087–0.5122 | -5.5% | 100% | — |
| search-heavy | nextfact | 2 | 0.4634 | 0.4634 | 0.4439–0.4828 | 0.3872–0.5395 | -4.9% | 100% | — |
| search-heavy | notrust | 2 | 0.4743 | 0.4743 | 0.4615–0.4871 | 0.4242–0.5245 | -2.6% | 100% | — |
| search-heavy | parts | 2 | 0.5468 | 0.5468 | 0.4984–0.5952 | 0.3569–0.7366 | +12.3% | 0% | repo-sweep +12.3% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 739871 | 779004 | 708379–810496 | 672810–885197 | — | — | — |
| long-session | combo | 4 | 1006828 | 913437 | 870505–1049760 | 640534–1186339 | +36.1% | 0% | feature-drift +18.2% |
| long-session | hush | 4 | 864599 | 842400 | 775817–931181 | 727076–957724 | +16.9% | 0% | incident-forensics +16.2% |
| long-session | nextfact | 4 | 716700 | 693989 | 650858–759831 | 584492–803486 | -3.1% | 50% | incident-forensics +1.5% |
| long-session | notrust | 4 | 987231 | 985617 | 910937–1061910 | 843293–1127940 | +33.4% | 0% | incident-forensics +39.4% |
| long-session | parts | 4 | 856418 | 905949 | 795062–967304 | 746793–1065104 | +15.8% | 0% | incident-forensics +19.7% |
| noisy-output | baseline | 6 | 268845 | 267160 | 215918–315654 | 221571–312750 | — | — | — |
| noisy-output | combo | 6 | 231791 | 231446 | 220862–243692 | 220170–242722 | -13.8% | 100% | — |
| noisy-output | hush | 6 | 228799 | 233853 | 219546–241884 | 217150–250556 | -14.9% | 100% | — |
| noisy-output | nextfact | 6 | 264881 | 275664 | 218264–333529 | 223786–327541 | -1.5% | 33% | log-triage +22.4% |
| noisy-output | notrust | 6 | 238139 | 242032 | 228077–254650 | 222974–261091 | -11.4% | 100% | — |
| noisy-output | parts | 6 | 221605 | 225425 | 213366–228630 | 212258–238593 | -17.6% | 100% | — |
| search-heavy | baseline | 2 | 342796 | 342796 | 336640–348951 | 318665–366926 | — | — | — |
| search-heavy | combo | 2 | 328326 | 328326 | 320728–335923 | 298544–358107 | -4.2% | 100% | — |
| search-heavy | hush | 2 | 309733 | 309733 | 307990–311475 | 302901–316564 | -9.6% | 100% | — |
| search-heavy | nextfact | 2 | 319753 | 319753 | 298690–340815 | 237187–402318 | -6.7% | 100% | — |
| search-heavy | notrust | 2 | 319573 | 319573 | 289232–349913 | 200639–438506 | -6.8% | 100% | — |
| search-heavy | parts | 2 | 411442 | 411442 | 337134–485750 | 120155–702729 | +20.0% | 0% | repo-sweep +20.0% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 11652 | 12446 | 7900–16198 | 7026–17865 | — | — | — |
| long-session | combo | 4 | 10847 | 10985 | 9923–11909 | 7937–14033 | -6.9% | 50% | feature-drift +15.8% |
| long-session | hush | 4 | 9754 | 10964 | 9417–11301 | 7704–14224 | -16.3% | 50% | feature-drift +16.4% |
| long-session | nextfact | 4 | 9353 | 9565 | 5679–13239 | 5117–14013 | -19.7% | 100% | — |
| long-session | notrust | 4 | 13599 | 12958 | 10146–16411 | 8618–17298 | +16.7% | 50% | feature-drift +19.1% |
| long-session | parts | 4 | 10423 | 9983 | 8698–11708 | 7262–12704 | -10.5% | 50% | feature-drift +1.2% |
| noisy-output | baseline | 6 | 4049 | 4508 | 3030–4702 | 2672–6345 | — | — | — |
| noisy-output | combo | 6 | 2599 | 2395 | 1809–2973 | 1829–2960 | -35.8% | 100% | — |
| noisy-output | hush | 6 | 2391 | 2292 | 1747–2498 | 1714–2871 | -41.0% | 100% | — |
| noisy-output | nextfact | 6 | 2824 | 2604 | 1862–3244 | 1915–3294 | -30.3% | 100% | — |
| noisy-output | notrust | 6 | 2808 | 2870 | 1569–3533 | 1610–4130 | -30.6% | 100% | — |
| noisy-output | parts | 6 | 1851 | 1975 | 1572–2136 | 1514–2436 | -54.3% | 100% | — |
| search-heavy | baseline | 2 | 5130 | 5130 | 5022–5237 | 4707–5552 | — | — | — |
| search-heavy | combo | 2 | 3159 | 3159 | 3153–3165 | 3135–3183 | -38.4% | 100% | — |
| search-heavy | hush | 2 | 3268 | 3268 | 3212–3325 | 3047–3489 | -36.3% | 100% | — |
| search-heavy | nextfact | 2 | 3624 | 3624 | 3454–3795 | 2956–4292 | -29.3% | 100% | — |
| search-heavy | notrust | 2 | 3607 | 3607 | 3476–3737 | 3094–4119 | -29.7% | 100% | — |
| search-heavy | parts | 2 | 3845 | 3845 | 3514–4176 | 2547–5143 | -25.0% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 13 | 14 | 7–19 | 6–22 | — | — | — |
| long-session | combo | 4 | 3 | 3 | 0–6 | -0–7 | -76.0% | 100% | — |
| long-session | hush | 4 | 6 | 5 | 4–7 | 2–8 | -52.0% | 50% | feature-drift +7.1% |
| long-session | nextfact | 4 | 6 | 5 | 4–7 | 2–8 | -52.0% | 100% | — |
| long-session | notrust | 4 | 4 | 4 | 0–7 | -0–7 | -72.0% | 100% | — |
| long-session | parts | 4 | 4 | 4 | 0–7 | -1–8 | -72.0% | 50% | feature-drift +7.1% |
| noisy-output | baseline | 6 | 58 | 70 | 47–87 | 29–111 | — | — | — |
| noisy-output | combo | 6 | 4 | 5 | 0–9 | 0–9 | -94.0% | 100% | — |
| noisy-output | hush | 6 | 8 | 7 | 6–8 | 6–8 | -87.1% | 100% | — |
| noisy-output | nextfact | 6 | 8 | 8 | 6–8 | 6–9 | -87.1% | 100% | — |
| noisy-output | notrust | 6 | 7 | 7 | 6–7 | 5–9 | -88.8% | 100% | — |
| noisy-output | parts | 6 | 7 | 8 | 6–9 | 6–9 | -87.9% | 100% | — |
| search-heavy | baseline | 2 | 113 | 113 | 106–121 | 84–142 | — | — | — |
| search-heavy | combo | 2 | 6 | 6 | 6–6 | 6–6 | -94.7% | 100% | — |
| search-heavy | hush | 2 | 10 | 10 | 10–10 | 10–10 | -91.2% | 100% | — |
| search-heavy | nextfact | 2 | 10 | 10 | 9–10 | 9–10 | -91.6% | 100% | — |
| search-heavy | notrust | 2 | 6 | 6 | 6–7 | 4–8 | -94.7% | 100% | — |
| search-heavy | parts | 2 | 6 | 6 | 6–6 | 6–6 | -94.7% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.6271 | 0.5216 | 450381 | 100% | 76 |
| combo | 12 | 0.6036 | 0.4636 | 474923 | 100% | 50 |
| hush | 12 | 0.6071 | 0.4624 | 449349 | 100% | 48 |
| nextfact | 12 | 0.6041 | 0.5132 | 422454 | 92% | 58 |
| notrust | 12 | 0.6682 | 0.4743 | 502817 | 100% | 57 |
| parts | 12 | 0.6230 | 0.5048 | 483269 | 92% | 49 |
