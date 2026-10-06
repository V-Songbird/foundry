`toTable` pads each column to its widest value, so the columns line up, and it uses a `pad` helper for that. `buildRows` reads [runs.json](data/runs.json) with `fs.readFileSync` and `JSON.parse`. The `slow` field is true when `ms` is over 5000. `main` is in [cli.js:8](src/cli.js:8) and it returns 1 for anything that is not `report`, after printing `usage: cli.js report`.

`toTable` is in [format.js:14](src/format.js:14) and prints only four columns: `id`, `suite`, `status` and `ms`. `owner` and `slow` are left out on purpose. `buildRows` is in [report.js:11](src/report.js:11). Each run becomes a row with six fields: `id`, `suite`, `status`, `ms`, `owner` and `slow`. Do not read data back out of the table, because it has already lost `owner` and `slow`. The rows are sorted by `ms`, biggest first, because the slowest suite is the one people care about.

`r-105` is the billing suite. It failed and took 9120 ms. It is marked `slow: true` and sorted to the top, and its owner, `payments`, never reaches the screen. The comment in the file says the table is too narrow for the two dropped fields.

For `report`, `main` runs one line: `toTable(buildRows())`. So the report command is a three-step pipeline. Nothing was changed.

Next: open [format.js:7](src/format.js:7) and look at `COLUMNS`. That one list decides what prints, so it is the first place your change will either touch or have to avoid.
