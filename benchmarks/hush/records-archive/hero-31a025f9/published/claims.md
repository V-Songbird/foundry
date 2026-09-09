# hush benchmark — generated claims

Generated from 72 retained run records · batch `hero-31a025f9` · model `sonnet` · seed `1787177750394` · arms: baseline, hushmax.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 12 | 0.3903 | 0.4116 | 0.3725–0.4121 | 0.3694–0.4538 | — | — | — |
| long-session | hushmax | 12 | 0.4032 | 0.4578 | 0.3252–0.5463 | 0.3681–0.5475 | +3.3% | 50% | feature-drift +42.0% |
| noisy-output | baseline | 18 | 0.2115 | 0.2341 | 0.1855–0.3053 | 0.2074–0.2608 | — | — | — |
| noisy-output | hushmax | 18 | 0.2188 | 0.2388 | 0.2098–0.2519 | 0.2106–0.2670 | +3.4% | 33% | failing-suite +19.4% |
| search-heavy | baseline | 6 | 0.5922 | 0.6197 | 0.5606–0.6757 | 0.5456–0.6939 | — | — | — |
| search-heavy | hushmax | 6 | 0.6595 | 0.6041 | 0.5572–0.6829 | 0.5036–0.7045 | +11.4% | 0% | repo-sweep +11.4% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 12 | 561060 | 556553 | 430524–612945 | 475267–637838 | — | — | — |
| long-session | hushmax | 12 | 582291 | 646354 | 533999–722816 | 551995–740714 | +3.8% | 50% | feature-drift +73.2% |
| noisy-output | baseline | 18 | 255806 | 256455 | 185945–315071 | 226931–285978 | — | — | — |
| noisy-output | hushmax | 18 | 280730 | 284197 | 235856–312213 | 229795–338598 | +9.7% | 33% | log-triage +6.9% |
| search-heavy | baseline | 6 | 399757 | 484033 | 351792–578869 | 332899–635166 | — | — | — |
| search-heavy | hushmax | 6 | 402671 | 421557 | 357144–433288 | 346743–496370 | +0.7% | 0% | repo-sweep +0.7% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 12 | 5915 | 6852 | 4686–8440 | 5348–8356 | — | — | — |
| long-session | hushmax | 12 | 5040 | 5935 | 2618–8475 | 3829–8041 | -14.8% | 100% | — |
| noisy-output | baseline | 18 | 1796 | 1685 | 1313–1973 | 1514–1857 | — | — | — |
| noisy-output | hushmax | 18 | 1682 | 1566 | 1165–1844 | 1339–1792 | -6.3% | 67% | failing-suite +2.3% |
| search-heavy | baseline | 6 | 10396 | 9971 | 10043–10968 | 8550–11391 | — | — | — |
| search-heavy | hushmax | 6 | 9991 | 8952 | 7266–10847 | 6196–11707 | -3.9% | 100% | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 12 | 22 | 37 | 0–68 | 14–60 | — | — | — |
| long-session | hushmax | 12 | 0 | 0 | 0–0 | 0–0 | -100.0% | 100% | — |
| noisy-output | baseline | 18 | 35 | 33 | 14–42 | 23–43 | — | — | — |
| noisy-output | hushmax | 18 | 0 | 5 | 0–0 | -0–9 | -100.0% | 100% | — |
| search-heavy | baseline | 6 | 78 | 79 | 60–96 | 53–105 | — | — | — |
| search-heavy | hushmax | 6 | 17 | 19 | 15–22 | 14–23 | -78.8% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 36 | 0.3575 | 0.3251 | 394417 | 100% | 48 |
| hushmax | 36 | 0.3727 | 0.3231 | 427809 | 100% | 44 |
