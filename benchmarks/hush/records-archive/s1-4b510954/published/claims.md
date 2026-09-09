# hush benchmark — generated claims

Generated from 108 retained run records · batch `s1-4b510954` · model `sonnet` · seed `1787151735289` · arms: baseline, adhd, caveman, combo, hush, nextfact, notrust, parts, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.3732 | 0.4198 | 0.3673–0.4257 | 0.3238–0.5159 | — | — | — |
| long-session | adhd | 4 | 0.4094 | 0.4114 | 0.3191–0.5017 | 0.2997–0.5231 | +9.7% | 50% | feature-drift +9.1% |
| long-session | caveman | 4 | 0.3325 | 0.3373 | 0.2867–0.3831 | 0.2622–0.4124 | -10.9% | 100% | — |
| long-session | combo | 4 | 0.5921 | 0.5496 | 0.5136–0.6281 | 0.3867–0.7125 | +58.7% | 0% | feature-drift +37.4% |
| long-session | hush | 4 | 0.4088 | 0.4052 | 0.3410–0.4730 | 0.3233–0.4870 | +9.6% | 50% | feature-drift +2.2% |
| long-session | nextfact | 4 | 0.4038 | 0.4303 | 0.3482–0.4859 | 0.3135–0.5471 | +8.2% | 50% | feature-drift +11.6% |
| long-session | notrust | 4 | 0.4919 | 0.4779 | 0.3906–0.5792 | 0.3513–0.6046 | +31.8% | 50% | feature-drift +25.5% |
| long-session | parts | 4 | 0.4452 | 0.4230 | 0.3640–0.5042 | 0.3180–0.5280 | +19.3% | 50% | feature-drift +8.9% |
| long-session | ste | 4 | 0.3466 | 0.3562 | 0.3147–0.3881 | 0.3018–0.4106 | -7.1% | 100% | — |
| noisy-output | baseline | 6 | 0.2245 | 0.2414 | 0.2031–0.2894 | 0.1961–0.2867 | — | — | — |
| noisy-output | adhd | 6 | 0.1949 | 0.2261 | 0.1872–0.2761 | 0.1755–0.2768 | -13.2% | 100% | — |
| noisy-output | caveman | 6 | 0.1855 | 0.2031 | 0.1766–0.2120 | 0.1499–0.2563 | -17.4% | 100% | — |
| noisy-output | combo | 6 | 0.2159 | 0.2426 | 0.2102–0.2238 | 0.1876–0.2975 | -3.9% | 67% | failing-suite +15.1% |
| noisy-output | hush | 6 | 0.2128 | 0.2042 | 0.1975–0.2156 | 0.1905–0.2179 | -5.2% | 67% | failing-suite +13.1% |
| noisy-output | nextfact | 6 | 0.2152 | 0.2091 | 0.2150–0.2208 | 0.1910–0.2272 | -4.2% | 67% | failing-suite +13.9% |
| noisy-output | notrust | 6 | 0.2151 | 0.2161 | 0.2099–0.2195 | 0.1993–0.2328 | -4.2% | 33% | failing-suite +11.7% |
| noisy-output | parts | 6 | 0.2104 | 0.2185 | 0.2054–0.2166 | 0.1982–0.2389 | -6.3% | 67% | failing-suite +13.3% |
| noisy-output | ste | 6 | 0.2148 | 0.2425 | 0.2069–0.2861 | 0.1973–0.2877 | -4.3% | 33% | failing-suite +4.9% |
| search-heavy | baseline | 2 | 0.6189 | 0.6189 | 0.6061–0.6318 | 0.5685–0.6693 | — | — | — |
| search-heavy | adhd | 2 | 0.4265 | 0.4265 | 0.3650–0.4879 | 0.1855–0.6674 | -31.1% | 100% | — |
| search-heavy | caveman | 2 | 0.3839 | 0.3839 | 0.3806–0.3873 | 0.3708–0.3971 | -38.0% | 100% | — |
| search-heavy | combo | 2 | 0.5621 | 0.5621 | 0.5152–0.6090 | 0.3782–0.7460 | -9.2% | 100% | — |
| search-heavy | hush | 2 | 0.6270 | 0.6270 | 0.5927–0.6614 | 0.4923–0.7617 | +1.3% | 0% | repo-sweep +1.3% |
| search-heavy | nextfact | 2 | 0.4475 | 0.4475 | 0.3578–0.5372 | 0.0959–0.7992 | -27.7% | 100% | — |
| search-heavy | notrust | 2 | 0.4846 | 0.4846 | 0.4186–0.5507 | 0.2258–0.7434 | -21.7% | 100% | — |
| search-heavy | parts | 2 | 0.7368 | 0.7368 | 0.6876–0.7860 | 0.5439–0.9297 | +19.1% | 0% | repo-sweep +19.1% |
| search-heavy | ste | 2 | 0.6348 | 0.6348 | 0.6253–0.6443 | 0.5975–0.6720 | +2.6% | 0% | repo-sweep +2.6% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 532189 | 569401 | 499347–602243 | 411527–727275 | — | — | — |
| long-session | adhd | 4 | 422951 | 495350 | 391639–526662 | 316846–673854 | -20.5% | 100% | — |
| long-session | caveman | 4 | 518975 | 562509 | 459056–622428 | 376438–748579 | -2.5% | 50% | feature-drift +13.9% |
| long-session | combo | 4 | 771379 | 753115 | 712233–812262 | 596987–909243 | +44.9% | 0% | incident-forensics +38.1% |
| long-session | hush | 4 | 575442 | 580003 | 541610–613835 | 526837–633168 | +8.1% | 0% | feature-drift +2.9% |
| long-session | nextfact | 4 | 558869 | 668949 | 514742–713077 | 416617–921281 | +5.0% | 0% | feature-drift +29.2% |
| long-session | notrust | 4 | 650171 | 633878 | 589178–694871 | 550304–717453 | +22.2% | 0% | incident-forensics +13.9% |
| long-session | parts | 4 | 698631 | 652924 | 630947–720608 | 521198–784650 | +31.3% | 0% | feature-drift +20.9% |
| long-session | ste | 4 | 471653 | 483782 | 443545–511889 | 381500–586063 | -11.4% | 50% | incident-forensics +3.1% |
| noisy-output | baseline | 6 | 259328 | 264784 | 203370–313337 | 205543–324025 | — | — | — |
| noisy-output | adhd | 6 | 238841 | 227081 | 197061–254333 | 200374–253788 | -7.9% | 100% | — |
| noisy-output | caveman | 6 | 242877 | 243705 | 225374–289690 | 179996–307414 | -6.3% | 67% | failing-suite +7.9% |
| noisy-output | combo | 6 | 280118 | 270875 | 258339–292578 | 220791–320958 | +8.0% | 33% | log-triage +39.0% |
| noisy-output | hush | 6 | 265818 | 254675 | 216787–279862 | 218098–291251 | +2.5% | 33% | failing-suite +9.1% |
| noisy-output | nextfact | 6 | 252467 | 243678 | 213408–273232 | 198633–288724 | -2.6% | 100% | — |
| noisy-output | notrust | 6 | 298377 | 279560 | 280486–313663 | 214658–344461 | +15.1% | 33% | failing-suite +20.7% |
| noisy-output | parts | 6 | 252544 | 258248 | 251449–268357 | 246531–269965 | -2.6% | 67% | log-triage +32.4% |
| noisy-output | ste | 6 | 296135 | 266686 | 215677–301137 | 218356–315015 | +14.2% | 33% | failing-suite +19.2% |
| search-heavy | baseline | 2 | 428179 | 428179 | 406738–449620 | 344130–512228 | — | — | — |
| search-heavy | adhd | 2 | 407599 | 407599 | 404712–410487 | 396280–418918 | -4.8% | 100% | — |
| search-heavy | caveman | 2 | 496378 | 496378 | 461283–531472 | 358806–633949 | +15.9% | 0% | repo-sweep +15.9% |
| search-heavy | combo | 2 | 546211 | 546211 | 479549–612872 | 284896–807525 | +27.6% | 0% | repo-sweep +27.6% |
| search-heavy | hush | 2 | 377687 | 377687 | 352070–403304 | 277268–478106 | -11.8% | 100% | — |
| search-heavy | nextfact | 2 | 352592 | 352592 | 344224–360960 | 319789–385395 | -17.7% | 100% | — |
| search-heavy | notrust | 2 | 435913 | 435913 | 384049–487776 | 232607–639218 | +1.8% | 0% | repo-sweep +1.8% |
| search-heavy | parts | 2 | 505615 | 505615 | 486981–524248 | 432570–578659 | +18.1% | 0% | repo-sweep +18.1% |
| search-heavy | ste | 2 | 413306 | 413306 | 382842–443770 | 293887–532725 | -3.5% | 100% | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 6579 | 7210 | 5245–8543 | 4358–10061 | — | — | — |
| long-session | adhd | 4 | 6363 | 6802 | 4618–8547 | 4163–9440 | -3.3% | 100% | — |
| long-session | caveman | 4 | 3422 | 3745 | 3074–4092 | 2748–4741 | -48.0% | 100% | — |
| long-session | combo | 4 | 7055 | 7001 | 3354–10701 | 2497–11504 | +7.2% | 50% | feature-drift +16.4% |
| long-session | hush | 4 | 6028 | 5987 | 3475–8540 | 2715–9259 | -8.4% | 100% | — |
| long-session | nextfact | 4 | 5092 | 5418 | 3167–7343 | 2762–8074 | -22.6% | 100% | — |
| long-session | notrust | 4 | 5628 | 5572 | 3371–7829 | 2904–8239 | -14.4% | 100% | — |
| long-session | parts | 4 | 6019 | 5646 | 3215–8450 | 2395–8897 | -8.5% | 100% | — |
| long-session | ste | 4 | 5403 | 5511 | 5047–5867 | 4218–6804 | -17.9% | 100% | — |
| noisy-output | baseline | 6 | 1632 | 1717 | 1376–2032 | 1365–2069 | — | — | — |
| noisy-output | adhd | 6 | 1548 | 1562 | 1221–1872 | 1249–1874 | -5.2% | 100% | — |
| noisy-output | caveman | 6 | 1186 | 1290 | 1073–1457 | 1052–1528 | -27.4% | 100% | — |
| noisy-output | combo | 6 | 1390 | 1598 | 973–1737 | 910–2287 | -14.8% | 67% | log-triage +26.3% |
| noisy-output | hush | 6 | 1314 | 1418 | 1238–1667 | 1182–1653 | -19.5% | 67% | failing-suite +1.4% |
| noisy-output | nextfact | 6 | 1318 | 1382 | 1192–1655 | 1124–1639 | -19.2% | 100% | — |
| noisy-output | notrust | 6 | 1477 | 1504 | 1385–1870 | 1051–1958 | -9.5% | 67% | failing-suite +7.8% |
| noisy-output | parts | 6 | 1387 | 1381 | 1274–1535 | 1230–1533 | -15.0% | 100% | — |
| noisy-output | ste | 6 | 1697 | 1674 | 1431–1894 | 1351–1997 | +4.0% | 67% | failing-suite +16.5% |
| search-heavy | baseline | 2 | 10290 | 10290 | 10161–10420 | 9782–10798 | — | — | — |
| search-heavy | adhd | 2 | 7648 | 7648 | 6018–9277 | 1261–14034 | -25.7% | 100% | — |
| search-heavy | caveman | 2 | 3521 | 3521 | 2932–4111 | 1210–5832 | -65.8% | 100% | — |
| search-heavy | combo | 2 | 7810 | 7810 | 6293–9326 | 1866–13753 | -24.1% | 100% | — |
| search-heavy | hush | 2 | 10685 | 10685 | 10290–11081 | 9135–12235 | +3.8% | 0% | repo-sweep +3.8% |
| search-heavy | nextfact | 2 | 6471 | 6471 | 4412–8531 | -1602–14544 | -37.1% | 100% | — |
| search-heavy | notrust | 2 | 6474 | 6474 | 4784–8165 | -153–13101 | -37.1% | 100% | — |
| search-heavy | parts | 2 | 11260 | 11260 | 11093–11428 | 10603–11917 | +9.4% | 0% | repo-sweep +9.4% |
| search-heavy | ste | 2 | 10234 | 10234 | 10166–10301 | 9970–10497 | -0.5% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0 | 29 | 0–29 | -28–85 | — | — | — |
| long-session | adhd | 4 | 24 | 40 | 0–64 | -12–91 | — | 0% | feature-drift +38.3% |
| long-session | caveman | 4 | 3 | 17 | 0–19 | -13–46 | — | 100% | — |
| long-session | combo | 4 | 0 | 0 | 0–0 | 0–0 | — | 100% | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | — | 100% | — |
| long-session | nextfact | 4 | 0 | 0 | 0–0 | 0–0 | — | 100% | — |
| long-session | notrust | 4 | 0 | 0 | 0–0 | 0–0 | — | 100% | — |
| long-session | parts | 4 | 0 | 0 | 0–0 | 0–0 | — | 100% | — |
| long-session | ste | 4 | 0 | 15 | 0–15 | -15–45 | — | 100% | — |
| noisy-output | baseline | 6 | 39 | 38 | 19–60 | 15–61 | — | — | — |
| noisy-output | adhd | 6 | 43 | 39 | 11–60 | 12–65 | +9.0% | 67% | failing-suite +37.2% |
| noisy-output | caveman | 6 | 16 | 16 | 3–21 | 3–30 | -60.3% | 100% | — |
| noisy-output | combo | 6 | 5 | 11 | 0–21 | 0–21 | -87.2% | 100% | — |
| noisy-output | hush | 6 | 0 | 1 | 0–0 | -1–2 | -100.0% | 100% | — |
| noisy-output | nextfact | 6 | 0 | 4 | 0–8 | -1–9 | -100.0% | 100% | — |
| noisy-output | notrust | 6 | 8 | 10 | 0–19 | 1–18 | -80.8% | 67% | log-triage +11.1% |
| noisy-output | parts | 6 | 6 | 7 | 0–13 | 1–12 | -84.6% | 100% | — |
| noisy-output | ste | 6 | 39 | 42 | 32–49 | 18–66 | +0.0% | 33% | log-triage +72.2% |
| search-heavy | baseline | 2 | 110 | 110 | 96–123 | 58–161 | — | — | — |
| search-heavy | adhd | 2 | 109 | 109 | 93–126 | 44–174 | -0.5% | 100% | — |
| search-heavy | caveman | 2 | 58 | 58 | 42–75 | -7–123 | -47.0% | 100% | — |
| search-heavy | combo | 2 | 30 | 30 | 27–32 | 19–40 | -73.1% | 100% | — |
| search-heavy | hush | 2 | 41 | 41 | 38–43 | 32–49 | -63.0% | 100% | — |
| search-heavy | nextfact | 2 | 28 | 28 | 23–32 | 11–44 | -74.9% | 100% | — |
| search-heavy | notrust | 2 | 19 | 19 | 15–24 | 1–37 | -82.6% | 100% | — |
| search-heavy | parts | 2 | 23 | 23 | 20–26 | 11–35 | -79.0% | 100% | — |
| search-heavy | ste | 2 | 58 | 58 | 57–60 | 52–64 | -47.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 12 | 0.3638 | 0.3397 | 393556 | 100% | 51 |
| adhd | 12 | 0.3213 | 0.3033 | 346591 | 100% | 40 |
| caveman | 12 | 0.2780 | 0.2763 | 392085 | 100% | 33 |
| combo | 12 | 0.3982 | 0.3475 | 477511 | 100% | 58 |
| hush | 12 | 0.3417 | 0.2680 | 383619 | 100% | 39 |
| nextfact | 12 | 0.3226 | 0.2456 | 403588 | 100% | 33 |
| notrust | 12 | 0.3481 | 0.2902 | 423725 | 100% | 40 |
| parts | 12 | 0.3731 | 0.2774 | 431034 | 100% | 36 |
| ste | 12 | 0.3458 | 0.3138 | 363488 | 100% | 46 |
