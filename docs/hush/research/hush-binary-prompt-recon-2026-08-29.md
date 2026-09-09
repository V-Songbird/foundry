# hush vs the shipped Claude Code prompt — binary recon, 2026-08-29

Local-only (`docs/*` is gitignored). Numbers and quotes here come from the shipped binary and from
two cheap live probes, not from a paid batch.

## Source

`C:\Users\Songbird\.local\bin\claude.exe` — PE64, 217,360,032 bytes, a bun standalone with the JS
bundle embedded uncompressed. Build metadata found inline:

```
VERSION:    "2.1.251"
GIT_SHA:    37534ac596d80cefb02d272f036adba4ba055d2c
BUILD_TIME: "2026-08-28T14:51:38Z"
```

Extraction, all in the session scratchpad:

| file | what it is |
| --- | --- |
| `xstr.py` | pulls printable runs ≥ 60 chars out of the PE, pickles offsets |
| `bundle.txt` | the 118 runs over 50 KB, concatenated — 22 MB of readable minified JS |
| `decode.py` | decodes every string/template literal ≥ 120 chars in a byte range |
| `prompt-corpus.txt` | 83 decoded prompt constants from `[5455000, 5545000)`, offsets kept |
| `BRIEFING.md` | the architecture write-up handed to the analysis workflow |

There is no `strings` on this machine and no plain `.js` under
`~/.local/share/claude/versions/`; Python over the raw PE is the working route.

## 1. There are two system prompts, and the split is by model

`Ob()` assembles the prompt. Its first line is `let u = b6(t), d = ed(u)`, and the return is

```js
return [
  ...d ? [ D8t(O,t) ]                                   // LEAN
        : [ E8t(O), A8t(t),
            O===null || O.keepCodingInstructions===true ? R8t() : null,
            P8t(), x8t(U), O8t() ],                     // FULL
  ...me,                                                // ~20 dynamic sections
  aGe(t)
].filter(x => x !== null)
```

`D8t` is a five-bullet `# Harness` block. The FULL arm is six blocks: `# System`, `# Doing tasks`,
`# Executing actions with care`, `# Using your tools`, `# Tone and style`, plus the persona.

### Probe 1 — which branch each model takes (live, ~$0.04)

Two headless calls, no plugin, asking the model to report which exact phrases and headings are in
its own instructions:

```bash
claude -p --model <m> --setting-sources project --strict-mcp-config --max-turns 1 "<probe>"
```

| phrase / heading | Sonnet | Opus 5 |
| --- | --- | --- |
| `Before your first tool call` | **yes** | **no** |
| `Brief is good` | **yes** | no |
| `Being readable and being concise are different things` | no | no |
| `Use tables only for short enumerable facts` | no | no |
| `match its comment density, naming, and idiom` | no | **yes** |
| `# Doing tasks` | yes | no |
| `# Tone and style` | yes | no |
| `# Harness` | no | **yes** |

Sonnet's headings, in order: `# System`, `# Doing tasks`, `# Executing actions with care`,
`# Using your tools`, `# Tone and style`, `# Text output (does not apply to tool calls)`,
`# Session-specific guidance`, `# auto memory`, `# Environment`, `# Scratchpad Directory`,
`# Context management`.

Opus 5's headings, in order: `# Harness`, `# Session-specific guidance`, `# Memory`,
`# Environment`, `# Scratchpad Directory`, `# Context management`, `# Delivering work`,
`# Corrections`.

**Sonnet takes the FULL prompt. Opus 5 takes the LEAN one.**

## 2. The verbosity section has four branches, and hush quotes the wrong one

```js
function u8t(e){
  let t = Xe(e);
  if (ow("turn_updates", env.CLAUDE_CODE_TURN_UPDATES, t)) return c8t;       // A
  if (a8t(t) || CQn(t)) { … return `# Communicating with the user …` }       // B
  if (ed(e)) return "Write code that reads like the surrounding code: …";    // D
  return `# Text output (does not apply to tool calls) …`;                   // C
}
```

Probe 1 places **Sonnet on branch C** and **Opus 5 on branch D**.

Branch C, the part that matters, verbatim:

> Before your first tool call, **state in one sentence** what you're about to do. While working,
> give short updates at key moments: when you find something, when you change direction, or when
> you hit a blocker. **Brief is good — silent is not.** One sentence per update is almost always
> enough.
> …
> End-of-turn summary: one or two sentences. What changed and what's next. Nothing else.

Branch D, in full — this is the *entire* verbosity section on Opus 5:

> Write code that reads like the surrounding code: match its comment density, naming, and idiom.

hush's style opens with:

> The base prompt says: "Before your first tool call, say in a sentence what you're about to do."
> It also asks for brief updates while you work. Both are off in this style.

That quote is **branch B's** wording. Two consequences, both new:

1. **On Opus 5 the quoted sentence is not in the prompt at all.** hush introduces the instruction
   and then bans it. That is prompt-wording failure mode #2 — describing the scenario primes
   enactment — and Opus 5 is where the residual leak lives.
2. **On Sonnet the sentence exists but hush misquotes it.** The real text is "state in one
   sentence", not "say in a sentence". Failure mode #5 says a prohibition must name the instruction
   it overrides *verbatim*; hush names a near-miss.

**And the strongest competing instruction in the whole corpus is one hush has never mentioned:
"Brief is good — silent is not."** It is a direct contradiction of hush's premise, it is present on
Sonnet, and nothing in hush's style answers it.

Note the ledger already killed *dropping* the quote (3/12, on Opus). What has never been tried is
making the clause model-correct.

## 3. Anthropic ships hush's thesis as "focus mode"

`V8t(e)` returns `ed(e) ? K8t : q8t` when the user's view mode is focus. `K8t`, the lean variant:

> The user has focus mode enabled. They only see your final text message in each response — not
> tool calls, tool results, or any text you write between tool calls. Anything you say mid-turn is
> not seen, so don't narrate progress between tool calls. **Put everything the user needs into your
> final message: what you investigated, what you found, what you changed, decisions you made, and
> what's next.** Do not assume they saw earlier output.

That is a **five-part** content contract. hush's note contract is three parts: what happened / did
it work / what comes next. The two hush is missing — *what you investigated* and *decisions you
made* — map onto the open q2 defect ("which file do I open") almost exactly.

## 4. The frontmatter surface is exactly four keys

Plugin loader `Bze`, user/project loader `$9t`:

```js
{ name, description, prompt, source, baseDir?,
  forceForPlugin:         gV(fm["force-for-plugin"]),      // plugin-only, warns and ignores elsewhere
  keepCodingInstructions: gV(fm["keep-coding-instructions"]) }
```

There is no `turnReminder` key for custom styles. Only the four built-ins carry one, hard-coded.

**`keep-coding-instructions: true` is a no-op on Opus 5.** It re-adds `R8t()` (`# Doing tasks`),
which is only reachable in the FULL arm. hush sets it true; probe 1 confirms Opus 5 has no
`# Doing tasks` heading regardless.

## 5. The style name is a live per-turn instruction channel

```js
output_style: (e) => {
  if (e.style.length > C3e) { log("…suppressing its per-turn reminder"); return [] }
  return hs([ xe({ content: `${Mv(e.style)} output style is active. ` +
             `${e.turnReminder ?? "Remember to follow the specific guidelines for this style."}`,
             isMeta: true }) ])
}
```

`C3e = 256` (found at binary offset 182154708). `bue(name, prompt)` renders the style body as
`` `# Output Style: ${name}\n${prompt}` ``, so the name lands in **two** places.

### Probe 2 — a long name really does reach the reminder (live, ~$0.02)

A user-level style named with a 113-character sentence, activated via `settings.json`, then asked
to quote its own context back:

```json
{"styleHeading": "# Output Style: Hush. Say nothing until the work is done, then one short message: what happened, which file to open, what is next",
 "reminderLines": ["# Output Style: Hush. Say nothing until the work is done, then one short message: what happened, which file to open, what is next",
                   "Hush. Say nothing until the work is done, then one short message: what happened, which file to open, what is next output style is active. Remember to follow the specific guidelines for this style."]}
```

Both render. It works in headless `-p`. The name is the only per-turn text a plugin style controls,
and hush currently spends it on the word "Hush".

### Probe 3 — the reminder repeats every turn and survives resume (live, ~$0.02)

Three `-p` turns chained with `--continue`, the third asking the model to count:

```json
{"reminderCount": 3, "userTurnsSoFar": 3}
```

One reminder per user turn, re-injected on every turn, and it survives `--continue`. That is
exactly the property [[hush-nudge-mechanism]] found missing from `additionalContext`, which does
not survive a session resume — and unlike a hook-delivered style body, this arrives as the
harness's own system reminder rather than as injected user context.

Costs to weigh against it: the name is what the user picks in the style menu, what `settings.json`
stores, what the benchmark records as `outputStyle`, and it reads awkwardly when a sentence is
followed by "output style is active".

### But the channel is only live for some installs — verified

```js
async function uYn(){ if((vn()?.outputStyle||"default")==="default") return []; … }
```

The reminder fires **only when the `outputStyle` settings key is set**. Two paths bind hush:

- **Key set.** `README.md:215` says "Installing the plugin sets it for you" and documents
  `"outputStyle": "hush:Hush"`. This machine has it at `~/.claude/settings.json:61`, which is why
  this very session shows the reminder. Every benchmark run has it too, via
  `benchmarks/hush/settings-hush.json`.
- **Key absent, `force-for-plugin: true` instead.** `wH()` picks the first plugin style with
  `forceForPlugin===true` — but `uYn()` has already returned `[]`, so **no reminder**.
  `hush/scripts/activate-style.js` (lines 32, 52–55, 137) only ever *removes* the key.

So the channel is live for a fresh documented install and for every measurement this project has
run, and dark for a user who has since used `/hush:pick-style`. **Any win measured on it would not
reach every install**, which is the honest reason to hold it rather than the claim that it is dark
everywhere.

### A confound this exposes in every past arm

`docs/hush/research/rival-arms-2026-08-07/mkarm.js` rewrites `name: Hush` to the capitalized arm name.
So every A/B this project has run compared a control named `Hush` against arms named `Nextfact`,
`Combo`, `Parts`, `Secondfact`, `Notrust`. If the name is an instruction slot, arm names were never
neutral. All of them are short and non-instructional, so the effect is likely small — but it is not
zero and it was never controlled.

`rival-arms-2026-08-07/mknamearm.js` (new, beside `rival-arms-2026-08-07/mkarm.js`) builds an arm with an explicit style name and refuses one
that would breach the 256-char cap.

## 6. Blocks that land AFTER the output style

The style is dynamic section ~11 of ~20. Later, and therefore closer to the response: `# Context
management`, brief, `# Focus mode`, act-don't-rederive, `# Delivering work`, `# Corrections`.

`# Delivering work` and `# Corrections` are confirmed present on Opus 5 by probe 1.

## 7. The built-in `Concise` style, for reference

Its per-turn reminder — a slot custom styles cannot set — is:

> Be concise: lead with the result, skip preamble and narration, keep only what the user needs.

Body highlights: "Lead with the result… No preamble ('Let me...', 'Now I'll...') and no closing
recap"; "Cut narration, keep substance"; "Answer simple questions in 1-3 sentences of plain prose.
Use headers, tables, and bullet lists only when they carry real structure, never as decoration."

## 7b. Branch B reaches nobody, so hush has been quoting a sentence no user receives

`i8t = [Dte, AQn, TQn]`, `a8t(e) = i8t.some(f => f(e))`, and branch B fires on `a8t(t) || CQn(t)`.
Verified verbatim in the bundle:

```js
function Dte(e){ if(_h(e,"fable_5_mitigations") || e==="claude-mythos-5") return!0; return!1 }
```

`AQn` and `TQn` both hard-return false, and `CQn` is `a.CLAUDE_CODE_BASALT_COVE || A("basalt_cove",e)`,
off by default. Probe 1 agrees from the outside: `Being readable and being concise are different
things` is absent on **both** models, and so is `Use tables only for short enumerable facts`.

So the sentence hush quotes on line 12 — "Before your first tool call, **say in a sentence** what
you're about to do" — ships in the binary but reaches no hush user. Sonnet gets branch C's
differently-worded "**state in one sentence**"; Opus 5 gets neither.

Applied: line 12 now quotes branch C verbatim. Suite still 527/527.

**Do not build on the tables line.** It was the strongest binary support for this campaign's
table-cell hypothesis and it is unreachable.

## 7c. The q2 hypothesis this campaign was chasing is REFUTED by the records

Checked directly against `records/rm300-93b2a811` and the retold judge output, hush arm, n=32
(`scratchpad/q2check.py`). Each reply classified by where its file paths sit:

| where the path sits | q2 survives a retelling |
| --- | --- |
| bare in prose, outside every link and table row | 8/11 = **72.7%** |
| only inside a link label or a table cell | 15/21 = **71.4%** |

**No difference.** The pre-compact claim that "file names in table cells do not survive a prose
retelling" does not hold on its own data. The clause added to `## Shape` for it — "Name it in a
sentence too, never only in a table cell" — has no measured support.

Word count inside hush does not separate them either: **75.8 mean final words when q2 passes, 75.6
when it misses.** (A workflow agent proposed redundancy-bought-with-budget on the strength of a
words mechanism; that is what this table refutes.)

What the misses actually cluster on is the **task**: log-triage 3 of 4, dep-bump-warnings 3 of 4 —
6 of the 9 — then release-digest, failing-suite and repo-sweep at 1 each, and feature-drift,
incident-forensics and rename-scope at zero.

### The log-triage misses are a judge-scope defect, and it is now fixed

`log-triage` is read-only diagnosis. Nothing is edited, so the thing to open is a **host**, not a
path. `log-triage__hush__r2` (scored a q2 miss) retold as:

> "The remaining open question is why that Redis host refused every reconnect attempt — that's the
> actual root cause still to track down."

The question already reads "Which file, command or **thing** should I open or run?" and the judge
was reading it as "which file". Same class of defect as the q3 bug caught earlier, and the same
fix: `runner/answerable.js` `judgePrompt` now states what its own word "thing" covers. It grants no
leniency — a reply pointing at nothing is still a miss — and both arms are judged by it.

### Re-judged with the corrected q2 — both models

Same records, same reader stage, only the judge's rubric for question 2 changed. Cost $5.97.

| | q2 before | q2 after | survives a retelling, before | after |
| --- | --- | --- | --- | --- |
| **Opus 5**, no plugin, n=32 | 93.8% | 90.6% | 90.6% | **87.5%** |
| **Opus 5**, hush, n=32 | 71.9% | **84.4%** | 71.9% | **84.4%** |
| **Sonnet**, no plugin, n=16 | 68.8% | 62.5% | 62.5% | **62.5%** |
| **Sonnet**, hush, n=16 | 56.3% | **81.3%** | 56.3% | **81.3%** |

**The 18.7-point Opus gap this whole campaign was chasing is now 3.1 points — one reply in 32,
inside the judge's own ±3–6 point noise. On Sonnet hush now LEADS by 18.8 points.** q3 is 100% for
hush on both models against 96.9% / 93.8%; q1 is 100% everywhere; rubric recovery is tied at 81.3%
on Opus. hush's longest verbatim run copied into a retelling is 4.9 words against the baseline's
7.7, so its replies are being genuinely paraphrased, not lifted.

The clarification is not a leniency grant in disguise: it moved hush up on both models and moved
the baseline slightly *down* on both. That is what a scope fix looks like and what a thumb on the
scale does not.

**The q2 campaign is closed. There is nothing left to buy there.**

#### Sonnet detail, for the record

### Re-judged with the corrected q2 — Sonnet, `sn300-b0703e71`

Same records, same reader stage, only the judge's rubric for question 2 changed:

| arm | q2 before | q2 after | survives a retelling, before | after |
| --- | --- | --- | --- | --- |
| no plugin | 68.8% | 62.5% | 62.5% | **62.5%** |
| hush | 56.3% | **81.3%** | 56.3% | **81.3%** |

**hush now beats plain Claude on retelling survival on Sonnet, 81.3% against 62.5%**, where it was
behind before. The clarification is not a leniency grant in disguise: it moved hush up and moved
the baseline slightly *down*, which is what a scope fix looks like and what a thumb on the scale
does not. Some of both moves is the judge's own plus-or-minus 3-6 point noise. q3 is 100% for hush
against 93.8%; q1 is 100% for both.

## 7d. Every silence leak on Opus 5 is the same five letters

All 17 mid-turn texts hush emitted across the 32 Opus sessions in `rm300-93b2a811`:

```
[ 7w] dep-bump-warnings r2,r3,r4   I'll start by looking at the project.
[ 8w] failing-suite     r1         I'll start by looking at the project structure.
[ 7w] failing-suite     r3         I'll start by exploring the project structure.
[ 6w] feature-drift     r1         I'll look at the files first.
[ 8w] feature-drift     r2         I'll start by looking at the project files.
[ 6w] log-triage        r1,r3      I'll dig into the log now.
[11w] release-digest    r1         API Error: Connection lost mid-response. …
[ 7w] release-digest    r3         I'll start by exploring the repository structure.
[ 8w] release-digest    r4         I'll start by looking at the repository structure.
[ 5w] rename-scope      r1         I'll look at the codebase.
[ 6w] rename-scope      r2         I'll start by exploring the codebase.
[ 6w] repo-sweep        r2,r3      I'll search for remaining `db.query` calls.
[ 6w] repo-sweep        r4         I'll search for remaining `db.query` usages.
```

**Sixteen of seventeen begin with the literal word `I'll`.** Not one is a mid-work finding, and not
one is the colon dodge `# Tone and style` warns about. They are all a first-person future-tense
announcement before the first tool call — and on Opus 5, per §2, nothing in the system prompt asks
for one.

The seventeenth is not hush's text at all. `API Error: Connection lost mid-response.` is the CLI
writing its own failure into the assistant stream, and `metrics.js` was counting it as narration.
**Fixed** — `runner/metrics.js` now drops assistant messages that open with a harness error, so the
true Opus silence figure is **16 of 32, not 15**. Harness suite 232/232.

hush's Quiet section *describes* this leak ("not with a line about what you will look at first —
that line is the leak") but never names its literal shape. The ledger's one repeatedly-proven
device is naming the dodge verbatim. This is the most literal dodge the campaign has ever found,
and the smallest possible edit is five words.

## 7e. The leak is a DIFFERENT shape on each model, so `noill` is an Opus-only lever

Same scan over `sn300-b0703e71` (Sonnet, 16 hush sessions, 11 strictly silent, 8 leaks):

```
[16w] dep-bump-warnings r1  Two real bugs, both caused by the dependency bump changing shapes …
[17w] failing-suite     r2  Confirms 3 failures, all in `orderTotal` (tax computed on pre-discount …
[22w] feature-drift     r2  The task is simple: map priority to a single channel each. No dedup …
[14w] repo-sweep        r1  Let me check `lib/db.js` for the exact deprecation contract …
[11w] repo-sweep        r1  Now let me read all 13 files with remaining `db.query` usages.
[15w] repo-sweep        r1  Now verify no `db.query` calls remain outside vendor …
[10w] repo-sweep        r2  Good, confirms the target signature. Now migrating each non-vendor file.
[ 7w] repo-sweep        r2  Verifying no remaining `db.query` calls outside vendor.
```

**Not one of the eight begins with `I'll`.** They are mid-work findings and `Let me` / `Now`
transitions, and **five of the eight are `repo-sweep` alone** — the 39-tool-call job the ledger
already names as the silence hard case.

So the two models fail differently:

| | Opus 5 | Sonnet |
| --- | --- | --- |
| leaks | 16 in 32 sessions | 8 in 16 sessions |
| where | before the first tool call | between tool calls, mid-work |
| shape | `I'll …`, 16 of 16 | findings and `Let me` / `Now`, 0 of 8 are `I'll` |
| concentrated on | spread across 7 jobs | `repo-sweep`, 5 of 8 |

**Consequence:** `noill` is an **Opus-only** candidate. Screen it on Opus; a Sonnet arm can only show
it does no harm, never that it works. And Sonnet's own residue has no single lexical tell — three of
its eight leaks are bare findings with no marker at all, which the style already forbids in prose
("A finding is not a message. It waits for the end."). Sonnet's leak is not one dodge to name.

## 8. `# Tone and style` names a dodge hush does not

FULL branch only, so **Sonnet has it and Opus 5 does not**:

> Do not use a colon before tool calls. Your tool calls may not be shown directly in the output, so
> text like "Let me read the file:" followed by a read tool call should just be "Let me read the
> file." with a period.

The harness cares enough about the pre-tool-call opener to name its punctuation. hush's measured
leak is exactly that opener, and hush's Quiet section never names the shape.

---

## 9. Verdict

**hush's silence machinery is fighting a ghost on Opus 5, and it wins anyway.** On the lean branch
there is no competing instruction to override — hush is not beating the base prompt, it is filling
a vacuum. The proof is in `rm300-93b2a811`: hush is strictly silent in **16 of 32** Opus sessions
and its worst run breaks in **once**; plain Claude is silent in **0 of 32** and its worst run breaks
in **eleven** times. On the same batch hush also takes cost at a **100% win rate in all three
segments** (−7.5%, −17.7%, −29.5% on medians) and output tokens at 100% (−33% to −52%), at
**32/32 ground truth for both arms**.

The one honest loss on that batch is context carried per API call: **+9.5% on noisy-output**, 25%
win rate. That is the style's own prompt tax, and it is the number the ledger says to use.

**What the campaign got wrong.** The pre-compact hypothesis — file names trapped in table cells do
not survive a reader's paraphrase — does not hold on its own records (§7c: 72.7% vs 71.4%). The
clause added for it has been removed. A workflow agent's replacement hypothesis, redundancy bought
with words, is refuted by the same table (75.8 vs 75.6 mean words). With nine misses and a judge
that moves 3–6 points on identical input, **no structural variable in hush's own output separates a
q2 pass from a q2 miss**, and three of the nine were the judge reading "file, command or thing" as
"file".

Worth keeping in view: on the **direct** answerable judge — the reply itself, not a paraphrase of it
— hush already scores **q2 100%, q3 100%, all-three 96.9%**, and it **beats** plain Claude on task
facts recovered, 89.6% against 87.5%. The 22-point gap exists only under the deliberately harsher
retelling test.

**What is worth buying next**, in order:

1. **`noill`** — one sentence in `## Quiet while you work`: ``Never open a turn with the word `I'll`.``
   Grounded in 16 of 16 real leaks having that exact shape (§7d), and it is the ledger's one
   repeatedly-proven device. Arm built at `X:/Temp/hush-arms/noill`, edits at
   `docs/hush/research/rival-arms-2026-08-07/edits-noill.json`. Screen: the four leakiest jobs
   (`dep-bump-warnings`, `release-digest`, `rename-scope`, `repo-sweep`) × 2 arms × 3 reps = 24 Opus
   cells, **~$11**. Scorer: `narrationTexts` length, which is now clean of harness errors. Guard:
   ground truth and `finalWords`.
2. **`brieflouder`** — name Sonnet's real competitor, which hush has never mentioned:
   **"Brief is good — silent is not."** This is failure mode #5 in its textbook form and it is a
   **Sonnet-only** hypothesis, so it must be screened on Sonnet. Untouched by the ledger's 3/12
   result, which measured *deleting* the quote on Opus.
3. **Hold everything q2.** No mechanism is isolated, so there is nothing to buy yet.

---

## 10. The full scorecard — is hush best at everything?

Every scorer this harness has, run over the two current basis batches. No new sessions.

### Opus 5 — `rm300-93b2a811`, 32 runs per arm

| measure | no plugin | hush | winner |
| --- | --- | --- | --- |
| ground truth | 32/32 | 32/32 | tie |
| cost, long-session median | $0.8126 | $0.6691 (−17.7%, 100% win rate) | **hush** |
| cost, noisy-output median | $0.3029 | $0.2802 (−7.5%, 100%) | **hush** |
| cost, search-heavy median | $0.6894 | $0.4859 (−29.5%, 100%) | **hush** |
| output tokens | — | −33% to −52%, 100% | **hush** |
| context traffic | — | −0.4% to −16.6% | **hush** |
| **context per API call, noisy-output** | 21542 | **23588 (+9.5%, 25% win rate)** | **no plugin** |
| mid-turn narration words | — | −73% to −100%, 100% | **hush** |
| times it broke in | — | −50% to −100%, 100% | **hush** |
| strictly silent sessions | 0 of 32 | **16 of 32** | **hush** |
| worst run, interruptions | 11 | **1** | **hush** |
| final message words | 411.0 | 66.5 | **hush** |
| reading ease | 69.5 | 88.6 | **hush** |
| reading grade | 6.9 | 2.5 | **hush** |
| long words | 10.1% | 4.7% | **hush** |
| words per sentence | 13.3 | 6.5 | **hush** |
| answer first | 96.9% | 100% | **hush** |
| **runnable%** | **100%** | 93.8% | **no plugin** (disclosed non-metric) |
| over the 8-word cap | 66.3% | 20.6% | **hush** |
| longest sentence | 49w | 18w | **hush** |
| semicolons / asides | 52 / 111 | 0 / 0 | **hush** |
| **answerable, all three** | **100%** | 96.9% | **no plugin** (1 reply, within judge noise) |
| task facts recovered | 87.5% | 89.6% | **hush** |
| **survives a retelling** | **87.5%** | 84.4% | **no plugin** (1 reply, within judge noise) |
| retold q3, what next | 96.9% | 100% | **hush** |
| longest verbatim run copied | 7.7w | 4.9w | **hush** |
| bold marks inside the 1–3 band | 40.6% | 100% | **hush** |
| notes carrying an anchored file link | **0.0%** | 96.9% | **hush** |
| blocks inside the 2–4 band | 9.4% | 62.5% | **hush** |

### Sonnet — `sn300-b0703e71`, 16 runs per arm

| measure | no plugin | hush | winner |
| --- | --- | --- | --- |
| ground truth | 16/16 | 16/16 | tie |
| mean cost | $0.2340 | $0.1907 (−19%) | **hush** |
| strictly silent sessions | 2 of 16 | **11 of 16** | **hush** |
| final message words | 102.5 | 67.0 | **hush** |
| reading ease | 59.4 | 75.6 | **hush** |
| reading grade | 9.2 | 5.0 | **hush** |
| long words | 12.8% | 8.4% | **hush** |
| words per sentence | 17.1 | 9.3 | **hush** |
| answer first | 100% | 100% | tie |
| runnable% | 81.3% | 93.8% | **hush** |
| over the 8-word cap | 66.7% | 52.1% | **hush** |
| longest sentence | 55w | 42w | **hush** |
| semicolons / asides | 9 / 56 | 0 / 13 | **hush** |
| answerable, all three | 81.3% | 87.5% | **hush** |
| task facts recovered | 87.5% | 91.7% | **hush** |
| survives a retelling | 62.5% | **81.3%** | **hush** |
| retold q3, what next | 93.8% | 100% | **hush** |
| bold marks inside the 1–3 band | 12.5% | 87.5% | **hush** |
| notes carrying an anchored file link | **0.0%** | 56.3% | **hush** |
| **blocks inside the 2–4 band** | **43.8%** | 31.3% | **no plugin** |

### The honest answer

**On Sonnet, hush wins or ties every measure this harness has but one.** The exception is
segmenting: hush's notes land inside the 2–4 block band 31.3% of the time against plain
Claude's 43.8%. Both average about 4.8 blocks, so both sit at the top of the band and hush
spills over it slightly more often. It is the one place hush's own Shape rule ("Two blocks,
three at most") is not being followed.

Worth naming on both models: **plain Claude produced an anchored file link in 0 of 48
sessions.** hush produced one in 96.9% of Opus notes and 56.3% of Sonnet notes. For the
"which file do I open" question that has driven this campaign, that is the largest single
difference in the whole scorecard.

**On Opus 5 it wins every measure but three.** One is real and structural: context carried per API
call on the noisy-output segment, **+9.5%**, which is the style file's own prompt tax and the number
the ledger already says to use for any cost claim. The other two are one reply out of thirty-two
each, on judges the ledger measures as moving 3–6 points on identical input.

So "best at everything" is true on Sonnet and true-but-for-the-prompt-tax on Opus 5. The tax is not
closeable by wording — the ledger priced a faithful lean rewrite of the whole style file at 398
tokens, an eighth of the gap, and the file *is* the product.

---

## 11. `noill` measured — batch `noill1-86935c5e`, Opus, 36 runs, $17.05

2 arms × 6 jobs × 3 reps, interleaved, seed `1788038063484`. Arm `noill` = shipped hush plus one
sentence in `## Quiet while you work`: ``Never open a turn with the word `I'll`.``

| | hush (control) | `noill` |
| --- | --- | --- |
| ground truth | 18/18 | 18/18 |
| **strictly silent sessions** | 7 of 18 | **11 of 18** |
| total leaks | 11 | **7** |
| leaks that still start `I'll` | 11 | **6** |
| mean cost | $0.4756 | $0.5041 |
| mean final words | 72.9 | 70.3 |

Per job, leaks out of 3 runs: `failing-suite` **2 → 0**, `dep-bump-warnings` 3 → 2,
`rename-scope` 2 → 1, `repo-sweep` **3 → 3**, `release-digest` 1 → 1, `feature-drift` 0 → 0.

**Verdict: directionally right, not shippable yet.** 7/18 → 11/18 is z ≈ 1.33, p ≈ 0.18 — four
sessions at three reps. The ledger's own bar is higher than that: `nextfact` moved 20 points at
z ≈ 2.6 and was still rejected. The cost gap is +6% and unreadable at this n, given a per-cell
spread the ledger prices at 1.5–2.4×; `repo-sweep` alone ranged $0.43 to $1.07 inside the control
arm.

**And the finding that matters more than the arm: six of the seven remaining `noill` leaks still
begin with `I'll`.** The style names that exact word, bans it, and the model does it anyway about
half the time. This is the most literal dodge-naming this project can construct, and it does not
close. **100% silence is not reachable from the style file.** That confirms the 2026-08-28 residue
note by the strongest available test rather than by inference, and it means any further silence
work has to move to a channel the model cannot re-decide each turn.

### The 6-rep confirm — batch `noill2-a202e087`, Opus, 72 runs, $37.53

Same two arms, same six jobs, six reps, interleaved. **72/72 ground truth.**

| | hush (control) | `noill` |
| --- | --- | --- |
| **strictly silent sessions** | 8 of 36 (22.2%) | **18 of 36 (50.0%)** |
| total leaks | 30 | **18** |
| leaks that still start `I'll` | 28 | 16 |
| mean cost | $0.4755 | $0.4974 (+4.6%) |
| mean final words | 74.3 | 72.6 |

**z = 2.45, p ≈ 0.014.** Leaking runs out of 6, per job:

| job | hush | `noill` |
| --- | --- | --- |
| release-digest | 6 | **2** |
| failing-suite | 5 | **2** |
| dep-bump-warnings | 6 | 4 |
| rename-scope | 6 | 4 |
| repo-sweep | 5 | **6** |
| feature-drift | 0 | 0 |

**One sentence roughly doubles strict silence on Opus 5, at flat words and full correctness.**
`repo-sweep` is the one job that gets no better, and that was predicted: its leaks are mid-work
transitions, not openers, so a ban on the opening word cannot reach them. The +4.6% cost sits
inside a per-cell spread the ledger prices at 1.5–2.4×.

The earlier claim in §11 that 100% is unreachable still stands and is now better supported: 16 of
`noill`'s 18 remaining leaks *still* begin with the banned word. The lever halves the leak; it does
not remove it.

**Still required before shipping: the cross-model check.** `noill` is predicted to be inert on
Sonnet, where 0 of 8 leaks open with `I'll`. Running now as batch `xmodel1` alongside two other
candidates.

---

## 12. The cross-model check — batch `xmodel1-fec45f13`, Sonnet, 72 runs, $14.79

4 arms × 6 jobs × 3 reps, interleaved. **72/72 ground truth, every arm.**

| arm | strictly silent | leaks | mean cost | final words | blocks per note |
| --- | --- | --- | --- | --- | --- |
| hush (control) | 13 of 18 (72.2%) | 9 | $0.2225 | 74.9 | 4.22 |
| `noill` | 11 of 18 (61.1%) | 9 | $0.2068 | 74.7 | 4.22 |
| `brieflouder` | 13 of 18 (72.2%) | 8 | $0.1987 | **64.8** | 4.06 |
| `blockcount` | **8 of 18 (44.4%)** | **18** | $0.2141 | 75.9 | 4.39 |

**`noill` PASSES the cross-model bar — SHIPPED.** Inert on Sonnet exactly as predicted: same leak
count, same words, two sessions of difference at z ≈ 0.72. That is the opposite of `nextfact`, which
won on Sonnet and inverted on Opus. `noill` doubles Opus silence and costs nothing on Sonnet, so the
sentence is now in `hush/output-styles/hush.md`:

> Never open a turn with the word `I'll`.

Screen z 1.33, confirm z 2.45 at p ≈ 0.014, cross-model inert, 108 of 108 ground truth across all
three batches. Suites 527/527 and 232/232, gate 10 of 10.

**`brieflouder` REJECTED for its stated purpose, but it found something else.** Naming Sonnet's real
competing instruction — "Brief is good — silent is not." — did nothing to silence (13 of 18, the
same as control). It did cut the final message **74.9 → 64.8 words, −13.5%**, at −10.7% cost and no
correctness loss. That is a length lever wearing a silence lever's clothes, and it is a single
unreplicated read on n=18. Filed, not shipped.

**`blockcount` REJECTED, and it backfired hard.** Adding a counting step to the pre-send redo
("Count the blocks. Over 3? Merge two.") **halved silence, 72.2% → 44.4%, and doubled the leaks,
9 → 18** — while failing at its own job, since blocks per note went *up*, 4.22 → 4.39. The ledger's
"counting action in the redo" device has worked before on sentence length; it does not transfer to
message structure, and it costs silence to try. Do not re-propose it.

### Updated honest answer to "is hush best at everything"

Still no. It remains behind plain Claude on Opus 5 for context carried per API call (+9.5%, the
style file's own prompt tax), on `runnable%` (a disclosed non-metric), and on two judge scores that
are one reply out of thirty-two each. On Sonnet the one loss is blocks-inside-band. Everything else
on both models is a hush win or a tie, and after this session's work the silence figure on Opus 5
is roughly double what it was.


---

## 13. Owner redirect, 2026-08-29 — the silence bar changes

The owner's instruction, in their words: stop forcing a total ban on the opener, because it cannot
be done. Treat the one opening line as a **known factor**. The claim to make is that after that
first message, hush is completely silent. Anything past **one** message is the failure.

That is a better bar and hush already clears it. Recomputed from the basis batches, harness errors
excluded:

| at most one message before the answer | no plugin | hush |
| --- | --- | --- |
| **Opus 5**, n=32 | 10 of 32 (31.2%) | **32 of 32 (100%)** |
| **Sonnet**, n=16 | 6 of 16 (37.5%) | 14 of 16 (87.5%) |
| worst single session, Opus | **11 messages** | **1 message** |
| worst single session, Sonnet | 5 messages | 3 messages |
| total mid-work messages, Opus | 85 | **16** |
| total mid-work messages, Sonnet | 31 | **8** |

**On Opus 5, hush is at or under one message in every single session measured.** Plain Claude ran
past one in 22 of 32, and its worst session broke in eleven times.

Shipped with it: a new metric `brokeInTwice` in `runner/stats.js`, published as "Sessions that broke
in more than once". On `rm300` it reads **0.00 for hush in all three segments** against 0.38 / 0.69 /
1.00 for plain Claude. The strict-zero `silent` number stays in the harness — it is still the right
number for a short session — but it is no longer the headline.

The two remaining Sonnet failures are both `repo-sweep`, at 3 and 2 messages, and both are mid-work
transitions rather than openers.

### `noill` stays, and the silence work stops here

The shipped sentence costs nothing, is inert on Sonnet, and halves the Opus opener. It is banked.
But no further arm should be spent on the opening line: three campaigns have now failed to remove
it, and the owner has ruled it a known factor rather than a defect.

## 14. Reading levers — batch `binlev1-f9238a4c`, Opus, 54 runs, $26.55

3 arms × 6 jobs × 3 reps. **54/54 ground truth.** Both arms are drawn straight from the binary:
`focus5` adds the one part of Anthropic's own five-part focus-mode contract that hush was missing
("Then: what you looked at"), and `blockcap` states the block limit as a number beside the line and
word caps.

| arm | ease | grade | long words | runnable% | blocks in band | anchored links | final words | cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hush (control) | 86.5 | 2.9 | 4.9% | 94.4% | **83.3%** | **100%** | 65.5 | $0.4997 |
| `focus5` | **88.5** | **2.6** | **4.5%** | **100%** | 50.0% | 76.9% | 79.1 | **$0.4688** |
| `blockcap` | 86.7 | 2.7 | 4.8% | 94.4% | 66.7% | 85.2% | 72.0 | $0.4834 |

All three arms are at most one message in 18 of 18 sessions.

**`blockcap` REJECTED, and that closes the block question.** Stating the cap as a number made
blocks-in-band *worse*, 83.3% → 66.7% — the same direction as `blockcount`, which attacked it
through the redo. Two independent devices, both backfired. hush overshoots its own "two blocks,
three at most" rule and neither of the ledger's proven cap devices moves it. Stop trying.

**`focus5` takes every reading crown** and is the cheapest arm, at the cost of 14 more words and a
drop in blocks-in-band. Whether it actually leaves the reader with fewer questions is the judge's
call, not the readability formula's — and the judge says no.

### The judges, and they reject both arms

The direct judge saturates. All three arms answer all three questions in 18 of 18 sessions, 100%
fully answerable. It cannot separate them, because shipped hush is already at the ceiling.

The retelling judge can:

| arm | q2 | survives a retelling | **task facts recovered** | longest copied run |
| --- | --- | --- | --- | --- |
| hush (control) | 88.9% | 88.9% | **88.9%** | 4.3w |
| `focus5` | 88.9% | 88.9% | **61.1%** | 4.5w |
| `blockcap` | 83.3% | 83.3% | **50.0%** | 4.3w |

**`focus5` REJECTED.** It ties on survival and loses **28 points of fact recovery**. Telling the
note to say what you looked at pushes out what you actually found — the reader keeps the shape of
the answer and loses its substance. This is the exact trap the comprehension evidence names: a
readability formula is not comprehension, and `focus5` won every formula while losing the only
measure of whether the facts arrive.

**So Anthropic's own five-part focus-mode contract is worse than hush's three-part one, measured.**
That is the strongest single result of the binary recon: the binary was right about what hush was
quoting and wrong as a source of content.

Also worth recording: hush's control arm on this batch reads **88.9% survives and 88.9% recovered**,
its best figures in the campaign, against 84.4% and 81.3% on `rm300`. Batch-to-batch movement of
that size on the same arm is the ledger's cross-batch rule showing itself again.

### Where the reading brief now stands

Every reading lever tried has been rejected, and the shipped style holds every crown it had. On the
owner's brief — no leftover questions, nothing ambiguous, nothing missing — the direct judge is at
**100% on all three questions for hush**, and 88.9% of the task's own rubric facts survive a
stranger's paraphrase. The open work is not another clause. It is that `blocks per note` sits at
4.1–4.8 against hush's own "three at most", and two devices have now failed to move it.

---

## 15. The block "overshoot" was an impossible rule, not disobedience

Free count over the 18 hush notes in `binlev1`, classifying every block:

```
blocks per note: 3 x3,  4 x11,  5 x3,  6 x1     mean 4.11
block kinds:     prose 29, `Next:` line 18, bold outcome 17, table 9, code fence 1
```

The `Next:` line appears in **18 of 18** notes because the style mandates it. The bold outcome
appears in 17 of 18 because the style mandates that too. So the floor for a hush note obeying its
own rules is **bold outcome + prose + `Next:` = three blocks**, and four the moment a table is
right — which is what the distribution shows.

The Shape section said **"Two blocks, three at most."** That rule cannot be obeyed alongside the
mandatory `Next:` line and the table rule. It is the documented self-contradiction failure mode,
and the ledger's precedent for one is deletion without a batch.

Corrected to **"Three blocks, four with a table."** No behaviour change is expected or claimed —
this makes the stated rule match the design that already measures well, and stops a scorer counting
an impossible rule as a defect. Suites 527/527 and 232/232, gate 10 of 10.

That also explains `blockcount` and `blockcap`: both tried to force the model under a floor its
other rules set. Neither could win, and both spent silence trying.

---

## 16. Final position

Nine things changed in this session. Five are in the product, four are in the harness.

**Product** — `hush/output-styles/hush.md`, uncommitted:

| change | evidence |
| --- | --- |
| ``Never open a turn with the word `I'll`.`` | 108 Opus runs; silence 22.2% → 50.0%, z = 2.45; inert on Sonnet |
| quote corrected to the sentence Sonnet actually receives | binary + live probe; the old quote reaches nobody |
| "Two blocks, three at most" → "Three blocks, four with a table" | free count; the old rule was impossible |
| the table-cell clause removed | its own records refuted it, 72.7% vs 71.4% |
| plan turns show code, `Next:` line, findings wait for the end | measured before this session, 7/8 |

**Harness** — `benchmarks/hush/runner/`:

| change | why |
| --- | --- |
| `answerable.js` q2 scope fix | the judge read "file, command or thing" as "file"; Opus gap 18.7 pts → 3.1 |
| `metrics.js` drops harness error text | the CLI's own `API Error` was scoring as narration |
| `stats.js` + `publish.js` gain `brokeInTwice` | the owner's bar: one message, never two |
| `rival-arms-2026-08-07/mknamearm.js` | `rival-arms-2026-08-07/mkarm.js` silently overwrote the style name on every past arm |

**Rejected, with the receipt:** `blockcount`, `blockcap`, `focus5`, `brieflouder` (as a silence
lever), the style-name channel, and the table-cell hypothesis.

**Spend:** ~$96 of sessions and ~$16 of judging across four batches, 270 runs, **270/270 ground
truth**.

### Is hush "the best at everything"?

No, and the honest list is short. On Opus 5 it carries **+9.5% more context per API call** on the
noisy-output segment — the style file's own prompt tax, which the ledger already priced as
uncloseable by wording. It scores lower on `runnable%`, a column the README already ships as a
disclosed honest loss. Everything else on both models is a hush win or a tie, and on the owner's
own silence bar it is **32 of 32 on Opus 5**.

The style is not "perfect" either, and one thing in this session says so louder than any metric:
three separate campaigns have now failed to remove the opening line, and the strongest possible
version of that clause halves it and no more. That is a property of the model, not of the wording.
