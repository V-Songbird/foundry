---
paths:
  - "**/.claude-plugin/*.json"
  - "**/.codex-plugin/*.json"
  - ".agents/plugins/marketplace.json"
  - "*/README.md"
  - "*/CHANGELOG.md"
  - "*/skills/**"
  - "*/hooks/**"
  - "*/scripts/**"
  - "*/tests/**"
---

# Plugin ownership and release layout

Foreman, Hush and Razor are independent repositories mounted in Foundry.
Their Claude and Codex branches contain their native implementations; main is
the edition selector. Flint keeps its existing standalone product layout.

The Claude catalog is .claude-plugin/marketplace.json in Foundry. It owns the
Claude edition's version and pins a full SHA on the Claude branch. Its plugin
metadata lives in .claude-plugin/plugin.json and does not override that version.

The Codex catalog is .agents/plugins/marketplace.json in Foundry. The native
.codex-plugin/plugin.json owns the Codex package version. The catalog pins its
full SHA on Codex and uses its own interface/policy/category schema. Do not
apply Claude's catalog schema or version rule to it.

Each changed installable payload needs an appropriate effective version when
released. A gitlink update alone is not a release. Use the shared workflow in
.github/RELEASE_WORKFLOW.md and the requested edition's validation guide.
The current working tree, a local ref and a published ref are distinct states.

Common README content stays coordinated under the readme-parity rule. Main
selectors follow their own contract. Product guides and plugin-specific
decisions accompany the plugin; research and benchmark tooling live in Foundry.
Community files follow the current .github templates and retain necessary
edition-specific sections.

Respect the requested file/branch scope and any runtime freeze. Preserve
unrelated changes. Use a non-main work branch and a non-conflicting prefix on
Windows, where Codex prevents creating codex/* in the same repository.

Run appropriate product tests for runtime changes, and maintenance checks for
documentation, metadata and tooling. Do not interpret a manifest/schema pass
as installed activation or a unit suite as measured model performance.
