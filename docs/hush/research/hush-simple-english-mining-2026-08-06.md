# hush ← SimpleEnglish mining pass (2026-08-06)

**Status:** HISTORICAL — banner added 2026-08-18. ADR-3 shipped (the counting-redo
fix) and ADR-2, the headline hypothesis, was refuted: short sentences in the style
file made replies longer. Note the cap itself has since moved from 15 words to 10
(hush 1.6.0), so every conformance number below is measured against a cap that no
longer applies. Records for the batches cited here live under
`benchmarks/hush/records-archive/`, not `records/`. The current account of hush's
open work is `hush-consolidation-2026-08-18.md`.

Source: `github.com/AminBlg/SimpleEnglish`, cloned to `D:\Projects\Knowledge\SimpleEnglish`,
HEAD `379728b` (2026-07-21, 9 commits, whole project is one day old).
**License MIT** — code and prose are both safe to adapt with attribution.
Repo names go in gitignored notes only, per the house rule.

---

## 1. What the source is, and where it touches hush

A prompt-only agent skill (`skills/simple-english/SKILL.md`, 18 KB) that encodes
ASD-STE100 Simplified Technical English — the controlled language aerospace has used
since 1983 — as 53 numbered rules with software examples. Around it: two reference
files, a standalone system-prompt version, a deterministic regex linter
(`evals/ste_lint.py`, 133 lines), a `claude -p` benchmark runner, 8 scenarios,
96 committed raw runs, and a results table.

**It is not a hush competitor.** Its target is the *artifact the agent writes* —
READMEs, runbooks, error messages, incident reports. hush's target is the *chat
reply* and the *tool output on the way in*. Zero mechanism overlap: no hooks, no
compression, no silence, no harness integration. It ships one skill file.

The overlap is a single surface: **hush's output style already is a controlled
language for the final message**, with hard caps, a banned-punctuation list, a
plain-word rule, and a numbered redo pass. SimpleEnglish is the same species of
artifact built independently, so the useful question is not "what can we copy"
but "where did they solve something we left implicit".

Two convergences worth recording, because they retire questions rather than open them:

- **Anti-terseness.** STE Rule 4.2 forbids telegraph style — keep articles, keep
  "that", no contractions. hush's `Keep the verbs; write the sentence` is the same
  rule, reached independently. hush's Rock preset is deliberately the opposite, and
  that stays a preset, not a default.
- **The self-check.** STE's "Self-Check Before You Deliver" is four numbered actions
  run before delivery. hush's Register redo is seven. Same shape, same placement,
  same reason. hush's own measured law — *a rule stated as an action to carry out
  reaches the reply; the same rule stated as a description does not* — is the
  general form of what their skill discovered.

---

## 2. What the pass actually found

The mining produced one genuinely new thing, and it did not come from copying a
rule. It came from copying their **method**: they ship a deterministic linter and
point it at their own output.

Pointing the equivalent at hush's 272 committed benchmark records — free, no API
calls, no new runs — says this:

| Cap, as hush's style states it | Held? | Measured over 272 records |
| --- | --- | --- |
| **12 lines** for the whole message | yes | breached in 1 of 136 hush runs |
| **15 words** per sentence or bullet | **no** | **297 of 836 sentences over — 35.5%** |
| No semicolons | **no** | 14 |
| No parentheses inside a sentence or bullet | **no** | 79 of 836 units |
| Latin abbreviations, filler words | yes | 0 and 0 |

The 15-word breach is not a rounding artifact. The distribution is
`16–20w: 137, 21–30w: 135, 31–45w: 25, 46+: 0`, so the typical breach is roughly
double the cap, and the worst sentence hush shipped is 44 words. Every backticked
identifier already counts as one word here — STE Rule 8.6, and a real ambiguity in
hush's own wording. **The sentences are long prose, not long identifiers.**

hush still beats no-plugin on every one of these on Sonnet — 306→185 long sentences,
37→3 semicolons, 200→32 paren units, over 709→497 units. The finding is not that
hush is bad. It is that **hush's most-repeated hard limit fails on more than a third
of the sentences it ships, and nothing in the repo would have told us.**

**Haiku is worse, and the shape of it matters.** Absolute long sentences barely move,
122→112, while total sentences fall 491→339 — so as a *share* of what hush writes,
the breach rate goes the wrong way, 24.8% baseline to 33.0% hush. hush shortens the
message without shortening the sentence. That is the cap failing, not the cap being
traded for something.

### The likely cause, and why it is a hush finding rather than a borrowed one

SimpleEnglish's premise, stated in its own use-cases file: *a system prompt is a
procedure for a reader that cannot ask questions.* hush proved the strong form of
this in the 2026-07-20 voice-transfer campaign: **the reply comes out in the
register the style file is written in** — writing every section in the voice took
Sonnet's pirate dialect from 0/12 to 12/12, at flat cost.

Run that measurement on the style file itself:

| File | its own sentences over 15w | mean | longest | semicolons |
| --- | --- | --- | --- | --- |
| `output-styles/hush.md` | **28%** (32 of 113) | 13.0w | **55w** | **12** |
| `styles/pirate.md` | 29% | 12.7w | 57w | 11 |
| `styles/sensei.md` | 28% | 14.5w | 55w | 10 |
| `styles/rock.md` | 2% | 4.8w | 19w | 2 |
| `styles/glyph.md` | 1% | 5.8w | 19w | 2 |

`hush.md` teaches a 15-word cap in prose that spikes to 55 words, and bans
semicolons in a file containing twelve of them. Its worked example is clean — every
line under 15 words — but the example is ~8 lines against ~110 lines of instruction
prose, and the transfer law says the reply copies the file, not just the example.

**This is a hypothesis, not a proven cause.** Rock and Glyph are terse files that
produce terse replies, but their voice is telegram by design, so their density is
explained twice over and the n=5 correlation proves nothing on its own. The records
cover stock only. What makes it worth a batch is that hush has already measured the
mechanism in a different dimension and found it strong.

---

## 3. Decisions

### ADR-1 — Build a cap-conformance meter in the benchmark harness. ACCEPT. **BUILT 2026-08-06.**

**Shipped:** `benchmarks/hush/runner/caps.js` and
`benchmarks/hush/tests/benchmark_caps.test.js` (29 tests). Harness suite
103 → 132, all green. Nothing in the plugin changed; the readiness gate still
reads 10 of 10.

The caps are **parsed out of `output-styles/hush.md`**, never copied into the
meter — a reworded style throws with a message naming the fix instead of quietly
scoring against a stale number. One deliberate ceiling carries a `razor:` comment:
a one-character group like `(a)` reads as an enumeration label and is not counted
as an aside.

Usage:

```
node runner/caps.js --records records/claims2-sonnet-4c486329
node runner/caps.js --tag <batch-tag>
```


**Context.** hush publishes cost, final-message words, narration words, and
ground-truth pass rate. It publishes nothing about whether the shipped message obeys
the style's own contract. The one prior acknowledgement is a line in the 2026-07-21
preset-conformance notes: *"style caps slip on plan-avatars for every arm including
stock — same class, tolerated."* Tolerated because unmeasured.

**Decision.** Add one analyzer beside `metrics.js` in
`benchmarks/hush/runner/`, reading `finalText` from the records that
already exist. It reports, per arm and per segment: sentences over 15 words with the
over-cap distribution, messages over 12 lines, semicolons, parentheses inside a unit,
and the longest sentence with its task. Fenced blocks are exempt — they are
`Never compress` content. Backticked spans count as one word, and the report states
that it counts them that way.

**Why this rung.** Not new machinery: the harness already has `metrics.js`,
`report.js`, `stats.js` and `publish.js`, and this is a sibling of them. It runs on
committed records, so it costs nothing per run and needs no new batch. It lives in
the parent repo, so the shipped plugin gains zero bytes. It has already paid for
itself — every number in §2 came from the throwaway version.

**Copy from the source, deliberately:** the honest-ceiling docstring at the top of
`ste_lint.py`. It names what the regex cannot see and states that the numbers are
comparable between two texts run through the same version, never a compliance
verdict. hush's own oracle-circularity lesson makes that mandatory here, not
optional: this meter is a *different* implementation of the caps than the style
prose, so it must never become the definition of them.

**Do not copy:** their rule set. hush's caps are 15/12/no-semicolon, not STE's
20/25. A meter that scored hush against someone else's numbers would measure nothing
hush claims.

---

### ADR-2 — Rewrite `hush.md`'s own prose to obey `hush.md`'s own caps. ACCEPT, gated on an A/B.

**Context.** §2 above. The style is the one file whose register is measured to
transfer, and it is currently a counter-example to itself.

**Decision.** Build one variant of `output-styles/hush.md` in which the instruction
prose is rewritten under the caps it teaches — every sentence at or under 15 words,
zero semicolons, no parentheses inside a sentence — with every verifier anchor
intact: same numbers, same inline code, same bold spans, same shape-table rows,
paragraph for paragraph. Run it as an arm against stock in one interleaved batch.
Score with ADR-1's meter plus the standing metrics.

**Ship only if** over-cap sentence rate drops materially on **both** models with cost
and ground truth flat. hush's own noise floor rule applies: same direction on both
models plus a second metric moving, or it is noise.

**Known risks, named up front.**
- The 60% word floor in `verify-style.js` is a floor on *this* rewrite too. Cutting
  55-word sentences into 12-word ones preserves words, so the floor is not the
  binding constraint, but the paragraph-for-paragraph check is — the rewrite must
  split sentences without collapsing blocks.
- hush's prior evidence that the reworkable prose is load-bearing: the Hush Plain
  rewrite dropped the clause-test paragraph and *lost the compression*. This rewrite
  must reword, never delete.
- Wording levers have measured null in this repo more often than they have measured
  real. Budget for a null result and say so in the proposal.

**This is the batch to propose. It needs its own go, with arms × tasks × reps and a
cost estimate, per the standing rule.**

---

### ADR-3 — Put the caps into the Register redo as literal-search actions. ACCEPT, same batch as ADR-2.

**Context.** SimpleEnglish's self-check step 2 is: *search your draft for `'ll`,
`has been`, `should`, `, making`, semicolons.* A literal string search is the most
checkable form a rule can take.

In hush's style the caps live in **Final message** as a stated limit. The **Register**
redo — the seven numbered actions the model actually carries out before sending —
never mentions the 15-word cap, the semicolon ban, or the parenthesis ban. Step 2
says *"A long sentence? Break it into short ones"* with no number in it. That is
exactly the shape hush already caught and fixed once: Rock's redo line moved nothing
until the style's own fifteen-word number was put into it, after which it went 96w →
68w on Sonnet and 20.0 → 14.1 words per sentence on Haiku.

**Decision.** Put the number and the two banned marks into the redo steps, as
actions. Nothing is added to the file's rule count — the caps are already stated, so
this only moves them from the section that describes to the section that executes.

**Why in the same batch as ADR-2.** They are the two candidate causes of the same
measured breach, and hush has already found that wording and delivery *compound*.
Run them as separate arms so a null on one does not hide a win on the other.

---

### ADR-4 — Give `verify-style.js` a density ceiling. ACCEPT, small, independent.

**Context.** The verifier enforces a 60% word **floor** per guarded section so a
rewrite cannot delete a rule. It has no ceiling and no sentence-length check. A
crafted style written entirely in 50-word sentences passes today, and the transfer
law says that style will teach 50-word replies.

**Decision.** After ADR-2 settles what the canonical file's density actually is,
derive the ceiling from the canonical file rather than hard-coding a number — the
same principle the rest of the script already follows, where the canonical file is
the source of truth for every invariant. Report it as a problem, never rewrite.

**Sequence.** This lands *after* ADR-2, because deriving a ceiling from a file that
breaches its own caps would pin the breach in place.

---

### ADR-5 — Close the self-contradicting cap exemption. ACCEPT, one-line edit. **DONE 2026-08-06.**

**Shipped:** the exemption clause is gone from `output-styles/hush.md` and from
`styles/pirate.md`, which carried its own rewrite of it. The other three presets
verify in core mode and never had the caps block. Full verify passes on pirate,
core verify passes on rock, glyph and sensei. hush's suite: 482 of 482.


**Context.** `output-styles/hush.md` says both of these:

> These are hard limits, not targets. Only content under Never compress may pass them:

> Anything the user asked to have explained — requested depth is the deliverable.
> […] Every limit above applies to each one.

The first grants `Never compress` an exemption from the caps. The second, inside
`Never compress`, revokes it. hush's own wording lessons name this exact failure
twice: *enumerating what a rule doesn't cover reads as permission*, and *a carve-out
is a hole sized by its own wording*.

The measured breach concentrates in the explain-shaped tasks — `explain-rebase` 41
over-cap sentences, `explain-rerender` 35, `log-triage` 39 — which are precisely the
turns a reader could file under "asked to have explained".

**Decision.** Delete the exemption clause, so the caps have no carve-out and the
`Never compress` section keeps the one sentence that already says the limits apply.
One sentence out, nothing in. It preserves every verifier anchor.

**Do not** replace it with a longer clause explaining when the exemption applies.
The lesson from the same report: when a clause backfires, the answer is almost never
more words.

---

### Rider — say how a backticked identifier counts

`- **15 words** per sentence or bullet. Count them.` never says what
`src/net/retryPolicy.js` counts as. STE Rule 8.6 settles it in their file: quoted
text, identifiers, and numbers with units each count as one word. Measured impact on
hush is small — collapsing them moves the breach count 192 → 188 — so this is a
clause added while ADR-2 is already touching the file, not a reason to touch it.

---

## 4. Checked and rejected

| Candidate | Rung | Why not |
| --- | --- | --- |
| Two modes, pragmatic and strict | 1 | Standing product decision: *"There are no compression levels and no profiles. hush has one policy."* Also the user's own no-intensity-levels principle. |
| An STE / "manual" voice preset for the shelf | 1 | Measured precedent: the status-token voice was rejected because a register that flat *"reads much like stock Hush already"*. STE is stock hush plus extra articles. |
| A linter hook that blocks or rewrites the final message | 1 | The capability does not exist. Probed against the binary: zero occurrences of `updatedMessage` / `suppressMessage` / `blockMessage`, and a MessageDisplay probe hook never fired. |
| Slop-word substitution table in the style | 1 | Measured **0 hits** in 272 records for the whole list — leverage, utilize, seamlessly, robust, comprehensive, delve, myriad. The problem is already absent. |
| Ban Latin abbreviations | 1 | Measured **0 hits** under hush. Baseline had 19. Already solved by the existing rules. |
| One-word-one-meaning / synonym-rotation rule | 1 | A 69-word reply has no room to rotate. No measured instance. Their rule targets whole documents. |
| Banned-modal list in the reply rules | 1 | Measured 17 hedges across 136 hush runs, ~0.12/run, and reading them they are ordinary conditionals — *"unless you want those cleaned up"*. Nothing to fix, and hush already measured that naming residual classes **primes** them. |
| Dual 20/25 cap by procedural vs descriptive | 1 | More machinery for a 12-line message, and hush's single cap is not held yet. Fix the one cap first. |
| Condition-before-command as a reply rule | 1 | Plausible and cheap, but no measured hit — hush replies are already answer-first by the opening rule. Parked, not refuted. |
| Apply STE to hush's README | 1 | Conflicts with the committed template rule: the README voice is loud, vivid and opinionated on purpose. STE deletes persuasion by design, and their own file says so. |
| `npx skills add` multi-harness distribution | 1 | hush is hooks-first. Hooks do not port to Cursor or Codex. Their skill ports because it is one prompt file. |

**Audited and clean:** hush's own instruction files were scanned for hedged modals
on the strength of their *"models read 'should' as optional"* claim. Every hit in
`hush.md`, the four presets, and both SKILL.md files is either a legitimate
conditional (*"something the user would plausibly want to stop"*) or descriptive
prose about the reader (*"never a hint that the reader should already have known
something"*). No directive is softened by a modal. Nothing to do — recorded so this
is not re-mined.

---

## 5. What to do next, in order

1. ~~**ADR-1** — build the meter.~~ **DONE 2026-08-06**, uncommitted.
2. ~~**ADR-5** — delete the contradicting exemption clause.~~ **DONE 2026-08-06**,
   uncommitted, `CHANGELOG.md` carries an Unreleased line for it.
3. ~~**ADR-2 + ADR-3** — run the batch.~~ **DONE 2026-08-06.** ADR-3 shipped,
   ADR-2 refuted. Numbers in §6.
4. ~~**ADR-4**~~ **DEAD.** It was premised on ADR-2, and ADR-2 did not hold.

Nothing here changes the shipped plugin's runtime, adds a dependency, or adds a
surface. Four of the five items are edits to files that already exist; the fifth is
a report script in the parent repo's harness.

---

## 6. The batch proposal — ARMS BUILT, AWAITING GO

### The arms

Three variant style files, in `docs/research/cap-arms-2026-08-06/`. Each is a
complete `output-styles/hush.md`, frontmatter included, so an arm is a copy of the
hush plugin directory with that one file swapped. All three pass hush's own
`verify-style.js` in full mode against the current canonical — every number, code
span, bold span, shape-table row, listed exception and paragraph survived.

Scored by the new meter, the arms are a clean contrast:

| Arm | its own sentences | over 15w | longest | semicolons | asides |
| --- | --- | --- | --- | --- | --- |
| `stock` (canonical) | 114 | 32 — **28%** | 55w | 11 | 3 |
| `dense-prose` | 166 | 2 — **1.2%** | 16w | 1 | 1 |
| `redo-caps` | 120 | 33 — 28% | 55w | 11 | 3 |
| `both` | 172 | 3 — 1.7% | 17w | 1 | 1 |

`dense-prose` cannot reach zero. Its residual semicolon and aside sit inside the
two Register paragraphs the verifier requires **byte for byte** — the hook-reminder
clause and the self-narration ban with its quoted `"Let me..."` openers. Recording
that as a floor, not a miss.

It is a clean 2×2. Factor A is prose density everywhere in the file. Factor B is
what the redo list says. `both` is built by splicing only B's numbered list into A,
so neither factor drags the other along.

**What `redo-caps` changes.** The seven-step Register redo becomes nine, and three
of them are counting actions rather than judgment calls: count the words in your
longest unit against **15 words**, search the text for `;` and `(`, count the lines
against **12 lines**. The caps are already stated in `Final message` — this only
moves them into the section the model executes.

### The tiers

Per-run costs measured on this harness: Sonnet $0.19, Haiku $0.045. Four arms,
three reps, no `baseline` arm — baseline cap numbers already exist in the committed
records for the same tasks on both models.

| Tier | Shape | Runs | Cost |
| --- | --- | --- | --- |
| **2 — RECOMMENDED** | full suite, both models, 17 tasks × 4 arms × 3 reps | 408 | **≈ $48** |
| 1 | the 8 breach-carrying tasks, both models | 192 | ≈ $23 |
| 3 | full suite, Haiku only | 204 | ≈ $9 |

**Why tier 2.** Two reasons, both from this repo's own history. A wording lever has
already won on Sonnet and regressed on Haiku in the same batch, so a single-model
run is a coin flip on the ship decision. And the tasks that currently comply are
exactly where a prose rewrite can do damage — the Hush Plain rewrite dropped
load-bearing prose and lost the compression while cost stayed flat. Tier 1 cannot
see that, because it only runs the tasks already breaching.

### Running it

```
cd benchmarks/hush
for arm in dense-prose redo-caps both; do
  cp -r ../../hush "/tmp/hush-$arm"
  cp "../../docs/research/cap-arms-2026-08-06/$arm.md" "/tmp/hush-$arm/output-styles/hush.md"
done
node runner/run.js --tag caps-sonnet --full --reps 3 --model sonnet \
  --arms hush,dense-prose,redo-caps,both \
  --rival-dir /tmp/hush-dense-prose --rival-name dense-prose --rival-settings settings-hush.json \
  --rival-dir /tmp/hush-redo-caps  --rival-name redo-caps  --rival-settings settings-hush.json \
  --rival-dir /tmp/hush-both       --rival-name both       --rival-settings settings-hush.json
node runner/caps.js --tag caps-sonnet
```

One batch, arms interleaved, seed recorded — never spliced with a second run, and
cost is not comparable across batches. Repeat with `--model haiku`.

### RESULT — batch ran 2026-08-06, 408 runs, $52.77 all in

Tier 2 as recommended. Two batches, seed `1786009855333` shared so arm order is
paired across models, 17 tasks × 4 arms × 3 reps each. Spend $40.30 Sonnet +
$11.07 Haiku, plus $1.40 of pre-flight probes — **$52.77 against a $48 quote, 10%
over.** Records under `docs/research/cap-arms-2026-08-06/records/`.

**Over-cap sentence rate, the metric the whole batch was for:**

| Arm | Sonnet | Haiku | Verdict |
| --- | --- | --- | --- |
| `stock` | 35.0% | 32.3% | the thing to beat |
| `dense-prose` | **41.7%** | 27.7% | **REFUTED — worse on Sonnet** |
| `redo-caps` | **31.7%** | **26.4%** | **SHIPS** |
| `both` | 33.5% | 26.9% | rejected, worse than `redo-caps` alone |

**ADR-3 ships. ADR-2 is refuted, and it is the headline hypothesis that died.**

Writing the style file in short sentences did not produce shorter reply sentences.
On Sonnet it produced *longer* ones, 35.0% → 41.7%. The register-transfer law that
carried dialect 0/12 → 12/12 does not extend to sentence length. Voice transfers.
Density does not. That is now a measured limit on hush's own strongest lever, and
it kills ADR-4 with it — a verifier ceiling on style density would enforce a
property that buys nothing.

`redo-caps` wins the way this repo's levers always win: the cap moved out of the
section that *describes* and into the numbered sequence the model *executes*. Fifth
confirmation of action-beats-description. It also brings stock in line with the
guidance `craft-style` already gives every crafted style — *"the redo grows into
one numbered sequence with each cap as its own action"* — which stock itself was
not following.

Everything else held flat, which is what makes it shippable:

| | Sonnet stock → `redo-caps` | Haiku stock → `redo-caps` |
| --- | --- | --- |
| Cost per run | $0.1950 → $0.1982, +1.6% | $0.0542 → $0.0536, −1.1% |
| Ground truth | 94% → 96% | 96% → 94% |
| Final message words | 86 → 87 | 87 → 86 |
| Mid-turn narration | 4.7w → 3.5w | 0.9w → 0.2w |

Two honest notes. The Haiku ground-truth dip is one run of 51, and the failures
cluster in `explain-rerender` on Sonnet and `incident-followup` on Haiku **across
every arm including stock**, so it reads as task noise rather than an arm effect.
And `redo-caps`' single worst sentence on Sonnet is 52 words against stock's 38 —
the rate improved while the tail got longer, so the redo shortens the common case
and not the outlier.

The dense arms carry one more mark against them: on Haiku they narrate 3.1 and 3.3
words per run against stock's 0.9, while `redo-caps` narrates 0.2.

**Shipped:** the nine-step redo is in `output-styles/hush.md`. Presets keep their
own redo lists and were not touched — they are unmeasured, and widening the change
past what the batch measured would be inventing evidence. hush 482/482, harness
134/134, readiness gate 10 of 10.

### Ship rule, fixed before the numbers arrive

Ship an arm only if its over-cap sentence rate drops materially on **both** models,
with cost and ground-truth pass rate flat. A move on one model only is noise until
a second metric moves with it. A null result is a real outcome and gets recorded as
one — the file stays as it is.

---

## Appendix — how the numbers were produced

`benchmarks/hush/runner/caps.js` over `benchmarks/hush/records/`
(`claims2-sonnet-4c486329`, 170 records; `claims2-haiku-55fd2b8b`, 102 records),
reading the `finalText` field each record already carries. Fenced blocks stripped,
table rows and headings excluded, list markers stripped so each bullet is its own
unit, sentences split on `.!?` followed by whitespace. Every long sentence quoted in
§2 was read back in full to confirm it is one real sentence and not a splitter
artifact.

**One correction to the first pass.** The throwaway splitter ended a sentence only
at whitespace directly after `.!?`, so a bold topic lead merged with the sentence
after it — `**Fixed it.** Here is why.` scored as one long unit. The style asks for
a bold topic lead, so this hit real replies. The meter now lets closing markup and
quotes ride with the sentence they close, pinned by two tests. The headline moved
37.5% of 821 → **35.5% of 836**, and the worst sentence 67w → **44w**. Every figure
in this report is from the corrected version.

Ceiling, stated the way their linter states its own: this is a regex pass. It cannot
see passive voice or part of speech, it can miscount sentence bounds in unusual
markdown, and its numbers are comparable between two texts run through the same
version. They are not a verdict on the style contract.
