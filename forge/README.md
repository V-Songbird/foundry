<div align="center">
  <img src="assets/logo.svg" alt="forge" width="240" />
  <h1>forge</h1>
  <p><em>Stop discovering architectural problems in code review.<br>Surface them before implementation starts.</em></p>
</div>

---

## What is this?

When you ask Claude to build something big, the risky part isn't the typing — it's what nobody checked first: a hidden connection between two parts of your project, an assumption that turns out wrong, a change that quietly breaks something three folders away. Those problems usually surface after the code is written, when they cost the most to fix.

forge flips the order. You describe what you want, forge studies your actual project and writes a plan, and then it tries hard to break its own plan — all before you approve a single edit.

## Why you'd want it

- **Problems surface in minutes, not after a week.** Missed connections and wrong assumptions get caught up front, while they're still cheap.
- **Nothing happens without your sign-off.** You see the plan and approve it before any code is written — redirect, scope down, or cancel first.
- **Every claim points at real code.** The plan cites exact files and lines from your project, not hand-waving.
- **It scales to the job.** Small change? `/forge lite` skips the heavy work. High-stakes change? `/forge deep` adds an extra layer of checking.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install forge
```

It's active from your next session — nothing to configure. To use it, type `/forge`, describe the feature in plain words, and answer the approval question at the end. forge handles the rest.

## What you can do

| You want to… | Command |
| --- | --- |
| Plan a normal feature or change | `/forge` |
| Get a quick plan for a small, bounded change | `/forge lite` |
| Do an extra-thorough review for something high-stakes | `/forge deep` |

`/forge` is the only entry point you need — just describe what you want to build after running it.

## Under the hood

If you're curious, forge works by sending a small team of specialists at your plan from different angles, then letting a critic try to break it before you ever see it. Pairs naturally with [razor](../razor) and [hush](../hush): forge governs how Claude *plans*, razor what it *builds*, hush how it *talks*.

## License

MIT — see [LICENSE](./LICENSE).
