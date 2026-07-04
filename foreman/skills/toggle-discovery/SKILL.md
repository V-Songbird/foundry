---
name: toggle-discovery
description: Flip .foreman/config.json's discoverySuggestions flag on or off — whether the commit hook asks about newly-discovered roadmap opportunities after each git commit.
when_to_use: Trigger when the user wants to turn roadmap discovery suggestions on or off, says "toggle discovery", "enable/disable discovery suggestions", "stop asking about opportunities after commits", "turn on claude-suggested tasks", or invokes /foreman:toggle-discovery.
argument-hint: "<optional — on|off to skip the question>"
allowed-tools: AskUserQuestion, Read, Write, Bash, PowerShell
---

# foreman:toggle-discovery — flip the commit-hook discovery policy

`.foreman/config.json`'s one field, `discoverySuggestions`, controls whether
`hooks/post-commit.js` ever nudges Claude to scan a commit for roadmap
opportunities — see `roadmap-schema.md`'s `.foreman/config.json` section.
This skill is the one place besides `foreman:init` that writes that file.

**Pre-check**: if neither `ROADMAP.jsonl` nor `.foreman/config.json` exists
at the project root, tell the user to run `/foreman:init` first and stop
here — there's no per-project policy to toggle yet.

---

## 1. Read current state

`Read` `.foreman/config.json`. Missing or unparseable → current state is
`off` (matches how `post-commit.js` itself treats it — silent by default).
If the file is missing but `ROADMAP.jsonl` exists (someone deleted the
config independently), that's fine — step 3 creates it fresh.

---

## 2. Ask, unless args already said so

If args case-insensitively match `on`/`enable` or `off`/`disable`, skip
straight to step 3 with that target state.

Otherwise:

**Q1** — "Roadmap discovery is currently **on/off**. What do you want?"
Options:
- `Turn it on` — after every `git commit`, the hook asks Claude to scan for
  confirmed opportunities/bugs/ideas and offer to add them.
- `Turn it off` — the commit hook stays completely silent; nothing gets
  suggested until turned back on.
- `Leave it as-is` — no change, stop here.

---

## 3. Write, if the state actually changed

If the target state matches the current state (including the explicit
`Leave it as-is` pick), report "no change" and stop — no write, no commit.

Otherwise: read the existing `.foreman/config.json` object (empty object if
missing/corrupt), set `discoverySuggestions` to the target boolean, and
`Write` the result back — preserve any other keys already in the file
rather than overwriting the whole object, same care `roadmap.js` takes with
`ROADMAP.jsonl`'s other fields.

Then commit just this file, matching `foreman:init`'s own convention (this
file is a shared project artifact, not personal state):

```
git add .foreman/config.json && git commit -m "chore(foreman): <enable|disable> roadmap discovery suggestions"
```

Report back the new state in one line.
