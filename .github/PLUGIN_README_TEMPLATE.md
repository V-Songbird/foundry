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
  - For a caveat that deserves visual weight (an honest limit, a non-destructive guarantee),
    use a GitHub alert (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`) instead of an italic aside —
    matches how the plain-language sections already read at a skim. Sparingly: 1-2 per README.
    Reserve `[!WARNING]`/`[!CAUTION]` for real risk (data loss, a destructive command) — a cost
    or scope caveat is a `[!NOTE]`, not a warning.
-->

<div align="center">
  <img src="assets/logo.svg" alt="<plugin>" width="240" />
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
/plugin marketplace add V-Songbird/foundry
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
     the README, NOT a lab report. Lead with the HERO: one headline number (an aggregate you can
     defend — e.g. mean cost across the suite), stated up top and shown as the first chart, framed
     against the alternative ("~25%, roughly 5x what 'just be brief' manages"). Then, in order:
       1. Hero chart + the headline sentence.
       2. A "why" chart (what the reader was missing — e.g. reads dwarf the reply), 1-2 sentences.
       3. One or two TASK highlights that show the strongest capability, a chart each.
       4. THE HONEST TABLE: every task, every arm, wins AND ties/losses, cheapest per row in bold,
          an Average row bolded for your plugin. Disclosing the losses is the trust lever — a deck
          that only shows wins reads as cherry-picked. Add ONE `> [!NOTE]` naming where it wins vs
          where it's neutral/loses.
       5. A plain "how we tested" line (real multi-turn sessions, costs from the API, numbers move
          a few percent between runs).
     Charts: committed SVGs a non-technical reader gets at a glance — pill bars on soft tracks, big
     value labels, one accent colour for your plugin, a top-right stat badge, a one-line takeaway
     footer. Make them THEME-AWARE with an internal <style> + `@media (prefers-color-scheme:dark)`
     so they read in GitHub light and dark (see hush/assets/bench-hero.svg as the reference). Keep
     text left-anchored and inside the viewBox; there's no live renderer here, so estimate widths.
     Only claim numbers you can defend; never headline an underpowered (n<~6) result. GitHub renders
     repo SVGs via <img src="assets/..."> (the logo proves it). -->

## Under the hood

<!-- ONE short "if you're curious" SENTENCE, plain language — do NOT enumerate or explain the
     mechanisms (a curious coder reads the plugin's files; a non-coder doesn't care). Point to
     the code / a schema doc, and add the "pairs with" cross-link if there is a sibling plugin:
     "If you're curious, <one-line gist> — it's all there to read in the plugin's files. Pairs
     naturally with [<sibling>](../<sibling>): …". If the whole section would just repeat "What
     is this?", drop it. -->

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
