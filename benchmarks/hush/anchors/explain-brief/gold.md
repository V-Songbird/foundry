**It is three steps: `cli.js` picks the command, `report.js` builds the rows, `format.js` prints four columns of them.**

1. [cli.js:14](src/cli.js:14) runs one line for `report`: `toTable(buildRows())`.
2. [report.js:11](src/report.js:11) reads [runs.json](data/runs.json), adds a `slow` flag, and sorts the rows slowest first.
3. [format.js:14](src/format.js:14) prints only `id`, `suite`, `status` and `ms`. It drops `owner` and `slow` on purpose, because the table is narrow.

One thing to keep in mind: the rows are complete and the table is not. If you ever need `owner`, take it from `buildRows()`.

Nothing was changed. I read the code and did not run it.

Next: nothing to do before your meeting. When you want the long version, [format.js:7](src/format.js:7) is the place to start.
