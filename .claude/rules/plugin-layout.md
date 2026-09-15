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

Foreman, Hush and Razor are independent repositories mounted in Foundry. A
plugin's layout follows its Claude catalog entry. With `ref: "main"`, main is
one package for Claude Code and Codex, and the Claude and Codex branches are
frozen history (ADR 0011); Foreman ships this way. With a `Claude` ref, the
Claude and Codex branches contain the native implementations and main is the
edition selector. Razor's move to one package is pending in Foundry. Flint
keeps its existing standalone product layout.

The Claude catalog is .claude-plugin/marketplace.json in Foundry. For a plugin
with editions it owns the Claude edition's version and pins a full SHA on the
Claude branch; any .claude-plugin/plugin.json there carries no version, because
Claude Code prefers a manifest version over the catalog's. A package's entry
has no version and pins a full SHA on main, and both of the package's manifests
carry the same version.

The Codex catalog is .agents/plugins/marketplace.json in Foundry. The native
.codex-plugin/plugin.json owns the Codex package version. The catalog pins its
full SHA on Codex, or the same main SHA as the Claude catalog for a package, and
uses its own interface/policy/category schema. Do not apply Claude's catalog
schema or version rule to it.

Each changed installable payload needs an appropriate effective version when
released. A gitlink update alone is not a release. Use the shared workflow in
.github/RELEASE_WORKFLOW.md and the requested plugin or edition's validation
guide. The current working tree, a local ref and a published ref are distinct
states.

Common README content stays coordinated under the readme-parity rule. Main
selectors of plugins with editions follow their own contract, and a package's
single README follows ADR 0011. Product guides and plugin-specific decisions
accompany the plugin; research and benchmark tooling live in Foundry. Community
files follow the current .github templates and retain necessary plugin- or
edition-specific sections.

Respect the requested file/branch scope and any runtime freeze. Preserve
unrelated changes. Use a non-main work branch and a non-conflicting prefix on
Windows, where Codex prevents creating codex/* in the same repository.

Run appropriate product tests for runtime changes, and maintenance checks for
documentation, metadata and tooling. Do not interpret a manifest/schema pass
as installed activation or a unit suite as measured model performance.
