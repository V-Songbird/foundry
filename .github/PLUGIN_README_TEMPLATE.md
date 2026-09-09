# Shared plugin README contract

This template covers Claude/Codex editions. Foreman, Hush and Razor main branches
use an edition selector with minimal documentation CI instead, checked by check-main-frontpage.js.
Flint's existing main product is outside that policy.

The two editions of each plugin have one product story. Keep the same purpose,
scope, section order, common outcomes and decorative branding. Use plain, warm
language and retain facts that help a user decide or act. Keep extensive research
in Foundry and usage guides with the plugin.

The required shared sections, in order, are:

1. What is this?
2. Why you'd want it
3. How it works
4. Install
5. What you can do
6. The numbers
7. Going deeper
8. Good to know
9. License

Start with the common logo, product name and short promise; follow with the
edition's availability, navigation and TL;DR. A decorative mascot can be shared.
Numerical charts, measured examples and replays belong with their platform's
benchmark evidence. Never present an inherited measurement as a new model's run.

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
