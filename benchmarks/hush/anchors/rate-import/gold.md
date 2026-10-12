**Three rows between lines 1200 and 1350 break the import rules: a decimal comma at line 1238, a negative rate at line 1271 and an impossible date at line 1322.**

Line numbers count the header as line 1.

| Line | Id | Problem | Fix |
| --- | --- | --- | --- |
| 1238 | `fx-48659` | The rate is written `1,3552`. The comma splits it into two columns, so the row has 7 fields instead of 6. | `1.3552` |
| 1271 | `fx-48890` | The rate is `-1.5078`. Rates must be positive. | `1.5078`, if the sign is the only mistake |
| 1322 | `fx-49247` | The date is `2026-02-30`, which does not exist. The seven rows after it, the rest of its group, are dated `2026-01-13`. | `2026-01-13` |

The other 148 rows in that stretch match the rules in `import.config.json`.

I printed only lines 1200 to 1350 and changed nothing.

Next: fix those three rows in [data/rates.csv](data/rates.csv) and rerun the import.
