# Main branches present the product

For Foreman, Hush and Razor, main contains README.md, LICENSE,
assets/logo.svg, assets/logo-dark.svg and the shared animated assets/mascot.svg,
plus the minimal documentation check
in .github/check-main-frontpage.cjs and .github/workflows/test.yml. It introduces the product and links
to the Claude and Codex editions. It preserves their common What is this?, Why
you'd want it, How it works, What you can do and Good to know sections, along with
the shared branding and summary. Installation commands, runtime, skills,
hooks, benchmark data and platform instructions stay off main.

Main is a complete product overview, not just a few redirect links. Native
installation and compatibility details and measured benchmark tables remain in
Claude/Codex. Main links to the evidence for each edition without borrowing one
edition's results for the other. Unavailable editions remain clearly labeled.
Use Foundry's check-main-frontpage.js for a main selector. Its identical packaged
copy and the canonical PLUGIN_MAIN_WORKFLOW.yml produce the required `test`
check on the plugin's own commit. No other CI or product implementation belongs
on main; Foundry also validates the final published overview trees against both
edition refs. Use scripts/build-main-readmes.js to carry the shared narrative
forward; common edition changes require updating main before final release.

Flint is explicitly excluded: its main branch remains its existing product.
Prepare changes on a non-main branch and preserve other working copies.
Publish the linked edition branches before publishing a selector that links
to them. A local branch is not evidence that its GitHub URL is already live.
