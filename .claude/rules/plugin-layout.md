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
one package (ADR 0011). Foreman and Razor ship this way for Claude Code and
Codex (ADR 0013); Hush ships this way for Claude Code only, with no Codex
manifest or Codex catalog entry (ADR 0012). Their former Claude and Codex
branches were deleted on 2026-09-15. With a `Claude` ref, the Claude and Codex
branches contain the native implementations and main is the edition selector.
Flint keeps its existing standalone product layout.

The Claude catalog is .claude-plugin/marketplace.json in Foundry. For a plugin
with editions it owns the Claude edition's version and pins a full SHA on the
Claude branch; any .claude-plugin/plugin.json there carries no version, because
Claude Code prefers a manifest version over the catalog's. A package's entry
has no version and pins a full SHA on main. The package's manifests carry its
version, the same one in both when the package ships for Codex.

The Codex catalog is .agents/plugins/marketplace.json in Foundry. The native
.codex-plugin/plugin.json owns the Codex package version. The catalog pins its
full SHA on Codex, or the same main SHA as the Claude catalog for a package that
ships for Codex, and uses its own interface/policy/category schema. Do not apply Claude's catalog
schema or version rule to it.

Each changed installable payload needs an appropriate effective version when
released. A gitlink update alone is not a release. Use the shared workflow in
.github/RELEASE_WORKFLOW.md and the requested plugin or edition's validation
guide. The current working tree, a local ref and a published ref are distinct
states.

Common README content stays coordinated under the readme-parity rule. Main
selectors of plugins with editions follow their own contract, and a package's
single README follows ADR 0011, 0012 or 0013. Product guides and plugin-specific decisions
accompany the plugin; research and benchmark tooling live in Foundry. Community
files follow the current .github templates and retain necessary plugin- or
edition-specific sections.

Respect the requested file/branch scope and any runtime freeze. Preserve
unrelated changes. Use a non-main work branch and a non-conflicting prefix on
Windows, where Codex prevents creating codex/* in the same repository.

Run appropriate product tests for runtime changes, and maintenance checks for
documentation, metadata and tooling. Do not interpret a manifest/schema pass
as installed activation or a unit suite as measured model performance.
