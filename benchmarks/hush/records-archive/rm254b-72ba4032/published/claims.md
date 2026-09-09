# hush benchmark — generated claims

Generated from 96 retained run records · batch `rm254b-72ba4032` · model `sonnet` · seed `1787258322601` · arms: baseline, adhd, caveman, concise, hush, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.4836 | 0.4809 | 0.4213–0.5431 | 0.3857–0.5760 | — | — | — |
| long-session | adhd | 4 | 0.4160 | 0.4417 | 0.3906–0.4671 | 0.3588–0.5245 | -14.0% | 50% | incident-forensics +4.3% |
| long-session | caveman | 4 | 0.5514 | 0.5329 | 0.4604–0.6238 | 0.4139–0.6518 | +14.0% | 50% | incident-forensics +32.0% |
| long-session | concise | 4 | 0.4570 | 0.4332 | 0.4033–0.4869 | 0.3417–0.5246 | -5.5% | 100% | — |
| long-session | hush | 4 | 0.6293 | 0.5873 | 0.5781–0.6385 | 0.4967–0.6779 | +30.1% | 0% | feature-drift +32.2% |
| long-session | ste | 4 | 0.4747 | 0.4690 | 0.4061–0.5376 | 0.3867–0.5513 | -1.8% | 50% | incident-forensics +13.0% |
| noisy-output | baseline | 8 | 0.2644 | 0.3813 | 0.2181–0.4791 | 0.2122–0.5505 | — | — | — |
| noisy-output | adhd | 8 | 0.2524 | 0.3560 | 0.1978–0.4711 | 0.2037–0.5084 | -4.5% | 75% | log-triage +3.3% |
| noisy-output | caveman | 8 | 0.2371 | 0.3011 | 0.1722–0.3780 | 0.1831–0.4191 | -10.3% | 100% | — |
| noisy-output | concise | 8 | 0.2425 | 0.2788 | 0.1802–0.3275 | 0.1906–0.3671 | -8.3% | 100% | — |
| noisy-output | hush | 8 | 0.2269 | 0.2847 | 0.2182–0.3226 | 0.2115–0.3580 | -14.2% | 50% | failing-suite +7.2% |
| noisy-output | ste | 8 | 0.2603 | 0.3764 | 0.1729–0.3938 | 0.1672–0.5856 | -1.5% | 75% | release-digest +11.2% |
| search-heavy | baseline | 4 | 0.4219 | 0.4430 | 0.2841–0.5809 | 0.2536–0.6325 | — | — | — |
| search-heavy | adhd | 4 | 0.3812 | 0.3797 | 0.2030–0.5579 | 0.1685–0.5909 | -9.7% | 100% | — |
| search-heavy | caveman | 4 | 0.3811 | 0.3887 | 0.2236–0.5462 | 0.1940–0.5835 | -9.7% | 100% | — |
| search-heavy | concise | 4 | 0.3252 | 0.3331 | 0.1655–0.4928 | 0.1267–0.5395 | -22.9% | 100% | — |
| search-heavy | hush | 4 | 0.4605 | 0.4291 | 0.3088–0.5808 | 0.2385–0.6197 | +9.1% | 100% | — |
| search-heavy | ste | 4 | 0.3909 | 0.4049 | 0.2146–0.5812 | 0.1761–0.6336 | -7.3% | 100% | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 846170 | 810466 | 755568–901069 | 640291–980642 | — | — | — |
| long-session | adhd | 4 | 697331 | 696464 | 648053–745743 | 633564–759364 | -17.6% | 100% | — |
| long-session | caveman | 4 | 847220 | 820817 | 803835–864201 | 755252–886381 | +0.1% | 50% | incident-forensics +17.2% |
| long-session | concise | 4 | 759573 | 700348 | 666701–793220 | 545351–855345 | -10.2% | 100% | — |
| long-session | hush | 4 | 1025523 | 995098 | 866699–1153922 | 791761–1198435 | +21.2% | 0% | feature-drift +29.6% |
| long-session | ste | 4 | 736044 | 739064 | 705866–769242 | 697819–780310 | -13.0% | 50% | incident-forensics +3.3% |
| noisy-output | baseline | 8 | 275493 | 315487 | 205038–373151 | 194163–436810 | — | — | — |
| noisy-output | adhd | 8 | 230838 | 305882 | 220172–317803 | 181474–430289 | -16.2% | 50% | log-triage +20.8% |
| noisy-output | caveman | 8 | 204844 | 245573 | 197779–257424 | 177051–314094 | -25.6% | 75% | log-triage +27.3% |
| noisy-output | concise | 8 | 214735 | 214213 | 181422–237593 | 173194–255231 | -22.1% | 75% | log-triage +1.2% |
| noisy-output | hush | 8 | 272196 | 286658 | 236454–310012 | 205031–368285 | -1.2% | 50% | log-triage +17.3% |
| noisy-output | ste | 8 | 238834 | 328195 | 185229–350751 | 161428–494963 | -13.3% | 50% | release-digest +22.9% |
| search-heavy | baseline | 4 | 315442 | 325306 | 283151–357596 | 229399–421212 | — | — | — |
| search-heavy | adhd | 4 | 270965 | 261631 | 218004–314592 | 184378–338883 | -14.1% | 100% | — |
| search-heavy | caveman | 4 | 261457 | 254495 | 226823–289129 | 194550–314439 | -17.1% | 100% | — |
| search-heavy | concise | 4 | 195994 | 198499 | 147999–246494 | 109830–287168 | -37.9% | 100% | — |
| search-heavy | hush | 4 | 352167 | 345253 | 268418–429002 | 210134–480372 | +11.6% | 50% | rename-scope +24.8% |
| search-heavy | ste | 4 | 264212 | 268366 | 165486–367092 | 151547–385185 | -16.2% | 100% | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 39409 | 43172 | 37394–45187 | 33045–53299 | — | — | — |
| long-session | adhd | 4 | 37319 | 41905 | 35056–44169 | 30822–52988 | -5.3% | 50% | incident-forensics +1.6% |
| long-session | caveman | 4 | 50272 | 50790 | 39951–61111 | 36661–64918 | +27.6% | 0% | incident-forensics +30.5% |
| long-session | concise | 4 | 40003 | 43103 | 38500–44606 | 34230–51976 | +1.5% | 50% | feature-drift +4.8% |
| long-session | hush | 4 | 46812 | 48525 | 43872–51466 | 42514–54536 | +18.8% | 0% | feature-drift +22.6% |
| long-session | ste | 4 | 46233 | 46607 | 36019–56820 | 34153–59060 | +17.3% | 50% | incident-forensics +19.5% |
| noisy-output | baseline | 8 | 40647 | 41812 | 33630–46568 | 34988–48636 | — | — | — |
| noisy-output | adhd | 8 | 36924 | 42166 | 33166–49223 | 34133–50199 | -9.2% | 75% | release-digest +11.1% |
| noisy-output | caveman | 8 | 41515 | 43762 | 33795–53596 | 35906–51618 | +2.1% | 25% | log-triage +8.6% |
| noisy-output | concise | 8 | 40774 | 41285 | 33071–47931 | 34965–47604 | +0.3% | 75% | log-triage +1.2% |
| noisy-output | hush | 8 | 36439 | 38791 | 36214–38384 | 35469–42112 | -10.4% | 50% | failing-suite +9.9% |
| noisy-output | ste | 8 | 40776 | 44630 | 33146–50914 | 34599–54661 | +0.3% | 50% | release-digest +23.4% |
| search-heavy | baseline | 4 | 37170 | 38953 | 36151–39971 | 34650–43255 | — | — | — |
| search-heavy | adhd | 4 | 35845 | 35633 | 33474–38004 | 32835–38430 | -3.6% | 100% | — |
| search-heavy | caveman | 4 | 37459 | 37434 | 35016–39877 | 34635–40233 | +0.8% | 100% | — |
| search-heavy | concise | 4 | 35430 | 35196 | 32747–37878 | 31861–38530 | -4.7% | 100% | — |
| search-heavy | hush | 4 | 39456 | 39313 | 37666–41103 | 36397–42228 | +6.2% | 50% | rename-scope +2.4% |
| search-heavy | ste | 4 | 35569 | 36110 | 33097–38582 | 32541–39679 | -4.3% | 100% | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 4740 | 4555 | 4479–4816 | 4044–5066 | — | — | — |
| long-session | adhd | 4 | 4651 | 4787 | 4456–4982 | 4057–5517 | -1.9% | 50% | incident-forensics +22.5% |
| long-session | caveman | 4 | 3421 | 3580 | 3279–3721 | 3109–4050 | -27.8% | 100% | — |
| long-session | concise | 4 | 3350 | 3363 | 2980–3733 | 2913–3812 | -29.3% | 100% | — |
| long-session | hush | 4 | 4111 | 4239 | 3268–5082 | 3050–5428 | -13.3% | 50% | feature-drift +8.2% |
| long-session | ste | 4 | 4054 | 4035 | 3993–4096 | 3949–4121 | -14.5% | 100% | — |
| noisy-output | baseline | 8 | 1928 | 5988 | 1524–5862 | 398–11578 | — | — | — |
| noisy-output | adhd | 8 | 1775 | 4319 | 1485–3704 | 552–8086 | -7.9% | 50% | log-triage +13.6% |
| noisy-output | caveman | 8 | 1229 | 3023 | 1045–3252 | 587–5458 | -36.3% | 100% | — |
| noisy-output | concise | 8 | 1374 | 2553 | 1065–2764 | 852–4253 | -28.7% | 100% | — |
| noisy-output | hush | 8 | 1749 | 2971 | 1316–3050 | 1050–4892 | -9.3% | 75% | log-triage +6.1% |
| noisy-output | ste | 8 | 1607 | 5184 | 1379–4169 | 14–10353 | -16.7% | 75% | log-triage +13.8% |
| search-heavy | baseline | 4 | 7393 | 7204 | 4774–9823 | 4215–10193 | — | — | — |
| search-heavy | adhd | 4 | 6164 | 6198 | 2707–9655 | 2091–10306 | -16.6% | 100% | — |
| search-heavy | caveman | 4 | 6705 | 6567 | 3475–9797 | 2850–10283 | -9.3% | 50% | repo-sweep +0.1% |
| search-heavy | concise | 4 | 5851 | 5745 | 1888–9708 | 1196–10294 | -20.9% | 100% | — |
| search-heavy | hush | 4 | 7083 | 6973 | 3883–10173 | 2781–11164 | -4.2% | 50% | repo-sweep +7.5% |
| search-heavy | ste | 4 | 7938 | 7574 | 4450–11063 | 3451–11697 | +7.4% | 50% | repo-sweep +13.5% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 25 | 27 | 17–35 | 3–51 | — | — | — |
| long-session | adhd | 4 | 8 | 24 | 6–26 | -12–59 | -67.3% | 50% | incident-forensics +30.0% |
| long-session | caveman | 4 | 15 | 15 | 8–23 | 2–28 | -38.8% | 100% | — |
| long-session | concise | 4 | 5 | 6 | 0–10 | -1–12 | -81.6% | 100% | — |
| long-session | hush | 4 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| long-session | ste | 4 | 14 | 17 | 5–25 | -0–34 | -44.9% | 100% | — |
| noisy-output | baseline | 8 | 76 | 73 | 21–95 | 27–118 | — | — | — |
| noisy-output | adhd | 8 | 51 | 64 | 16–65 | 11–116 | -33.6% | 100% | — |
| noisy-output | caveman | 8 | 10 | 12 | 0–20 | 3–21 | -87.5% | 100% | — |
| noisy-output | concise | 8 | 38 | 36 | 0–53 | 11–62 | -50.7% | 100% | — |
| noisy-output | hush | 8 | 0 | 4 | 0–3 | -1–9 | -100.0% | 100% | — |
| noisy-output | ste | 8 | 36 | 38 | 14–68 | 17–59 | -52.6% | 100% | — |
| search-heavy | baseline | 4 | 60 | 57 | 37–79 | 24–90 | — | — | — |
| search-heavy | adhd | 4 | 59 | 56 | 13–103 | 2–111 | -0.8% | 50% | repo-sweep +24.6% |
| search-heavy | caveman | 4 | 13 | 16 | 0–29 | -3–35 | -78.2% | 100% | — |
| search-heavy | concise | 4 | 21 | 32 | 0–53 | -8–72 | -64.7% | 100% | — |
| search-heavy | hush | 4 | 17 | 17 | 0–33 | -2–36 | -72.3% | 100% | — |
| search-heavy | ste | 4 | 41 | 39 | 8–72 | 1–77 | -31.1% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.4217 | 0.3898 | 441686 | 100% | 61 |
| adhd | 16 | 0.3834 | 0.3845 | 392465 | 100% | 52 |
| caveman | 16 | 0.3809 | 0.3509 | 391614 | 100% | 54 |
| concise | 16 | 0.3310 | 0.2953 | 331818 | 100% | 39 |
| hush | 16 | 0.3965 | 0.3629 | 478417 | 100% | 61 |
| ste | 16 | 0.4067 | 0.3388 | 415955 | 100% | 60 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | adhd | caveman | concise | hush | ste |
|---|---|---|---|---|---|---|---|---|
| feature-drift | long-session | 1017 | 0.4836 | 0.3845 | 0.4347 | 0.4570 | 0.6395 | 0.3975 |
| failing-suite | noisy-output | 1401 | 0.1982 | 0.1767 | 0.1765 | 0.1734 | 0.2125 | 0.1708 |
| dep-bump-warnings | noisy-output | 2178 | 0.2238 | 0.2079 | 0.1619 | 0.1852 | 0.2259 | 0.2006 |
| incident-forensics | long-session | 2657 | 0.4782 | 0.4988 | 0.6310 | 0.4093 | 0.5352 | 0.5405 |
| rename-scope | search-heavy | 3281 | 0.2797 | 0.1939 | 0.2179 | 0.1537 | 0.2701 | 0.2057 |
| repo-sweep | search-heavy | 3709 | 0.6064 | 0.5656 | 0.5596 | 0.5126 | 0.5880 | 0.6040 |
| release-digest | noisy-output | 5612 | 0.7542 | 0.6788 | 0.5588 | 0.4684 | 0.4399 | 0.8391 |
| log-triage | noisy-output | 20032 | 0.3492 | 0.3608 | 0.3071 | 0.2884 | 0.2607 | 0.2952 |

