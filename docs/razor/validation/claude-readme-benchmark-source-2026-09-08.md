# Retained razor Claude benchmark source

Reviewed 2026-09-08. Source: razor, branch Claude, commit 623dd2c549786336c447296115f9b1ff3112a5a8, README.md.
The source excerpt does not state its run date; the review date is not the run date.
The benchmark destination was normalized to the recorded source commit on 2026-09-09; benchmark text and values remain unchanged.

## Original benchmark section


Real Claude Code sessions, start to finish, on Claude Opus 5. Same job, same starter files, same
test at the end. The code gets **run** — a short answer that breaks the task counts as a failure,
not a win. 39 sessions per setup, in one run.

Beside razor: [ponytail](https://github.com/DietrichGebert/ponytail), a plugin that also tells
Claude to write less and say less.

**Does it still work?** A session counts as clean only if the code is correct *and* no package was
added.

| setup | clean sessions |
| --- | --- |
| no plugin | 35 / 39 |
| ponytail | 39 / 39 |
| **razor** | **39 / 39** |

**How much code?** Lines written for the same job, averaged over the eleven coding jobs:

| setup | lines |
| --- | --- |
| no plugin | 18.3 |
| ponytail | 12.2 |
| **razor** | **9.6** |

razor wrote fewer lines than ponytail on nine of the eleven jobs and tied on the other two.

**And what does it cost?** Per session, same run:

| setup | cost |
| --- | --- |
| no plugin | $0.155 |
| ponytail | $0.151 |
| **razor** | **$0.121** |

**And over a whole session?** This is the one that surprised us. Five requests in a row on the same
project — build a feature, build another, fix a bug in the second one, build two more. Total lines
in the project after each turn, on Claude Opus. This is a separate multi-turn run, with no third
setup in it:

| after turn | no plugin | razor |
| --- | --- | --- |
| 1 | 57 | **29** |
| 3 | 100 | **43** |
| 5 | 136 | **58** |

The gap **grows** as the session goes on. And nothing broke: every feature passed in both setups,
every time.

> [!IMPORTANT]
> **Where razor doesn't win.** It does not make code easier to *read* — we tested that with blind
> side-by-side comparisons and razor lost. ponytail is genuine competition, not a straw man: it
> also blocked every unnecessary package, and it beat plain Claude on both size and cost. The
> savings are also clearly smaller on Sonnet than on Opus, and the cost saving on Sonnet doesn't
> reproduce reliably between runs. The full picture, wins and losses, is in
> [the numbers](docs/BENCHMARKS.md).

*Numbers move between runs, sometimes by a lot. Run it yourself — see [benchmarks/](https://github.com/V-Songbird/razor/tree/623dd2c549786336c447296115f9b1ff3112a5a8/benchmarks).*
