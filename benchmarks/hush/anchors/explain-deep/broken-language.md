**The report command is a three-step pipeline: read the runs, shape them into rows, print four columns of them.**

Nothing was changed. Here is the map, then each step.

| Step | File | What it does |
|---|---|---|
| 1. Pick the command | [cli.js:8](src/cli.js:8) | argv dispatch |
| 2. Build the rows | [report.js:11](src/report.js:11) | Deserialization and ordering |
| 3. Print the table | [format.js:14](src/format.js:14) | Tabular serialization |

**Step 1, pick the command.** The entrypoint performs single-branch subcommand dispatch on `report`, with the fallthrough path emitting the usage string to stderr and yielding a non-zero exit status of 1. The happy path is a single composed invocation, `toTable(buildRows())`, which constitutes the entire pipeline.

**Step 2, build the rows.** `buildRows` synchronously deserializes [runs.json](data/runs.json), projecting each record onto a six-property object in which `slow` is a derived boolean predicated on `ms` exceeding a 5000 threshold, and subsequently applies a descending comparator on `ms`, the rationale being that the highest-latency suite is of primary interest and is therefore surfaced first.

**Step 3, print the table.** The formatter is lossy by design: it emits a four-column projection, `id`, `suite`, `status` and `ms`, intentionally eliding `owner` and `slow` owing to width constraints, with per-column padding computed from the maximal cell width.

**One real run through all three steps.** The `r-105` record, a failed billing suite at 9120 ms, is flagged by the predicate, hoisted to index zero by the comparator, and rendered as the leading row, its `payments` attribution being dropped by the projection.

**The mistake to avoid next week.** Round-tripping data out of the rendered artifact is lossy. Consumers requiring the full tuple must source it from `buildRows()`.

Remember three things:

1. `cli.js` dispatches, `report.js` materializes, `format.js` renders.
2. The rows are lossless. The table is lossy.
3. Ordering is latency-descending.

Next: open [format.js:7](src/format.js:7) and look at `COLUMNS`. That one list decides what prints, so it is the first place your change will either touch or have to avoid.
