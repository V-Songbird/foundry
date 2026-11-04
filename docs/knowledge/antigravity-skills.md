---
type: knowledge
summary: "Which skill folders the Antigravity CLI (agy 1.5.0) lists in a workspace, including Foundry's .agents/skills/, which frontmatter it shows, and what remains unverified; read before claiming Antigravity support in a skill's compatibility line."
related_files:
  - .agents/skills/cut-release/SKILL.md
  - .agents/skills/brand/SKILL.md
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

## Not verified

- Whether Antigravity honors `disable-model-invocation`, Codex's `agents/openai.yaml` policy or
  any other setting that limits when the model may use a skill. A listed skill is offered to the
  model.
- Whether the enclosing-folder lookup stops at the Git repository root or continues further up.
