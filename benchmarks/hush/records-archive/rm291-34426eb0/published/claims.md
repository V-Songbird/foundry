# hush benchmark — generated claims

Generated from 64 retained run records · batch `rm291-34426eb0` · model `opus` · seed `1787886089218` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.8057 | 0.8132 | 0.7575–0.8576 | 0.7408–0.8856 | — | — | — |
| long-session | hush | 8 | 0.5775 | 0.5981 | 0.5527–0.6490 | 0.5485–0.6477 | -28.3% | 100% | — |
| noisy-output | baseline | 16 | 0.3305 | 0.4247 | 0.2601–0.5637 | 0.3290–0.5205 | — | — | — |
| noisy-output | hush | 16 | 0.2808 | 0.3203 | 0.2597–0.3752 | 0.2774–0.3632 | -15.0% | 75% | failing-suite +8.9% |
| search-heavy | baseline | 8 | 0.3942 | 0.4357 | 0.3333–0.4374 | 0.3216–0.5497 | — | — | — |
| search-heavy | hush | 8 | 0.4235 | 0.4396 | 0.3535–0.4546 | 0.3272–0.5520 | +7.4% | 50% | repo-sweep +30.4% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 708016 | 672498 | 516506–825920 | 539798–805197 | — | — | — |
| long-session | hush | 8 | 546724 | 566823 | 456299–689009 | 469578–664068 | -22.8% | 100% | — |
| noisy-output | baseline | 16 | 221681 | 239938 | 185728–273890 | 199766–280110 | — | — | — |
| noisy-output | hush | 16 | 196895 | 203766 | 184620–217519 | 187447–220086 | -11.2% | 75% | dep-bump-warnings +14.3% |
| search-heavy | baseline | 8 | 232753 | 239647 | 223330–246868 | 204267–275028 | — | — | — |
| search-heavy | hush | 8 | 215250 | 234769 | 198830–280905 | 186396–283143 | -7.5% | 50% | repo-sweep +3.8% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 31205 | 32158 | 30332–32486 | 30294–34022 | — | — | — |
| long-session | hush | 8 | 30599 | 30699 | 30268–31319 | 30141–31257 | -1.9% | 50% | feature-drift +1.9% |
| noisy-output | baseline | 16 | 27710 | 32497 | 25519–40247 | 28438–36555 | — | — | — |
| noisy-output | hush | 16 | 28715 | 29550 | 27130–31686 | 28235–30865 | +3.6% | 50% | failing-suite +10.8% |
| search-heavy | baseline | 8 | 29292 | 30215 | 28802–29920 | 27977–32452 | — | — | — |
| search-heavy | hush | 8 | 33135 | 33132 | 30596–35041 | 30472–35792 | +13.1% | 0% | repo-sweep +18.8% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 8762 | 9795 | 7401–11919 | 7731–11859 | — | — | — |
| long-session | hush | 8 | 5543 | 5335 | 5145–5680 | 4964–5705 | -36.7% | 100% | — |
| noisy-output | baseline | 16 | 2827 | 3072 | 2322–3762 | 2458–3685 | — | — | — |
| noisy-output | hush | 16 | 1755 | 2097 | 1364–2417 | 1620–2574 | -37.9% | 100% | — |
| search-heavy | baseline | 8 | 5006 | 5538 | 3313–6125 | 3240–7835 | — | — | — |
| search-heavy | hush | 8 | 3771 | 4427 | 2534–4614 | 2404–6450 | -24.7% | 50% | repo-sweep +19.1% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 19 | 19 | 15–23 | 14–23 | — | — | — |
| long-session | hush | 8 | 0 | 2 | 0–5 | 0–4 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 24 | 25 | 17–32 | 18–33 | — | — | — |
| noisy-output | hush | 16 | 6 | 4 | 0–7 | 2–6 | -75.0% | 100% | — |
| search-heavy | baseline | 8 | 20 | 21 | 9–31 | 12–30 | — | — | — |
| search-heavy | hush | 8 | 6 | 7 | 6–8 | 6–7 | -70.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 32 | 0.5246 | 0.5012 | 348005 | 100% | 65 |
| hush | 32 | 0.4196 | 0.4235 | 302281 | 100% | 55 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 516 | 0.8024 | 0.6555 |
| dep-bump-warnings | noisy-output | 1148 | 0.2654 | 0.2544 |
| failing-suite | noisy-output | 1301 | 0.2487 | 0.2701 |
| incident-forensics | long-session | 1417 | 0.8241 | 0.5408 |
| rename-scope | search-heavy | 2234 | 0.4134 | 0.3589 |
| repo-sweep | search-heavy | 2380 | 0.4579 | 0.5203 |
| release-digest | noisy-output | 7263 | 0.6784 | 0.4602 |
| log-triage | noisy-output | 8642 | 0.5064 | 0.2966 |

