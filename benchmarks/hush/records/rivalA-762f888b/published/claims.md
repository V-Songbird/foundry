# hush benchmark — generated claims

Generated from 180 retained run records · batch `rivalA-762f888b` · model `opus` · seed `1788248096318` · arms: baseline, adhd, caveman, concise, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.7234 | 0.7695 | 0.7132–0.8073 | 0.6855–0.8536 | — | — | — |
| long-session | adhd | 8 | 0.6731 | 0.6802 | 0.6220–0.7370 | 0.6175–0.7429 | -6.9% | 100% | — |
| long-session | caveman | 8 | 0.6207 | 0.6403 | 0.5774–0.6802 | 0.5743–0.7063 | -14.2% | 100% | — |
| long-session | concise | 8 | 0.6268 | 0.6282 | 0.5580–0.6617 | 0.5623–0.6941 | -13.4% | 100% | — |
| long-session | hush | 8 | 0.5727 | 0.5756 | 0.5448–0.5976 | 0.5116–0.6396 | -20.8% | 100% | — |
| noisy-output | baseline | 16 | 0.3972 | 0.4333 | 0.2551–0.5184 | 0.3295–0.5370 | — | — | — |
| noisy-output | adhd | 16 | 0.2709 | 0.4122 | 0.2373–0.5819 | 0.3044–0.5200 | -31.8% | 75% | release-digest +0.5% |
| noisy-output | caveman | 16 | 0.3150 | 0.3574 | 0.2608–0.4466 | 0.2966–0.4182 | -20.7% | 75% | dep-bump-warnings +5.7% |
| noisy-output | concise | 16 | 0.2680 | 0.3850 | 0.2365–0.5450 | 0.2937–0.4763 | -32.5% | 75% | log-triage +0.5% |
| noisy-output | hush | 16 | 0.2959 | 0.3395 | 0.2578–0.3878 | 0.2824–0.3967 | -25.5% | 50% | dep-bump-warnings +3.4% |
| search-heavy | baseline | 12 | 0.3583 | 0.3387 | 0.1581–0.4658 | 0.2539–0.4234 | — | — | — |
| search-heavy | adhd | 12 | 0.3379 | 0.2895 | 0.1680–0.3505 | 0.2375–0.3415 | -5.7% | 67% | plan-apply +7.9% |
| search-heavy | caveman | 12 | 0.3304 | 0.3105 | 0.1705–0.3987 | 0.2467–0.3743 | -7.8% | 67% | plan-apply +8.9% |
| search-heavy | concise | 12 | 0.3065 | 0.3015 | 0.1684–0.3759 | 0.2319–0.3712 | -14.5% | 67% | plan-apply +5.4% |
| search-heavy | hush | 12 | 0.3143 | 0.3048 | 0.1708–0.3777 | 0.2340–0.3757 | -12.3% | 67% | plan-apply +9.4% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 626833 | 579577 | 498222–651294 | 516262–642892 | — | — | — |
| long-session | adhd | 8 | 526381 | 521138 | 417912–625435 | 410927–631348 | -16.0% | 100% | — |
| long-session | caveman | 8 | 539873 | 515889 | 373797–609196 | 408699–623079 | -13.9% | 100% | — |
| long-session | concise | 8 | 496735 | 508288 | 351651–632437 | 381963–634612 | -20.8% | 50% | feature-drift +2.0% |
| long-session | hush | 8 | 529409 | 501761 | 446425–570174 | 423297–580226 | -15.5% | 100% | — |
| noisy-output | baseline | 16 | 178566 | 220666 | 164518–220330 | 170143–271190 | — | — | — |
| noisy-output | adhd | 16 | 167500 | 207307 | 144882–213716 | 157182–257432 | -6.2% | 100% | — |
| noisy-output | caveman | 16 | 162710 | 167626 | 140233–167078 | 147370–187882 | -8.9% | 75% | dep-bump-warnings +5.1% |
| noisy-output | concise | 16 | 172467 | 193311 | 145814–229616 | 161213–225409 | -3.4% | 50% | log-triage +13.9% |
| noisy-output | hush | 16 | 166658 | 198197 | 159463–213425 | 161123–235271 | -6.7% | 50% | failing-suite +8.7% |
| search-heavy | baseline | 12 | 190688 | 181701 | 75896–236892 | 130412–232990 | — | — | — |
| search-heavy | adhd | 12 | 177183 | 156842 | 95607–196924 | 127457–186227 | -7.1% | 67% | plan-apply +26.6% |
| search-heavy | caveman | 12 | 175583 | 164186 | 86462–201725 | 127492–200881 | -7.9% | 67% | plan-apply +14.1% |
| search-heavy | concise | 12 | 156649 | 173368 | 95178–200655 | 125039–221697 | -17.9% | 67% | plan-apply +26.5% |
| search-heavy | hush | 12 | 199195 | 189978 | 104346–215814 | 132682–247273 | +4.5% | 67% | plan-apply +38.8% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 26584 | 27139 | 26194–27776 | 25951–28326 | — | — | — |
| long-session | adhd | 8 | 25856 | 26398 | 25365–26443 | 24956–27839 | -2.7% | 100% | — |
| long-session | caveman | 8 | 27996 | 28341 | 27029–28934 | 26871–29811 | +5.3% | 0% | feature-drift +5.6% |
| long-session | concise | 8 | 25625 | 25441 | 25440–25736 | 24831–26051 | -3.6% | 100% | — |
| long-session | hush | 8 | 26749 | 26771 | 25980–27336 | 25750–27791 | +0.6% | 50% | feature-drift +2.4% |
| noisy-output | baseline | 16 | 25380 | 28513 | 21200–35695 | 24468–32559 | — | — | — |
| noisy-output | adhd | 16 | 21775 | 27320 | 21008–35566 | 23305–31336 | -14.2% | 75% | release-digest +5.1% |
| noisy-output | caveman | 16 | 26040 | 27629 | 23539–31591 | 25332–29927 | +2.6% | 50% | dep-bump-warnings +12.0% |
| noisy-output | concise | 16 | 21596 | 27161 | 20922–36182 | 23240–31083 | -14.9% | 25% | log-triage +3.2% |
| noisy-output | hush | 16 | 25068 | 25773 | 23073–27697 | 24301–27245 | -1.2% | 50% | failing-suite +12.5% |
| search-heavy | baseline | 12 | 25096 | 23787 | 18974–25832 | 21592–25982 | — | — | — |
| search-heavy | adhd | 12 | 24420 | 22772 | 19121–24590 | 21173–24371 | -2.7% | 67% | plan-apply +1.3% |
| search-heavy | caveman | 12 | 27014 | 25488 | 21615–27551 | 23787–27189 | +7.6% | 0% | plan-apply +14.1% |
| search-heavy | concise | 12 | 23979 | 23024 | 19036–25082 | 21221–24828 | -4.4% | 67% | plan-apply +1.2% |
| search-heavy | hush | 12 | 24899 | 24900 | 20869–26915 | 22887–26912 | -0.8% | 33% | plan-apply +11.0% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 9438 | 9925 | 7477–11805 | 7830–12020 | — | — | — |
| long-session | adhd | 8 | 8243 | 8651 | 7681–10033 | 7522–9780 | -12.7% | 50% | feature-drift +0.7% |
| long-session | caveman | 8 | 6655 | 6337 | 5318–7187 | 5419–7255 | -29.5% | 100% | — |
| long-session | concise | 8 | 7415 | 7380 | 6999–7921 | 6858–7901 | -21.4% | 100% | — |
| long-session | hush | 8 | 5080 | 5399 | 4917–5262 | 4707–6091 | -46.2% | 100% | — |
| noisy-output | baseline | 16 | 2448 | 3478 | 2376–3610 | 2480–4475 | — | — | — |
| noisy-output | adhd | 16 | 2521 | 3390 | 1988–4265 | 2382–4399 | +3.0% | 50% | log-triage +5.7% |
| noisy-output | caveman | 16 | 2044 | 2149 | 1425–2454 | 1692–2607 | -16.5% | 100% | — |
| noisy-output | concise | 16 | 2350 | 2768 | 1853–3178 | 2163–3373 | -4.0% | 75% | log-triage +7.2% |
| noisy-output | hush | 16 | 1909 | 2343 | 1589–2511 | 1730–2955 | -22.0% | 100% | — |
| search-heavy | baseline | 12 | 3734 | 3922 | 1812–5666 | 2822–5021 | — | — | — |
| search-heavy | adhd | 12 | 3585 | 3243 | 1802–4349 | 2562–3925 | -4.0% | 67% | plan-apply +3.2% |
| search-heavy | caveman | 12 | 2901 | 2773 | 1201–3651 | 2013–3533 | -22.3% | 100% | — |
| search-heavy | concise | 12 | 2819 | 3250 | 1756–4703 | 2328–4172 | -24.5% | 100% | — |
| search-heavy | hush | 12 | 2394 | 2221 | 1000–2546 | 1483–2958 | -35.9% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 10 | 13 | 6–18 | 7–18 | — | — | — |
| long-session | adhd | 8 | 7 | 19 | 6–23 | 4–33 | -26.3% | 50% | feature-drift +26.3% |
| long-session | caveman | 8 | 0 | 1 | 0–1 | -0–3 | -100.0% | 100% | — |
| long-session | concise | 8 | 9 | 11 | 6–14 | 7–14 | -5.3% | 50% | feature-drift +63.2% |
| long-session | hush | 8 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 32 | 41 | 9–64 | 22–60 | — | — | — |
| noisy-output | adhd | 16 | 32 | 33 | 13–42 | 21–44 | -1.6% | 75% | release-digest +4.2% |
| noisy-output | caveman | 16 | 6 | 9 | 0–12 | 4–14 | -81.3% | 100% | — |
| noisy-output | concise | 16 | 20 | 24 | 9–35 | 15–33 | -37.5% | 75% | log-triage +16.7% |
| noisy-output | hush | 16 | 0 | 0 | 0–0 | -0–1 | -100.0% | 100% | — |
| search-heavy | baseline | 12 | 28 | 38 | 15–37 | 18–58 | — | — | — |
| search-heavy | adhd | 12 | 23 | 34 | 15–37 | 18–49 | -17.9% | 67% | repo-sweep +41.0% |
| search-heavy | caveman | 12 | 5 | 4 | 0–6 | 2–5 | -82.1% | 100% | — |
| search-heavy | concise | 12 | 16 | 27 | 13–30 | 8–46 | -44.6% | 100% | — |
| search-heavy | hush | 12 | 0 | 2 | 0–5 | 1–4 | -100.0% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 1.5 | 1.5 | 1.0–2.0 | 1.1–1.9 | — | — | — |
| long-session | adhd | 8 | 1.0 | 1.6 | 1.0–2.3 | 1.0–2.3 | -33.3% | 100% | — |
| long-session | caveman | 8 | 0.0 | 0.3 | 0.0–0.3 | -0.1–0.6 | -100.0% | 100% | — |
| long-session | concise | 8 | 1.5 | 1.5 | 1.0–2.0 | 1.1–1.9 | +0.0% | 50% | feature-drift +33.3% |
| long-session | hush | 8 | 0.0 | 0.0 | 0.0–0.0 | 0.0–0.0 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 2.0 | 2.0 | 1.0–2.3 | 1.5–2.5 | — | — | — |
| noisy-output | adhd | 16 | 2.0 | 2.2 | 1.8–3.0 | 1.7–2.7 | +0.0% | 50% | release-digest +66.7% |
| noisy-output | caveman | 16 | 1.0 | 1.0 | 0.0–2.0 | 0.6–1.4 | -50.0% | 100% | — |
| noisy-output | concise | 16 | 2.0 | 2.0 | 1.0–3.0 | 1.6–2.4 | +0.0% | 75% | dep-bump-warnings +25.0% |
| noisy-output | hush | 16 | 0.0 | 0.1 | 0.0–0.0 | -0.1–0.2 | -100.0% | 100% | — |
| search-heavy | baseline | 12 | 2.0 | 2.6 | 1.0–3.3 | 1.6–3.6 | — | — | — |
| search-heavy | adhd | 12 | 2.0 | 2.4 | 1.0–2.5 | 1.5–3.4 | +0.0% | 67% | repo-sweep +28.6% |
| search-heavy | caveman | 12 | 1.0 | 0.6 | 0.0–1.0 | 0.3–0.9 | -50.0% | 100% | — |
| search-heavy | concise | 12 | 1.0 | 2.2 | 1.0–3.0 | 1.0–3.3 | -50.0% | 100% | — |
| search-heavy | hush | 12 | 0.0 | 0.4 | 0.0–1.0 | 0.1–0.7 | -100.0% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.50 | 0.50 | 0.00–1.00 | 0.13–0.87 | — | — | — |
| long-session | adhd | 8 | 0.00 | 0.38 | 0.00–1.00 | 0.02–0.73 | -100.0% | 100% | — |
| long-session | caveman | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| long-session | concise | 8 | 0.50 | 0.50 | 0.00–1.00 | 0.13–0.87 | +0.0% | 50% | feature-drift +100.0% |
| long-session | hush | 8 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 1.00 | 0.63 | 0.00–1.00 | 0.38–0.87 | — | — | — |
| noisy-output | adhd | 16 | 1.00 | 0.75 | 0.75–1.00 | 0.53–0.97 | +0.0% | 67% | release-digest +100.0% |
| noisy-output | caveman | 16 | 0.00 | 0.31 | 0.00–1.00 | 0.08–0.55 | -100.0% | 100% | — |
| noisy-output | concise | 16 | 1.00 | 0.63 | 0.00–1.00 | 0.38–0.87 | +0.0% | 100% | — |
| noisy-output | hush | 16 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 12 | 1.00 | 0.67 | 0.00–1.00 | 0.39–0.95 | — | — | — |
| search-heavy | adhd | 12 | 1.00 | 0.67 | 0.00–1.00 | 0.39–0.95 | +0.0% | 100% | — |
| search-heavy | caveman | 12 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | concise | 12 | 0.00 | 0.42 | 0.00–1.00 | 0.13–0.71 | -100.0% | 100% | — |
| search-heavy | hush | 12 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 36 | 0.4765 | 0.4866 | 287436 | 100% | 58 |
| adhd | 36 | 0.4309 | 0.3509 | 260226 | 100% | 60 |
| caveman | 36 | 0.4046 | 0.3860 | 243871 | 100% | 44 |
| concise | 36 | 0.4112 | 0.3822 | 256658 | 100% | 48 |
| hush | 36 | 0.3804 | 0.3396 | 262916 | 100% | 39 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | adhd | caveman | concise | hush |
|---|---|---|---|---|---|---|---|
| feature-drift | long-session | 596 | 0.6895 | 0.7045 | 0.6493 | 0.6998 | 0.5875 |
| plan-apply | search-heavy | 720 | 0.1548 | 0.1665 | 0.1693 | 0.1642 | 0.1696 |
| dep-bump-warnings | noisy-output | 936 | 0.2503 | 0.2414 | 0.2593 | 0.2492 | 0.2537 |
| incident-forensics | long-session | 984 | 0.8495 | 0.6559 | 0.6313 | 0.5565 | 0.5637 |
| failing-suite | noisy-output | 1280 | 0.2574 | 0.2201 | 0.2416 | 0.2073 | 0.2668 |
| repo-sweep | search-heavy | 2187 | 0.4294 | 0.3457 | 0.3517 | 0.3961 | 0.3684 |
| rename-scope | search-heavy | 2916 | 0.4318 | 0.3563 | 0.4104 | 0.3443 | 0.3765 |
| release-digest | noisy-output | 5190 | 0.7092 | 0.6998 | 0.4174 | 0.6172 | 0.5128 |
| log-triage | noisy-output | 12171 | 0.5163 | 0.4875 | 0.5112 | 0.4662 | 0.3249 |

