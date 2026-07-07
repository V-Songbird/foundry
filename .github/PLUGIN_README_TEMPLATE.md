<!--
  Shared plugin README template for this marketplace.
  Copy this into <plugin>/README.md, fill the placeholders, and DELETE every guidance comment.
  All plugins here share this lean shape, tone, and style.

  THE GOLDEN RULE: short and friendly. If a reader sees a wall of text, they won't read it.
  Write for a regular user / "vibe coder", not an engineer. Aim for ~50-80 lines total.
  razor/ and hush/ are the reference implementations for voice; foreman/ shows how lean to go.

  House rules:
  - Warm, plain, second-person, benefit-first prose. Em-dashes are fine. NO exclamation-point
    hype, NO jargon (no "context traffic", "PreToolUse", "n=6", "tokens", schema/field names).
  - Never name a competitor plugin — contrast with a generic category, sell on our own merits.
  - Keep ONLY what a user actually wants to read. Cut mechanism deep-dives, reference tables
    (schemas, hook internals, exhaustive config), comparison tables, and any "Tests" section
    (testing lives in CONTRIBUTING.md). Deep detail stays in the code / a linked schema doc.
  - Sections marked (optional) may be dropped when they don't apply.
-->

<div align="center">
  <img src="assets/logo.svg" alt="<plugin>" width="120" />
  <h1><plugin></h1>
  <p><strong><!-- one-line value prop: what it does FOR THE USER, plain language --></strong></p>
</div>

---

## What is this?

<!-- 2-3 short plain sentences. Open with the pain the user already feels, then what the plugin
     does about it. No mechanism, no jargon. -->

## Why you'd want it

<!-- 3-4 bullets, each a **bold lead-in** + one sentence. Benefits the user feels, not features. -->

- **<benefit>.** <one sentence>

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install <plugin>
```

<!-- one line: when it takes effect; "nothing to configure" if true; any one-time step, stated simply -->

## What you can do

<!-- (optional — only if the plugin has user-facing commands/skills.) A compact table, nothing more.
| You want to… | Command |
| --- | --- |
| <plain outcome> | `/<plugin>:<command>` |
-->

## Benchmarks

<!-- (optional — razor/hush only, or any plugin with REAL head-to-head data; drop it entirely
     rather than inventing numbers.) A MARKETING SHOWCASE in the same friendly voice as the top of
     the README, NOT a lab report. Shape: friendly framing sentence -> one or two simple committed
     SVG bar charts (see hush/razor assets/bench-*.svg — a non-technical reader must get each at a
     glance) -> 2-3 benefit bullets in everyday terms (cost, "0 words", "never broke") -> a plain
     "how we tested" line -> one honest limit. Only claim numbers you can defend; never headline an
     underpowered (n<~6) result. GitHub renders repo SVGs via <img src="assets/..."> (the logo
     proves it). -->

## Under the hood

<!-- ONE short "if you're curious" paragraph, plain language — the single most interesting idea,
     not a mechanism catalogue. If it pairs with a sibling plugin, add one line here
     ("Pairs naturally with [<sibling>](../<sibling>): …"). If deep detail exists, point to it
     ("the field-by-field details live in `<doc>.md` if you ever want them"). -->

## Settings

<!-- (optional — only if there are user-relevant knobs.) Lead with "Most people never touch these".
     A compact table, <=5 rows, everyday wording — not every env var.
| Variable | What it does |
| --- | --- |
| `<PLUGIN>_<VAR>` | <plain effect> |
-->

## Good to know

<!-- (optional) 1-3 short, user-facing gotchas only — the things a user might actually hit.
     Not developer-only caveats. -->

- <gotcha>

## License

MIT — see [LICENSE](./LICENSE).
