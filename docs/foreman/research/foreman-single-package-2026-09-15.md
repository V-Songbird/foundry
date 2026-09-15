# Foreman as one package for Claude Code and Codex (2026-09-15)

## Question

The owner asked to combine Foreman's Claude Code and Codex editions into one
plugin with one line of development, because two edition branches drift in
ways nobody can track objectively. The end state is one version, working for
both assistants, on the foreman repository's `main` branch.

## Result

Built and verified locally on foreman branch `unify/single-package` (started
from `Claude` at `22f2f0a`; package commit `f02f394`), with the matching
Foundry changes on branch `chore/foreman-single-package` (`ef5436fd`: checks
that derive each plugin's layout from the catalogs, plus ADR 0011;
`36151524`: documentation). Nothing was pushed, installed or measured with a
model. Publication needs the owner's approval (see the last section).

## The two editions before the merge

Compared `origin/Claude` `22f2f0a` (Claude Code 2.7.0) with `origin/Codex`
`9bc76c6` (Codex 3.0.4-codex.1); merge base `4eb352c` (2.6.0).

- 156 paths: 62 identical, 57 different, 5 only on `Claude`, 32 only on
  `Codex`. `git diff --stat`: 94 files, +5104/−4345.
- Runtime JavaScript was mostly a Codex superset of the Claude code.
- The skills were two separate texts: every `SKILL.md` and roadmap branch file
  shared almost no lines. `prompt-template.md` had 695 lines on `Claude` and
  259 on `Codex`, 154 of them common.
- A line-by-line inventory of the skills and the template found 280
  divergences (139 in the roadmap flow, 141 in the entrance, craft-prompt,
  survey, init and the template). About a third were behavioral policy
  differences, for example whether an explicit request still needs a
  confirmation question, how a question is counted in the trial log, and when
  a split run may make checkpoint commits.

## Host facts the layout relies on

### Codex CLI 0.154.0

Read at tag `rust-v0.154.0`, the version installed on this machine.

- Manifest discovery tries `.codex-plugin/plugin.json` before
  `.claude-plugin/plugin.json`
  ([protocol.rs:47](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/exec-server-protocol/src/protocol.rs#L47)).
- The manifest accepts a `hooks` field
  ([manifest.rs:65](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/manifest.rs#L65);
  present since
  [rust-v0.145.0](https://github.com/openai/codex/blob/rust-v0.145.0/codex-rs/core-plugins/src/manifest.rs#L44)).
  Manifest hook paths are used instead of the default `hooks/hooks.json`
  ([loader.rs:1198](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/loader.rs#L1198),
  default at [loader.rs:1230](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/loader.rs#L1230)),
  and manifest skill paths replace the default `skills/` directory
  ([loader.rs:1085](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core-plugins/src/loader.rs#L1085)).
- A hooks file rejects unknown top-level keys but ignores event names it does
  not know
  ([hook_config.rs:11](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/config/src/hook_config.rs#L11)).
  On Windows a handler's `commandWindows` replaces `command`
  ([discovery.rs:514](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/hooks/src/engine/discovery.rs#L514)),
  `${KEY}` placeholders are substituted
  ([discovery.rs:568](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/hooks/src/engine/discovery.rs#L568)),
  and hooks receive `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `PLUGIN_DATA` and
  `CLAUDE_PLUGIN_DATA`
  ([discovery.rs:265](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/hooks/src/engine/discovery.rs#L265)).
  The default hook shell is `%COMSPEC%` (`cmd.exe /C`) on Windows and
  `$SHELL -lc` elsewhere
  ([command_runner.rs:428](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/hooks/src/engine/command_runner.rs#L428)).
- Shell commands receive `CODEX_SESSION_ID`, `CODEX_THREAD_ID` and
  `CODEX_VERSION`
  ([exec_env.rs:13](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/core/src/exec_env.rs#L13)).
- Skill frontmatter parsing retries a YAML error with a line-oriented repair
  of scalar fields
  ([parser.rs:52](https://github.com/openai/codex/blob/rust-v0.154.0/codex-rs/skills/src/parser.rs#L52)).
- The local plugin-creator validator rejects the manifest `hooks` key, and the
  skill-creator validator rejects `when_to_use` and `argument-hint`
  frontmatter keys. Both disagree with the runtime above; the package accepts
  those two validator failures.

### Claude Code 2.1.271

- The [plugins reference](https://code.claude.com/docs/en/plugins-reference),
  fetched 2026-09-15: `hooks/hooks.json` loads automatically, the `skills/`
  directory is always scanned, and a plugin's version resolves from
  `plugin.json` first, then the marketplace entry, then the commit SHA, with
  `plugin.json` silently winning when both are set.
- Hooks receive `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA` and
  `CLAUDE_PROJECT_DIR`, and no `PLUGIN_ROOT`.
- `claude plugin validate` passes on the unified package.

## Layout

```text
.claude-plugin/plugin.json   Claude Code manifest, version 3.1.0
.codex-plugin/plugin.json    Codex manifest, version 3.1.0, interface, hooks -> ./hooks/codex-hooks.json
hooks/hooks.json             Claude Code registration (Codex skips it because of the manifest field)
hooks/codex-hooks.json       Codex registration, with encoded Windows launchers
hooks/*.js, scripts/*.js     one runtime; scripts/runtime.js detects the host
skills/                      five skills, one text each for both assistants
prompt-template.md           one template; wording that differs is a host="claude"/"codex" block
tests/                       one suite covering both hosts
```

- Host detection: `FOREMAN_HOST`, otherwise Codex when `PLUGIN_ROOT`,
  `CODEX_THREAD_ID` or `CODEX_SESSION_ID` is set, otherwise Claude Code.
  Scripts find the project from `FOREMAN_PROJECT_DIR`, then `CODEX_CWD`, then
  `CLAUDE_PROJECT_DIR`, then the working directory.
- Two registration files instead of one shared file: a shared file would make
  each host run the other's no-op hooks (Stop on Claude Code, the context
  reader on every Codex shell call).
- The handoff assembler takes a `host` input and the prompt gate a `--host`
  flag. Each host's handoff keeps its edition's guardrail wording.
- The version lives in both manifests, kept equal by a test; the Foundry
  catalogs pin the same `main` commit and carry no Foreman version.

## Decisions taken while merging

- One text per behavior. Host-specific lines name their host. Differences kept
  on purpose: tool mechanics (question tools, task tools, delegation, clipboard
  and shell forms), handoff guardrail wording, and reviewed increments.
- Reviewed increments (approval after each result) stay Codex-only: the owner
  authorized that contract for Codex alone, pending its evaluation.
- Where the editions disagreed on policy, one rule now applies to both, chosen
  by recorded evidence where it existed: an explicit, fully specified request
  authorizes that change and inferred changes still need a question; a trial
  `question_asked` is one question interaction on either host; checkpoint
  commits follow `safe-commit.js begin`'s `dirty` field; the end-of-run finish
  choice is saved once answered; init records goals drafted from the
  repository as suggested work and commits only its own files; a question
  handoff investigates and never implements a fix.
- The Claude Code standard profile still drops context and invariants blocks
  (a measured decline, `foreman-prompt-eng-measurements-2026-08-18.md`), while
  the Codex profile keeps them; both are recorded as host-specific.

## Evidence

Package commit `f02f394` on foreman branch `unify/single-package`.

- Test suite: 1514 tests, 1514 passing, on Windows with Node.js 22 (the
  pre-commit hook's run). The suite loads host-free: `tests/helpers.js`
  removes inherited `FOREMAN_*`, `CODEX_*`, `CLAUDE*`, `PLUGIN_ROOT`,
  `PLUGIN_DATA` and `GIT_*` variables, and host-specific tests pass their host
  explicitly.
- Handoff output, 10 cases per host, compared byte for byte with each former
  edition. Codex: 9 identical; the tenth, a clipboard split for a roadmap
  entry, now reads `safe-commit.js begin` before task 1 instead of plain
  `git status`, so opening the entry no longer disables its checkpoints.
  Claude Code: 5 identical; the others carry that same checkpoint change, the
  investigation and decision rules, and the reinforced scope rule that logs
  mid-session work as the user's own entry awaiting acceptance.
- Hook registrations run the way each host launches them on Windows (Claude
  Code through PowerShell, Codex through `cmd.exe /C` and the encoded
  PowerShell launcher): both deny a direct `ROADMAP.jsonl` edit, Codex also for
  `apply_patch`; the commit hook returns each host's own discovery text; the
  context reader stays silent without a configured window.
- The Codex Windows launcher now probes PATH with `where.exe`, after a Razor
  measurement on windows-latest found `Get-Command` misses and `Join-Path`
  taking 17–44 s with a cold PowerShell module cache. On this machine, with
  Node removed from PATH and a fresh module cache path, the guard hook took
  1.5–1.9 s before and 0.5 s after (three runs each); the long stall itself
  did not reproduce here.
- Validators: `claude plugin validate` passes. The Codex plugin-creator
  validator rejects only the manifest `hooks` key, and the skill-creator
  validator only the `when_to_use` and `argument-hint` keys.
- An adversarial review of the merged skills and documentation found 22
  issues; the ones that changed behavior or contradicted the code were fixed
  before the commit.
- Not established: live hook activation and skill behavior on either host,
  Codex's hook trust prompt after the registration file changes, and any
  model-measured quality difference.

## Publication sequence (owner approval required)

1. Push `unify/single-package` and open a pull request into foreman `main`;
   confirm the `test` check and both `Suite` runs pass.
2. Change foreman's default branch to `main` before merging, so the `default`
   ruleset protects it.
3. Merge through the owner's chosen approval route; record the `main` SHA.
4. Freeze the `Claude` and `Codex` branches (restrict updates, keep them
   readable) so earlier pins stay reachable.
5. Foundry: merge the layout-aware checks and ADR 0011, then the catalog pull
   request pinning both catalogs to the `main` SHA with no Foreman version,
   the gitlink at the same SHA, and the documentation.
6. Check an update on clean Claude Code and Codex homes (installs need
   approval).

## Risks

- Existing Codex users may be asked to review and trust the hooks again,
  because the registration file changed. Not observed.
- Codex behavior above is pinned to 0.154.0 source; re-check on upgrades.
- Claude Code users see behavior changes listed in the 3.1.0 changelog, most
  visibly fewer confirmation questions for explicit requests.
