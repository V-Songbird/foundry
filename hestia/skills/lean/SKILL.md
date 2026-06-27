---
name: lean
description: Controls Hestia's companion verbosity — how assertively the session brief enforces standing orders (phase discipline, lean/YAGNI, truth-grounding, scope control). Set trim, lean, bare, or off.
when_to_use: Use when the user wants to change how assertively Hestia's companion brief enforces standing orders — "be lazy", "lean mode", "simplest/minimal solution", "do less", "make Claude lazier", "tone down the companion", or invokes /hestia:lean [trim|lean|bare|off].
argument-hint: [trim|lean|bare|off]
allowed-tools: Read, Write, AskUserQuestion
---

# Companion verbosity control

Hestia injects a companion brief into every session automatically — standing orders covering lean code, phase discipline, truth-grounding for niche domains, scope control, and memory hygiene. This skill sets the *verbosity* of that brief for the current project, or shows the current setting. The level is stored in `.hestia/lean-mode` and read by the session hook.

## Levels

- **trim** — light. All standing orders present but stated once, concisely.
- **lean** — default. Standing orders with enough context to apply them confidently.
- **bare** — minimal. Lean + truth-grounding only — the most critical pair.
- **off** — no companion brief injected.

## Steps

1. **Read the requested level from `$ARGUMENTS`.**
   - If it is one of `trim`, `lean`, `bare`, `off` → go to step 3.
   - Otherwise → go to step 2.

2. **No clear level given — ask.** First Read `.hestia/lean-mode` (if it is absent, the current level is `lean`). Then MUST invoke `AskUserQuestion`:
   - header: `Companion verbosity`
   - multiSelect: false
   - options: `trim`, `lean`, `bare`, `off` — each with its one-line description from the list above, and mark which one is current.

3. **Save it.** MUST invoke `Write` to put the single lowercase word in `.hestia/lean-mode` (create the `.hestia/` folder if it does not exist). If the file already exists, Read it first.

4. **Confirm in plain language.** Tell the user the new verbosity level, what it means in one sentence, and that it applies to this project from now on and takes effect for the rest of this session.
