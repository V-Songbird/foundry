<!--
  Shared plugin README template for this marketplace.
  Copy this into <plugin>/README.md, fill the placeholders, and DELETE every guidance comment.
  All plugins here share this lean shape, tone, and style.

  THE GOLDEN RULE: short, and it should sound like a person wrote it, not a pitch deck.
  If a reader sees a wall of text or marketing hype, they won't read it.
  Write for a regular user / "vibe coder", not an engineer. Aim for ~60-110 lines total —
  a little longer than the old bar, because personality needs room to land a line.
  razor/ and hush/ are the reference implementations for voice; foreman/ shows how lean to go.

  VOICE: dry, deadpan, LOUD with personality — a sharp friend with a strong opinion and two
  drinks in them, not a marketing brief. Reach for the vivid, concrete, slightly absurd
  comparison over the safe abstract one ("every session forgets everything the moment it
  ends," not "state isn't persisted between sessions") — a line should be memorable enough to
  repeat, not just accurate. Short, confident, declarative sentences. State an opinion bluntly
  instead of hedging it. Self-aware about how AI-coding-tool README hype usually sounds, happy
  to poke fun at the pattern it's part of. House rules for that voice, first two non-negotiable:
    - NEVER name another plugin/product/project by name — not competitors, not tools we drew
      ideas from, not repos we used as references. Contrast with a generic category ("a plugin
      that just tells the model to be brief") and sell on our own merits instead. This applies
      to every public record in this marketplace: READMEs, CHANGELOGs, manifests, code comments,
      test names, commit messages, PR text. Names of reference projects live only in gitignored
      private notes (docs/research/), never in anything that ships or gets pushed.
    - No profanity, ever. Crude isn't a substitute for funny — if a line only lands because of
      a swear word, cut the word and find the sharper, cleaner version of the same joke. Loud
      and blunt is the goal; crude is not.
    - Self-deprecating humor about the PROBLEM ("AI assistants love to add things") or about
      the genre of README this is ("does it actually work, or is this vibes") is fair game.
      Don't make the joke at a real project's or a real person's expense.
  Still no jargon in the plain-language sections (no "context traffic", "PreToolUse", "n=6",
  "tokens", schema/field names) — a joke about jargon is fine, actual jargon isn't.

  House rules:
  - Keep ONLY what a user actually wants to read. Cut mechanism deep-dives, reference tables
    (schemas, hook internals, exhaustive config), comparison tables, and any "Tests" section
    (testing lives in CONTRIBUTING.md). Deep detail stays in the code / a linked schema doc.
  - Sections marked (optional) may be dropped when they don't apply.
  - Badges: License (static, never goes stale) and a "Works with Claude Code" badge are fine.
    Do NOT hard-code a version number badge — this marketplace's single source of truth for
    version is the root `marketplace.json` (see CONTRIBUTING.md), and a version baked into the
    README would drift the moment it's released. If you want a version badge, it has to read
    the number dynamically (e.g. from a shields.io endpoint) — otherwise leave it out.
  - The logo needs two files: `assets/logo.svg` (dark fill, shown in light mode) and
    `assets/logo-dark.svg` (identical artwork, fill swapped to white, shown in dark mode).
    The `<picture>`/`<source media="prefers-color-scheme">` markup below picks the right one.
  - For a caveat that deserves visual weight (an honest limit, a non-destructive guarantee),
    use a GitHub alert (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`) instead of an italic aside —
    matches how the plain-language sections already read at a skim. Sparingly: 1-2 per README.
    Reserve `[!WARNING]`/`[!CAUTION]` for real risk (data loss, a destructive command) — a cost
    or scope caveat is a `[!NOTE]`, not a warning.

  ---
  VOICE EXEMPLAR (synthetic, house-written — a fictional plugin, so nothing real is named).
  The VOICE paragraph above is the spec; this is what it sounds like in practice, so a specific
  line's tone can be checked against an example instead of a summary. Delete this whole appendix
  along with the rest of this comment on copy; it is reference material for calibrating tone,
  never content that ships in a plugin's README.

  # gutter

  Your AI assistant writes beautiful commit messages for code that doesn't compile.
  gutter makes it check first.

  ## The problem

  Every AI coding tool ships the same demo: flawless code, first try, confetti.
  Then you use one for a week and learn its favorite sentence: "This should work now."
  Should. The load-bearing word in modern software.

  gutter is a small set of hooks that turns "should work" into "ran, exit code 0, here's
  the line that proves it." No dashboard. No subscription. No whitepaper about agentic
  synergy. It sits in the gutter and catches what rolls off.

  ## What it does

  | When | What happens |
  |---|---|
  | The assistant claims something works | gutter checks whether anything was actually run |
  | Nothing was | One polite interruption: run it, or say plainly that you didn't |
  | Something was, and it failed | The failure gets quoted back before "done" is allowed |

  That's the whole trick. You could do this yourself, every time, forever, without ever
  getting tired of it. You will not.

  ## Honest limits

  gutter reads what happened; it can't smell intent. A test suite that passes for the
  wrong reasons will sail through — that one's still on you. And if you tell it to be
  quiet, it's quiet: one environment variable, documented below, no hard feelings.

  Does it actually work, or is this vibes? We keep the receipts in the repo — every
  claim above maps to a test you can run in about two seconds.
-->

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <img src="assets/logo.svg" alt="<plugin>" width="240" />
  </picture>
  <h1><plugin></h1>
  <p><strong><!-- one-line value prop: a blunt clause + its consequence, plain language --></strong></p>
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE) [![Claude Code](https://img.shields.io/badge/Claude_Code-E5582B)](https://docs.anthropic.com/en/docs/claude-code)

---

## What is this?

<!-- 2-3 short plain sentences. Open with the pain the user already feels, then what the plugin
     does about it. No mechanism, no jargon. -->

## Why you'd want it

<!-- 3-4 bullets, each a **bold lead-in** + one sentence. Benefits the user feels, not features. -->

- **<benefit>.** <one sentence>

## How it works

<!-- (optional — only when the plugin has a real set of distinct triggers/moments worth naming, e.g.
     razor's gates or hush's compression points.) A short 2-row-to-6-row table — "Moment" / "What
     happens" — reads faster than bullets and gives the section its own visual shape. Bullets are
     fine too if a table feels forced for your plugin. Still zero jargon — no hook names, no env
     vars, no schema. Skip this section entirely if "Why you'd want it" is already trigger-framed
     (e.g. "After each commit, it notices X and records it") — don't add a section that just
     restates the bullets above. razor and hush are the reference implementations. -->

| Moment | What happens |
| --- | --- |
| <trigger/moment> | <what happens, one sentence> |

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

<!-- ONE short closing sentence, plain language — a pointer to the code / a schema doc (NOT a
     restatement of "How it works" above), plus the "pairs with" cross-link if there's a sibling
     plugin: "<one-line pointer, e.g. 'Every check above fires as Claude works'> — read the
     plugin's files if you want the exact mechanics. Pairs naturally with
     [<sibling>](https://github.com/V-Songbird/<sibling>): …". If the whole section would just
     repeat "What is this?" or "How it works", drop it. -->

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
