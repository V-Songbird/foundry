<!--
  Shared plugin README template for this marketplace.
  Copy this into <plugin>/README.md, fill the placeholders, and DELETE every guidance comment.
  All plugins in this repo share this section order, tone, and style.

  House rules (apply throughout):
  - Two registers, split by the "How it works" divider. ABOVE it: plain language for a skimming
    developer — the pain they feel, the benefit, how to install. No mechanism detail, no jargon.
    BELOW it: technical depth for the curious. Never mix the two.
  - Never name a competitor plugin. Contrast with the generic category ("prompt-injection <X>
    plugins") and sell on our own merits.
  - Confident, concrete, em-dash prose. No marketing fluff, no exclamation points.
  - Anything a reader can check should be checkable. Benchmarks always state method + N + model,
    and always carry one honest limit — the limit is what makes the wins credible.
  - Keep the section order below. Sections marked (optional) may be dropped if they don't apply.
-->

<div align="center">
  <img src="assets/logo.svg" alt="<plugin>" width="120" />
  <h1><plugin></h1>
  <p><strong><!-- one-line value prop: what it does FOR THE USER, plain language --></strong></p>
</div>

---

## What is this?

<!-- 1-2 short paragraphs. Open with the pain the user already feels, in their own words.
     Then what the plugin does about it — still plain language, no mechanism yet. -->

## Why you'd want it

<!-- 3-5 bullets, each a **bold lead-in** + one sentence. Benefits the user feels, not features. -->

- **<benefit>.** <one sentence>

## Install

Inside Claude Code, run:

```
/plugin marketplace add V-Songbird/claude-plugins
/plugin install <plugin>
```

<!-- one line: when it takes effect (e.g. "active from the next session"); "no configuration needed" if true -->

---

## How it works (for the curious)

<!-- Everything below the divider is the technical register. Lead with ONE framing paragraph
     naming the design thesis (usually: keep the idea, swap the delivery for the strongest
     mechanism available at each layer — not prompt-only). Then numbered mechanism subsections. -->

### 1. <mechanism name>

<!-- What it hooks, what it does, why that layer. Show a real example (a deny reason, a diff, an
     output sample) where it helps the reader picture it. -->

## <plugin> vs <generic competitor category>

<!-- (optional — only when the plugin has a genuine competitor category; drop it for plugins with
     no rival, e.g. a tool-router or a docs-fetcher.)
     Comparison table: the generic prompt-injection category vs our approach, one row per axis
     (delivery, enforcement, grounding, cost, intensity, ...). If a straight table doesn't fit,
     a "Relationship to <generic category>" prose paragraph is the fallback. Never name names. -->

| | <generic category> | <plugin> |
|---|---|---|
| <axis> | <theirs> | <ours> |

## Benchmarks

<!-- (optional — only when the plugin has real head-to-head benchmark data; drop it entirely
     rather than inventing numbers.) This is a MARKETING SHOWCASE for regular users and vibe
     coders, so write it in the SAME friendly, plain-language voice as the top of the README —
     NOT a lab report. Ban the jargon: no "context traffic", "tokens", "n=6", "per-rep", "means".
     Preferred shape: a friendly framing sentence -> one or two simple committed SVG bar charts
     (see hush/razor assets/bench-*.svg — a non-technical reader must get each at a glance) ->
     2-3 benefit bullets in everyday terms (cost, "0 words", "never broke") -> one plain-language
     "how we tested" line -> one honest limit. Only claim numbers you can defend; if a headline
     number shifted with a later release, don't overclaim precision. GitHub renders repo SVGs via
     <img src="assets/..."> (the logo already proves it). A dense three-column table (with the
     "no plugin" column populated with REAL values, never blank) is an acceptable fallback, but
     the chart+prose form reads far friendlier and is preferred. -->

<friendly framing sentence: what we compared, in plain words>.

<p align="center"><img src="assets/bench-<metric>.svg" alt="<plain description of what the chart shows>" width="540"></p>

**<benefit, in bold>.** <one or two plain sentences a non-technical reader gets.>

*How we tested: <one friendly, non-technical sentence — real tasks, fresh workspace, real cost from the API, not guesses>.*

*<Honest note / limit, in friendly terms>.*

<takeaway: the 1-2 facts that matter, in prose>

*Honest limit:* <the workload or case where it doesn't win>.

## Configuration

<!-- (optional — drop if the plugin has no knobs) -->

Environment variables, e.g. via `env` in `settings.json`:

| Variable | Default | Effect |
| --- | --- | --- |
| `<PLUGIN>_<VAR>` | `<default>` | <effect> |

<!-- (optional) Feature-specific sections — e.g. "## Optional: <skill>" — go here, same tone. -->

## Relationship to <sibling plugin>

<!-- (optional — only if it pairs with another plugin here) One line on the complementary split. -->

## Known limits

<!-- Bullet list. Be honest about edges, bypasses, and what a plugin fundamentally cannot do.
     This section is not optional — every plugin has limits, and stating them builds trust. -->

- <limit>

## Tests

<!-- (optional — drop if the plugin has no scripted behavior) -->

```
node --test <plugin>/tests/*.test.js
```

## License

MIT — see [LICENSE](./LICENSE).
