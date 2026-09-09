# Foreman /goal run — 2026-07-16

Goal: make foreman's two named strengths — perfect prompt crafting, best-task
picking — stronger and demonstrable. Budget $30 (pre-authorized). All paid
runs via headless `claude -p` on haiku/sonnet.

## Shipped changes (foreman 0.24.0-alpha)

### Pick quality (roadmap.js `next-candidates`)
- **Transitive unblocks** (`unblocks_total`): candidates ranked by every
  *open* entry transitively waiting behind them, not just direct dependents.
  Chain walk stays on open nodes (a dropped middle entry severs the chain).
- **Closed referrers no longer count** — a done/dropped/rejected dependent
  no longer inflates a candidate's importance (old behavior counted ALL
  referrers regardless of status; the old test even pinned it).
- **Collision demotion**: ties prefer the candidate whose `touches` don't
  overlap in-progress work (flag unchanged, now also a sort key).
- **`--hint`**: mechanical hint relevance — containment score (fraction of
  hint words found in title/why/what/touches/notes), `hint_score` per
  candidate + top-level `hint_matched`. Replaces the skill's old
  "--limit 10 and pick 3 yourself by relevance" LLM step; roadmap/SKILL.md
  now passes the hint through and takes the order as returned.
- Sort: `hint_score` (when hinted) → `unblocks_total` → `unblocks` →
  no-collision → oldest `created_at`.

### Prompt gate (`scripts/check-prompt.js`, new)
Mechanical validator for assembled handoff prompts; wired as a REQUIRED
pre-delivery step via prompt-template.md's new "Mechanical gate" section
(both skills inherit it; roadmap skill also names `--entry`/`--resume`).
Canonical fixed blocks are parsed OUT OF prompt-template.md at run time (no
second copy to drift); `${CLAUDE_PLUGIN_ROOT}` in scope_discipline handled
by segment matching. Checks: guardrail blocks verbatim (truth_grounding,
scope_discipline, the closing register paragraph), leftover template
placeholders (fragment list pinned to the template by a drift test),
task_rules + verification Run:/Expected: (unless `--research`),
relevant_files non-empty + path-like, omitSections compliance incl. the
background-Agent tone carve-out (`--destination task|agent|clipboard`
required), custom sections inlined verbatim, entry paragraph presence/
variant (`--entry`, `--resume`), persona vs usePersona, workflow-stage
flavor (`--workflow-stage`), assumed-context phrases (warning).
Tests: 214 total suite (was 193), incl. drift pin (every bracketed template
line covered by the checker's fragments) and skill-grammar pin.

## Evidence (private harnesses)

### Craft probes — `benchmarks/foreman/experiments/craft/` (new harness)
Sessions execute roadmap step 3 (assemble handoff from a picked entry).
Arms: `pre` (template without the gate section, no checker) vs `gate`.
Scored by running check-prompt.js on the artifact afterward. 3 scenarios
(plain / trio-config / research), 3 reps, tags craft1-haiku + craft1-sonnet.

- **haiku pre: 2/9 gate-clean** (8 errors across 7 reps) — dropped the
  closing register paragraph, dropped `<output_format>`, or mutated
  `<scope_discipline>`. Exactly the tuned blocks whose absence caused the
  historical narration/XML-echo regressions (0.13.1/0.14.x/0.16.0 sagas).
- **haiku gate: 9/9 clean**, 2 gate runs per rep, cost +$0.02–0.03/craft
  (~+11%, $0.075 vs $0.068).
- **sonnet pre: 9/9 clean already** — the gate catches nothing on these
  scenarios at sonnet; its sonnet value is regression insurance (same
  saturation shape as razor's sonnet result). gate arm 9/9, cost ~parity.
- Smoke rep artifact confirmed the defects are real (prompt truncated after
  the request line + stray ``` fence).

### Haiku-elaboration validation — foreman-handoff tag `haikuelab1`
Frozen `foreman-haiku.md` prompts (same facts as foreman.md, re-elaborated
per the template's targetModel:"haiku" rule) vs standard `foreman`, haiku,
n=4/cell, 3 fixtures, 24/24 correct:
- api-constraint: elaboration mildly better — reads flat 3,3,3,3 (vs
  4,3,4,3), turns flat 7 (vs 8,7,8,7), cost tied. Matches the feature's
  grounding (consistency/lower exploration).
- adjacent-mess: identical (2,2,2,2 / 6,6,6,6 both). Null.
- **moved-file (stale-claim trap): elaboration HURTS** — out-tokens +30%
  (3710 vs 2847), cost +13% ($0.0629 vs $0.0558), mismatchNamed 2/4 → 0/4.
  Hypothesis: hard-repeating the stale path+range as a single-action bullet
  ("Read src/parser.js:5-17.") anchors haiku on the decoy harder.
- Follow-up probe tag `anchor1` (same batch, moved-file only, third arm
  `foremanhaiku2` = identical except that one bullet cites via
  relevant_files instead of repeating the path): penalty REPRODUCES
  (foreman $0.0547/2713tok, foremanhaiku $0.0608/3534tok); the indirect
  citation recovers about half the token penalty ($0.0570/2997tok) but
  mismatchNamed didn't improve (1/1/0 of 4 — haiku mm-naming is noise, as
  the haiku2 campaign already concluded). 12/12 correct.
  **Decision: no template change.** The penalty only exists when the brief
  is wrong; the clean-fixture elaboration win is real; the shipped 0.23.0
  dispatch-time caution (haiku target + stale-reference-reconciling entry)
  is the mitigation that matches the evidence.
- Workflow-stage craft probes (tags wf1-haiku/wf1-sonnet, scenario
  `workflow` — the intricate 0.22.0 flavor: tone dropped, output_format
  replaced by the enforcement sentence, schema authored alongside):
  **haiku pre 0/3 clean** (all three dropped the closing register
  paragraph), gate 3/3 clean at 2 gate runs (+~40% craft cost, $0.089 vs
  $0.056); sonnet pre 3/3 clean already, gate 3/3 with 1 verify run
  (+~55%, $0.36 vs $0.23).
- **Craft totals: haiku unaided 2/12 gate-clean → 12/12 with the gate;
  sonnet 12/12 either way.** The gate turns haiku's craft defect rate from
  10/12 to 0/12; on sonnet it's pure regression insurance.

## Non-actions (deliberate)
- Staleness word-sniffing in ranking: rejected — `deferred` status is the
  sanctioned mechanism; text-sniffing "someday" language is ungrounded
  prescription.
- No LLM-assisted picking: user chose "smarter mechanical ranking" —
  zero codebase reads, deterministic, preserved.
- report.js's opt-in-arm filtering still unfixed (known follow-up noted in
  the harness README); summaries computed directly from runs/*.json.

## Spend
smoke $0.18 + craft1-sonnet $4.55 + craft1-haiku $1.29 + haikuelab1 ~$1.22
+ anchor1 ~$0.70 + wf1-haiku ~$0.44 + wf1-sonnet ~$1.78 ≈ **$10.2 of $30**.
