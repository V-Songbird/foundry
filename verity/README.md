<div align="center">
  <img src="assets/logo.svg" alt="verity" width="120" />
  <h1>verity</h1>
  <p><strong>Stops Claude from guessing about Claude Code. Makes it look up the real documentation instead.</strong></p>
</div>

---

## What is this?

Claude is trained on a snapshot of the internet, and that snapshot ages — while Claude Code keeps shipping new features. So when you ask "does Claude Code support X?" or "what does this setting do?", Claude might answer from memory that's months out of date.

verity fixes that. When a question about Claude Code comes up, Claude fetches the **current official docs** on demand, reads them, and answers from what they actually say today — with a link to the exact page, so you can check for yourself.

## Why you'd want it

- **Answers you can trust.** Every answer ends with a link to the page it came from.
- **Always current.** The docs are fetched live, the moment you ask — never a stale copy.
- **Covers the hidden stuff too.** Some tools inside Claude Code sessions aren't in the public docs at all (things like `spawn_task` or `show_widget`). verity bundles a reference for those, so even the undocumented corners get real answers.
- **Zero setup.** No configuration, no accounts, nothing to maintain.

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install verity
```

That's it — nothing to configure.

## How to use it

Mostly, you don't — Claude reaches for the docs on its own. Ask anything about how Claude Code works and it'll look things up before answering:

> "What are the valid hook events?"
> "Does Claude Code support scheduled tasks?"
> "What does the `spawn_task` tool do?"

You can also ask for it explicitly with `/verity:ground-truth`.

## Under the hood

If you're curious: for official docs, Claude pulls the current page straight from the source as plain text — no cached copies, no scraping. For the undocumented in-session tools, it reads a bundled reference built from watching those tools directly. Either way, the answer ends with a citation so you always know where it came from.

## Good to know

- Live doc lookups need an internet connection — no connection, no fresh fetch.
- The bundled reference for hidden tools is a snapshot. If a newer Claude Code version adds tools it doesn't list, Claude tells you so instead of guessing.

## License

MIT — see [LICENSE](./LICENSE).
