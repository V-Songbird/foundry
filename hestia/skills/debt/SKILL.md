---
name: debt
description: Harvest every `hestia:later` comment in the codebase into a ledger of deferred shortcuts, each with its ceiling and the trigger to revisit it. Read-only.
when_to_use: Use when the user wants to see deferred shortcuts — "what did we defer", "list the shortcuts", "lean debt", "hestia debt", "what did lean mark to do later", or /hestia:debt.
allowed-tools: Bash, Read, Grep, Glob
---

# Lean debt ledger

Lean mode marks deliberate shortcuts with `hestia:later` comments. This skill collects them so they get revisited instead of rotting into "later means never". Read-only.

## Steps

1. **Find the markers.** MUST invoke `Grep` for `hestia:later` across the repository (any comment style). Skip `node_modules`, `.git`, and build output directories.

2. **Parse each marker.** A well-formed marker reads `hestia:later <what was deferred> — revisit when <trigger>`. Split on `revisit when` (case-insensitive) to separate the deferred work from its trigger. For each one, write a line:

   `path:line — what was deferred. revisit when: the trigger.`

   Tolerate older shapes: a `;` separator or a bare `hestia:later <what>` with no trigger clause still parse — treat anything after `revisit when` (or after `;`) as the trigger, and the rest as the deferred work.

3. **Flag the rotting ones.** A marker with no `revisit when` trigger gets `— NO TRIGGER (silent-rot risk)` appended. Those are the shortcuts that quietly become permanent: "later" with no observable condition to revisit on means "never".

4. **Tally.** End with one line: `N deferrals, M with no revisit trigger.`

If there are no markers, say so in one line.
