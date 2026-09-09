# hush benchmark — generated claims

Generated from 64 retained run records · batch `rm293-d516617d` · model `opus` · seed `1787898948786` · arms: baseline, hush.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 0.7071 | 0.7361 | 0.6743–0.7281 | 0.6592–0.8130 | — | — | — |
| long-session | hush | 8 | 0.6008 | 0.5994 | 0.5070–0.6576 | 0.5003–0.6985 | -15.0% | 50% | feature-drift +3.7% |
| noisy-output | baseline | 16 | 0.3042 | 0.4025 | 0.2636–0.5524 | 0.3086–0.4964 | — | — | — |
| noisy-output | hush | 16 | 0.2748 | 0.3397 | 0.2516–0.3942 | 0.2809–0.3985 | -9.7% | 100% | — |
| search-heavy | baseline | 8 | 0.4283 | 0.4650 | 0.3604–0.5185 | 0.3567–0.5734 | — | — | — |
| search-heavy | hush | 8 | 0.4207 | 0.4776 | 0.3176–0.5428 | 0.3337–0.6216 | -1.8% | 50% | repo-sweep +34.8% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 648420 | 598009 | 462000–666552 | 503167–692851 | — | — | — |
| long-session | hush | 8 | 575326 | 571878 | 395715–715605 | 426555–717201 | -11.3% | 50% | feature-drift +11.5% |
| noisy-output | baseline | 16 | 193366 | 229123 | 180203–254278 | 190713–267533 | — | — | — |
| noisy-output | hush | 16 | 191382 | 212679 | 171587–248383 | 187633–237725 | -1.0% | 50% | log-triage +3.9% |
| search-heavy | baseline | 8 | 262346 | 267844 | 216971–314946 | 217916–317771 | — | — | — |
| search-heavy | hush | 8 | 259565 | 250137 | 198063–289985 | 207940–292334 | -1.1% | 50% | repo-sweep +1.8% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 30580 | 31747 | 29965–31946 | 29757–33736 | — | — | — |
| long-session | hush | 8 | 30248 | 30265 | 29273–31205 | 29122–31408 | -1.1% | 50% | feature-drift +5.2% |
| noisy-output | baseline | 16 | 26684 | 30876 | 25846–35533 | 27176–34577 | — | — | — |
| noisy-output | hush | 16 | 28589 | 30063 | 27573–31351 | 28414–31713 | +7.1% | 25% | log-triage +11.5% |
| search-heavy | baseline | 8 | 29849 | 31228 | 29152–32114 | 28635–33821 | — | — | — |
| search-heavy | hush | 8 | 33013 | 33665 | 29339–36201 | 30318–37012 | +10.6% | 0% | repo-sweep +13.3% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 8186 | 8753 | 6659–10459 | 6930–10576 | — | — | — |
| long-session | hush | 8 | 5349 | 5362 | 4566–6033 | 4728–5996 | -34.7% | 100% | — |
| noisy-output | baseline | 16 | 3042 | 3522 | 2069–4705 | 2659–4385 | — | — | — |
| noisy-output | hush | 16 | 1803 | 2206 | 1492–2341 | 1622–2789 | -40.7% | 100% | — |
| search-heavy | baseline | 8 | 4816 | 5681 | 3974–6116 | 3637–7724 | — | — | — |
| search-heavy | hush | 8 | 2799 | 5165 | 2481–6817 | 2319–8010 | -41.9% | 50% | repo-sweep +65.5% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 8 | 11 | 12 | 7–18 | 8–16 | — | — | — |
| long-session | hush | 8 | 0 | 1 | 0–0 | -1–2 | -100.0% | 100% | — |
| noisy-output | baseline | 16 | 28 | 31 | 20–40 | 21–40 | — | — | — |
| noisy-output | hush | 16 | 0 | 3 | 0–7 | 1–5 | -100.0% | 100% | — |
| search-heavy | baseline | 8 | 25 | 32 | 22–33 | 18–46 | — | — | — |
| search-heavy | hush | 8 | 6 | 4 | 0–8 | 2–7 | -77.6% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 32 | 0.5015 | 0.4807 | 331025 | 100% | 73 |
| hush | 32 | 0.4391 | 0.4088 | 311844 | 100% | 50 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | hush |
|---|---|---|---|---|
| feature-drift | long-session | 587 | 0.6909 | 0.7020 |
| dep-bump-warnings | noisy-output | 855 | 0.2718 | 0.2537 |
| incident-forensics | long-session | 1582 | 0.7814 | 0.4969 |
| rename-scope | search-heavy | 1962 | 0.4236 | 0.3463 |
| failing-suite | noisy-output | 2131 | 0.2575 | 0.2659 |
| repo-sweep | search-heavy | 2710 | 0.5065 | 0.6090 |
| log-triage | noisy-output | 4094 | 0.3793 | 0.3058 |
| release-digest | noisy-output | 7561 | 0.7014 | 0.5332 |

