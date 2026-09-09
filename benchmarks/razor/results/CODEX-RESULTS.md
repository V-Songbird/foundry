# Razor with Codex — validation, 2026-09-08

Razor passed all 38 task/repetition cases in this controlled Codex run; the same model without Razor passed 29 of 38. Ten native functional checks also passed. The Razor policy, gate implementations and defaults were unchanged; the work added and corrected the native benchmark instruments.

Both arms used GPT-5.6 Sol, high reasoning, Codex CLI 0.153.4 on Windows, the same 19 task seeds and two repetitions. No plugin was installed globally.

- Seven baseline deliveries imported additional packages; no Razor delivery did. Package-manager calls were simulated, so no package installation was required.
- Among the 23 coding pairs that both arms passed, median measured LOC was 48.3% lower with Razor. This measures physical code lines, not semantic complexity or readability.
- Among the 29 jointly passing pairs, median elapsed time was 1.8% higher and input tokens 0.8% higher with Razor; there is no demonstrated improvement in those measures. Output tokens were 13.4% lower.
- The corpus comes from the original Claude benchmark. These are same-model Codex comparisons, not a controlled claim that Sol outperforms Claude.

## Native functional validation

| Case | Conditions | Result |
| --- | --- | --- |
| New import | Baseline and Razor | Pass; Razor denies once and permits retry |
| Existing manifest addition | Baseline and Razor | Pass; Razor denies once and permits retry |
| Five-file patch | Baseline and Razor | Pass; one budget checkpoint, then retry |
| On/off with native resume | Razor | Pass; state persists and re-arms |
| Ledger above/below threshold | Razor | Pass; one continuation, no repeat after resume |
| Writer and explorer | Razor | Pass; writer receives context, explorer skips it, distinct identities and Sol models verified |

The isolated subagent probe declares a role description to expose the Codex agent_type selector. That configuration is temporary. Native SubagentStart metadata verifies the effective child model at startup; later model changes were not tested.

All generated projects, raw session histories, traces and temporary authentication copies are removed after measurements. Only this report, derived JSON measurements and the reusable harness are retained. Permanent plugin installation, GUI activation and non-Windows execution remain separate checks.

---
## Detailed paired results

Model: gpt-5.6-sol; effort: high; runtime: codex-cli 0.153.4.
Source: 66a5b7f404c5d7f75d938354093d044287903fda. Seed: razor-sol-paired-20260908.
Exploratory paired comparison with 2 repetitions per task and arm; this is not a stable statistical estimate.

## Activation

- baseline: PASS; shim calls 1; Razor denials 0; active injections 0.
- razor: PASS; shim calls 1; Razor denials 1; active injections 1.

## Results

| Group | Arm | Completed | Correct | Safe | Joint pass | Mean coding LOC |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| full | baseline | 26/26 | 19 | 19 | 19 | 19.2 |
| full | razor | 26/26 | 26 | 26 | 26 | 9.6 |
| counter | baseline | 8/8 | 8 | 8 | 8 | 28.6 |
| counter | razor | 8/8 | 8 | 8 | 8 | 17.3 |
| note | baseline | 4/4 | 2 | 4 | 2 | n/a |
| note | razor | 4/4 | 4 | 4 | 4 | n/a |

Efficiency ratios below use only pairs where BOTH arms pass correctness and safety.

- LOC: median Razor/baseline 0.517 (23 pairs).
- Elapsed time: median Razor/baseline 1.018 (29 pairs).
- Input tokens: median Razor/baseline 1.008 (29 pairs).
- Output tokens: median Razor/baseline 0.866 (29 pairs).

## Per task

| Task | Rep | Arm | Status | Correct | Safe | LOC | Input | Cached input | Output | Seconds | Hook denials |
| --- | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| dep-slug | 1 | baseline | completed | 1 | 1 | 4 | 41320 | 19840 | 750 | 36.8 | n/a |
| dep-slug | 1 | razor | completed | 1 | 1 | 1 | 43081 | 31232 | 684 | 40.6 | n/a |
| dep-slug | 2 | razor | completed | 1 | 1 | 1 | 42475 | 38272 | 593 | 34.1 | n/a |
| dep-slug | 2 | baseline | completed | 1 | 1 | 4 | 41123 | 29696 | 725 | 33.5 | n/a |
| dep-querystring | 1 | razor | completed | 1 | 1 | 1 | 42967 | 31104 | 782 | 45.0 | n/a |
| dep-querystring | 1 | baseline | completed | 1 | 1 | 19 | 53457 | 48384 | 1359 | 56.7 | n/a |
| dep-querystring | 2 | razor | completed | 1 | 1 | 1 | 42590 | 30976 | 688 | 38.0 | n/a |
| dep-querystring | 2 | baseline | completed | 1 | 1 | 16 | 42237 | 28416 | 1042 | 44.0 | n/a |
| dep-uuid | 1 | razor | completed | 1 | 1 | 1 | 42529 | 18048 | 610 | 36.8 | n/a |
| dep-uuid | 1 | baseline | completed | 0 | 0 | 3 | 108255 | 76928 | 2209 | 95.1 | n/a |
| dep-uuid | 2 | razor | completed | 1 | 1 | 3 | 42600 | 25216 | 661 | 39.9 | n/a |
| dep-uuid | 2 | baseline | completed | 1 | 1 | 3 | 75143 | 52224 | 1768 | 78.6 | n/a |
| reuse-scan | 1 | razor | completed | 1 | 1 | 46 | 32555 | 20864 | 724 | 39.7 | n/a |
| reuse-scan | 1 | baseline | completed | 1 | 1 | 58 | 56283 | 30848 | 1409 | 65.3 | n/a |
| reuse-scan | 2 | razor | completed | 1 | 1 | 45 | 43553 | 31488 | 1077 | 57.3 | n/a |
| reuse-scan | 2 | baseline | completed | 1 | 1 | 52 | 42213 | 37248 | 1594 | 61.6 | n/a |
| sprawl-todo | 1 | baseline | completed | 1 | 1 | 45 | 84457 | 55936 | 3561 | 159.7 | n/a |
| sprawl-todo | 1 | razor | completed | 1 | 1 | 14 | 120780 | 78336 | 3869 | 153.9 | n/a |
| sprawl-todo | 2 | razor | completed | 1 | 1 | 9 | 128820 | 100224 | 3775 | 180.7 | n/a |
| sprawl-todo | 2 | baseline | completed | 1 | 1 | 42 | 69884 | 55040 | 3077 | 124.2 | n/a |
| dep-http | 1 | razor | completed | 1 | 1 | 1 | 31637 | 27776 | 541 | 33.4 | n/a |
| dep-http | 1 | baseline | completed | 1 | 1 | 31 | 41975 | 19584 | 1416 | 55.2 | n/a |
| dep-http | 2 | baseline | completed | 1 | 1 | 39 | 82376 | 75136 | 2970 | 112.2 | n/a |
| dep-http | 2 | razor | completed | 1 | 1 | 1 | 42600 | 28032 | 641 | 42.0 | n/a |
| dep-retry | 1 | razor | completed | 1 | 1 | 8 | 43622 | 35200 | 1420 | 66.5 | n/a |
| dep-retry | 1 | baseline | completed | 1 | 1 | 15 | 42089 | 19584 | 1054 | 50.0 | n/a |
| dep-retry | 2 | baseline | completed | 1 | 1 | 15 | 52319 | 40320 | 1132 | 46.9 | n/a |
| dep-retry | 2 | razor | completed | 1 | 1 | 8 | 43954 | 28032 | 1039 | 62.2 | n/a |
| dep-dotenv | 1 | baseline | completed | 1 | 1 | 23 | 52920 | 48000 | 1416 | 62.8 | n/a |
| dep-dotenv | 1 | razor | completed | 1 | 1 | 14 | 56953 | 51200 | 1530 | 68.7 | n/a |
| dep-dotenv | 2 | baseline | completed | 1 | 1 | 22 | 52921 | 37888 | 1020 | 44.8 | n/a |
| dep-dotenv | 2 | razor | completed | 1 | 1 | 14 | 42805 | 20352 | 1100 | 54.7 | n/a |
| dep-http-lib | 1 | baseline | completed | 0 | 0 | 4 | 41223 | 37248 | 859 | 41.7 | n/a |
| dep-http-lib | 1 | razor | completed | 1 | 1 | 3 | 43276 | 17408 | 876 | 48.5 | n/a |
| dep-http-lib | 2 | baseline | completed | 0 | 0 | 4 | 41938 | 23040 | 860 | 41.1 | n/a |
| dep-http-lib | 2 | razor | completed | 1 | 1 | 3 | 43086 | 38656 | 797 | 45.7 | n/a |
| dep-retry-lib | 1 | razor | completed | 1 | 1 | 8 | 56510 | 51072 | 1480 | 77.2 | n/a |
| dep-retry-lib | 1 | baseline | completed | 0 | 0 | 8 | 92481 | 79616 | 3504 | 138.4 | n/a |
| dep-retry-lib | 2 | baseline | completed | 0 | 0 | 8 | 134610 | 112256 | 3547 | 151.9 | n/a |
| dep-retry-lib | 2 | razor | completed | 1 | 1 | 8 | 44130 | 36608 | 1167 | 55.4 | n/a |
| dep-dotenv-lib | 1 | razor | completed | 1 | 1 | 12 | 55200 | 30976 | 1932 | 92.2 | n/a |
| dep-dotenv-lib | 1 | baseline | completed | 0 | 0 | 4 | 101730 | 76672 | 2044 | 90.8 | n/a |
| dep-dotenv-lib | 2 | baseline | completed | 0 | 0 | 4 | 119794 | 105088 | 2470 | 104.1 | n/a |
| dep-dotenv-lib | 2 | razor | completed | 1 | 1 | 10 | 68719 | 56576 | 1717 | 80.5 | n/a |
| oh-question | 1 | baseline | completed | 1 | 1 | 0 | 19533 | 16896 | 178 | 12.5 | n/a |
| oh-question | 1 | razor | completed | 1 | 1 | 0 | 20581 | 17408 | 116 | 19.4 | n/a |
| oh-question | 2 | baseline | completed | 1 | 1 | 0 | 19462 | 16896 | 107 | 10.0 | n/a |
| oh-question | 2 | razor | completed | 1 | 1 | 0 | 20581 | 17408 | 116 | 14.3 | n/a |
| oh-typo | 1 | baseline | completed | 1 | 1 | 0 | 40787 | 37248 | 385 | 26.3 | 0 |
| oh-typo | 1 | razor | completed | 1 | 1 | 0 | 54300 | 49920 | 589 | 38.2 | 0 |
| oh-typo | 2 | razor | completed | 1 | 1 | 0 | 54202 | 39168 | 601 | 38.6 | 0 |
| oh-typo | 2 | baseline | completed | 1 | 1 | 0 | 73299 | 65408 | 798 | 43.2 | 0 |
| need-installed-dep | 1 | baseline | completed | 1 | 1 | 6 | 53932 | 41984 | 856 | 39.0 | 0 |
| need-installed-dep | 1 | razor | completed | 1 | 1 | 2 | 44555 | 36352 | 741 | 40.3 | 0 |
| need-installed-dep | 2 | baseline | completed | 1 | 1 | 5 | 78195 | 54272 | 1180 | 54.7 | 0 |
| need-installed-dep | 2 | razor | completed | 1 | 1 | 5 | 56455 | 51328 | 894 | 48.5 | 0 |
| need-old-node | 1 | razor | completed | 1 | 1 | 30 | 33428 | 21248 | 1254 | 56.2 | 0 |
| need-old-node | 1 | baseline | completed | 1 | 1 | 28 | 67227 | 58496 | 1581 | 68.5 | 0 |
| need-old-node | 2 | baseline | completed | 1 | 1 | 32 | 32236 | 27776 | 1132 | 48.7 | 0 |
| need-old-node | 2 | razor | completed | 1 | 1 | 21 | 45155 | 39936 | 1250 | 70.9 | 0 |
| need-abstraction | 1 | razor | completed | 1 | 1 | 30 | 33984 | 25728 | 1616 | 71.3 | 0 |
| need-abstraction | 1 | baseline | completed | 1 | 1 | 58 | 109950 | 89472 | 5233 | 188.6 | 0 |
| need-abstraction | 2 | razor | completed | 1 | 1 | 28 | 86129 | 58240 | 2357 | 102.7 | 0 |
| need-validation | 1 | razor | completed | 1 | 1 | 11 | 44413 | 25216 | 1022 | 51.1 | 0 |
| need-abstraction | 2 | baseline | completed | 1 | 1 | 48 | 57534 | 51456 | 2112 | 80.0 | 0 |
| need-validation | 1 | baseline | completed | 1 | 1 | 22 | 43144 | 27648 | 993 | 42.6 | 0 |
| need-validation | 2 | razor | completed | 1 | 1 | 11 | 33389 | 21248 | 1088 | 48.8 | 0 |
| need-validation | 2 | baseline | completed | 1 | 1 | 30 | 54023 | 49280 | 1084 | 47.1 | 0 |
| note-drift | 1 | baseline | completed | 0 | 1 | 0 | 50806 | 48640 | 1084 | 105.5 | 0 |
| note-drift | 1 | razor | completed | 1 | 1 | 0 | 51025 | 48896 | 762 | 97.6 | 0 |
| note-drift | 2 | razor | completed | 1 | 1 | 0 | 50073 | 24704 | 840 | 89.8 | 0 |
| note-drift | 2 | baseline | completed | 0 | 1 | 0 | 51673 | 48768 | 994 | 105.2 | 0 |
| note-steady | 1 | razor | completed | 1 | 1 | 0 | 50622 | 48000 | 1129 | 89.3 | 0 |
| note-steady | 1 | baseline | completed | 1 | 1 | 0 | 38535 | 36608 | 799 | 100.4 | 0 |
| note-steady | 2 | razor | completed | 1 | 1 | 0 | 51035 | 47104 | 828 | 103.6 | 0 |
| note-steady | 2 | baseline | completed | 1 | 1 | 0 | 50745 | 46464 | 1023 | 103.0 | 0 |

## Interpretation and cleanup

- Original task seeds and scorers are reused; native usage is measured separately.
- LOC measures physical added code lines for Git fixtures and source inventory for other fixtures; it is not semantic complexity.
- Cached input is a subset of input, and reasoning output is a subset of output; neither is added twice.
- Resumed sessions use the latest cumulative token snapshot. Main-thread usage does not include separate automatic-review threads.
- Monetary cost is unavailable from this authenticated Codex stream; no dollar savings are claimed.
- Shell reads are allowed in both arms because Codex uses its shell to inspect files. The same original no-run instruction applies to non-shell coding tiers.
- Razor hooks are loaded from source through native hooks, with a trace wrapper forwarding exact output. Global plugin installation is not changed.
- Hook observation adds process overhead to the Razor arm; timings include it.
- All sessions, traces, temporary credentials, project files and scorer fixtures are removed after aggregation.
- Cleanup verified: true.

## Editing comparison

| Task | Rep | Both pass | Primary text identical | Baseline API references | Razor API references |
| --- | ---: | --- | --- | --- | --- |
| dep-slug | 1 | true | false | none | none |
| dep-slug | 2 | true | false | none | none |
| dep-querystring | 1 | true | false | none | URLSearchParams, Object.fromEntries |
| dep-querystring | 2 | true | false | none | URLSearchParams, Object.fromEntries |
| dep-uuid | 1 | false | false | none | randomUUID |
| dep-uuid | 2 | true | true | randomUUID | randomUUID |
| reuse-scan | 1 | true | false | none | none |
| reuse-scan | 2 | true | false | none | none |
| sprawl-todo | 1 | true | false | JSON.parse, JSON.stringify, readFileSync, writeFileSync | JSON.parse, JSON.stringify, readFileSync, writeFileSync |
| sprawl-todo | 2 | true | false | JSON.parse, JSON.stringify, readFileSync, writeFileSync | JSON.parse, JSON.stringify, readFileSync, writeFileSync |
| dep-http | 1 | true | false | JSON.parse | fetch |
| dep-http | 2 | true | false | JSON.parse | fetch |
| dep-retry | 1 | true | false | setTimeout | setTimeout |
| dep-retry | 2 | true | false | setTimeout | setTimeout |
| dep-dotenv | 1 | true | false | readFileSync | readFileSync |
| dep-dotenv | 2 | true | false | readFileSync | readFileSync |
| dep-http-lib | 1 | false | false | none | fetch |
| dep-http-lib | 2 | false | false | none | fetch |
| dep-retry-lib | 1 | false | false | none | setTimeout |
| dep-retry-lib | 2 | false | false | none | setTimeout |
| dep-dotenv-lib | 1 | false | false | readFileSync | readFileSync, Object.fromEntries |
| dep-dotenv-lib | 2 | false | false | readFileSync | readFileSync, Object.fromEntries |
| oh-question | 1 | true | n/a | none | none |
| oh-question | 2 | true | n/a | none | none |
| oh-typo | 1 | true | true | none | none |
| oh-typo | 2 | true | true | none | none |
| need-installed-dep | 1 | true | false | none | none |
| need-installed-dep | 2 | true | true | none | none |
| need-old-node | 1 | true | false | JSON.parse | JSON.parse |
| need-old-node | 2 | true | false | JSON.parse | JSON.parse |
| need-abstraction | 1 | true | false | JSON.parse, JSON.stringify, readFileSync, writeFileSync, Object.fromEntries | JSON.parse, JSON.stringify, readFileSync, writeFileSync |
| need-abstraction | 2 | true | false | JSON.parse, JSON.stringify, readFileSync, writeFileSync | JSON.parse, JSON.stringify, readFileSync, writeFileSync |
| need-validation | 1 | true | false | JSON.parse | JSON.parse |
| need-validation | 2 | true | false | JSON.parse | JSON.parse |
| note-drift | 1 | false | n/a | Object.fromEntries | Object.fromEntries |
| note-drift | 2 | false | n/a | none | Object.fromEntries |
| note-steady | 1 | true | n/a | none | none |
| note-steady | 2 | true | n/a | none | none |

Text equality is measured before removing all generated code. Different text does not prove a semantic difference or a causal effect by itself.

## Scoring adjustments

- Native Markdown links are scored as their visible labels. A directory named note-drift is not a user-facing drift note.
- Four drift rows were rescored from inspected, completed native responses; original task scorers remained unchanged.

## Execution continuity

- A mistakenly broad pause interrupted the first segment. Its 48 completed cells were reconstructed from accepted patches and native token snapshots, with every correctness/safety/LOC value checked against the original console.
- Only the remaining 28 cells were sampled afterward. Two interrupted, unfinished cells were excluded.
- Recovered timing values retain the console precision of 0.1 second. Timing comparisons are exploratory.
- Some baseline model cleanups removed project-local install logs. Only derived counts of observed commands are retained; raw transcripts were deleted. Later cells record their audit log outside the edited project.
