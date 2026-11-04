---
type: knowledge
summary: "Which skill folders the Antigravity CLI (agy 1.5.0) lists in a workspace, including Foundry's .agents/skills/, which frontmatter it shows, how disable-model-invocation hides a skill from the model, and what remains unverified; read before claiming Antigravity support in a skill's compatibility line."
related_files:
  - .agents/skills/cut-release/SKILL.md
  - .agents/skills/brand/SKILL.md
  - .claude/skills/brand/SKILL.md
---

# Skills on Antigravity

This page records which workspace skills the Antigravity CLI, `agy`, offers its model. Read it
before you add or remove Antigravity in the `compatibility` line of a skill under
`.agents/skills/`.

## What Antigravity lists

Observed with `agy` 1.5.0 in print mode, with the folder passed through `--add-dir`:

| Skill location | Listed |
| --- | --- |
| `.agents/skills/<name>/SKILL.md` in the workspace folder | Yes |
| `.agent/skills/<name>/SKILL.md` in the workspace folder | Yes |
| `.agents/skills/` of a folder that encloses the workspace folder, such as the Foundry checkout around a subfolder | Yes |
| `.claude/skills/` | No |

Skills from enabled Antigravity plugins appear in the same list.

In a Foundry checkout, Antigravity therefore finds `brand` and `cut-release` in their
`.agents/skills/` copies. Both name Antigravity in their `compatibility` line. `cut-release`
carries `disable-model-invocation: true`, so the model is not offered it and it runs only when
the user invokes it as `/cut-release`.

## Frontmatter

- Antigravity shows each skill's `name` and `description`.
- A `SKILL.md` that also carries `license`, `compatibility` and `metadata` is still listed.
- A skill marked `disable-model-invocation: true` is left out of the list the model sees. The
  user can still invoke it in a prompt as `/<name>`, which expands the skill's body, also in
  print mode.

## Repeat the check

Use this to confirm the first two rows of the table above and the frontmatter claims after a new
`agy` release. The enclosing-folder row needs one more control skill in a folder that encloses
the project, and the `.claude/skills/` row one more in that folder. It needs the `agy` CLI and
starts one model session.

1. Create an empty throwaway project folder outside any Foundry checkout.
2. In it, add a skill at `.agents/skills/quokka-ledger/SKILL.md` and a control skill at
   `.agent/skills/heron-ledger/SKILL.md`. Give each the `name`, `description`, `license`,
   `compatibility` and `metadata` keys, so the run also shows whether the extra keys matter.
   Use a different word in each skill, so the answer shows which one was listed.
3. Remove the `CLAUDE*` variables from the environment of the run, and point `TEMP` and `TMP` at
   a scratch folder.
4. Start `agy` from the project folder in print mode, with the folder passed through
   `--add-dir`: `agy -p "<prompt>" --add-dir <project> --output-format stream-json`. The prompt
   forbids reading files and running commands, and asks the model to list the name and
   description of every skill it has, then to state whether each of the two skills is among them.
5. Read the reply. A skill the model names is listed; a skill it does not name is not.

To test another location, such as `.claude/skills/`, add one more control skill there.

To check `disable-model-invocation`, run the same steps with two skills under
`.agents/skills/`: one marked `disable-model-invocation: true` and an otherwise identical
control without the key. The marked skill must be missing from the reply and the control
present. Then start a second run whose prompt begins with `/<marked name>` and forbids reading
files. Give the marked skill a body that asks for a reply word the model cannot guess from the
name. The run's `init` event lists the skill under `expanded_commands`, and the reply carries
that word.

## Not verified

- Whether Antigravity honors Codex's `agents/openai.yaml` policy.
- Whether the enclosing-folder lookup stops at the Git repository root or continues further up.
