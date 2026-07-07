<div align="center">
  <img src="assets/logo.svg" alt="razor" width="120" />
  <h1>razor</h1>
  <p><strong>Stops Claude from over-building — no unnecessary dependencies, no file sprawl, no code "for later".</strong></p>
</div>

---

## What is this?

AI assistants love to add things. Ask for one small feature and you might get a new library installed, five helper files, and an abstraction layer for a future that never comes — all of it stuff you now have to understand, maintain, and eventually delete.

razor teaches Claude a simple habit: **don't build what isn't needed, reuse what's already there, prefer what's already installed.** And it backs the habit with real checks — when Claude reaches for a new dependency or starts spawning files, razor makes it stop and reconsider once. If Claude still thinks it's right, it goes ahead. A speed bump for second thoughts, never a wall.

## Why you'd want it

- **Leaner projects.** Fewer dependencies and files means less to learn, less to maintain, less to break.
- **It acts, not just advises.** "Reuse first" is enforced in the tool layer, not just suggested in a prompt Claude can forget.
- **Never blocks you.** Every nudge fires once and the retry always goes through. You stay in control.
- **One switch.** `/razor off` turns it off for the session, `/razor on` back on. No dials to fiddle with.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install razor
```

It's active from your next session — nothing to configure.

## Benchmarks

We put razor up against plain Claude Code and the popular "keep it lean" plugin — same real coding jobs, three setups — and measured the bill and the code.

<p align="center"><img src="assets/bench-cost.svg" alt="Cost of a coding task vs no plugin: the lean plugin is 9% cheaper, razor is 26% cheaper" width="540"></p>

**razor got the job done for about a quarter less — cheaper than running no plugin at all.** It writes the least code to get there, so there's less for you to read, less to review, and less that can quietly break later.

<p align="center"><img src="assets/bench-deps.svg" alt="When you say just use axios: without razor the needless dependency was added every time, with razor never" width="540"></p>

**Say "just use axios" and razor quietly reaches for what's already built in.** That throwaway line would otherwise ship a real dependency you now have to keep updated and secure — every time. With razor on, Claude used the platform's own tools instead and moved on.

And it never cut a corner to do it: **every job still came out correct.**

*How we tested: we ran each setup on the same real coding tasks several times in a fresh, throwaway workspace and read the real cost straight from the API — no guesswork. Figures are averages on the smaller, cheaper model, and the headline results hold on the bigger one too.*

*Good to know:* razor never blocks you. If you genuinely want that library, just say so again and it steps aside — it's a nudge for second thoughts, not a wall.

## Under the hood

If you're curious: razor drops a short "don't over-build" checklist into Claude once per session (and into the helper agents that write code, but not the read-only ones). Then it backs the checklist with a few light touches — it pauses the first time Claude tries to install a new package (and shows what the project already has), the first time it creates a pile of new files at once, and at the end of a session that grew a lot with nothing deleted. Each fires at most once, and the retry always passes.

Pairs naturally with [hush](../hush): hush governs how Claude *talks*, razor governs what it *builds*.

## Settings

Most people never touch these, but a few environment variables tune it or turn parts off:

| Variable | What it does |
| --- | --- |
| `RAZOR_DISABLE=1` | Turns everything off |
| `RAZOR_DEP_GUARD=off` | Stops the new-dependency nudge |
| `RAZOR_FILE_BUDGET=4` | New files allowed in one turn before it speaks up |
| `RAZOR_LEDGER=off` | Turns off the end-of-session "is all this needed?" check |

## License

MIT — see [LICENSE](./LICENSE).
