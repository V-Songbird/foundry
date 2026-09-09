# Foreman ground truth vs Claude Code — 2026-07-18

Private notes (gitignored dir). Sources: installed binary `claude.exe`
2.1.214 (C:\Users\Songbird\.local\bin, string extraction; key passages
re-verified byte-exact in this session at the offsets below), official docs
(code.claude.com best-practices/sub-agents/agent-teams + platform
prompting-best-practices + prompting-claude-fable-5, fetched this session).
Diffed against `foreman/prompt-template.md` (lastmod 2026-07-10 revision).

## Verified firsthand this session (offsets in claude.exe 2.1.214)

- `@231432166`: Agent-tool model enum `H1r=["sonnet","opus","haiku","fable"]`
  — `fable` is a first-class model value; foreman's targetModel omitted it.
- `@236924697..812`: "Give enough context... judgment calls rather than just
  following a narrow instruction. If you need a short response, say so
  ('report in under 200 words'). Lookups: hand over the exact command.
  Investigations: hand over the question — prescribed steps become dead
  weight when the premise is wrong." Followed by: "Terse command-style
  prompts produce shallow, generic work."
- `@234401484`: "Add a purpose statement — Include a brief purpose so
  workers can calibrate depth and emphasis" (with PR-description /
  quick-check examples).
- `@246158491`: "the prompt must be fully self-contained. Include: The
  overall goal (the user's instruction), This unit's specific task...,
  Any codebase conventions..., The e2e test recipe".
- Old template source-d URL
  (code.claude.com/docs/en/about-claude/models/prompting-fable5): HTTP 404.
- Current Fable page (platform.claude.com .../prompting-claude-fable-5),
  fetched in full: "Skills developed for prior models are often too
  prescriptive for Claude Fable 5 and can degrade output quality";
  "Don't instruct Claude to reproduce its reasoning in the response...
  can trigger the reasoning_extraction refusal category"; "Give the
  reason, not only the request"; brevity/lead-with-outcome and
  anti-overengineering sample blocks.

## Agreements (template confirmed, no change)

Zero-memory self-containment (4 independent binary passages + docs);
no-assumed-context ban ("Fix the bug we discussed" is the binary's own
anti-pattern); exact paths with line ranges; REQUIRED verification with
evidence ("Have Claude show evidence rather than asserting success" — the
strongest three-way agreement); one-sentence persona ("Even a single
sentence makes a difference"); context-for-judgment-calls; XML tags for
mixed instruction/context/example prompts (platform guidance verbatim);
concise outcome-first final summary; when-not-to-hand-off; sonnet/opus
"don't add elaboration" (mirrors "often too prescriptive... can degrade").
The template's own `<context>` example line is near-verbatim the
agent-teams doc example (JWT/httpOnly) — directly doc-derived.

## Contradictions found → what was done

1. targetModel enum lacked `fable` (binary ships it) → ADDED (template,
   render-sections.js VALID_TARGET_MODELS, init Q4 via-Other note,
   craft-prompt Call 6 slot rule, README row). Elaboration treatment =
   default level, grounded in the official guide's brief-steering stance.
2. source-d URL dead (404) → replaced with the live platform URL; added
   source-e (binary delegation guidance).
3. Prescribed steps for investigations contradict the binary
   ("Investigations: hand over the question — prescribed steps become dead
   weight") → template task_rules gained a pure-investigation bracket:
   question + exact commands instead of the three step bullets; checklist
   updated; gate's --research already waives the verification pair.
   NOTE the template keeps the positive form only (hand over the
   question), per the priming lessons — the binary's "premise is wrong"
   failure description stays out of the template.
4. AUDITED, NOT ADOPTED — "tone carve-out mis-scoped": the extraction
   agent argued output styles reach no non-fork subagent, so an omitted
   tone should also stay for TaskCreate. Rejected on foreman's actual
   semantics: foreman's TaskCreate destination runs the work IN this
   session (skill: "Then work the task in this session"), where the
   operator's output style does govern. The agent's claim rests on
   agent-teams task-claiming, which foreman doesn't use. No change.
5. AUDITED, NOT ADOPTED — "binary steers TaskCreate away from delegation":
   same resolution; foreman uses TaskCreate as task-list + work-here,
   matching the binary's own semantics ("adds an item to the task list").

## Gaps adopted

- Purpose statement (binary + Fable page "Give the reason"): task_context
  gained an optional purpose sentence bracket (what the output feeds, who
  it's for). check-prompt fragment list extended.
- Reasoning-echo refusal guard (Fable page): check-prompt.js now warns
  (never errors) on show/explain/reproduce/transcribe/echo-your-reasoning
  and think-out-loud phrasing, naming reasoning_extraction. The canonical
  closing paragraph ("in your thinking before editing") verified not to
  trip it (test pinned).

## Gaps noted, NOT adopted (and why)

- Response-length cap slot ("report in under 200 words") — output_format's
  default already prescribes a concise summary; no measured deficiency.
- Continue-vs-spawn (SendMessage resume) — foreman 0.22.0 already has
  background-agent resume via SendMessage marker; the binary's table adds
  nothing new to adopt at template level.
- CLAUDE.md restatement for Explore-class workers — foreman prompts are
  self-contained by construction; customSections is the sanctioned rule
  carrier. No change.
- 3–5 diverse examples (platform) — aimed at few-shot IO tasks; foreman's
  single before/after example fits code handoffs; no evidence of a
  deficit.
- Anti-overengineering default constraint (platform sample block) — razor
  owns this concern in this stack; adding it as fixed template text would
  duplicate a sibling plugin's job. Parked; revisit only on evidence of
  scope creep in destinations without razor.
- Reviewer-calibration caveat (best-practices) — relevant only to
  review-flavored handoffs; parked pending a real case.

## Folklore check on existing template content

- Per-model elaboration ladder: externally uncorroborated (no doc gives
  per-model detail advice) but grounded in foreman's own benchmark
  (haiku reads-before-first-edit + craft totals) — stands on first-party
  evidence, correctly labeled in the template.
- "raw <tag> markers read as a bug" in output_format: no external source
  either way; kept as product stance (also the anti-XML-echo guard the
  0.16.0 investigation validated).
- Workflow-stage schema authoring rules — **VERIFIED 2026-07-19**:
  - Enforcement sentence + retry-on-mismatch: CONFIRMED in claude.exe
    2.1.214 @236857787 ("Subagents are told their final text IS the
    return value (not a human-facing message)... validation happens at
    the tool-call layer so the model retries on mismatch").
  - "Keep schemas small": corroborated by the Agent SDK
    structured-outputs doc ("Keep schemas focused... Start simple") plus
    its retry-limit error (`error_max_structured_output_retries`).
  - descriptions-double-as-instructions, cited-pair shape,
    retry-costs-a-full-subagent-turn, object-root-with-required: absent
    from the 2.1.214 binary and the docs, but present VERBATIM in the
    newer harness's live Workflow tool description (observed in this
    session's own tool schema) — foreman copied the host's authoring
    rules faithfully; the installed binary just lags the harness.
  - Verdict: no contradiction anywhere; no template change.

## 2026-07-19 follow-up analyses (the four "needs analysis" items)

1. **Workflow-stage rules**: VERIFIED, see the amended folklore-check
   entry above. No change.
2. **Background-Agent autonomy gap**: CONFIRMED and CLOSED. The
   subagent system prompt ("You are an agent for Claude Code...",
   claude.exe @234865393) carries no autonomy language; a live haiku
   background-agent probe confirmed "You are operating autonomously" is
   absent from its context while "Complete the task fully" is present.
   The binary DOES ship the autonomy reminder but conditionally
   elsewhere (feature-flagged Dzy @240499691 — not the subagent path).
   Shipped: template BACKGROUND-AGENT DESTINATION block carrying the
   official source-d reminder verbatim, gate requires it for
   --destination agent and warns when it appears for task/clipboard
   (a user IS present there). 218 tests (was 217).
3. **Reviewer calibration**: shipped as a craft-prompt mapping rule —
   review-flavored tasks (Security-audit type or Code-reviewer role) get
   one constraint bullet: "Flag only gaps that affect correctness or
   security — reporting that the work is sound is a valid outcome."
   Doctrine: best-practices' reviewer-overreporting warning; the
   sound-is-valid clause is the lesson-6 outlet form.
   **MEASURED 2026-07-19 (user go): over-flagging probe, tag rev1**,
   new standalone rig `benchmarks/foreman/experiments/handoff/review/` (sound
   retry/backoff module, 6 green tests, read-only review handoff,
   JSON-forced findings list; plain vs calibrated = one bullet delta;
   2 arms × 6 reps, sonnet, $3.47):
   - plain: EVERY parseable rep invented correctness findings —
     2,1,1,2,2 across 5 reps (1 JSON parse failure recorded as null),
     mean 1.6/rep, zero clean reps.
   - calibrated: 0,1,0,0,1,0 — mean 0.33/rep, 4 of 6 reps returned an
     empty findings array. jsonOk 6/6. Also ~19% cheaper per run
     (fewer findings to write). No file edits in any rep.
   - Claim audit (read every claim): no real behavioral defect exists —
     the recurring claims are hardening stretches (unvalidated
     baseMs/maxMs, retry(fn, null) TypeError, async-predicate
     non-support) plus one genuinely wrong claim (shouldRetry "should"
     run on the final failure — that's intended semantics). Honest
     metric framing: findings claimed as correctness/security against a
     module whose contract and tests are clean — stretch-nits promoted
     to defect claims, which is precisely the documented phenomenon.
   - Verdict: the shipped calibration bullet is now probe-backed
     (5x fewer invented gaps, outlet works — sound reported as sound in
     4/6 reps). No further change.
4. **Purpose line validation**: CLOSED as not feasibly measurable now.
   The three fixtures are single-task with no downstream consumer, so a
   purpose sentence has no depth-calibration decision to influence —
   any measured delta would be noise around one added sentence. Doctrine
   backing (binary purpose-statement section + Fable "Give the reason")
   stands as the sole ground; revisit only with a fixture that has a
   genuine audience/depth fork.

## Test state

217 tests pass after the changes (was 214; +1 fable pass-through, +2
reasoning-echo warning pins).
