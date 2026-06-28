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

- **trim** — light. Every standing order, but a single terse line each (no detail).
- **lean** — default. Every standing order in full — the detail needed to apply it confidently.
- **bare** — minimal. Only the two critical orders (lean + truth-grounding), terse; the rest are dropped.
- **off** — no companion brief injected.

Each level changes what the SessionStart hook actually injects — `bare` < `trim` < `lean` in size — not just the tone.

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

## Standing-order self-audit (optional)

An always-on order that is frequently irrelevant trains Claude to tune out all of them. The injection ledger turns that risk into a measurable signal: each session can record whether a standing order *mattered* (`confirm`) or *fired but was irrelevant* (`dispute`), and the summary shows which orders earn their always-on slot.

- **Record a verdict** when an order demonstrably mattered or clearly didn't this session. MUST invoke `Bash` with `description: "Record a standing-order verdict"` and command `python "${CLAUDE_PLUGIN_ROOT}/scripts/injection_ledger.py" confirm <order-id>` (or `dispute <order-id>`). Order ids: `lean`, `phases`, `truth-grounding`, `scope`, `memory`. Example: a `hestia:later` marker caught real scope creep → `confirm scope`.
- **Show the summary** when the user asks how the standing orders are performing, or wants to know which to drop or rescope. MUST invoke `Bash` with `description: "Summarize the injection ledger"` and command `python "${CLAUDE_PLUGIN_ROOT}/scripts/injection_ledger.py" summary`, then relay the output. The summary reports plain confirm/dispute counts and a descriptive note (e.g. "order X: 0 confirms / N sessions — candidate to drop or rescope"). The candidacy is descriptive only — never auto-drop an order; that is a human decision.

This is a self-audit signal, not enforcement. The ledger lives in `.hestia/injection-ledger.jsonl` (gitignored) and is created on first write.
