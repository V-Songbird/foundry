# Hush Claude README evidence reconciliation

Reviewed September 10, 2026. This review uses retained records; it does not add paid runs or change any recorded result.

## Current README comparison

The source is [rivalA-762f888b](../../../benchmarks/hush/records/rivalA-762f888b), started **2026-09-01T07:34:56.324Z**. The batch has nine fixture jobs and four repetitions per setup. Its records retain model alias `opus` and explicit effort `medium`. The [previously retained README source](claude-readme-benchmark-source-2026-09-08.md) identifies the model as Claude Opus 5; the sanitized records do not establish an immutable resolved model ID. The published setup used the shipped Hush writing voice and `HUSH_WRAP=1`.

The date above is the batch start in UTC, not the source-review date. The earlier source excerpt omitted that date; the retained batch metadata supplies it. All record and batch hashes passed `runner/records.js` verification during this review.

| Setup | Task checks passed | At most one mid-work update | Median final prose words | Runnable content detected |
| --- | --- | --- | --- | --- |
| No plugin | 36/36 | 14/36 | 366.5 | 100% |
| caveman | 36/36 | 31/36 | 150.5 | 100% |
| Hush | 36/36 | 36/36 | 68.5 | 94.4% |

The README rounds prose medians to 367, 151 and 69. The reduction between the unrounded Hush and baseline medians is 81.3%, presented as about 81%. These are **medians, not means**. The same batch also includes `adhd` and `concise` arms; the retained records preserve them.

The [readability implementation](../../../benchmarks/hush/runner/readability.js) excludes fenced code, treats inline code as an opaque token, and scores prose with a shared heuristic. Runnable-content detection recognizes fenced code or command-shaped inline code. It does not prove that the next action is correct, runnable or complete. Readability scores are not human comprehension measurements.

The interruption measure counts `narrationTexts` before the final answer. The task checks are fixture-specific mechanical checks, not a guarantee for arbitrary projects. All whole-plugin effects include the writing style and hooks; this comparison does not isolate the cost effect of brevity alone.

Mean tool-result size fell from 23,367.4 to 15,385.0 characters (34.2%). Mean API output tokens fell from 5,058.3 to 2,981.1 (41.1%). These are separate metrics: characters are not tokens, output tokens include all API-billed output, and neither percentage is a cost reduction.

Per-job mean cost changes for Hush versus baseline in this batch:

| Job | Cost change |
| --- | --- |
| log-triage | -37.1% |
| dep-bump-warnings | +1.4% |
| failing-suite | +3.6% |
| release-digest | -27.7% |
| repo-sweep | -14.2% |
| rename-scope | -12.8% |
| feature-drift | -14.8% |
| incident-forensics | -33.7% |
| plan-apply | +9.5% |

Thus three jobs cost approximately 1–10% more. Do not convert selected wins into a stable suite-wide saving. Four repetitions per job are exploratory evidence; values can move substantially between runs.

## Earlier detailed benchmark page

The existing `hush/docs/BENCHMARKS.md` tables match separate retained batches:

| Batch | Start (UTC) | Model alias | Explicit effort | Sessions per setup | Baseline / Hush prose median | Baseline / Hush at most one update |
| --- | --- | --- | --- | --- | --- | --- |
| [rm320-99a236ff](../../../benchmarks/hush/records/rm320-99a236ff) | 2026-08-30T02:53:51.831Z | opus | Not recorded | 36 | 406 / 71 | 12/36 / 36/36 |
| [sn320-a9885078](../../../benchmarks/hush/records/sn320-a9885078) | 2026-08-30T03:30:07.181Z | sonnet | Not recorded | 18 | 167 / 82 | 12/18 / 16/18 |

The detailed page previously described medium effort, but these batches store `effort: null`. The runner omits the CLI override when it is unset; the effective host default is unknown. Preserve the earlier tables and their negative cases, including the approximately 31% Sonnet router regression, with their own provenance. Do not pool them with September 1 or use the September run's settings to fill missing fields.

The model-judged answer-retelling tables on the detailed page are a separate evaluation from runnable-content detection. Their percentages must not be substituted for each other.

## External support for the mechanism

Anthropic's [September 8, 2026 article](https://claude.com/blog/reducing-cost-and-improving-performance-with-claude-platform) reports approximately 55% lower cost on SWE-bench Verified with Sonnet 5 after combining medium effort and concise output. Caching already worked; median steps fell from 29 to 17 and prompt tokens from 75.2M to 33.7M. The article does not isolate either change's contribution. Its benchmark figure was unavailable to this review, so the README makes no pass-rate claim for that experiment.

Hush's July 7, 2026 source already asks for quiet work and economical final responses: [historical style](https://github.com/V-Songbird/hush/blob/4532e46/output-styles/hush.md). This establishes earlier implementation in Hush, not invention, influence, endorsement or use by Anthropic.

Anthropic's [cost and intelligence guide](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) explains repeated conversation input and trimming with caching enabled. That supports the mechanism, not a Hush performance claim. The launch draft's unsupported 11–22% cost range is retired.

## Reproduce the local analysis

From Foundry, run `node benchmarks/hush/runner/readability.js --records records/rivalA-762f888b`. The CLI reads retained JSON and prints its report without invoking a model. `readRecords` in `benchmarks/hush/runner/records.js` verifies hashes and returns `{ runs, batches }`; count task checks and interruptions from `runs`, and compute per-job means from `costUsd` within the same batch.

The original records and the archived [rivalA](../../../benchmarks/hush/datasets/results--rivalA.tar.gz), [rm320](../../../benchmarks/hush/datasets/results--rm320.tar.gz) and [sn320](../../../benchmarks/hush/datasets/results--sn320.tar.gz) outputs remain unchanged.
