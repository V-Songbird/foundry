# Shared plugin README contract

This template covers Claude/Codex editions. Foreman, Hush and Razor main branches
use a shared product overview with animation and edition choices, checked by check-main-frontpage.js against both editions.
Flint's existing main product is outside that policy.

The two editions of each plugin have one product story. Keep the same purpose,
scope, section order, common outcomes and decorative branding. Use plain, warm
language and retain facts that help a user decide or act. Keep extensive research
in Foundry and usage guides with the plugin.

The required shared sections, in order, are:

1. What is this?
2. Why you'd want it
3. How it works
4. What you can do
5. Install
6. Good to know
7. The numbers
8. Going deeper
9. License

Use the approved example-led C style: one short promise, edition availability and navigation, then a concrete situation explaining the product. Put the mascot after the introduction. Avoid a TL;DR that duplicates the promise. Use practical examples and connected prose; use tables for genuinely parallel choices. Put measured charts and recorded demos beside the evidence, with source attribution. Keep limits visible before results. Main overview uses an edition choice in place of native installation. Root uses a plugin choice table before installation.


## Six native exceptions

Use exactly one block for each key. Keep main headings outside the blocks.

| Key | Justified differences |
| --- | --- |
| identity | Host label, badge and actual edition availability |
| install | Native commands, prerequisites and setup |
| commands | Host-specific skill names and controls |
| compatibility | Actual integration or feature-availability differences |
| benchmarks | Measured models, setup rows, values, limits and empirical artwork |
| links | Edition-specific guides and valid destinations |

Example markers:

~~~markdown
<!-- foundry:edition Claude -->
<!-- foundry:platform install -->
Native installation instructions.
<!-- /foundry:platform install -->
~~~

Benchmark tables begin with Model and Setup. The remaining questions, metric
names, units and columns must match across editions. Values and setup rows can
vary with the evidence. State an honest loss or boundary beside measured gains.
Use Not measured for missing values; do not remove the table from that edition.

A measured declaration inside the benchmarks block identifies platform, models,
source and source date. If the source omits its date, record date as unknown and
explain it with dateReason; reviewedAt can separately record the review date.

~~~markdown
<!-- foundry:evidence {"platform":"Codex","status":"pending","reason":"No equivalent paired performance run is available"} -->
| Model | Setup | Metric |
| --- | --- | --- |
| Not measured | Without plugin | Not measured |
| Not measured | With plugin | Not measured |
~~~

Keep empirical claims inside the benchmarks exception. A short user-facing
summary is enough on the front page; sources and full methodology stay linked.
Do not use an exception to hide unrelated product divergence. Do not remove a
supported feature to manufacture equality: identify its genuine availability
difference and keep the shared product contract intact.

Use coordinate-readmes for authoring and the shared documentation reviewer for
review. Check each page with check-readme-parity.js --check, then compare the
actual pair with --pair or --git-pair. Check README navigation and verify the
cited measurements separately. Preserve supplied scope and authorization.

Public community-file templates remain in the other PLUGIN_*_TEMPLATE.md files.

## Approved art direction

Follow docs/shared/launch/tinta-y-oficio.md for Ember and supporting graphics. Hush uses blue, Foreman green, Razor red, including the name pill and decorative README accents. Preserve banners and evidence; use flat fills and organic ink outlines without corner shine.

Center the README banner composition, the `Available on` selector and the navigation. Put the edition icons above their labels, Codex first and Claude second. Hush shows Codex struck through without an installation link while that edition is unavailable. Preserve the native edition status below the selector.
