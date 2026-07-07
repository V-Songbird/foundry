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
     rather than inventing numbers or writing a benchmark section with nothing to show.)
     Head-to-head vs a no-plugin baseline AND the generic competitor category. Keep this EXACT
     shape: framing sentence -> italic method note -> results table -> takeaway -> honest limit.
     Only publish numbers you can defend; state model + reps. Never publish underpowered (n < ~6)
     numbers as a headline. The honest-limit line is mandatory when this section is present.
     Give the "no plugin" baseline its own column with REAL values (absolute, not blank) so every
     cell is concrete — a "vs no plugin" header over delta-only columns leaves the reader with no
     reference point. Keep punchy % deltas for the prose takeaway. -->

<one framing sentence: what was measured, against what>.

*Method: real headless `claude -p` sessions, one fresh workspace per run, token counts from the API's own `usage` blocks (not tokenizer estimates), <ground-truth check, e.g. `node --test` / keyword rubric> so a broken result scores as a failure, not a win. <model>, <N> runs per arm. Means shown; not a powered study.*

| | no plugin | <generic category> | <plugin> |
|---|---|---|---|
| <metric> | <baseline value> | <theirs> | **<ours>** |

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
