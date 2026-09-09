# hush benchmark — generated claims

Generated from 96 retained run records · batch `rm254-cde35d60` · model `sonnet` · seed `1787245282532` · arms: baseline, adhd, caveman, concise, hush, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.5208 | 0.5183 | 0.4069–0.6323 | 0.3815–0.6551 | — | — | — |
| long-session | adhd | 4 | 0.5068 | 0.5355 | 0.4827–0.5596 | 0.4417–0.6294 | -2.7% | 50% | feature-drift +18.9% |
| long-session | caveman | 4 | 0.3838 | 0.4342 | 0.3173–0.5007 | 0.2775–0.5909 | -26.3% | 100% | — |
| long-session | concise | 4 | 0.3428 | 0.3627 | 0.3079–0.3976 | 0.2320–0.4934 | -34.2% | 100% | — |
| long-session | hush | 4 | 0.4820 | 0.5028 | 0.4376–0.5472 | 0.3844–0.6212 | -7.4% | 50% | feature-drift +47.4% |
| long-session | ste | 4 | 0.5090 | 0.4982 | 0.4526–0.5547 | 0.4132–0.5833 | -2.3% | 50% | feature-drift +8.2% |
| noisy-output | baseline | 8 | 0.2785 | 0.3538 | 0.2070–0.4131 | 0.2032–0.5044 | — | — | — |
| noisy-output | adhd | 8 | 0.2371 | 0.3552 | 0.1814–0.4078 | 0.1760–0.5345 | -14.9% | 50% | release-digest +10.3% |
| noisy-output | caveman | 8 | 0.2620 | 0.3100 | 0.1985–0.3531 | 0.2071–0.4130 | -5.9% | 75% | failing-suite +12.5% |
| noisy-output | concise | 8 | 0.2302 | 0.2992 | 0.1707–0.3586 | 0.1755–0.4230 | -17.4% | 75% | failing-suite +0.6% |
| noisy-output | hush | 8 | 0.2057 | 0.2551 | 0.1961–0.2512 | 0.1808–0.3294 | -26.1% | 75% | failing-suite +18.0% |
| noisy-output | ste | 8 | 0.2616 | 0.3722 | 0.1886–0.3998 | 0.1792–0.5653 | -6.1% | 50% | release-digest +14.5% |
| search-heavy | baseline | 4 | 0.3547 | 0.3854 | 0.2463–0.4938 | 0.2032–0.5676 | — | — | — |
| search-heavy | adhd | 4 | 0.3561 | 0.3548 | 0.1813–0.5296 | 0.1559–0.5537 | +0.4% | 100% | — |
| search-heavy | caveman | 4 | 0.2083 | 0.2976 | 0.1999–0.3060 | 0.1151–0.4802 | -41.3% | 100% | — |
| search-heavy | concise | 4 | 0.3649 | 0.3717 | 0.2001–0.5365 | 0.1535–0.5900 | +2.9% | 50% | repo-sweep +4.7% |
| search-heavy | hush | 4 | 0.4598 | 0.4468 | 0.2820–0.6247 | 0.2413–0.6523 | +29.6% | 0% | repo-sweep +17.2% |
| search-heavy | ste | 4 | 0.3992 | 0.4089 | 0.1851–0.6229 | 0.1520–0.6657 | +12.5% | 50% | repo-sweep +18.7% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 661825 | 669058 | 379237–951645 | 333094–1005022 | — | — | — |
| long-session | adhd | 4 | 749028 | 731609 | 670152–810484 | 544347–918870 | +13.2% | 50% | feature-drift +67.2% |
| long-session | caveman | 4 | 483766 | 553657 | 348540–688882 | 294687–812626 | -26.9% | 100% | — |
| long-session | concise | 4 | 374161 | 459071 | 349682–483550 | 231835–686307 | -43.5% | 50% | feature-drift +0.3% |
| long-session | hush | 4 | 778023 | 860115 | 657371–980767 | 538190–1182040 | +17.6% | 50% | feature-drift +193.0% |
| long-session | ste | 4 | 608887 | 611930 | 501365–719452 | 406370–817489 | -8.0% | 50% | feature-drift +22.3% |
| noisy-output | baseline | 8 | 236314 | 318088 | 197366–373997 | 200763–435412 | — | — | — |
| noisy-output | adhd | 8 | 242615 | 303891 | 193985–329708 | 177455–430327 | +2.7% | 50% | failing-suite +11.2% |
| noisy-output | caveman | 8 | 237823 | 236319 | 194285–270237 | 187456–285182 | +0.6% | 75% | failing-suite +15.1% |
| noisy-output | concise | 8 | 195942 | 240529 | 179624–247690 | 157174–323884 | -17.1% | 75% | failing-suite +1.7% |
| noisy-output | hush | 8 | 220288 | 221909 | 187732–252324 | 161521–282296 | -6.8% | 75% | failing-suite +12.2% |
| noisy-output | ste | 8 | 244803 | 302530 | 223178–300880 | 199181–405878 | +3.6% | 50% | failing-suite +10.2% |
| search-heavy | baseline | 4 | 248779 | 264027 | 225086–287720 | 201903–326152 | — | — | — |
| search-heavy | adhd | 4 | 215165 | 221878 | 164826–272217 | 155580–288176 | -13.5% | 100% | — |
| search-heavy | caveman | 4 | 208490 | 218542 | 198510–228522 | 171039–266046 | -16.2% | 100% | — |
| search-heavy | concise | 4 | 274754 | 264404 | 213743–325414 | 160167–368640 | +10.4% | 50% | repo-sweep +11.1% |
| search-heavy | hush | 4 | 328488 | 326444 | 287445–367487 | 242745–410143 | +32.0% | 0% | repo-sweep +25.3% |
| search-heavy | ste | 4 | 253065 | 282697 | 165947–369815 | 141203–424192 | +1.7% | 50% | repo-sweep +29.5% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 48463 | 47896 | 37924–58435 | 35854–59939 | — | — | — |
| long-session | adhd | 4 | 48271 | 50600 | 39691–59180 | 36934–64265 | -0.4% | 0% | incident-forensics +6.0% |
| long-session | caveman | 4 | 40013 | 46949 | 38727–48235 | 32299–61598 | -17.4% | 50% | feature-drift +3.6% |
| long-session | concise | 4 | 37416 | 41975 | 36760–42631 | 31974–51976 | -22.8% | 50% | feature-drift +0.3% |
| long-session | hush | 4 | 43075 | 44153 | 42195–45033 | 40799–47506 | -11.1% | 50% | feature-drift +12.4% |
| long-session | ste | 4 | 47487 | 47291 | 38425–56354 | 36496–58086 | -2.0% | 50% | feature-drift +1.4% |
| noisy-output | baseline | 8 | 37248 | 42925 | 34242–49749 | 34463–51387 | — | — | — |
| noisy-output | adhd | 8 | 37940 | 40702 | 32967–44896 | 33314–48091 | +1.9% | 50% | log-triage +3.8% |
| noisy-output | caveman | 8 | 42364 | 43317 | 34910–50141 | 36732–49902 | +13.7% | 50% | log-triage +14.2% |
| noisy-output | concise | 8 | 40193 | 42387 | 32953–49344 | 34705–50068 | +7.9% | 50% | log-triage +10.3% |
| noisy-output | hush | 8 | 37209 | 38275 | 36385–39280 | 36180–40370 | -0.1% | 50% | failing-suite +12.2% |
| noisy-output | ste | 8 | 39954 | 43553 | 33430–51755 | 34994–52112 | +7.3% | 50% | log-triage +12.9% |
| search-heavy | baseline | 4 | 36260 | 36157 | 34106–38311 | 33338–38977 | — | — | — |
| search-heavy | adhd | 4 | 34929 | 35075 | 32965–37040 | 32507–37644 | -3.7% | 100% | — |
| search-heavy | caveman | 4 | 34748 | 36145 | 34510–36383 | 33032–39257 | -4.2% | 50% | rename-scope +1.9% |
| search-heavy | concise | 4 | 36255 | 35786 | 33985–38055 | 32906–38665 | -0.0% | 100% | — |
| search-heavy | hush | 4 | 40697 | 40444 | 38239–42902 | 37362–43525 | +12.2% | 0% | rename-scope +12.0% |
| search-heavy | ste | 4 | 35865 | 36734 | 33189–39409 | 32258–41210 | -1.1% | 50% | repo-sweep +4.8% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 6786 | 7195 | 4702–9280 | 4069–10321 | — | — | — |
| long-session | adhd | 4 | 5290 | 6805 | 4386–7709 | 2975–10635 | -22.0% | 100% | — |
| long-session | caveman | 4 | 4608 | 4616 | 3503–5721 | 3353–5880 | -32.1% | 100% | — |
| long-session | concise | 4 | 5071 | 4867 | 3235–6703 | 2480–7253 | -25.3% | 100% | — |
| long-session | hush | 4 | 4776 | 4779 | 3176–6379 | 2856–6701 | -29.6% | 100% | — |
| long-session | ste | 4 | 7051 | 7275 | 4538–9788 | 4023–10527 | +3.9% | 50% | feature-drift +2.8% |
| noisy-output | baseline | 8 | 2010 | 4454 | 1427–4676 | 900–8007 | — | — | — |
| noisy-output | adhd | 8 | 1606 | 5830 | 1389–6170 | 265–11395 | -20.1% | 50% | release-digest +48.0% |
| noisy-output | caveman | 8 | 1550 | 3203 | 1096–3360 | 684–5722 | -22.9% | 75% | failing-suite +0.4% |
| noisy-output | concise | 8 | 1228 | 3161 | 992–3220 | 478–5843 | -38.9% | 100% | — |
| noisy-output | hush | 8 | 1448 | 3145 | 1125–2983 | 618–5673 | -28.0% | 100% | — |
| noisy-output | ste | 8 | 1518 | 5544 | 1331–4677 | -2–11089 | -24.5% | 50% | release-digest +40.6% |
| search-heavy | baseline | 4 | 7328 | 6908 | 4630–9606 | 3667–10148 | — | — | — |
| search-heavy | adhd | 4 | 6110 | 6194 | 2385–9919 | 1870–10517 | -16.6% | 50% | repo-sweep +3.4% |
| search-heavy | caveman | 4 | 3368 | 4761 | 3017–5111 | 1485–8037 | -54.0% | 100% | — |
| search-heavy | concise | 4 | 6122 | 6009 | 2286–9845 | 1562–10456 | -16.5% | 50% | repo-sweep +2.5% |
| search-heavy | hush | 4 | 7201 | 6862 | 4004–10058 | 3194–10529 | -1.7% | 50% | repo-sweep +4.0% |
| search-heavy | ste | 4 | 6231 | 6324 | 2544–10011 | 1994–10654 | -15.0% | 50% | repo-sweep +4.8% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 10 | 22 | 0–32 | -10–54 | — | — | — |
| long-session | adhd | 4 | 31 | 57 | 18–70 | -9–124 | +205.0% | 0% | incident-forensics +205.0% |
| long-session | caveman | 4 | 26 | 22 | 17–32 | 7–38 | +160.0% | 50% | incident-forensics +10.0% |
| long-session | concise | 4 | 20 | 22 | 0–41 | -3–47 | +95.0% | 50% | incident-forensics +95.0% |
| long-session | hush | 4 | 0 | 1 | 0–1 | -1–3 | -100.0% | 100% | — |
| long-session | ste | 4 | 14 | 19 | 6–27 | -1–38 | +40.0% | 100% | — |
| noisy-output | baseline | 8 | 40 | 39 | 24–57 | 20–57 | — | — | — |
| noisy-output | adhd | 8 | 27 | 60 | 17–66 | 1–119 | -31.6% | 50% | release-digest +165.6% |
| noisy-output | caveman | 8 | 11 | 14 | 0–25 | 3–25 | -73.4% | 100% | — |
| noisy-output | concise | 8 | 38 | 65 | 24–54 | -3–132 | -5.1% | 50% | release-digest +168.7% |
| noisy-output | hush | 8 | 0 | 2 | 0–0 | -2–6 | -100.0% | 100% | — |
| noisy-output | ste | 8 | 23 | 45 | 19–39 | 4–87 | -41.8% | 50% | log-triage +185.7% |
| search-heavy | baseline | 4 | 27 | 35 | 0–62 | -6–76 | — | — | — |
| search-heavy | adhd | 4 | 35 | 45 | 13–67 | 6–84 | +29.6% | 0% | repo-sweep +10.1% |
| search-heavy | caveman | 4 | 10 | 14 | 0–24 | -3–32 | -63.0% | 100% | — |
| search-heavy | concise | 4 | 42 | 41 | 23–59 | 8–74 | +53.7% | 100% | — |
| search-heavy | hush | 4 | 6 | 15 | 0–21 | -8–38 | -79.6% | 100% | — |
| search-heavy | ste | 4 | 36 | 33 | 10–59 | 3–63 | +33.3% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.4028 | 0.3512 | 392315 | 100% | 65 |
| adhd | 16 | 0.4002 | 0.3783 | 390317 | 100% | 48 |
| caveman | 16 | 0.3380 | 0.2953 | 311209 | 100% | 45 |
| concise | 16 | 0.3332 | 0.2861 | 301133 | 100% | 37 |
| hush | 16 | 0.3649 | 0.3350 | 407594 | 100% | 60 |
| ste | 16 | 0.4129 | 0.3535 | 374922 | 100% | 49 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | adhd | caveman | concise | hush | ste |
|---|---|---|---|---|---|---|---|---|
| feature-drift | long-session | 1273 | 0.3983 | 0.4736 | 0.3163 | 0.3428 | 0.5869 | 0.4312 |
| dep-bump-warnings | noisy-output | 2284 | 0.2287 | 0.1800 | 0.2096 | 0.1603 | 0.1993 | 0.1969 |
| failing-suite | noisy-output | 2471 | 0.1735 | 0.1823 | 0.1952 | 0.1745 | 0.2048 | 0.1818 |
| rename-scope | search-heavy | 2796 | 0.2359 | 0.1790 | 0.2065 | 0.1833 | 0.2666 | 0.1826 |
| repo-sweep | search-heavy | 3213 | 0.5349 | 0.5305 | 0.3888 | 0.5602 | 0.6271 | 0.6351 |
| incident-forensics | long-session | 3940 | 0.6383 | 0.5975 | 0.5521 | 0.3826 | 0.4186 | 0.5653 |
| release-digest | noisy-output | 7944 | 0.6940 | 0.7653 | 0.5401 | 0.5760 | 0.4227 | 0.7945 |
| log-triage | noisy-output | 12032 | 0.3191 | 0.2934 | 0.2953 | 0.2861 | 0.1935 | 0.3157 |

