**The report command is a three-step pipeline: read the runs, shape them into rows, print four columns of them.**

Nothing was changed. Here is the map, then each step.

| Step | File | What it does |
|---|---|---|
| 1. Pick the command | [cli.js:8](src/cli.js:8) | Checks the word after `cli.js` |
| 2. Build the rows | [report.js:11](src/report.js:11) | Reads the data and sorts it |
| 3. Print the table | [format.js:14](src/format.js:14) | Turns rows into lines of text |

**Step 1, pick the command.** The entry point recognises a single command. Other input is rejected with a usage message. The recognised command composes the two later steps.

**Step 2, build the rows.** The data is read and each record becomes a row that keeps all of its fields plus one derived flag. The rows are then ordered so that the most relevant ones come first.

**Step 3, print the table.** The formatter shows a subset of the fields. The rest are left out by design. Columns are aligned.

**The mistake to avoid next week.** The printed output is not a complete view of the data. Code that needs everything should use the earlier step.

Remember three things:

1. One file picks, one builds, one prints.
2. The rows are complete. The table is not.
3. The order is deliberate.

Next: open [format.js:7](src/format.js:7) and look at `COLUMNS`. That one list decides what prints, so it is the first place your change will either touch or have to avoid.
