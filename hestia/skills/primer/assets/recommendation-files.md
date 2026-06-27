# Instruction-File Hygiene

Rules that prevent Claude from creating or trusting stale references in
project instruction files. "Instruction files" below means CLAUDE.md,
README.md, AGENTS.md, and any file under `.claude/rules/`.

- After invoking `Bash` with `mv`, `git mv`, or `rm -r`, or after relocating code through `Edit`/`Write` (delete from one file plus create in another), Grep every instruction file for the original path before marking the task done.
  - When a match is found, update the citation to the new path or remove it.
  - Why: instruction files cite source paths as canonical, so an unaudited move leaves the next Claude session reading a path that no longer exists.

- After invoking `Bash` with `rename`, `mmv`, `find ... -exec mv`, or a `for f in ... do mv` loop, Grep every instruction file for each old basename touched by the rename pattern.
  - Capture the list of matching files before the rename runs so the old basenames are known.
  - Why: batch renames bypass the single-`mv` trigger of the rule above and leave dozens of stale paths in one shot.

- Before saving an `Edit` or `Write` to an instruction file, `Glob` every backticked path in the new content.
  - When a path does not resolve, remove or correct it before saving the edit.
  - Why: instruction files outlive the layouts they describe, so an unverified edit ships stale paths that the next session trusts as authoritative.

- Before saving an `Edit` to CLAUDE.md, README.md, or AGENTS.md that changes a stated rule or convention, Grep the other two files for the same claim.
  - When a sibling repeats the old wording, update it or replace it with a citation pointing to the new source of truth.
  - Why: contradictions between instruction files force the next session to guess which rule is current, eroding trust in all three.

- After an `Edit` that renames an exported function, class, type, or constant, Grep every instruction file for the old identifier.
  - Detect renames by diffing the old and new strings on the same `export`, `pub`, `def`, `class`, or `func` line.
  - Match both the bare identifier and its call form (`oldName(`).
  - Why: instruction files cite public APIs by name, so a rename leaves copy-pasteable examples that no longer compile on the next session.

- After an `Edit` to `package.json` `"scripts"`, a `Makefile` target, `pyproject.toml` `[project.scripts]`, or `Cargo.toml` `[[bin]]` that renames or removes a command, Grep every instruction file for the old command name.
  - Match the cited invocation form (`npm run build`, `make test`, `cargo run --bin foo`).
  - When found, update to the new command or remove the citation.
  - Why: instruction files quote build commands as canonical, so a removed `npm run check` invites the next session to run a script that fails.

- After an `Edit` that renames an environment variable in `process.env.X`, `os.environ["X"]`, `.env.example`, or a config schema, Grep every instruction file for the old key.
  - Match both the bare name (`API_URL`) and assignment form (`API_URL=`).
  - When found, update to the new key or remove the citation.
  - Why: docs pointing at `API_URL` after the loader switched to `API_BASE_URL` make the next session set the wrong variable and silently fall back to defaults.
