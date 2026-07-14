<div align="center">
  <img src="assets/logo.svg" alt="plumb" width="220" />
  <h1>plumb</h1>
  <p><strong>Won't let Claude call it done until it's actually run the code.</strong></p>
</div>

---

## What is this?

AI assistants are quick to sign off. Ask for a fix and you'll often get "Done — that resolves it" or "Tests should pass now" — sometimes without a single command ever having run. The change looks finished, you move on, and the break surfaces later, when it's expensive to trace back.

plumb watches the end of each turn. When Claude has edited code and signed off as if it works — but never ran a test, a build, or the program itself — plumb asks it to prove it first: run the change, confirm it works, then finish. It fires once, and if verification honestly doesn't apply, Claude says why in a line and stops. A checkpoint for "did you actually check?", never a wall.

It's built for real engineering sessions, where a confidently-wrong "it's fixed" costs far more than the second it takes to run the thing.

> [!NOTE]
> plumb ships **observe-only**. Until you arm it, it quietly records what it would have flagged — and never interrupts a turn — so you can see how it behaves in your own work before it holds the line.

## Why you'd want it

- **Catches "done" that isn't.** The costly bug is the one Claude reports as fixed.
- **It acts at the moment it matters** — turn's end — not as a start-of-session reminder Claude has long forgotten.
- **Never a wall.** It fires once per turn, and Claude can wave it off in one line when a check genuinely doesn't apply. You stay in control.
- **Starts quiet.** Observe-only by default; arm it with one switch when you're ready.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/foundry
/plugin install plumb
```

It observes from your next session. To have it actually hold the line, turn on **Arm the completion gate** in the plugin's configuration (or set `PLUMB_ARM=1`).

## Under the hood

It's one check at the end of a turn plus a bit of cleanup — all there to read in the plugin's files. Pairs naturally with [razor](https://github.com/V-Songbird/razor) and [hush](https://github.com/V-Songbird/hush): razor keeps the code lean, hush keeps it quiet, plumb keeps it honest — and they stay out of each other's way.

## Settings

Most people only ever touch the first one. plumb asks about arming when you enable it (changeable anytime in the plugin's configuration) — the environment variables below do the same and take precedence when set:

| Variable | What it does |
| --- | --- |
| `PLUMB_ARM=1` | Arms the gate — it holds back an unproven "done" instead of only observing |
| `PLUMB_DISABLE=1` | Turns everything off |
| `PLUMB_LOG=<path>` | Where the observe-only log is written |

## License

MIT — see [LICENSE](./LICENSE).
