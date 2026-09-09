# Opus 5 backlash: recon and build/no-build decision

Date: 2026-08-06. Verdict: **build nothing.** The single candidate edit died under review, and the
one new candidate that revision 2 opened also fails the YAGNI test — but for a reason the owner may
want to overrule, so it is written up rather than buried (§D, comment density).

**Revision 2** folds in three sources the first pass missed, all now verified:

1. Anthropic's blog post *The new rules of context engineering for Claude 5 generation models*
   (Thariq Shihipar, 2026-07-24) — **over 80% of Claude Code's system prompt was deleted** for Opus 5
   and Fable 5, including the lines that suppressed comment spam and stray planning documents. This
   is a harness change, not a model change, and it is the missing third answer to "model or user".
2. The Opus 5 system card's FrontierCode-by-effort result — **quality peaks at `medium` effort**, and
   the card attributes the decline at higher effort to the model making "more changes than the task
   requires". The vendor's own numbers show over-engineering rising with effort.
3. `/doctor` — a first-party command for rightsizing skills and CLAUDE.md, which the first pass never
   named.

**Revision 3** audits **foreman**, which the first two passes left out entirely. It changes no
verdict to build, but it corrects one row and it turns out to be the plugin best aligned with the
recon's biggest structural finding — see "foreman" below the decision table.

Scope: 15 independent extraction passes over ~55 Reddit threads (r/ClaudeAI, r/Anthropic,
r/ClaudeCode, r/vibecoding), the Opus 5 prompting guide, the migration guide, the effort reference,
the launch post, the context-engineering blog post, the system card via secondary sources, and
shipped-surface audits of hush, razor and assay. The synthesis was attacked by a YAGNI enforcer and a
fact checker; their corrections are folded in below rather than appended.

Corpus hygiene up front. The corpus is not uniformly about Opus 5. One whole chunk (four threads,
455-1467 ups) contains **zero** Opus 5 behavioural complaints — every complaint there names Opus 4.8
or Fable 5. The most-cited "quantitative" post ("I was lobotomized. Here's the data", 2464 ups) is
about Opus **4.6**, and its own comment tree is majority-dissent on its method. Two more threads
predate the release and their Opus 5 content is prediction. Everything below is filtered to
Opus-5-attributed voices; the discarded material is itself a finding (§E).

**Denominator note.** The corpus was mined by 15 passes (14 chunk miners + 1 seed-thread miner). The
"Miners" column reports `x/8`, and the two numbers were never reconciled — several chunks carried no
Opus-5 behavioural material at all. Read that column as relative breadth, not a verified fraction.

---

## A. Ranked behavioural clusters

Counts are distinct voices, deduplicated across miners where a quote repeats, ±10% — treat as
weight, not measurement. The underlying `evidence_count` fields are quote counts, not verified
unique commenters.

| # | Cluster | Voices | Miners | Anchor threads (ups) |
|---|---|---|---|---|
| 1 | **Verbosity / unreadable prose** — walls of text, low substance density, has to be re-read | ~75 | 8/8 | 1vam0ak (254), 1vephjv (531), 1v7b1u1 (476), 1vbdp39 (520) |
| 2 | **Register: metaphor, invented jargon, verbal tics** — "load-bearing", "seam", "footgun", "tombstone", "provenance", "it's not X, it's Y", "you're right to push back" | ~50 | 7/8 | 1uyxibb (190), 1v5h6o9 (2937), 1vb41nf (412) |
| 3 | **Scope creep / over-engineering** — unrequested fixes, rabbit holes, 335 lines for a 3-line change | ~48 | 8/8 | 1vahyru (599), 1vgpyni (3612), 1v7hiik (171) |
| 4 | **Instruction-following** — ignores CLAUDE.md, skills, hard directives; decays after a few turns | ~45 | 8/8 | 1vahyru, 1v83vb2 (391), 1v92csh (260) |
| 5 | **Overconfidence / argues / won't take correction** — strawmans, relitigates, blames the user | ~42 | 6/8 | 1v6r82w (617), 1vephjv, 1v92csh |
| 6 | **Self-correction narration** — "I have to be straight with you, I was wrong"; audits that retract themselves | ~33 | 6/8 | 1v6r82w, 1v83vb2 |
| 7 | **Doom-loop** — circles, 17 design reviews before asking, self-doubt spirals | ~32 | 7/8 | 1v7hiik, 1v83vb2, 1v92csh |
| 8 | **Introduces regressions** — fixes one, breaks two | ~28 | 6/8 | 1v6r82w, 1vfw5tp (399) |
| 9 | **Invents non-problems / escalates trivia** | ~20 | 4/8 | 1vephjv, 1vgpyni, 1v7b1u1 |
| 10 | **Context loss / rot** | ~19 | 5/8 | 1v7hiik, 1uwzqor |
| 11 | **Tone / hostility toward the user** | ~17 | 4/8 | 1vephjv, 1v6zk2y (244) |
| 12 | **Laziness / glossing / defers breakage** | ~12 | 3/8 | 1vfw5tp |
| 13 | **False completion** — claims fixed, isn't | ~12 | 4/8 | 1v6r82w, 1v8cpbr (392) |
| 14 | **Buried questions / trailing "one more issue"** | ~7 | 2/8 | 1vam0ak, 1v8zu46 (263) |
| 15 | **Comment and file spam / written-deliverable bloat** — one branch measured at 40% comments against 8% on main; unrequested planning and analysis documents | ~6 in this corpus, **under-weighted** — see note | 3/8 | 1v6zk2y, 1uyxibb |
| 16 | **Subagent behaviour** — bad orchestrator, under-specifies, yaps to agents | ~5 | 2/8 | 1v7b1u1 |
| — | **Counter-cluster: too terse / cryptic / under-narrates** | ~11 | 2/8 | 1v7b1u1, 1vbdp39 |

**Note on cluster 15.** The first pass ranked it 15th of 16 and used that low weight to dismiss it.
An independent second reading of ~20 threads ranked it in the top five. The keyword filters used to
assemble this corpus were tuned for verbosity and scope language, so comment-density complaints were
almost certainly under-sampled here. Treat the ~6 as a floor, not an estimate — and see §B, where it
turns out to be the one cluster with a *directly identifiable* cause.

Noise, excluded from the ranking: usage limits, quota exhaustion, pricing and cancellations (~60+
voices — the single largest topic in the raw corpus and not behavioural); memes; "competitor
detraction campaign" accusations; the 53.4%>53.5% marketing chart error; Fable→Opus safety-classifier
routing; and compute-reallocation / quantization folklore (~16 voices, mostly pre-release).

---

## B. Documentation verdict per cluster

CONFIRMED means Anthropic states the behaviour changed.

| Cluster | Verdict | Basis |
|---|---|---|
| 1 Verbosity | **CONFIRMED** | "default user-facing responses run longer than prior Opus models'"; plus the trap — "lowering effort can reduce thinking volume without reliably shortening the visible response. To control response length, prompt for it explicitly." |
| 2 Register / metaphor / tics | **SILENT** | No Anthropic page addresses diction, metaphor or stock phrasing. The only adjacent instruction is a meta-lever: "Positive examples of the communication style you want tend to be more effective than instructions about what not to do." |
| 3 Scope creep | **CONFIRMED, twice** | Prompting guide: "can also expand the scope of a task, adding steps that weren't requested or applying its own judgment about what the task should be. For narrow tasks, constrain scope explicitly." And the system card, via FrontierCode: score peaks at `medium` effort because at higher effort the model makes "more changes than the task requires" and the grader penalises out-of-scope edits. |
| 4 Instruction-following | **CONFIRMED as a system-design change** | The blog post names the mechanism: with 80% of the system prompt gone, the remaining instructions are judgment calls, and it calls out clashes directly — "several conflicting messages in a single request like 'leave documentation as appropriate,' or 'DO NOT add comments' as our system prompt, skills, and user requests clash with each other". Memory docs still hold: CLAUDE.md is "context, not enforced configuration", "no guarantee of strict compliance, especially for vague or conflicting instructions", "if two rules contradict each other, Claude may pick one arbitrarily". |
| 5 Overconfidence / arguing | **CONFIRMED (system card, second-hand)** | The card reports slightly more factual hallucination than Opus 4.8, and answers stated confidently while actually uncertain more often than expected. The prompting pages are silent; the launch post claims the opposite direction. Sourced from published summaries, not a direct read of the PDF. |
| 6 Self-correction narration | **CONFIRMED** | "The model also narrates corrections to its earlier statements more than prior models do, which can be undesirable in user-facing products." |
| 7 Doom-loop | **SILENT as such; mechanically derivable** | Self-verification + scope expansion + correction narration compound into turns. Directly: "Claude Opus 5 verifies its own work without being told to… instructions like these cause over-verification." |
| 8 Regressions | **SILENT** | No vendor claim either way; no controlled comparison in the corpus. |
| 9 Invents non-problems | **SILENT, arguably CONTRADICTED** | The severity clause documents only *under*-reporting when told to be conservative. On over-reporting the docs say the opposite: findings are "mostly real issues rather than false positives". Do not cite the docs in support of this cluster. |
| 10 Context rot | **CONTRADICTED by the docs; contested in the corpus** | "instruction following, tool calling, and reasoning stay consistent throughout the window", with 1M tokens as default and maximum. Two users report otherwise. |
| 11 Tone | **SILENT** | — |
| 12 Laziness / glossing | **PARTIALLY CONFIRMED (config interaction)** | The literal-conservatism clause explains under-reporting for anyone carrying "be conservative" review prompts. |
| 13 False completion | **SILENT on the model; a first-party remedy exists** | Stop hook exit-2 / `decision:"block"`, packaged as `/goal` — "a small fast model checks whether the condition holds", completion "decided by a fresh model rather than the one doing the work." |
| 14 Buried questions | **SILENT** | — |
| 15 Comment and file spam | **CONFIRMED, and the cause is named** | The prompting guide confirms longer written files. The blog post supplies the mechanism: the deleted system prompt contained "In code: default to writing no comments. Never write multi-paragraph docstrings or multi-line comment blocks — one short line max. Don't create planning, decision, or analysis documents unless the user asks for them — work from conversation context, not intermediate files." It was replaced by "Write code that reads like the surrounding code: match its comment density, naming, and idiom." |
| 16 Subagent eagerness | **CONFIRMED** | "delegates to subagents more readily than prior models"; remedy is prompt guidance **or** deterministic caps. |
| Breaking config semantics | **CONFIRMED** | Thinking on by default; disabling thinking capped at `high`; `max_tokens` is a hard limit over thinking+text; 64k recommended at xhigh/max; effort defaults "should be re-swept", low/medium often fine. |

Counting only the prompting and migration guides, four of the top seven clusters are confirmed or
derivable. Admitting the system card and the blog post takes it to seven of seven except cluster 2.
**The single cluster Anthropic never addresses anywhere is #2, register** — ~50 voices, no vendor
acknowledgement, and no native lever of any kind.

---

## C. Answers

### 1. Why do people have difficulty with Opus 5 over Opus 4.8?

Three things happened at once, and conflating them is why the community diagnosis stayed muddled.

**The model changed.** Opus 5 talks more, narrates more, corrects itself out loud more, verifies
itself unprompted, widens the task, delegates more eagerly, and writes longer files. Each is
tolerable alone. Together they change the unit of work: what was one 4.8 turn becomes several Opus 5
turns, each of which must be read.

**The harness changed, and users did not do this to themselves.** Over 80% of Claude Code's system
prompt was deleted for the 5-generation models. The deleted text included the explicit suppression of
comment blocks and unrequested planning documents, quoted in §B. So "I changed nothing and it got
worse" is literally true for anyone hit by cluster 15: the restraint was removed on the stated
assumption that the new model's judgment no longer needs it.

**Stale instructions now amplify instead of correcting.** Most CLAUDE.md files were written as
counterweights to 4.x failure modes — verify your work, be thorough, don't stop early, document what
you did. Point those at a model that already self-verifies, already narrates and already
over-documents, with the suppressing system prompt gone, and they compound the behaviour. Anthropic
says this outright for verification instructions: remove them, because they cause over-verification
with no quality gain.

The best-evidenced symptom is the cost of reading and steering, not the quality of the code. Output
quality is contested: cluster 8 and the false-completion cluster claim the code itself is worse, and
nothing in the corpus can settle that either way (§E).

**The deciding variable looks like role, not skill.** The prompting guide says Opus 5 "performs best
when given the complete task specification up front and left to run". People using it that way — as
an executor or reviewer, with tests as the arbiter — report satisfaction. People steering it turn by
turn as a conversational pair-programmer are the ones describing exhaustion. An earlier framing here
blamed "elaborate harnesses"; that was refuted, because the corpus contains heavy-process dissenters
("I am process oriented and we do use workflows") and strict-harness complainers who still failed.
Role fits the evidence better and is supported by the docs. It remains a hypothesis: no
per-commenter config or workflow data exists anywhere in the corpus.

### 2. What changed that users are raging about?

Confirmed by the prompting and migration guides: longer default replies; readier narration
("announces what it is about to do"); more narrated self-correction; unprompted self-verification;
scope expansion; readier subagent delegation; longer files written to disk. Confirmed breaking
changes: thinking on by default, effort's meaning, `max_tokens` now covering thinking+text, and a
recommendation to re-sweep effort downward. Two prompt-sensitivity inversions: verification
instructions now cause over-verification, and "only report high-severity issues" is now followed
literally, producing under-reporting that reads as laziness.

Confirmed by the system card: more confident assertion under actual uncertainty, slightly more
hallucination than 4.8, and — the important one — quality peaking at `medium` effort because higher
effort makes "more changes than the task requires". The over-engineering complaint is visible in the
vendor's own benchmark numbers.

Confirmed by the blog post: the guardrails against comment blocks and unrequested planning documents
were deliberately deleted, along with most of the rest of the system prompt, in a "rules to
judgement" shift. The post is candid that the fix for the 5-generation models was *unhobbling* —
deleting constraints that once prevented worst cases and now create conflicting instructions.

Not confirmed anywhere, yet ranked #2 by volume: the register. "Load-bearing", "seam", "footgun",
"blast radius", "it's not X, it's Y" — the second-biggest complaint is diction, and no Anthropic page
mentions it. This is also where the community's standard fix backfires: asking for brevity without
constraining register produces *compressed* jargon. Two independent voices report exactly that.

### 3. Do users really need to change their rules or CLAUDE.md?

Partly yes, and the change is mostly **subtractive**, which is the opposite of everyone's instinct.

Fixable by configuration: verbosity via one explicit brevity instruction and not via effort;
narration cadence by describing the shape wanted; deliverable length; comment density by saying so
explicitly; over-verification by deleting the old verify rules; scope creep by stating scope in one
line; subagent sprawl by capping delegation; and effort defaults carried over from 4.8 habits, where
the old guidance was "start at `xhigh`" and the new guidance is "start at `high`, use low and medium
liberally". Anthropic ships `/doctor` for exactly this rightsizing, and the blog post asks for a
lightweight CLAUDE.md that spends its tokens on codebase gotchas rather than rules. Where several
verification instructions are genuinely needed, the post's answer is a verification skill referenced
from CLAUDE.md, not inline prose.

Not reliably fixable by configuration: the register. Multiple people describe adding a plain-English
rule and getting an essay about conciseness back, or compliance for one turn followed by drift.
Adherence that decays mid-session is a model property, not a config defect — and it is the argument
for hook re-injection over a style file alone.

The structural caveat outranks both. For anything that must not happen, CLAUDE.md is the wrong tool
at any wording quality: "Claude treats them as context, not enforced configuration. To block an
action regardless of what Claude decides, use a PreToolUse hook instead."

Note for this repo specifically: none of the deletion agenda applies here. There is no `CLAUDE.md` at
all, the whole instruction surface is 117 lines across `.claude/rules/plugin-layout.md` and
`public-docs.md`, and a search for verification instructions, "be conservative" clauses and
"only high-severity" wording across `.claude/` returns zero matches.

### 4. Model issue or user issue?

Neither alone. There are three causes, and the third one is the one everybody missed.

- **The model.** Counting clusters 1, 3, 6, 15, 16 (confirmed verbatim) plus 7 and 9 as mechanically
  downstream gives 219 of 451 voices, ~49%. Admitting cluster 5 on the system card raises it to ~58%;
  admitting cluster 2, a real model property Anthropic simply never addresses, raises it to ~60%.
  On any of those counts, "skill issue" is the wrong answer for the largest share of the pain.
- **A vendor product decision, not the model and not the user.** The 80% system-prompt deletion
  removed the specific suppression behind cluster 15 and weakened the enforcement of everything else
  by design. Nobody chose to have their guardrails deleted, and no amount of user skill would have
  predicted it. This is the honest answer to "I changed nothing and it got worse."
- **Stale user configuration.** Effort pinned at max or xhigh; verification instructions;
  conservative-review clauses; 4.8-era rules that now conflict; oversized CLAUDE.md. Real,
  vendor-documented, and it explains the dissenters. It cannot be given a percentage: no cluster maps
  to it cleanly and no config data exists per commenter. An earlier "15-20%" figure was unmapped and
  is withdrawn.
- **Noise, ~20-25%.** Cluster 8 rests on single-session anecdote. Context rot is contradicted by the
  docs. Quantization folklore has zero evidence and predates Opus 5. And a material fraction of the
  "Opus 5 rage" corpus is complaint about 4.8 and 4.6 wearing an Opus 5 headline.

Underneath all three sits an evaluation-design problem the vendor documents itself: Opus 5 was
optimised and measured on autonomous long-horizon task completion, and human legibility and
collaborative turn-taking were not the target. The FrontierCode-by-effort result is that visible in
Anthropic's own numbers.

---

## D. Question 5 — build/no-build decision table

Filter: the best code is code never written. A row earns work only when the cluster has weight, no
native lever exists, and the fix is the smallest possible edit to a plugin that already owns the layer.

| # | Cluster | Best existing lever | Gap | Verdict |
|---|---|---|---|---|
| 1 | Verbosity | **hush** — `hush/output-styles/hush.md` hard caps (12 lines `:55`, 15 words, no semicolons) re-stated every turn by `hush/hooks/silence-nudge.js:25-32` | None. Stronger than the vendor's own suggested snippet, because hook re-injection cannot decay the way a style file does | **ALREADY COVERED** |
| 2 | Register / metaphor / tics | **hush** — `hush.md:90` "everything around them is everyday English, in words the reader had before this session started"; `:12` swap-don't-gloss; `:117` Register step 1 | None demonstrable. `:90` already excludes coined shop jargon, and a search of the committed benchmark records (2,518 JSON + 2,058 JSONL) for "load-bearing", "footgun", "blast radius" and "the unlock" returns **zero** occurrences in run output | **ALREADY COVERED** |
| 3 | Scope creep / over-engineering | **razor** — RULESET ladder in `hooks/razor-lib.js:16-34`, one mechanical file-budget deny per turn in `file-meter.js:39`, session growth check in `build-ledger.js`. **foreman** — the handoff carries `relevant_files` with resolved symbols, an `Expected file surface:` constraint line, and `task_rules`, which is Anthropic's "constrain scope explicitly" delivered as a template. Plus native plan mode and `/effort medium` | Coverage is partly advisory: razor's dependency gates gate *dependencies*, not scope, and `file-meter.js:12-13` admits Bash heredocs bypass the file budget. The vendor's own FrontierCode result now backs the ladder's premise | **ALREADY COVERED (with caveats)** |
| 4 | Instruction-following | **assay** — `assay:claude` grades loadability, position, conflicts and shadowed sources; `assay:craft-rules` writes one rule at a time. Native: **`/doctor`**, and hooks over CLAUDE.md | None. The corpus's reported-worked fixes (cut it down, de-conflict, identical wording) *are* assay's product, and `/doctor` is the vendor shipping the same idea. assay ships from a different marketplace, so nothing here to change | **ALREADY COVERED** |
| 5 | Overconfidence / arguing | None | Vendor-confirmed by the system card, and still no lever at this layer: no output style or hook can make a model less confident about a fact it has wrong. hush pushes the *right* way here — `hush.md:79` "If you would drop a point the moment the user pushed back, drop it now" | **DO NOTHING** |
| 6 | Self-correction narration | **hush** — `hush.md:77` (report state, never the path) + `:83` (end on the last fact) | Covers the written report, not mid-turn thinking. Nothing can reach thinking | **ALREADY COVERED** |
| 7 | Doom-loop | **foreman** — the handoff's verification block carries a bounded fix loop, "after two failed fix attempts", fixed text that replaced an older open-ended "iterate until it passes" (`prompt-template.md:449`). Native: delete verification instructions, drop effort to medium. Corpus: new session, switch model, manual stop | **Revision 1 was wrong to say no plugin has a loop ceiling.** foreman caps retries inside the task it hands off, which is the cheap answer. What no plugin has is *detection* of circling in a free-form session, and that needs cross-turn edit-history state — a new plugin. Note `hush.md:77` cuts "what failed on the way", which hides the loop's earliest visible symptom | **ALREADY COVERED for handoff work; DO NOTHING for free-form** |
| 8 | Regressions | None | Unfalsifiable at corpus level | **DO NOTHING** |
| 9 | Invents non-problems | Native: remove severity clauses in either direction | Prompt-layer, per-project; and the docs contradict the cluster | **DO NOTHING** |
| 10 | Context loss | **hush** — `precompact-summary.js`, `postcompact-rearm.js`; **razor** re-injects RULESET on `compact` | Neither pins the *user's* earlier instructions. Contradicted by the docs and mid-weight | **DO NOTHING** |
| 11 | Tone / hostility | **hush** — `hush.md:10` core persona, `:94` never-implies-you-should-have-known, `:125` Register step 9 | None | **ALREADY COVERED** |
| 12 | Laziness / glossing | Native: delete conservative-review clauses. **razor** never cuts "anything explicitly requested" | None worth code | **DO NOTHING** |
| 13 | False completion | **Native `/goal`** — a session-scoped Stop hook judged by a fresh model. Partial: `hush/hooks/compress-tool-output.js:227` `SIGNAL_RE` and `:356` `FAILURE_RE` keep every warning, error and failure line uncollapsed | First-party feature already exists. Duplicating it is strictly worse | **ALREADY COVERED (native)** |
| 14 | Buried questions | **hush** — `hush.md:79` "The first line is the answer", the 12-line cap at `:55`, break-silence conditions at `:24-28` | None | **ALREADY COVERED** |
| 15 | **Comment and file spam** | Native: the replacement base-prompt line, "Write code that reads like the surrounding code: match its comment density, naming, and idiom", plus a one-line CLAUDE.md instruction | **Real gap, honestly stated.** Neither razor nor hush says anything about comment density — grep confirms razor's only mention is its own `razor:` ceiling marker. The native replacement is a judgment call that has nothing to match in a new file | **DO NOTHING — see below** |
| 16 | Subagent eagerness | **Native** `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` (default 20), `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION` (default 200), `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, plus prompt guidance | The caps bound concurrency, not the decision to delegate, and ultracode is exempt from the concurrency cap. hush and razor both hook `SubagentStart`, which fires *after* the spawn is committed and has no deny channel | **ALREADY COVERED (native, partially)** |
| — | Effort pinned high | **Native** `/effort`; docs say re-sweep, and the system card shows `medium` peaking on FrontierCode | The highest-leverage action in the whole corpus, and it is a per-session knob | **DO NOTHING** |
| — | CLAUDE.md bloat and conflicts | **Native `/doctor`**; **assay** for evidence-backed findings | None | **ALREADY COVERED** |

### foreman — omitted by the first two passes, and it needs nothing

foreman was never audited against the taxonomy. Audited now, it is the plugin **best aligned** with
the recon's biggest structural finding, and it needs no change.

The finding: the prompting guide says Opus 5 "performs best when given the complete task
specification up front and left to run", and the corpus's happy population is the one using it as an
executor under a spec rather than a turn-by-turn partner (§C.1). Manufacturing that spec is foreman's
entire product. Its handoff carries the task identity and goal, `relevant_files` with symbols
resolved against the real code, an `Expected file surface:` line, `task_rules`, and a runnable
`Verification (REQUIRED): Run:/Expected:` pair. That is Anthropic's scope-constraint and
full-spec-up-front advice already shipped as a template with a mechanical gate behind it
(`scripts/check-prompt.js`).

The obvious worry was the opposite one: that foreman carries exactly the 4.x-era verification
scaffolding Anthropic now says to delete. It does not, and the distinction matters.

- `<truth_grounding>` ("verify it against the current state of the codebase") grounds a possibly
  stale *plan* against reality. A queued prompt can be executed much later. That is not the model
  double-checking its own answer, which is the thing that now over-fires.
- `Verification (REQUIRED)` is a concrete command with an expected signal, not self-check prose. It is
  the same shape as the first-party `/goal` remedy for false completion.
- The bounded fix loop is a *ceiling* on retries, which pushes against over-verification rather than
  feeding it.

Watch item, not work: if Anthropic's "rules to judgement" direction continues, a template this
explicit could start costing more than it buys on later models. That is a measurement question for a
future release, not an edit today.

### The candidate that revision 2 opened, and why it still loses

Cluster 15 is the only row where new evidence created a real gap: a vendor-caused behaviour, a
measured complaint (one branch at 40% comments against 8% on main), and no coverage in either plugin.
razor owns the layer — comments are code volume, and its stated rules are "deletion over addition"
and "shortest working diff".

It still does not earn work, for three reasons:

1. **The ladder is frozen** by owner decision, so the cheap version — one rung or one clause — is the
   expensive option here.
2. **A comment-ratio gate is new machinery**, not a small edit: a PostToolUse diff parser, a
   threshold per language, tests, and a false-positive story for genuinely comment-heavy files. That
   is a feature, not a line.
3. **It bets against the vendor's own eval.** Anthropic deleted the no-comments rule deliberately and
   reports no measurable loss on their coding evaluations. Re-adding it as a plugin rule is a claim
   that their eval missed something. That claim may well be right — but it needs measurement first,
   not code first.

The cheap move, if the owner wants one, is a user-level instruction, not a plugin: one CLAUDE.md line
naming the comment budget. If it should become razor's job, the order is measure, then decide: a
`proof` A/B on comment ratio with and without the instruction, on this repo's own benchmark fixtures.
That needs a paid batch and the owner's go under the existing ask-before-batches rule.

### The edit killed in revision 1

One row (2, register) reached a proposed change: add "A metaphor where a plain description would do?"
to `hush/output-styles/hush.md:125`, Register read-back step 9. Refuted on three grounds.

1. **Duplicate of a broader shipped line.** `hush.md:90` already requires "everything around them is
   everyday English, in words the reader had before this session started" — that excludes coined shop
   jargon, which is the whole complained-about class.
2. **No demonstrable target.** Searching 2,518 `.json` and 2,058 `.jsonl` committed run records under
   `benchmarks/` for "load-bearing", "footgun", "blast radius" and "the unlock" returns zero
   occurrences in run output.
3. **It misses its own cited evidence, and local measurement points the wrong way.** The "it's not X,
   it's Y" tic is antithesis, not metaphor. And this repo's 408-run cap-conformance result was that
   adding short-sentence pressure to the style file made replies *longer*.

**Net: ship nothing.** Nothing to `hush/output-styles/hush.md`, nothing to `hush/styles/*.md`,
nothing to razor, nothing to assay, no new plugin, no new skill, and nothing to any README or
CHANGELOG.

---

## E. What the corpus does not support

- **No controlled comparison with reported methodology or data exists in 55 threads.** Every "Opus 5
  introduces more regressions" claim is single-session anecdote. One user claims a blind test but
  reports only a thinking-token impression. The one quantitative post is about Opus 4.6 and its own
  thread refutes its method.
- **Quantization / compute-reallocation / "lobotomy" has zero evidence** and was already being
  asserted about 4.8 *before* Opus 5 shipped. Also unsupported: a new tokenizer inflating token
  counts, quantisation-based routing, deliberate benchmark gaming, and an intentional upsell strategy.
- **"Lower the effort level" is more right than revision 1 allowed, and still not a verbosity fix.**
  It is reported working repeatedly against overthinking and rabbit-holing, the docs endorse
  re-sweeping down, and the system card's FrontierCode result shows `medium` scoring highest because
  higher effort makes more changes than the task requires. What it does **not** do is shorten replies
  — "lowering effort can reduce thinking volume without reliably shortening the visible response".
  Revision 1 wrongly said the docs contain no support for high effort hurting; the support is in the
  system card, not the prompting pages.
- **"Opus 5 is verbose" is not universal.** ~11 voices report the opposite: too terse, cryptic,
  patching 300 lines without a word. Several had already installed brevity instructions.
- **"Opus 5 is instructed not to spawn subagents"** is unverified and contradicts the documented
  "delegates to subagents more readily". Do not build against it.
- **One voice reports a caveman-style plugin failing on Opus 5** ("acknowledged that caveman was in
  effect and two responses later, revert to writing War and Peace"). Read correctly, that is evidence
  *for* hush's architecture — a style file alone decays inside a session.
- **Nobody in the corpus asked for tooling that does not exist.** Every fix reported as working is
  free or native: lower effort, roll back the model, delete or shrink instructions, split models,
  plan or spec first, start a new session, run `/doctor`. That is the strongest single argument for a
  table with no work in it.
- **Reddit selects hard for frustration.** Satisfied users mostly do not post, and the sentiment is
  genuinely split: "practically unusable" drew ~890 points, "working fine for me" ~137 and "Opus 5 is
  incredible" ~153.

---

## F. Verification pass and remaining gaps

Verified after the first synthesis, and folded in above:

- Every documentation quotation in §B and §D re-verified verbatim against `platform.claude.com`.
- The blog post's 80% claim, the deleted comment/planning-document text, the replacement line, the six
  shifts, and `/doctor` all verified against `claude.com/blog/...`.
- The FrontierCode-by-effort result corroborated across independent secondary sources (peak at
  `medium`: 53.4% main, 63.6% extended; higher effort penalised for out-of-scope edits).
- The register edit refuted against `hush.md:90` and the committed benchmark records.
- `hush.md` line numbers 10, 12, 55, 77, 79, 83, 90, 94, 104, 108, 125 re-checked;
  `verify-style.js:15` `GUARDED_SECTIONS` is `["Mid-turn silence", "Thoroughness", "Never compress",
  "Final message"]` and `CORE_PHRASES` has four entries, neither covering `## Register`.
- razor and hush both searched for comment-density language: razor's only hit is its own `razor:`
  ceiling marker, hush has none. The "match its comment density" line is Claude Code's current base
  prompt, not either plugin.
- foreman audited in revision 3: `prompt-template.md` read for verification wording, and its three
  verification surfaces classified (plan-grounding, runnable command, retry ceiling). None is the
  self-check pattern Anthropic says to delete. This corrected the cluster 7 row.
- `docs/hush/research/codex-native-alternatives.md` read: it concerns Codex shell-output compression, not any
  pain-cluster lever, so it does not bear on the "already covered (native)" rows.
- The claim that hush pushes the wrong way on overconfidence was withdrawn — `hush.md:79` pushes the
  right way, and "a statement that was accurate needs no correction" is Claude Code's base prompt,
  absent from hush.

Still unconsulted, and worth naming:

- **The Opus 5 system card itself.** Cluster 5 and the FrontierCode figures are admitted on published
  summaries; the PDF exceeded the fetch limit here. Read it before quoting the card publicly.
- **`anthropics/claude-code` issues and the CLI changelogs shipped alongside Opus 5.** That is the one
  place users post reproducible cases with their config attached, and it is now doubly relevant: the
  80% deletion means several "model changed" behaviours are harness defaults in a CLI release.
- **A comment-density measurement.** Cluster 15's weight in this corpus is a floor, not an estimate,
  because the keyword filters were tuned for verbosity and scope language.

---

## Sources

Documentation (ground truth):
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
- https://platform.claude.com/docs/en/about-claude/models/migration-guide
- https://platform.claude.com/docs/en/build-with-claude/effort
- https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models
- https://www.anthropic.com/news/claude-opus-5
- System card, not read directly (PDF exceeds fetch limit): summarised via
  https://thezvi.substack.com/p/claude-opus-5-the-system-card ·
  https://www.sitepoint.com/claude-opus-5-medium-effort-frontiercode-benchmark/ ·
  https://www-cdn.anthropic.com/c5fbac3f0b1280a933ebd26d3cb8bb9f5bdeaf48/Claude%20Opus%205%20System%20Card.pdf

Supporting first-party pages cited in the decision table: code.claude.com/docs/en/output-styles ·
/memory · /hooks · /goal · /permission-modes · /sub-agents · /model-config · /doctor

Threads cited:
- https://reddit.com/r/Anthropic/comments/1v6r82w/opus_5_is_erm_a_nightmare/ (617)
- https://reddit.com/r/Anthropic/comments/1v6zk2y/opus_5_is_not_incredible_i_take_it_back_p/ (244)
- https://reddit.com/r/Anthropic/comments/1v7hiik/guys_either_opus_5_is_worst_than_opus_48_or_it/ (171)
- https://reddit.com/r/Anthropic/comments/1v83vb2/i_am_shocked/ (391)
- https://reddit.com/r/Anthropic/comments/1v8zu46/let_me_know_when_anthropic_releases_a_good_model/ (263)
- https://reddit.com/r/Anthropic/comments/1vahyru/switched_back_to_opus_48/ (599)
- https://reddit.com/r/Anthropic/comments/1vb41nf/opus_50_sucks/ (412)
- https://reddit.com/r/Anthropic/comments/1uwzqor/opus_48_is_officially_braindead/ (289, pre-Opus-5)
- https://reddit.com/r/ClaudeAI/comments/1v5h6o9/introducing_claude_opus_5/ (2937)
- https://reddit.com/r/ClaudeAI/comments/1v5h4id/introducing_claude_opus_5/ (823)
- https://reddit.com/r/ClaudeAI/comments/1v7b1u1/opus_5_is_an_incredible_coder_and_really_painful/ (476)
- https://reddit.com/r/ClaudeAI/comments/1v8cpbr/fable_opus5/ (392)
- https://reddit.com/r/ClaudeAI/comments/1v92csh/opus_5_extremely_rlfried_and_mistakeprone_for/ (260)
- https://reddit.com/r/ClaudeAI/comments/1vam0ak/opus_5s_stream_of_consciousness_and_longwinded/ (254)
- https://reddit.com/r/ClaudeAI/comments/1vbdp39/is_opus_5_actually_that_bad_or_is_it_just_reddit/ (520)
- https://reddit.com/r/ClaudeAI/comments/1vephjv/opus_5_is_just_annoying_to_work_with_back_to_opus/ (531)
- https://reddit.com/r/ClaudeAI/comments/1vfw5tp/opus_48_opus_5/ (399)
- https://reddit.com/r/ClaudeAI/comments/1vgpyni/my_opus_5_experience_in_a_nutshell/ (3612)
- https://reddit.com/r/ClaudeAI/comments/1urq8fv/opus_48_is_a_pain_in_the_a_to_read_and_to_work/ (455, Opus 4.8 only)
- https://reddit.com/r/ClaudeCode/comments/1vhaxfj/opus_5_is_too_verbose_and_hard_to_understand/ (139)
- https://reddit.com/r/ClaudeCode/comments/1veeuy5/opus_5_is_a_practically_unusable_model/ (894)
- https://reddit.com/r/ClaudeCode/comments/1vdq86b/opus_5_is_just_dumb/ (170 comments)
- https://reddit.com/r/ClaudeCode/comments/1uyxibb/theres_a_terrible_seam_in_your_spine_which_might/ (190)
- https://reddit.com/r/ClaudeCode/comments/1v0nyf1/fable_56_sol_opus_working_together_is_soooo_unfair/ (620)
- https://reddit.com/r/ClaudeCode/comments/1snhyck/my_name_is_claude_opus_46_i_live_on_port_9126_i/ (2464, Opus 4.6)
- https://reddit.com/r/ClaudeCode/comments/1uwme1k/opus_50_coming_this_week/ (449, pre-release)
