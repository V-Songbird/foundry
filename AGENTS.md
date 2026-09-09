# Foundry project instructions

Node and npm are managed by fnm. Initialize the shell environment with
`fnm env --use-on-cd | Out-String | Invoke-Expression` in PowerShell.
Check the branch before edits and work on a non-main branch. Preserve existing
work in the parent and plugin checkouts.

## One project roadmap

Foundry's root ROADMAP.jsonl owns development work for this collection. Do not
create another project roadmap inside a plugin or its platform worktree. Run
roadmap commands from Foundry, with host project-directory overrides pointing
at that root; plugin source commands and tests keep their own working directory.
This does not change roadmaps in unrelated projects where a plugin is installed.
Version Foundry's root ROADMAP.jsonl and .foreman/config.json, notes.jsonl and
archive.jsonl when present. Keep trial logs, session markers, locks and temporary
execution state local; do not expose the entire .foreman directory.
Preserve test fixtures and archival evidence. During consolidation, retain
history and acceptance states, and record any ID remapping explicitly.

## Coordinated documentation

Foreman, Hush and Razor main branches are edition selectors containing README.md,
LICENSE, the two logo SVGs and the minimal documentation check in
.github/check-main-frontpage.cjs and .github/workflows/test.yml. Use
check-main-frontpage.js for that contract; the paired README rules below apply
to Claude/Codex editions. Keep product runtime and unrelated CI out of main,
and publish linked edition branches before their selector. Flint is explicitly
outside this cleanup.

Benchmark runners, datasets, measurement tests and experiments belong in
Foundry's `benchmarks/<plugin>/`, not inside the installable plugin. Product
functional tests stay in the plugin. Use `.scratch/` for maintenance output,
backups and temporary validation dependencies; do not recreate `.benchmarks/`.

The Claude and Codex README of each plugin share their product narrative,
headings, order, common outcomes and decorative branding. Change common content
in both editions together. Only the six bounded native exceptions may differ:
identity, installation, commands, compatibility and actual availability,
benchmarks, and edition-specific links. Main headings stay outside exceptions.

Benchmark questions and columns stay the same. Results identify the actual host,
model, source and date. Preserve negative results and limits. Never relabel a
Claude measurement as Codex evidence, infer performance from unit tests, or fill
missing results with invented values. Use `Not measured` and state when an edition
is unavailable. Keep research and extensive methodology in Foundry documentation;
keep usage guides and plugin-specific decisions with their plugin.

Use `coordinate-readmes` for paired README changes and benchmark updates. Run
`node scripts/git-hooks/check-readme-parity.js --pair <Claude-README> <Codex-README>`
and `check-readme-nav.js` before considering the change ready. For committed
revisions use `--git-pair <plugin-repo> <Claude-ref> <Codex-ref>`. Also inspect the
original evidence: parser success is not proof of measurement quality.

Both native review agents use the Foundry README template and the same review
criteria. Platform-specific skills, rules and CI must keep this policy aligned.
Foundry hosts both platforms; its plugin-only platform-isolation rule does not
apply to the parent repository.
Common README changes in separate platform PRs use the reciprocal PR/SHA
protocol in `.github/README_COORDINATION.md`. A candidate-pair check does not
replace the final integrated-branch comparison before selectors or pins publish.
