# hush benchmark — generated claims

Generated from 72 retained run records · batch `xmodel1-fec45f13` · model `sonnet` · seed `1788041000170` · arms: blockcount, brieflouder, hush, noill.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcount | 3 | 0.4267 | 0.4346 | 0.4011–0.4642 | 0.3627–0.5064 | — | — | — |
| long-session | brieflouder | 3 | 0.2948 | 0.2929 | 0.2822–0.3045 | 0.2676–0.3181 | — | — | — |
| long-session | hush | 3 | 0.3821 | 0.3767 | 0.3622–0.3939 | 0.3404–0.4129 | — | — | — |
| long-session | noill | 3 | 0.3171 | 0.3052 | 0.2992–0.3172 | 0.2818–0.3287 | — | — | — |
| noisy-output | blockcount | 9 | 0.1261 | 0.1611 | 0.1092–0.2332 | 0.1156–0.2065 | — | — | — |
| noisy-output | brieflouder | 9 | 0.1245 | 0.1644 | 0.1186–0.2091 | 0.1274–0.2013 | — | — | — |
| noisy-output | hush | 9 | 0.1330 | 0.1929 | 0.1214–0.1966 | 0.1215–0.2644 | — | — | — |
| noisy-output | noill | 9 | 0.1282 | 0.1833 | 0.1207–0.2568 | 0.1264–0.2402 | — | — | — |
| search-heavy | blockcount | 6 | 0.1619 | 0.1836 | 0.1373–0.2357 | 0.1298–0.2373 | — | — | — |
| search-heavy | brieflouder | 6 | 0.1866 | 0.2030 | 0.1156–0.2574 | 0.1170–0.2891 | — | — | — |
| search-heavy | hush | 6 | 0.1894 | 0.1897 | 0.1068–0.2713 | 0.1170–0.2624 | — | — | — |
| search-heavy | noill | 6 | 0.1743 | 0.1928 | 0.1157–0.2680 | 0.1209–0.2647 | — | — | — |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcount | 3 | 1180639 | 1146783 | 1061516–1248979 | 932071–1361496 | — | — | — |
| long-session | brieflouder | 3 | 764655 | 764520 | 727150–801958 | 679867–849173 | — | — | — |
| long-session | hush | 3 | 972703 | 978083 | 934768–1018709 | 882949–1073217 | — | — | — |
| long-session | noill | 3 | 801809 | 778041 | 759266–808700 | 717446–838636 | — | — | — |
| noisy-output | blockcount | 9 | 204453 | 226629 | 167919–257470 | 172771–280487 | — | — | — |
| noisy-output | brieflouder | 9 | 203496 | 208150 | 196801–209910 | 194318–221982 | — | — | — |
| noisy-output | hush | 9 | 204027 | 246422 | 196911–238188 | 185507–307337 | — | — | — |
| noisy-output | noill | 9 | 223937 | 228352 | 203441–259204 | 201821–254883 | — | — | — |
| search-heavy | blockcount | 6 | 221307 | 206549 | 182082–243946 | 160482–252615 | — | — | — |
| search-heavy | brieflouder | 6 | 174349 | 239399 | 121026–203459 | 71388–407409 | — | — | — |
| search-heavy | hush | 6 | 158408 | 176779 | 113693–234477 | 118325–235234 | — | — | — |
| search-heavy | noill | 6 | 210979 | 227372 | 126842–324321 | 135606–319139 | — | — | — |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcount | 3 | 40974 | 42035 | 39529–44010 | 36859–47212 | — | — | — |
| long-session | brieflouder | 3 | 33246 | 33219 | 33043–33408 | 32805–33633 | — | — | — |
| long-session | hush | 3 | 36714 | 36206 | 35604–37063 | 34482–37931 | — | — | — |
| long-session | noill | 3 | 33983 | 33808 | 33281–34422 | 32504–35111 | — | — | — |
| noisy-output | blockcount | 9 | 29208 | 31190 | 27987–36095 | 28392–33988 | — | — | — |
| noisy-output | brieflouder | 9 | 29071 | 30858 | 28633–34834 | 28692–33024 | — | — | — |
| noisy-output | hush | 9 | 29147 | 33436 | 28130–34128 | 27992–38880 | — | — | — |
| noisy-output | noill | 9 | 29063 | 31581 | 28234–37029 | 28589–34572 | — | — | — |
| search-heavy | blockcount | 6 | 30244 | 30735 | 29257–32679 | 28683–32787 | — | — | — |
| search-heavy | brieflouder | 6 | 31509 | 31967 | 28418–33910 | 28533–35400 | — | — | — |
| search-heavy | hush | 6 | 31187 | 31317 | 28423–34028 | 28686–33949 | — | — | — |
| search-heavy | noill | 6 | 32074 | 32176 | 29456–34364 | 29480–34872 | — | — | — |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcount | 3 | 6304 | 5994 | 5754–6390 | 5214–6775 | — | — | — |
| long-session | brieflouder | 3 | 4825 | 4688 | 4511–4934 | 4191–5185 | — | — | — |
| long-session | hush | 3 | 5991 | 6339 | 5974–6530 | 5623–7055 | — | — | — |
| long-session | noill | 3 | 5167 | 5035 | 4951–5186 | 4739–5331 | — | — | — |
| noisy-output | blockcount | 9 | 1594 | 3376 | 1476–6071 | 1489–5263 | — | — | — |
| noisy-output | brieflouder | 9 | 1706 | 3175 | 1479–5072 | 1485–4865 | — | — | — |
| noisy-output | hush | 9 | 1722 | 3431 | 1445–5091 | 1434–5428 | — | — | — |
| noisy-output | noill | 9 | 1766 | 4245 | 1227–7132 | 1217–7273 | — | — | — |
| search-heavy | blockcount | 6 | 3865 | 5606 | 3019–8596 | 2699–8512 | — | — | — |
| search-heavy | brieflouder | 6 | 6676 | 6283 | 2270–10199 | 2788–9778 | — | — | — |
| search-heavy | hush | 6 | 6091 | 6068 | 1941–9889 | 2400–9735 | — | — | — |
| search-heavy | noill | 6 | 3540 | 5173 | 1853–8706 | 1897–8450 | — | — | — |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcount | 3 | 57 | 43 | 31–63 | 4–82 | — | — | — |
| long-session | brieflouder | 3 | 8 | 5 | 4–8 | 0–11 | — | — | — |
| long-session | hush | 3 | 17 | 15 | 9–23 | -1–32 | — | — | — |
| long-session | noill | 3 | 0 | 3 | 0–5 | -3–10 | — | — | — |
| noisy-output | blockcount | 9 | 0 | 10 | 0–19 | 1–19 | — | — | — |
| noisy-output | brieflouder | 9 | 0 | 1 | 0–0 | -1–4 | — | — | — |
| noisy-output | hush | 9 | 0 | 1 | 0–0 | -1–3 | — | — | — |
| noisy-output | noill | 9 | 0 | 9 | 0–18 | 2–16 | — | — | — |
| search-heavy | blockcount | 6 | 8 | 12 | 0–24 | 1–22 | — | — | — |
| search-heavy | brieflouder | 6 | 0 | 12 | 0–14 | -6–30 | — | — | — |
| search-heavy | hush | 6 | 0 | 8 | 0–13 | -3–19 | — | — | — |
| search-heavy | noill | 6 | 0 | 6 | 0–11 | -1–12 | — | — | — |

### Times it broke in before the answer <sub>(messages)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | blockcount | 3 | 3.0 | 2.7 | 2.0–3.5 | 0.9–4.4 | — | — | — |
| long-session | brieflouder | 3 | 1.0 | 0.7 | 0.5–1.0 | 0.0–1.3 | — | — | — |
| long-session | hush | 3 | 1.0 | 1.3 | 0.5–2.0 | -0.4–3.1 | — | — | — |
| long-session | noill | 3 | 0.0 | 0.3 | 0.0–0.5 | -0.3–1.0 | — | — | — |
| noisy-output | blockcount | 9 | 0.0 | 0.4 | 0.0–1.0 | 0.1–0.8 | — | — | — |
| noisy-output | brieflouder | 9 | 0.0 | 0.1 | 0.0–0.0 | -0.1–0.3 | — | — | — |
| noisy-output | hush | 9 | 0.0 | 0.1 | 0.0–0.0 | -0.1–0.3 | — | — | — |
| noisy-output | noill | 9 | 0.0 | 0.4 | 0.0–1.0 | 0.1–0.8 | — | — | — |
| search-heavy | blockcount | 6 | 1.0 | 1.0 | 0.0–2.0 | 0.1–1.9 | — | — | — |
| search-heavy | brieflouder | 6 | 0.0 | 0.8 | 0.0–1.5 | -0.2–1.9 | — | — | — |
| search-heavy | hush | 6 | 0.0 | 0.7 | 0.0–1.5 | -0.2–1.5 | — | — | — |
| search-heavy | noill | 6 | 0.0 | 0.7 | 0.0–1.5 | -0.2–1.5 | — | — | — |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| blockcount | 18 | 0.2141 | 0.1619 | 373295 | 100% | 50 |
| brieflouder | 18 | 0.1987 | 0.2004 | 311295 | 100% | 46 |
| hush | 18 | 0.2225 | 0.1813 | 345151 | 100% | 48 |
| noill | 18 | 0.2068 | 0.2079 | 319640 | 100% | 50 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | blockcount | brieflouder | hush | noill |
|---|---|---|---|---|---|---|
| dep-bump-warnings | — | — | 0.1067 | 0.1418 | 0.1353 | 0.1396 |
| failing-suite | — | — | 0.1244 | 0.1198 | 0.1247 | 0.1204 |
| feature-drift | — | — | 0.4346 | 0.2929 | 0.3767 | 0.3052 |
| release-digest | — | — | 0.2521 | 0.2315 | 0.3188 | 0.2898 |
| rename-scope | — | — | 0.1325 | 0.1123 | 0.1069 | 0.1135 |
| repo-sweep | — | — | 0.2347 | 0.2937 | 0.2724 | 0.2720 |

