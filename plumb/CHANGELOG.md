# Changelog

## 0.1.0-alpha

- First release. plumb watches the end of each turn: when Claude edits code and signs off as done without running a test, build, or the program, it can ask Claude to verify before finishing.
- Ships observe-only by default — it records candidates to a log and never interrupts a turn. Turn on **Arm the completion gate** (or `PLUMB_ARM=1`) to have it hold the line.
- Fires once per turn; `PLUMB_DISABLE=1` turns it off.
