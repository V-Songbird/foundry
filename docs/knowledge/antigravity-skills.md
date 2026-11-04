---
type: knowledge
summary: "Which skill folders the Antigravity CLI (agy 1.5.0) lists in a workspace, including Foundry's .agents/skills/, which frontmatter it shows, and what remains unverified; read before claiming Antigravity support in a skill's compatibility line."
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

In a Foundry checkout, Antigravity therefore lists `brand` and `cut-release` with the
descriptions of their `.agents/skills/` copies. `brand` names Antigravity in its
`compatibility` line. `cut-release` does not: it must run only when the user asks for it, and
no known Antigravity setting stops the model from using a listed skill.

## Frontmatter

- Antigravity shows each skill's `name` and `description`.
- A `SKILL.md` that also carries `license`, `compatibility` and `metadata` is still listed.

## Repeat the check

Use this to confirm the table above after a new `agy` release. It needs the `agy` CLI and
starts one model session.

1. Create an empty throwaway project folder outside any Foundry checkout.
2. In it, add a skill at `.agents/skills/quokka-ledger/SKILL.md` and a control skill at
   `.agent/skills/heron-ledger/SKILL.md`. Give each the `name`, `description`, `license`,
   `compatibility` and `metadata` keys, so the run also shows whether the extra keys matter.
   Use a different word in each skill, so the answer shows which one was listed.
3. Start `agy` from the project folder in print mode, with the folder passed through
   `--add-dir`: `agy -p "<prompt>" --add-dir <project> --output-format stream-json`. The prompt
   forbids reading files and running commands, and asks the model to list the name and
   description of every skill it has, then to state whether each of the two skills is among them.
4. Remove the `CLAUDE*` variables from the environment of the run, and point `TEMP` and `TMP` at
   a scratch folder.
5. Read the reply. A skill the model names is listed; a skill it does not name is not.

To test another location, such as `.claude/skills/`, add one more control skill there.

## Not verified

- Whether Antigravity honors `disable-model-invocation`, Codex's `agents/openai.yaml` policy or
  any other setting that limits when the model may use a skill. A listed skill is offered to the
  model.
- Whether the enclosing-folder lookup stops at the Git repository root or continues further up.
