# foreman doc-alignment audit — 2026-08-05

Improvement-opportunity pass over foreman 1.0.0 (submodule HEAD `5a54955`, the
218–224 simplification wave awaiting acceptance), motivated by four first-party
Anthropic docs:

- "The new rules of context engineering for Claude 5 generation models"
- "A harness for every task: dynamic workflows in Claude Code"
- "Effective context engineering for AI agents"
- "A field guide to Claude Fable: finding your unknowns"

Mandate: strengthen existing capabilities under YAGNI — trim, align, sharpen;
no new features. Method: 19-agent workflow (4 subsystem mappers → 4 per-doc
finders seeded with the house evidence constraints E1–E9 → merge/dedup →
one adversarial YAGNI verifier per candidate, all with repo access,
default-to-kill). 14 raw candidates, 10 after merge, **1 survivor, 9 killed**.
Every kill reason below was grounded in files the verifier actually read.

## Headline

Foreman is already aligned with almost everything these docs recommend (§4).
The one surviving opportunity is instruction-dedup — and inside it sits a
**manifested defect worth fixing regardless**: `pick.md`'s inline checkpoint
protocol has drifted from the canonical copy.

## 1. Survivor — single-source the duplicated delivery-mechanics blocks (keep, measure-first)

Three of the four docs converge on the same rule (remove duplicate
instructions; progressive disclosure; just-in-time loading), and foreman
already ships the mechanism: `skills/roadmap/destination-question.md` declares
itself "the one copy" of the destination question (entry 223, accepted
pattern), and pick.md step 4 references craft-prompt's Call 6 by name rather
than restating it.

The remaining duplicated blocks, verified line-for-line:

| Block | Copies |
| --- | --- |
| Clipboard pipe-to-temp-file mechanics | pick.md:355-367, craft-prompt SKILL.md:305-320, prompt-template.md:579-586 |
| Checkpoint protocol | prompt-template.md:653-717 (canonical) + full inline copy at pick.md:315-342 |
| Background-Agent delivery bullet | pick.md, craft-prompt SKILL.md, prompt-template.md |
| Never-print-the-prompt rule | 3–4 sites |
| craft-handoff return-shape paragraph | pick.md:266-272, craft-prompt SKILL.md:264-269 |
| `${CLAUDE_PLUGIN_ROOT}` type-it-literally warning | 2 sites |
| Workflow-stage JSON-Schema authoring rules | prompt-template.md:366-373 (declared canonical), craft-prompt SKILL.md:121-131 (verbatim copy) |
| Destination question restated | prompt-template.md:558-571 vs destination-question.md (declared "one copy") |

Change: one canonical copy per block, one-line named references everywhere
else — the same indirection entry 223 shipped. The checkpoint block keeps
pick's genuine deltas inline (task-created-hook no-op note, staged-close +
`Foreman: <id>` trailer step).

### 1a. The embedded defect (stands alone even if the dedup is deferred)

`pick.md:315-342`'s inline checkpoint copy **omits two rules the canonical
section carries**: the never-push rule ("Checkpoints always stay local …
never push them") and the whole `unexpected_files` / `--allow-unexpected`
recovery flow of `safe-commit.js finish`. craft-prompt already references the
canonical section instead of copying it ("the one copy lives in
prompt-template.md" — SKILL.md:293-298), so today the two entry points run
*different* checkpoint protocols: a pick split-run executes the degraded one.
That is drift-by-duplication having already happened, not a hypothetical.

### 1b. Why measure-first, not ship-now

Two unknowns the probe must answer before the full dedup ships:

1. Delivery fidelity through one more Read-time indirection — a few pick-flow
   runs per destination confirming the steps still execute correctly from a
   reference (prior art suggests yes: destination-question.md is read mid-flow
   today and survived its own probe in entry 223's records).
2. The token math of the canonical home. A reference into the 725-line
   prompt-template.md costs a full-file `Read` on the split path to recover
   ~28 inline lines; a small sidecar file (the destination-question.md shape)
   may be the right home instead. Net saving depends on path frequency, not
   inspection.

The 1a defect fix does not need the probe: aligning pick.md's copy with the
canonical section (or replacing it with the reference plus deltas) restores
behavior the template already specifies.

## 2. Killed candidates — do not re-propose without new evidence

| Candidate | Kill reason (verifier, files read) |
| --- | --- |
| Retire the "best for orchestration" steer on the background-Agent destination | Not Fable-orchestrator residue: added 0.39.0 for checkpoint-ownership, survived the 0.42.0 orchestrator removal, and entry 223 (post-1.0.0, accepted) deliberately re-pinned the exact clause in `check_prompt.test.js:377`. A recently pinned decision, not stale text. |
| Trim post-commit's statusSync injection to half its bytes | Frequency premise false: freshly-done paragraph already deduped once per entry per day (`filterUnnudged`); in_progress variant fires only while a tracked entry is open. The "framing" is the accepted 2026-07-28 trust-fix text ([Foreman: 131], [Foreman: 194]). Probe cost dwarfs the ~100–200-token saving and risks re-opening accepted fixes. |
| Frontier-tier condensation of reinforced-profile guardrails | Tier signal doesn't exist on the Execute-here path (profile computation is deliberately model-blind; Call 6 skipped for Execute-here). Category error vs E1: 0.29.0 trimmed capability scaffolding; reinforced blocks guard state-of-the-world hazards (stale/resumed/conflicting), which no frontier model can know without being told to verify. The condensed rendering already exists — it is the standard profile. |
| Drop the reinforced closing paragraph from Workflow-stage prompts | Misquotes the paragraph (the quoted clause lives in the background-Agent block, which workflow-stage doesn't carry). Schema enforcement covers return shape, not narration discipline or evidence provenance; in an unattended run the anti-narration clauses plausibly save more tokens than they cost. |
| Collapse pick.md's "triple-stated" no-investigation rule | The alleged restatements carry distinct payload (flow-shape spec; resolve-symbols fact; never-claim-checked rule). Real overlap ~2–3 lines, not 10–15, under a [Foreman: 141] anchor. |
| Dedup never-`git add -A` within one assembled prompt | The two blocks govern different acts: interim per-task checkpoints (raw `git add --`) vs the single entry-close commit (`safe-commit.js finish` staged-close). Only four words genuinely repeat, and the embed's narrow-staging line is a pinned invariant (`safe_commit.test.js:665`). |
| References-over-descriptions in `<context>` | Already exists structurally: `<relevant_files>` mandates path—symbol citations; `<context>` is deliberately the home for facts without a file anchor, per pick.md's recorded rationale ("stops the destination re-deriving what someone already wrote down"). The pick.md mirror would require the investigation that branch forbids. |
| Default away craft-prompt's role question | It is one radio row inside an already-batched call, the code default (`"a senior engineer"`, craft-handoff.js:322) already exists, and the answer is load-bearing: `Code reviewer` is the only path to a review-flavored non-security prompt. |
| Acceptance question restates the entry's recorded evidence | The fields don't exist at that moment: nothing records which checks ran, and closure notes / observed_touches materialize via the very update-status call the block prescribes. The asking session's live context is strictly richer. The later-session accept flow (pick.md) already excludes those fields as dialog bloat — a documented decision. |

Four further raw candidates merged away as duplicates or E1–E9 violations
before verification.

## 3. Standing constraints the finders were seeded with (E1–E9)

Model-tier trim already shipped (0.29.0); XML-vs-prose NULL; output_format
omission declined on evidence; failure-describing prose primes failures;
single-slice orchestration wash; TaskCompleted has no advisory channel;
behavior claims need a probe; `touches` is not a reference contract; the
roadmap is the structured memory to sharpen. These pre-killed the obvious
re-proposals and are why the finder yield was small.

## 4. What the docs confirm foreman already does right

- **Progressive disclosure** — router entrance (77 lines) → branch files read
  just-in-time; scripts, not the model, parse the template.
- **Right altitude** — standard/reinforced profiles from mechanical signals
  are exactly the docs' "minimal high-signal tokens, scaled to risk".
- **Fable field guide** — `truth_grounding`'s claims-as-hypotheses is the
  guide's verification posture; `Pattern:` reference lines are its
  "references over descriptions"; roadmap `notes` are its implementation-notes
  file; the interview flows are its "questions that change the architecture".
- **Workflows post** — the Workflow-stage flavor (schema artifact, tone drop,
  enforcement sentence) matches the post's guidance for schema-enforced
  stages.
- **Mechanical-first** — the docs' "let scripts compute what scripts can" is
  SCOPE.md's founding rule.

The open question the docs sharpen but this audit did not resolve: the R-004
draft's ~25k-token instruction load on the plain what's-next path. The
survivor chips at it (pick.md shrinks); the load-vs-payoff question stays
with the benchmark harness, as R-004 itself notes.

## 5. Run record

Workflow `wf_9154eb02-78c`, 19 agents, ~1.23M subagent tokens, 140 tool
calls, ~7 min. Per-agent returns in the session transcript dir
(`subagents/workflows/wf_9154eb02-78c/journal.jsonl`). Nothing in the repo
was changed by the audit; this report is the only artifact.
