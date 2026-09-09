# Wave 2 design — the attention release

Date: 2026-07-28. Status: SHIPPED — all six wave entries built and released; historical design record. Thesis: product-review-2026-07-28.md §3.1.
Deviation from this design: model-fit.md was never extracted — the whole model-advice surface (`model-fit.md`, `modelSuggestions`, `targetModel`) was deleted instead (CHANGELOG.md:137). Ignore the model-fit clauses at :39-40, :81, :95-97 and :131. §5's "commit as benchmarks/records/…" predates ADR 0004 (2026-08-11) — records are gitignored run data and are never committed; only the README number publishes.
Baseline: foreman main a22e207, 964 tests, R-004 draft (docs/foreman/research/R-004-instruction-load-draft.json).

## The problem, in one number

A fast pick loads ~25.5k est. tokens of instructions before ranking a single entry:

| File | bytes | est. tokens |
| --- | --- | --- |
| skills/foreman/SKILL.md (entrance) | 5,063 | ~1.3k |
| skills/roadmap/SKILL.md | 43,292 | ~10.8k |
| prompt-template.md | 53,637 | ~13.4k |

The README claims the pick "costs next to nothing". Large parts of that load are assembly
instructions for a structure a script could emit — SCOPE.md's mechanical-first rule says
exactly this should be computed, not read.

## Design

### 1. `scripts/craft-handoff.js` — assembly becomes a script call

New standalone script (sibling to render-sections.js / resolve-symbols.js / check-prompt.js;
NOT a roadmap.js subcommand — roadmap.js is the 2.5k-line ledger CLI, assembly is a different
concern, and the sibling scripts already set the pattern; deviation from the strategy doc's
`roadmap.js craft-handoff` phrasing, same product idea).

One call, stdin JSON + flags, one JSON line out (house style):

```
echo '{"entry":"012","destination":"task","judgment":{...}}' | node scripts/craft-handoff.js
```

The script does everything mechanical, in-process (all four helpers already export modules):

- loads the selected entry from ROADMAP.jsonl (title/why/what/notes/planned_touches/
  depends_on/kind/updated_at/commits/observed_touches/depends_on_docs);
- runs render-sections (config: usePersona, omit, customSections, targetModel, fableEnabled,
  modelSuggestions, requireVerification, decisionLog) and resolve-symbols (symbol map,
  missing/unresolved/outside_project, references, lastChanged, verification resolution);
- computes the handoff profile from the five mechanical signals (resumed / conflicting —
  collision recomputed internally against in_progress entries — / stale / highly
  constrained / risky) and returns `profile` + `signals` so the skill can state them;
- assembles the full XML: fixed blocks (truth_grounding, scope_discipline, plan, no-invention
  line, closing paragraph, tone/output_format defaults, decision_log, background-agent
  paragraph) read out of prompt-template.md at run time — the exact mechanism check-prompt.js
  already uses, so there is still exactly one copy of every guardrail block;
- bakes the entry paragraph completely: id substitution, requireVerification acceptance hold,
  decision-doc close field, executing model when given, `${CLAUDE_PLUGIN_ROOT}` as the
  literal string;
- when the destination is a task split or clipboard with ≥2 checks: emits the split
  (`tasks[]`, one row per Run:/Expected: pair, full prompt on row 1, entry paragraph on the
  last row only) and/or the checkpoint block with the `checkpoints` config values already
  resolved and baked — the clipboard embed and the in-session checkpoint protocol become one
  script-baked artifact instead of two prose procedures;
- runs check-prompt.js in-process as the final gate and returns
  `{ok, prompt, profile, signals, tasks?, gate, warnings}`. A gate failure is a script bug
  by construction, but the field stays so nothing is trusted silently.

The model's remaining job is only the judgment the script cannot do, passed as `judgment`:
role + goal sentence, context prose, invariants written as observable assertions, task_rules
steps/constraints, and the Run:/Expected: pairs. All of it comes from the selected entry's
own fields — the no-investigation rule is unchanged.

Entry-less mode (no `"entry"` key, all fields via stdin) serves `craft-prompt`, so both
crafting flows converge on one assembler.

### 2. Split skills/roadmap/SKILL.md — menu + four branch files

Keep ONE `foreman:roadmap` skill. Four separate skills would put four more frontmatter
descriptions into every session's skill list (a cost paid even when Foreman is never used)
and add commands to learn — both against install-and-forget.

SKILL.md shrinks to frontmatter + the shared header + Call 1 (menu/args routing) + one line
per branch: "Read `${CLAUDE_PLUGIN_ROOT}/skills/roadmap/<branch>.md` and follow it." (~2k
bytes). The branches move verbatim-first, then pick is rewritten:

| File | Content | est. size |
| --- | --- | --- |
| pick.md | Fast pick rewritten around craft-handoff: menu → Q1 → selected load → Q2/Q3 (Q4 gated on modelSuggestions) → gather judgment fields → ONE craft-handoff call → deliver. Reconcile-and-pick, finish-first, resume-via-agent, defer flow all stay. Compact delivery mechanics inline (TaskCreate/Agent/clipboard calls + chaining — the parts only a model can do). | ~13k bytes |
| add.md | current Add branch, unchanged | ~4.5k |
| correct.md | current Correct branch, unchanged | ~3.5k |
| status.md | current Review status branch, unchanged | ~2.5k |

The entrance table's branch names stay identical — it routes to the same skill and names the
same branches.

### 3. prompt-template.md changes role: canonical source for scripts, not session reading

No flow instructs loading it anymore. It stays as the single source of the fixed blocks
(check-prompt.js and craft-handoff.js both read it at run time; tests pin it), so it remains
load-bearing but costs sessions nothing.

- Model fit / Effort fit / Match-the-recommendation notes move to a small
  `model-fit.md`, loaded only when `modelSuggestions` is `true` (default `false` — the
  common path never reads a word of it).
- Delivery/splitting/checkpointing prose shrinks: the split and checkpoint blocks are
  script-baked (see 1); what stays in pick.md / craft-prompt is only the tool calls.
- craft-prompt/SKILL.md rewires its assembly step to craft-handoff's entry-less mode; its
  interview (Calls 1–6) is judgment and stays.

### 4. Rider: a doctor route (gap 3.3)

"My roadmap is broken / check it" currently routes nowhere, and repairability is the stated
top priority. Smallest fix: a row in the entrance table + a fifth menu option in
foreman:roadmap ("Check the roadmap") that runs `roadmap.js doctor`, renders the report in
plain words, and names the repair command (`migrate`, `correct`, `update-deps`,
`archive/restore`) for each finding. A tiny doctor.md branch file (~1.5k).

### 5. R-004 finalized + README reworded (needs explicit user go — this doc's approval is it)

After the wave lands: re-measure per-flow instruction load with the same bytes/4 method,
shape via validate-records.js, commit as benchmarks/records/R-004-instruction-load.json,
and reword the README's cost claim to what the new number supports, pointing at the record.
Publishing an unflattering-but-true number beats a claim a user disproves on day one.

## Expected numbers (targets, re-measured at the end)

Fast pick after: entrance ~5.1k + menu SKILL.md ~2k + pick.md ~13k ≈ 20k bytes ≈ **~5k est.
tokens**, from ~25.5k — an ~80% cut. craft-prompt drops prompt-template.md (~13.4k tokens)
the same way. No flow loads roadmap-schema.md or prompt-template.md as a matter of course.

## Wave plan — six entries, one commit each, sequenced

1. **craft-handoff.js + tests** — script + entry-less mode + split/checkpoint baking +
   in-process gate. Prose paths untouched; nothing routes to it yet. The biggest entry.
2. **Split SKILL.md into menu + add/correct/status branch files** — moves, no rewrites.
3. **pick.md rewrite around craft-handoff** — the attention payoff; delivery mechanics
   compacted inline.
4. **craft-prompt via craft-handoff + template slimming + model-fit.md extraction.**
5. **Doctor route** — entrance row + menu option + doctor.md.
6. **R-004 re-measure/finalize + README cost-claim rewording.**

Suite green before every commit; entries flow to awaiting_acceptance; adversarial review
after the wave; no release, no push.

## Risks / notes

- Judgment quality is unchanged by design: the gate still checks structure, not content —
  same as today, with far less structure left to get wrong.
- Slimming prompt-template.md must not break check-prompt.js's canonical-block extraction —
  the existing tests pin those blocks; entry 4 runs under that constraint.
- Decision docs 101/107/109/111/116/119/121/138/141 govern parts of the moved text; the
  moves keep their governed wording intact and the anchors travel with it.
