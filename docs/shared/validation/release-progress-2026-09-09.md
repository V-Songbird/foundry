# Reorganization release progress — 2026-09-09

The owner authorized version bumps and marketplace pins for both platforms.
Codex installation updates are performed here; updating installed Claude plugins
is reserved for the owner. Flint and the unavailable Hush/Codex package remain
outside the release set.

| Platform | Plugin | Version | Published commit |
| --- | --- | --- | --- |
| Claude | Foreman | 2.6.1 | fc656b418473568587a06c9e68b3d0afff575859 |
| Claude | Hush | 1.11.6 | 44c7bee36f3818ac6b616f0c57d4a8bafb5824ae |
| Claude | Razor | 1.5.9 | 9a43278fe87b194fca3fcb4b20de9c72217bd27a |
| Codex | Foreman | 3.0.1-codex.1+codex.20260909081411 | 006dd0d19dfe957b9ab32279ca8d20aa1806bb9d |
| Codex | Razor | 1.5.9-codex.1+codex.20260909081411 | 0d0eec20355c5494115be82a99db9a9327633d26 |

Both native branches were published atomically per repository. Hush/Codex also
has its documentation commit, a3e373d333714e56b00a36dcb06b76028c9716e7, without an
installable manifest or marketplace entry. Catalog pins were changed only after
the corresponding commits were confirmed remotely reachable.

## Installation evidence

Both Codex plugins were updated through the configured Foundry marketplace and
installed separately into a new empty Codex home. All 140 Foreman files and 96
Razor files in both installations match the published Git blobs byte for byte.
Installed entries remain enabled and report the expected versions and pins.
No Claude installation was changed. This proves installation/package contents,
not every hook's activation on another user's machine.

## CI and remaining blockers

Claude runtime checks and both editions' README/platform checks pass. Razor's
Codex runtime matrix passes on Linux, Windows and macOS after CI was configured
to preserve committed line endings and use a canonical temporary directory.

Foreman/Codex passes Linux, but its Windows launcher test still fails. Its
existing hooks.json contains the machine-specific executable
`D:/DevCache/fnm/aliases/default/node.exe`. The runner lacks that path. The
installed package on the owner's machine has it, which explains the local pass.
No hook command or runtime logic was changed to conceal this limitation.
Fixing that launcher requires a separately authorized exception to the
no-plugin-internals boundary before this release can be called portable.

The three main-selector PRs have passing checks and require review:
[Foreman #1](https://github.com/V-Songbird/foreman/pull/1),
[Hush #3](https://github.com/V-Songbird/hush/pull/3),
[Razor #1](https://github.com/V-Songbird/razor/pull/1).
They have not been merged and no protection bypass was used. Foundry's aggregate
selector check will require their final trees to be integrated first.

The previously proposed rulesets have not been applied while a required runtime
check remains failing. Current preservation allows only the two authorized
version fields and the two documented guide URLs to differ from the original
baseline; product behavior is otherwise unchanged.

Local receipts and exact-byte comparison results are in
`.scratch/consolidation/installed-release-verification.json`,
`clean-codex-install-results.json` and `updated-codex-list.json`.
