# Main branches are edition selectors

For Foreman, Hush and Razor, main contains README.md, LICENSE,
assets/logo.svg and assets/logo-dark.svg, plus the minimal documentation check
in .github/check-main-frontpage.cjs and .github/workflows/test.yml. It introduces the product and links
to the Claude and Codex editions. Installation commands, runtime, skills,
hooks, benchmark data and platform instructions stay off main.

This selector is not a third platform README. The paired-edition contract and
its benchmark exception blocks apply to Claude/Codex, not to this landing page.
Use Foundry's check-main-frontpage.js for a main selector. Its identical packaged
copy and the canonical PLUGIN_MAIN_WORKFLOW.yml produce the required `test`
check on the plugin's own commit. No other CI or product implementation belongs
on main; Foundry also validates the final published selector trees.

Flint is explicitly excluded: its main branch remains its existing product.
Prepare changes on a non-main branch and preserve other working copies.
Publish the linked edition branches before publishing a selector that links
to them. A local branch is not evidence that its GitHub URL is already live.
