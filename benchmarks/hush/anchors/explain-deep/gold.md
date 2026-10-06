**The report command is a three-step pipeline: read the runs, shape them into rows, print four columns of them.**

Nothing was changed. I read the three source files and the data file, and I did not run the command. Here is the map, then each step.

| Step | File | What it does |
|---|---|---|
| 1. Pick the command | [cli.js:8](src/cli.js:8) | Checks the word after `cli.js` |
| 2. Build the rows | [report.js:11](src/report.js:11) | Reads the data and sorts it |
| 3. Print the table | [format.js:14](src/format.js:14) | Turns rows into lines of text |

**Step 1, pick the command.** `main` only knows one command, `report`. Anything else prints `usage: cli.js report` and exits with code 1. For `report` it runs one line: `toTable(buildRows())`. That line is the whole pipeline.

**Step 2, build the rows.** `buildRows` reads [runs.json](data/runs.json). Each run becomes a row with six fields: `id`, `suite`, `status`, `ms`, `owner` and `slow`. The `slow` field is new at this step. It is true when `ms` is over 5000. Then the rows are sorted by `ms`, biggest first. Why: the slowest suite is the one people care about, so it lands on top.

**Step 3, print the table.** `toTable` prints only four columns: `id`, `suite`, `status` and `ms`. It leaves out `owner` and `slow` on purpose. The comment in the file says the table is too narrow for them, and the slow runs are already at the top. Each column is padded to its widest value, so the columns line up.

**One real run through all three steps.** `r-105` is the billing suite. It failed and took 9120 ms. Step 2 marks it `slow: true` and sorts it to the top. Step 3 prints its id, suite, status and ms as the first row. Its owner, `payments`, never reaches the screen.

**The mistake to avoid next week.** Do not read data back out of the table. It has already lost `owner` and `slow`. Anything that needs the full row should take it from `buildRows()`.

Remember three things:

1. `cli.js` picks, `report.js` builds, `format.js` prints.
2. The rows are complete. The table is not.
3. The order is slowest first.

Next: open [format.js:7](src/format.js:7) and look at `COLUMNS`. That one list decides what prints, so it is the first place your change will either touch or have to avoid.
