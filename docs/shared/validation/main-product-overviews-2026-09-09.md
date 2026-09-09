# Main product overviews

Main now presents the complete shared product story for Foreman, Hush and Razor:
logo, animated mascot, summary, purpose, benefits, mechanism, usage examples and
general limitations. The edition choice is available both near the entrance and
in a clear getting-started table. Hush/Codex remains explicitly unavailable.

The five product sections, branding, summary and three SVG assets are checked
against both edition refs. Main links to native installation and benchmark
evidence without copying platform-specific commands or relabeling measurements.
`scripts/build-main-readmes.js` reproduces the common content for later updates.

Validation: all three overviews match both editions and pass navigation checks.
The generator/contract tests reject missing product sections, lost animation,
shared-content drift and incorrect availability. The full maintenance suite has
159 passes, no failures and one expected skip. GitHub's rendered pages were
inspected visually, including loaded logos and the shared animations.

Only main documentation, its assets and the maintenance contract changed.
The installable Claude/Codex branches, versions and marketplace pins are unchanged
by this presentation update. Flint remains outside the scope.
