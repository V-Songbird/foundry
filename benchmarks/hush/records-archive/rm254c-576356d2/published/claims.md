# hush benchmark — generated claims

Generated from 96 retained run records · batch `rm254c-576356d2` · model `sonnet` · seed `1787262070641` · arms: baseline, adhd, caveman, concise, hush, ste.

Segments: long-session, noisy-output, search-heavy.

## By segment

Every figure below is a per-segment distribution. Arms are compared task by task on medians, so one wild run cannot flip a task, and the worst single regression is named rather than averaged away.

### Cost per session <sub>(USD)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 0.5282 | 0.5256 | 0.4892–0.5647 | 0.4180–0.6333 | — | — | — |
| long-session | adhd | 4 | 0.4310 | 0.4379 | 0.4137–0.4552 | 0.3886–0.4872 | -18.4% | 50% | feature-drift +3.6% |
| long-session | caveman | 4 | 0.3585 | 0.3523 | 0.2942–0.4166 | 0.2786–0.4260 | -32.1% | 100% | — |
| long-session | concise | 4 | 0.4309 | 0.4943 | 0.3916–0.5336 | 0.3384–0.6501 | -18.4% | 50% | incident-forensics +0.4% |
| long-session | hush | 4 | 0.5394 | 0.5404 | 0.4460–0.6338 | 0.3624–0.7184 | +2.1% | 50% | feature-drift +48.1% |
| long-session | ste | 4 | 0.4381 | 0.5154 | 0.4142–0.5393 | 0.3269–0.7040 | -17.0% | 100% | — |
| noisy-output | baseline | 8 | 0.2493 | 0.3204 | 0.2011–0.3708 | 0.1999–0.4409 | — | — | — |
| noisy-output | adhd | 8 | 0.2557 | 0.3325 | 0.2007–0.3797 | 0.1977–0.4673 | +2.6% | 25% | release-digest +7.2% |
| noisy-output | caveman | 8 | 0.2490 | 0.2904 | 0.1872–0.3418 | 0.1951–0.3857 | -0.1% | 75% | failing-suite +2.1% |
| noisy-output | concise | 8 | 0.2345 | 0.2789 | 0.1751–0.3318 | 0.1830–0.3747 | -5.9% | 100% | — |
| noisy-output | hush | 8 | 0.2288 | 0.2902 | 0.2056–0.3225 | 0.2015–0.3788 | -8.2% | 50% | failing-suite +12.0% |
| noisy-output | ste | 8 | 0.2729 | 0.3545 | 0.2063–0.4024 | 0.2016–0.5075 | +9.4% | 25% | release-digest +18.0% |
| search-heavy | baseline | 4 | 0.3444 | 0.3478 | 0.2076–0.4845 | 0.1815–0.5140 | — | — | — |
| search-heavy | adhd | 4 | 0.3852 | 0.4046 | 0.2154–0.5744 | 0.1857–0.6235 | +11.8% | 0% | repo-sweep +20.6% |
| search-heavy | caveman | 4 | 0.3359 | 0.3312 | 0.2024–0.4648 | 0.1782–0.4843 | -2.5% | 100% | — |
| search-heavy | concise | 4 | 0.3781 | 0.3759 | 0.1725–0.5815 | 0.1417–0.6102 | +9.8% | 50% | repo-sweep +18.0% |
| search-heavy | hush | 4 | 0.3941 | 0.4004 | 0.2274–0.5671 | 0.1993–0.6015 | +14.4% | 0% | repo-sweep +16.9% |
| search-heavy | ste | 4 | 0.3339 | 0.3541 | 0.2140–0.4740 | 0.1721–0.5361 | -3.0% | 50% | repo-sweep +2.7% |

### Context traffic per session <sub>(Σ input+cache tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 833561 | 835895 | 728451–941005 | 701313–970477 | — | — | — |
| long-session | adhd | 4 | 731848 | 755035 | 627592–859291 | 586118–923951 | -12.2% | 50% | feature-drift +6.7% |
| long-session | caveman | 4 | 614645 | 601718 | 455766–760597 | 412997–790439 | -26.3% | 100% | — |
| long-session | concise | 4 | 716532 | 746554 | 692386–770700 | 617295–875813 | -14.0% | 100% | — |
| long-session | hush | 4 | 918613 | 923282 | 658056–1183839 | 551501–1295063 | +10.2% | 50% | feature-drift +47.5% |
| long-session | ste | 4 | 824502 | 868807 | 737539–955770 | 612168–1125446 | -1.1% | 50% | incident-forensics +9.5% |
| noisy-output | baseline | 8 | 234222 | 251103 | 186751–313370 | 184740–317466 | — | — | — |
| noisy-output | adhd | 8 | 237854 | 278344 | 220484–260299 | 186982–369706 | +1.6% | 25% | log-triage +43.5% |
| noisy-output | caveman | 8 | 238700 | 246947 | 185504–289427 | 185997–307897 | +1.9% | 75% | log-triage +4.7% |
| noisy-output | concise | 8 | 212327 | 212278 | 177767–237760 | 171703–252853 | -9.3% | 75% | log-triage +1.2% |
| noisy-output | hush | 8 | 258331 | 260874 | 228400–295025 | 201371–320377 | +10.3% | 25% | dep-bump-warnings +24.7% |
| noisy-output | ste | 8 | 250586 | 299508 | 222292–383704 | 210124–388892 | +7.0% | 25% | dep-bump-warnings +43.3% |
| search-heavy | baseline | 4 | 231790 | 243517 | 164765–310541 | 152381–334652 | — | — | — |
| search-heavy | adhd | 4 | 267502 | 279114 | 173638–372977 | 156173–402054 | +15.4% | 0% | repo-sweep +19.8% |
| search-heavy | caveman | 4 | 258343 | 251937 | 197393–312887 | 178263–325611 | +11.5% | 50% | rename-scope +14.3% |
| search-heavy | concise | 4 | 244147 | 269525 | 165432–348240 | 142555–396495 | +5.3% | 50% | repo-sweep +16.4% |
| search-heavy | hush | 4 | 262448 | 261600 | 212695–311353 | 191511–331689 | +13.2% | 50% | rename-scope +23.1% |
| search-heavy | ste | 4 | 249893 | 234644 | 212421–272116 | 160475–308813 | +7.8% | 50% | rename-scope +12.2% |

### Context carried per API call <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 48729 | 48599 | 39267–58061 | 36043–61154 | — | — | — |
| long-session | adhd | 4 | 38268 | 38086 | 36802–39552 | 36177–39995 | -21.5% | 100% | — |
| long-session | caveman | 4 | 36754 | 36908 | 36458–37204 | 36292–37523 | -24.6% | 100% | — |
| long-session | concise | 4 | 46134 | 48671 | 35833–58972 | 33577–63765 | -5.3% | 50% | incident-forensics +3.6% |
| long-session | hush | 4 | 46158 | 47558 | 41334–52382 | 39194–55922 | -5.3% | 50% | feature-drift +32.4% |
| long-session | ste | 4 | 36834 | 44327 | 35961–45199 | 28805–59848 | -24.4% | 100% | — |
| noisy-output | baseline | 8 | 40153 | 41944 | 33532–47751 | 35235–48653 | — | — | — |
| noisy-output | adhd | 8 | 42256 | 43182 | 33441–50551 | 35599–50764 | +5.2% | 25% | log-triage +7.6% |
| noisy-output | caveman | 8 | 41686 | 43210 | 34195–50415 | 36043–50376 | +3.8% | 25% | log-triage +4.7% |
| noisy-output | concise | 8 | 40191 | 40941 | 32854–47977 | 34592–47290 | +0.1% | 75% | log-triage +1.2% |
| noisy-output | hush | 8 | 36888 | 39166 | 36521–41091 | 36352–41980 | -8.1% | 50% | failing-suite +10.5% |
| noisy-output | ste | 8 | 41141 | 44194 | 33712–52952 | 35777–52612 | +2.5% | 25% | release-digest +11.3% |
| search-heavy | baseline | 4 | 35154 | 35416 | 32953–37617 | 32585–38246 | — | — | — |
| search-heavy | adhd | 4 | 37508 | 37516 | 34728–40296 | 33942–41090 | +6.7% | 0% | repo-sweep +7.2% |
| search-heavy | caveman | 4 | 36596 | 36830 | 34315–39111 | 33807–39854 | +4.1% | 0% | repo-sweep +4.1% |
| search-heavy | concise | 4 | 36180 | 36185 | 33086–39279 | 32288–40082 | +2.9% | 50% | repo-sweep +4.5% |
| search-heavy | hush | 4 | 39732 | 39795 | 36972–42555 | 36414–43175 | +13.0% | 0% | repo-sweep +12.9% |
| search-heavy | ste | 4 | 35699 | 35618 | 33823–37494 | 32897–38338 | +1.6% | 50% | rename-scope +1.3% |

### Output tokens per session <sub>(tokens)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 4529 | 4609 | 4387–4750 | 4148–5070 | — | — | — |
| long-session | adhd | 4 | 4908 | 4816 | 4678–5046 | 4328–5304 | +8.4% | 50% | feature-drift +12.4% |
| long-session | caveman | 4 | 3570 | 3618 | 3214–3973 | 3091–4144 | -21.2% | 100% | — |
| long-session | concise | 4 | 3775 | 3627 | 3465–3937 | 3168–4085 | -16.7% | 100% | — |
| long-session | hush | 4 | 4058 | 4188 | 3275–4971 | 2726–5650 | -10.4% | 50% | feature-drift +17.7% |
| long-session | ste | 4 | 4815 | 4901 | 4695–5021 | 4478–5323 | +6.3% | 0% | feature-drift +6.3% |
| noisy-output | baseline | 8 | 1918 | 4085 | 1542–4319 | 1052–7119 | — | — | — |
| noisy-output | adhd | 8 | 1736 | 4241 | 1252–4393 | 735–7747 | -9.5% | 75% | release-digest +11.2% |
| noisy-output | caveman | 8 | 1315 | 2398 | 1117–2556 | 775–4020 | -31.4% | 100% | — |
| noisy-output | concise | 8 | 1473 | 2940 | 1048–2963 | 666–5214 | -23.2% | 100% | — |
| noisy-output | hush | 8 | 1582 | 3773 | 1219–3433 | 475–7071 | -17.5% | 100% | — |
| noisy-output | ste | 8 | 1693 | 4431 | 1342–4340 | 677–8186 | -11.7% | 50% | release-digest +15.4% |
| search-heavy | baseline | 4 | 7019 | 6787 | 4133–9672 | 3243–10331 | — | — | — |
| search-heavy | adhd | 4 | 7260 | 7385 | 3464–11180 | 2926–11843 | +3.4% | 50% | repo-sweep +14.9% |
| search-heavy | caveman | 4 | 6004 | 6081 | 3016–9068 | 2426–9735 | -14.5% | 100% | — |
| search-heavy | concise | 4 | 6263 | 6284 | 2150–10396 | 1549–11019 | -10.8% | 50% | repo-sweep +6.2% |
| search-heavy | hush | 4 | 6751 | 6854 | 3058–10547 | 2533–11174 | -3.8% | 50% | repo-sweep +8.3% |
| search-heavy | ste | 4 | 6685 | 6624 | 3292–10017 | 2764–10484 | -4.8% | 50% | repo-sweep +1.8% |

### Mid-turn narration per session <sub>(words)</sub>

| Segment | Arm | n | median | mean | p25–p75 | 95% CI | vs baseline (median) | win rate | worst task |
|---|---|---|---|---|---|---|---|---|---|
| long-session | baseline | 4 | 75 | 66 | 61–80 | 35–98 | — | — | — |
| long-session | adhd | 4 | 30 | 39 | 23–46 | -0–77 | -60.0% | 50% | feature-drift +7.8% |
| long-session | caveman | 4 | 5 | 9 | 0–14 | -3–22 | -93.3% | 100% | — |
| long-session | concise | 4 | 2 | 2 | 0–4 | -0–4 | -98.0% | 100% | — |
| long-session | hush | 4 | 0 | 2 | 0–2 | -1–4 | -100.0% | 100% | — |
| long-session | ste | 4 | 45 | 37 | 29–53 | 11–63 | -40.7% | 100% | — |
| noisy-output | baseline | 8 | 53 | 55 | 35–84 | 27–84 | — | — | — |
| noisy-output | adhd | 8 | 48 | 74 | 15–92 | 11–138 | -9.4% | 33% | release-digest +82.8% |
| noisy-output | caveman | 8 | 14 | 13 | 0–20 | 4–23 | -73.6% | 100% | — |
| noisy-output | concise | 8 | 34 | 27 | 0–44 | 11–44 | -35.8% | 100% | — |
| noisy-output | hush | 8 | 0 | 6 | 0–4 | -2–14 | -100.0% | 100% | — |
| noisy-output | ste | 8 | 59 | 49 | 23–76 | 25–73 | +10.4% | 67% | failing-suite +29.9% |
| search-heavy | baseline | 4 | 35 | 35 | 13–57 | 4–66 | — | — | — |
| search-heavy | adhd | 4 | 34 | 40 | 0–74 | -6–85 | -2.9% | 50% | repo-sweep +29.5% |
| search-heavy | caveman | 4 | 18 | 22 | 0–40 | -4–48 | -48.6% | 100% | — |
| search-heavy | concise | 4 | 16 | 34 | 0–50 | -14–82 | -54.3% | 50% | repo-sweep +11.5% |
| search-heavy | hush | 4 | 0 | 6 | 0–6 | -5–16 | -100.0% | 100% | — |
| search-heavy | ste | 4 | 36 | 36 | 13–59 | 3–69 | +1.4% | 50% | repo-sweep +4.1% |

## Suite total

All segments pooled. Segments hold different numbers of tasks, so this line is a headline, not evidence — the per-segment tables above are the evidence.

| Arm | Runs | Mean cost USD | Median cost USD | Mean context traffic | Pass rate | Median wall s |
|---|---|---|---|---|---|---|
| baseline | 16 | 0.3785 | 0.3453 | 395405 | 100% | 60 |
| adhd | 16 | 0.3769 | 0.3464 | 397709 | 100% | 56 |
| caveman | 16 | 0.3161 | 0.2952 | 336887 | 100% | 45 |
| concise | 16 | 0.3570 | 0.3377 | 360159 | 100% | 40 |
| hush | 16 | 0.3803 | 0.3108 | 426657 | 100% | 49 |
| ste | 16 | 0.3947 | 0.3537 | 425617 | 100% | 56 |
## By job, ordered by how much it prints

Mean cost per session. "printed per call" is the tool output a plain session pulls in per API call — the quantity that decides whether trimming that output can pay for the prompt a plugin carries.

| Job | Segment | printed per call | baseline | adhd | caveman | concise | hush | ste |
|---|---|---|---|---|---|---|---|---|
| feature-drift | long-session | 992 | 0.4557 | 0.4718 | 0.4168 | 0.3908 | 0.6750 | 0.4381 |
| failing-suite | noisy-output | 1595 | 0.1922 | 0.1841 | 0.1963 | 0.1811 | 0.2153 | 0.1771 |
| dep-bump-warnings | noisy-output | 2447 | 0.1995 | 0.2034 | 0.1724 | 0.1616 | 0.2188 | 0.2347 |
| repo-sweep | search-heavy | 2796 | 0.4938 | 0.5957 | 0.4662 | 0.5829 | 0.5774 | 0.5070 |
| rename-scope | search-heavy | 3083 | 0.2017 | 0.2135 | 0.1963 | 0.1690 | 0.2233 | 0.2012 |
| incident-forensics | long-session | 4389 | 0.5956 | 0.4039 | 0.2878 | 0.5978 | 0.4058 | 0.5927 |
| release-digest | noisy-output | 10264 | 0.5923 | 0.6348 | 0.4978 | 0.4869 | 0.4796 | 0.6987 |
| log-triage | noisy-output | 20032 | 0.2976 | 0.3079 | 0.2952 | 0.2858 | 0.2470 | 0.3076 |

