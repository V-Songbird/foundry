# Foreman repo mining — 2026-07-18

Private notes (gitignored dir). Eleven prompt-crafting / prompt-templating /
task-handoff repos cloned shallow to `D:\Projects\Knowledge\foreman-knowledge\`,
licenses verified from in-tree LICENSE files, mined against foreman's
`prompt-template.md` + `craft-prompt/SKILL.md` + `check-prompt.js`.

## License gates

- Code-compatible (MIT): prompt-polish, claude-code-prompt-improver,
  prompt-architect, prompt-master, claude-code-agents, prompt-optimizer
  (klausners), promptimal, prompt-ops (Meta). Apache-2.0: metaprompt mirror.
- **GPL-3.0 → idea-only/clean-room**: context-engineering-kit.
- **Provenance caution**: promptlint is MIT but its copyright line is
  template-copied from an unrelated project — treat idea-only.
- No PolyForm/Elastic/no-license traps in this pool.

## Per-repo verdicts (condensed)

| Repo | What it is | Verdict for foreman |
|---|---|---|
| prompt-polish (mfarzanansari) | Router SKILL.md + per-model doctrine files (fable-5.md, opus-4-8.md) distilled from the official Anthropic prompting guides. Installed here as the `prompt-polish` skill. | The one serious reference. Per-model **delete-on-sight noise lists**, refusal-aware polishing, placeholder budget (>4 → ask), API-settings-to-Note separation, "smallest tier that fits". Secondhand-official: cites the guides, no own benchmarks. |
| claude-code-prompt-improver (severity1) | UserPromptSubmit improver + JSON nudge-rule engine, research-first AskUserQuestion options grounded in actual code findings. | Complementary layer (inbound, not handoff). Research-grounded options idea noted; its "If this is not X, ignore this" high-recall wording is scenario-priming-shaped — A/B before borrowing any wording. |
| prompt-architect (ckelsoe) | 27 acronym frameworks (CO-STAR, RISEN…) routed by intent. | Folklore catalog, several rows contradict current Anthropic doctrine. Nothing adopted. |
| prompt-master (nidhinjs) | 27KB mega-skill, ~15 target tools, per-tool doctrine. Template M = agentic brief closest to foreman's shape. | Binary acceptance-criteria checkboxes + honest anti-technique list (bans ToT/GoT/USC as fabrication risks). Unsourced; idea-only parking. |
| context-engineering-kit (NeoLabHQ) | GPL marketplace; textbook patterns with fake-precise numbers ("CoT +30-50%"). | Nothing. Uniqueness confirmed. |
| claude-code-agents (undeadlist) | 24 subagent prompts + orchestrator conventions. | Agent Status Protocol (YAML status block: COMPLETE/PARTIAL/SKIPPED/ERROR + skipped_checks[]) — candidate third output_format flavor for orchestrated destinations. Parked, no demand signal yet. |
| prompt-optimizer (klausners) | promptfoo-loop rewriter: judge scores → rewrite prompt embeds failing rubric; placeholder-preservation reject. | The gate-error-as-rewrite-rubric loop; check-prompt.js errors are already rubric-like. Parked. |
| metaprompt (pizofreude) | Mirror of Anthropic's metaprompt Colab. | Nothing — foreman's template IS the domain-specialized metaprompt. |
| promptimal (shobrook) | GA optimizer, LLM self-eval fitness. | Cautionary reference only (self-eval judge bias; pre-2025 folklore categories). |
| promptlint (korchasa) | Go CLI, LLM-judge lint vs YAML rules. | Rule-file shape (name/rule/reason/fix/badExample/goodExample) is good; rule content is stale folklore. Idea-only. |
| prompt-ops (meta-llama) | DSPy-adjacent Llama prompt migrator/optimizer, bandit + judge. | Validates foreman's premise: a prompt tuned for model A is an artifact to migrate, not reuse. Machinery out of scope for one-shot handoffs. |

## Uniqueness confirmation (nothing else in the pool has these)

- Mechanical gate that re-reads canonical blocks FROM the template at runtime
  (no drift copy) — zero analogues; other "gates" are prose, packaging checks,
  or paid LLM calls.
- Config-driven section injection/omission with per-tag validity rules.
- Destination-aware assembly incl. the background-Agent tone carve-out.
- First-party benchmark grounding for per-model elaboration.
- Roadmap-entry lifecycle embedded and gate-verified in the handoff.
- REQUIRED runnable verification command with expected output — nobody else
  enforces one.

## Ranked adoptable ideas (all idea-only unless noted)

**Status 2026-08-01:** idea 1 is DEAD — targetModel was removed at the 1.0 close (entry 146). Idea 2 SHIPPED (check-prompt.js:336 warns on reasoning-echo phrasing). Ideas 3 and 5 are roadmap entries 074 and 075 (deferred); idea 4 is entry 076 (rejected).

1. **Per-model delete-on-sight noise lists** (prompt-polish doctrine files;
   ultimately official-guide content foreman already cites as source-d).
   targetModel today says how much to ADD; the subtraction half is missing.
   → adopt pending ground-truth workstream confirmation against the official
   guides themselves.
2. **Refusal-aware crafting** + mechanical reasoning-extraction phrase check
   in check-prompt.js ("show your reasoning / think out loud" → warning) —
   prevents handoffs that dead-end in stop_reason:"refusal" on Fable-class
   models. → adopt pending confirmation from official docs.
3. Research-grounded AskUserQuestion options (severity1). Conflicts with
   deliberate craft-prompt design (files come from the user; no exploration
   in the pick path). NOT adopted without user decision.
4. Structured status-block output flavor (undeadlist). Parked — no evidence
   of demand; would sit beside Workflow-stage flavor if ever needed.
5. Gate-error {error, fix, example} schema + feed-back-verbatim repair loop
   (klausners/korchasa shapes). Parked — current string errors already drive
   the 12/12 gate-clean result; no measured deficiency.

Honorable mention: prompt-polish is MIT and installed — craft-prompt could
invoke it for a final model-specific polish pass instead of duplicating
per-model doctrine. Cross-plugin coupling decision → user call, not taken
unilaterally.
