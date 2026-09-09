# hush benchmark — generated claims

Generated from 24 retained run records · batch `flintreadme-0cd8a09a` · model `opus` · seed `1787934856127` · arms: baseline, concise, flint.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 2 | 1.0697 | 1.0697 | 1.0398–1.0995 | 0.9526–1.1867 | — | — | — |
| long-session | concise | 2 | 0.5513 | 0.5513 | 0.5361–0.5666 | 0.4916–0.6111 | -48.5% | 100% | — |
| long-session | flint | 2 | 0.5386 | 0.5386 | 0.5256–0.5516 | 0.4876–0.5896 | -49.7% | 100% | — |
| noisy-output | baseline | 4 | 0.3289 | 0.3568 | 0.3046–0.3811 | 0.2724–0.4413 | — | — | — |
| noisy-output | concise | 4 | 0.2785 | 0.2963 | 0.2581–0.3167 | 0.2344–0.3583 | -15.3% | 100% | — |
| noisy-output | flint | 4 | 0.2855 | 0.3047 | 0.2806–0.3096 | 0.2575–0.3518 | -13.2% | 100% | — |
| search-heavy | baseline | 2 | 0.4288 | 0.4288 | 0.4118–0.4457 | 0.3624–0.4951 | — | — | — |
| search-heavy | concise | 2 | 0.5414 | 0.5414 | 0.4465–0.6363 | 0.1695–0.9133 | +26.3% | 0% | repo-sweep +26.3% |
| search-heavy | flint | 2 | 0.5533 | 0.5533 | 0.4438–0.6628 | 0.1240–0.9826 | +29.0% | 0% | repo-sweep +29.0% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 2 | 606209 | 606209 | 592886–619533 | 553981–658437 | — | — | — |
| long-session | concise | 2 | 320455 | 320455 | 301499–339411 | 246147–394763 | -47.1% | 100% | — |
| long-session | flint | 2 | 371742 | 371742 | 370240–373243 | 365855–377628 | -38.7% | 100% | — |
| noisy-output | baseline | 4 | 176150 | 174719 | 146995–203874 | 130816–218622 | — | — | — |
| noisy-output | concise | 4 | 144331 | 145591 | 143066–146856 | 140040–151141 | -18.1% | 50% | log-triage +3.9% |
| noisy-output | flint | 4 | 158230 | 161488 | 143327–176391 | 137188–185788 | -10.2% | 50% | log-triage +1.9% |
| search-heavy | baseline | 2 | 214351 | 214351 | 202229–226473 | 166833–261869 | — | — | — |
| search-heavy | concise | 2 | 259512 | 259512 | 229420–289603 | 141552–377471 | +21.1% | 0% | repo-sweep +21.1% |
| search-heavy | flint | 2 | 222557 | 222557 | 202471–242644 | 143818–301296 | +3.8% | 0% | repo-sweep +3.8% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 2 | 29620 | 29620 | 28609–30632 | 25657–33584 | — | — | — |
| long-session | concise | 2 | 23718 | 23718 | 23632–23805 | 23379–24057 | -19.9% | 100% | — |
| long-session | flint | 2 | 24783 | 24783 | 24683–24883 | 24390–25175 | -16.3% | 100% | — |
| noisy-output | baseline | 4 | 22034 | 21726 | 21543–22217 | 20866–22586 | — | — | — |
| noisy-output | concise | 4 | 21298 | 21633 | 20640–22291 | 20351–22914 | -3.3% | 50% | failing-suite +2.2% |
| noisy-output | flint | 4 | 24087 | 23897 | 23718–24267 | 23248–24547 | +9.3% | 0% | log-triage +10.7% |
| search-heavy | baseline | 2 | 26834 | 26834 | 26672–26996 | 26200–27469 | — | — | — |
| search-heavy | concise | 2 | 26990 | 26990 | 25953–28026 | 22925–31054 | +0.6% | 0% | repo-sweep +0.6% |
| search-heavy | flint | 2 | 29448 | 29448 | 27751–31145 | 22797–36099 | +9.7% | 0% | repo-sweep +9.7% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 2 | 17940 | 17940 | 17564–18317 | 16464–19416 | — | — | — |
| long-session | concise | 2 | 8008 | 8008 | 7788–8228 | 7146–8870 | -55.4% | 100% | — |
| long-session | flint | 2 | 6092 | 6092 | 5765–6419 | 4810–7374 | -66.0% | 100% | — |
| noisy-output | baseline | 4 | 3961 | 4064 | 2567–5458 | 2322–5806 | — | — | — |
| noisy-output | concise | 4 | 2325 | 2444 | 1456–3313 | 1264–3624 | -41.3% | 100% | — |
| noisy-output | flint | 4 | 1580 | 1558 | 1413–1724 | 1290–1825 | -60.1% | 100% | — |
| search-heavy | baseline | 2 | 4621 | 4621 | 4292–4951 | 3329–5913 | — | — | — |
| search-heavy | concise | 2 | 7590 | 7590 | 5590–9590 | -250–15430 | +64.3% | 0% | repo-sweep +64.3% |
| search-heavy | flint | 2 | 7408 | 7408 | 5110–9705 | -1600–16415 | +60.3% | 0% | repo-sweep +60.3% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 2 | 7 | 7 | 7–8 | 5–9 | — | — | — |
| long-session | concise | 2 | 6 | 6 | 5–6 | 5–6 | -21.4% | 100% | — |
| long-session | flint | 2 | 3 | 3 | 2–5 | -3–9 | -57.1% | 100% | — |
| noisy-output | baseline | 4 | 30 | 31 | 8–53 | 4–57 | — | — | — |
| noisy-output | concise | 4 | 6 | 9 | 6–9 | 3–15 | -79.7% | 100% | — |
| noisy-output | flint | 4 | 7 | 5 | 5–7 | 2–8 | -78.0% | 100% | — |
| search-heavy | baseline | 2 | 80 | 80 | 79–82 | 74–86 | — | — | — |
| search-heavy | concise | 2 | 12 | 12 | 9–14 | 3–20 | -85.6% | 100% | — |
| search-heavy | flint | 2 | 3 | 3 | 2–5 | -3–9 | -96.3% | 100% | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 2 | 1.0 | 1.0 | 1.0–1.0 | 1.0–1.0 | — | — | — |
| long-session | concise | 2 | 1.0 | 1.0 | 1.0–1.0 | 1.0–1.0 | +0.0% | 100% | — |
| long-session | flint | 2 | 0.5 | 0.5 | 0.3–0.8 | -0.5–1.5 | -50.0% | 100% | — |
| noisy-output | baseline | 4 | 1.5 | 1.8 | 1.0–2.3 | 0.8–2.7 | — | — | — |
| noisy-output | concise | 4 | 1.0 | 1.3 | 1.0–1.3 | 0.8–1.7 | -33.3% | 100% | — |
| noisy-output | flint | 4 | 1.0 | 0.8 | 0.8–1.0 | 0.3–1.2 | -33.3% | 100% | — |
| search-heavy | baseline | 2 | 4.5 | 4.5 | 4.3–4.8 | 3.5–5.5 | — | — | — |
| search-heavy | concise | 2 | 2.0 | 2.0 | 1.5–2.5 | 0.0–4.0 | -55.6% | 100% | — |
| search-heavy | flint | 2 | 0.5 | 0.5 | 0.3–0.8 | -0.5–1.5 | -88.9% | 100% | — |

### Sessions that broke in more than once <sub>(share of runs)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 2 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| long-session | concise | 2 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| long-session | flint | 2 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | — | — | — |
| noisy-output | baseline | 4 | 0.50 | 0.50 | 0.00–1.00 | -0.07–1.07 | — | — | — |
| noisy-output | concise | 4 | 0.00 | 0.25 | 0.00–0.25 | -0.24–0.74 | -100.0% | 100% | — |
| noisy-output | flint | 4 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |
| search-heavy | baseline | 2 | 1.00 | 1.00 | 1.00–1.00 | 1.00–1.00 | — | — | — |
| search-heavy | concise | 2 | 0.50 | 0.50 | 0.25–0.75 | -0.48–1.48 | -50.0% | 100% | — |
| search-heavy | flint | 2 | 0.00 | 0.00 | 0.00–0.00 | 0.00–0.00 | -100.0% | 100% | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 8 | 0.5530 | 0.4288 | 292500 | 100% | 80 |
| concise | 8 | 0.4214 | 0.3687 | 217787 | 100% | 60 |
| flint | 8 | 0.4253 | 0.3552 | 229319 | 100% | 39 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | concise | flint |
|---|---|---|---|---|---|
| incident-forensics | long-session | 1130 | 1.0697 | 0.5513 | 0.5386 |
| failing-suite | noisy-output | 1271 | 0.2994 | 0.2529 | 0.2776 |
| log-triage | noisy-output | 2154 | 0.4143 | 0.3397 | 0.3318 |
| repo-sweep | search-heavy | 3071 | 0.4288 | 0.5414 | 0.5533 |

