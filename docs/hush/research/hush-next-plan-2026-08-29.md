# hush — what happens next, 2026-08-29

Local-only. Produced by a 9-agent workflow: four independent lenses (release, style, harness,
product), one adversarial reviewer per lens, then a synthesizer that had to answer the reviews.
Every claim below was checked against the files or the sealed records by the reviewer that
signed it off.

## The headline

hush should stop selling silence as "never speaks" and start selling it as "speaks once, then nothing". The measured claim is one message at most before the answer — 32 of 32 Opus sessions against plain Claude's 10 of 32, worst plain session 11 messages — and it is the strongest true thing the plugin owns. Ship that page as 1.11.0, with the plan-turn code rule held back until the one batch that could refute it has run.

## NOW — free, settled, do before anything else

### 1. Delete `benchmarks/hush/runner/graders/` entirely.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/hush/runner/graders/plan-apply-verify.js`

**Why:** Verified unreachable and unpassable. `plan-apply`'s check in `tasks.json` is `{"type":"keywords","require":3}` with no `hidden`, so `run.js:359` resolves `graderFile` to `null` and `run.js:386` never copies anything; a repo-wide grep for `graders` in the harness returns zero hits. It also shells `node src/cli.js report --json` against a prompt that says "Don't touch anything yet", so a correct session makes it exit 1. `fixtures/plan-apply/` stays — it is the workspace the task runs in.

**Done when:** `grep -rn graders benchmarks/hush --include=*.js --include=*.json` prints nothing; `node --test benchmarks/hush/tests/*.test.js` still green.

### 2. Delete `rival-arms-2026-08-07/mkarm.js` and make `rival-arms-2026-08-07/mknamearm.js` the only arm builder.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/docs/hush/research/rival-arms-2026-08-07/mkarm.js`

**Why:** `mkarm.js:32` does `.replace(/^name: Hush$/m, `name: ${cap}`)`, and the frontmatter name is a live 256-character per-turn system reminder. Read straight out of the sealed records, every arm it built ran under a style whose name encodes its own hypothesis against a control named `Hush`: `noill2-a202e087` is `hush:Hush` vs `noill:Noill`, `binlev1-f9238a4c` is `hush:Hush` vs `focus5:Focus5` vs `blockcap:Blockcap`. Deleting the builder stops the class recurring; `rival-arms-2026-08-07/mknamearm.js` takes the name as a required argument. Local and gitignored under `/docs/*`, so nothing commits.

**Done when:** The file is gone, and the `hush-measurement-ledger` memory carries one line: every future arm is built with `mknamearm.js <arm> <edits> "Hush"`, and every rejected arm in the ledger — including this session's four — carries a small unpriced name bias.

### 3. Two deletions in `## Shape`: line 41 becomes `Blank line between blocks.` and line 53 is removed.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/hush/output-styles/hush.md`

**Why:** The block count is refuted by hush's own shipped exemplar (README.md:168-174 is four blocks with no table, captioned "Exactly as hush wrote it") and by the records: across 32 Opus and 16 Sonnet hush replies the block counts run 3-6 and 3-7 with a mode of 4 and 5, so neither `Two blocks, three at most` nor `Three blocks, four with a table` was ever obeyed. Both measured attempts to state a block count backfired (`blockcount` took Sonnet silence 72.2% to 44.4%; `blockcap` took fact recovery 88.9% to 50.0%), so delete the count rather than restate it — writing the scorer's `[2,4]` band into the style would also turn `blocksInBandPct` into a tautology. Line 53, `One sentence carries it? Write the sentence. No marks at all.`, is unreachable: bold outcome, `Next:` and backticks around every name are all mandatory with no exemption. Nothing outside the style file pins either string, and `verify-style.js` derives its checks from the canonical, so deleting a Shape paragraph loosens the crafted-style check rather than breaking it.

**Done when:** `node --test hush/tests/*.test.js` reads 527/527 and `node hush/scripts/verify-style.js` is clean.

### 4. Say in the harness README that 8 of the 10 tasks run by default, and name the two that do not.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/hush/README.md`

**Why:** Line 37 says "the whole suite (8 tasks x baseline + hush x 2 reps)" while line 99 says "The tasks: 10 in all". `config.json` `defaultTasks` resolves exactly eight ids, so a reader who runs the documented command gets eight and reads about ten. Add `crash-origin` and `plan-apply` as the two you add with `--tasks`. Flags and counts, no methodology.

**Done when:** The stated counts match what `run.js` resolves with no `--tasks` flag.

### 5. Add `benchmark_retold.test.js` covering `longestSharedRun`.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/hush/tests/benchmark_retold.test.js`

**Why:** `runner/retold.js` ships untracked with no test, and its copy detector is the only thing between a reader that lifts the reply verbatim and a comprehension score that measures nothing. Four cases: identical short strings return the word count, disjoint strings return 0, a deliberately lifted 5-word run inside a paraphrase returns 5, and case plus punctuation are ignored (`norm` at line 63 strips to `[a-z0-9]+`). Keep the identical-string case around 50 words: the index at line 69-70 is rebuilt per length, so 700 identical words takes ~1.1s while 300 takes 91ms and a disjoint pair is instant.

**Done when:** `node --test benchmarks/hush/tests/*.test.js` green with the new file included.

## NEXT — the release, in order

### 1. Get the owner's explicit go for the release, and a yes or no on the two paid steps below.

**File:** `n/a`   **Cost:** free

**Why:** Every substantive edit in this release is a published measured number. STATE section 7 and the standing no-auto-publish rule: nothing commits or pushes until the owner says go, however favourable the numbers.

**Done when:** The owner has said go, and has answered open questions 1 and 2.

### 2. Replot the hero on the owner's bar. Five lines in the script, then regenerate.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/docs/hush/research/scripts/hush-draw-hero.js -> hush/assets/hero.svg + hush/README.md line 9`   **Cost:** free — replots the existing `rm300-93b2a811` records, `node docs/hush/research/scripts/hush-draw-hero.js benchmarks/hush/records hush/assets/hero.svg rm300-93b2a811`

**Why:** The poster's own text node reads `15 of 32 sessions: not one word before the answer.` and the alt repeats it — both are generated from `silent`, so there is no recaption-only option. Two things are wrong with the 15. The bar has moved: the owner's claim is at most one message, where hush is 32 of 32 on Opus against plain Claude's 10 of 32. And the strict number is itself wrong: the one hush run scored as speaking, `release-digest__hush__r1`, carries `narrationTexts: ["API Error: Connection lost mid-response..."]` — a dropped connection, not narration. The shipped `metrics.js` filters that at run time but cannot rewrite a sealed record, so a reader who re-runs gets 16 and 8 words while the poster says 15 and 11. Keep the bars on narration words — that 207-versus-8 waveform is the picture, and replotting the bars on interruptions would render ten of the 32 baseline sessions at the same minimum height as every hush bar. Recompute the words from `narrationTexts` with the same `/^(API Error|Execution error|Request timed out)\b/` filter the harness ships (all 96 records in both batches carry `narrationTexts`), carry a second per-row field for the message count, and take the caption from it. Verified output: baseline peak 207 words / 11 messages / 10 of 32 at most one; hush max 8 words / max 1 message / 32 of 32.

**Done when:** The caption reads `32 of 32 sessions: one message at most before the answer.`, the alt describes 207 words and up to 11 messages on the left against one message at most and nothing over 8 words on the right, README line 9 is a verbatim paste of the alt the script prints, and no number in either was typed by hand (ADR 0002).

### 3. Drop the cost bar from the cuts chart, leaving three.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/docs/hush/research/scripts/hush-draw-cuts.js -> hush/assets/bench-cuts.svg + hush/README.md line 96`   **Cost:** free — `node docs/hush/research/scripts/hush-draw-cuts.js benchmarks/hush/records/rm300-93b2a811 hush/assets/bench-cuts.svg`

**Why:** The fourth bar carries `cost per session ... minus 22%`, a signed suite-cost percentage, which the ledger forbids from this harness outright: seven Sonnet batches of it read -3.0 / +1.3 / 0.0 / -14.9 / -6.1 / -1.1 / +4.2, and an identical baseline arm moved -16% between two batches a fortnight apart. The working tree proves it on Opus too — the committed page ships -12% with five of eight jobs cheaper, this one ships -22% with all eight, same suite, same style. Removing only the badge leaves an empty coloured pill (the rect at x=602 is drawn from `d.pct`) and leaves `minus 22%` in the aria string at line 40, which README line 96 pastes verbatim, so it would still publish to every screen-reader user. Drop the `cost per session` entry from `ROWS`, and shrink the card height, viewBox and legend y by 46 so no white gap opens above the legend.

**Done when:** The chart shows command output, chatter while working, and Claude's whole-session output; no signed suite-cost percentage survives in the SVG, its aria string, or README line 96.

### 4. The README prose pass. Seven edits, all verified against the records.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/hush/README.md`   **Cost:** free

**Why:** The page leads on a promise the owner abandoned while the true, stronger claim sits as a buried second sentence. (1) Line 100: promote it. `**And you read it in silence.** Every agent opens with a line about what it is about to do. With hush that line is the only one you get: in all 32 sessions it broke in at most once before the answer, against 10 of 32 without the plugin, and plain Claude Code broke in 11 times in its worst session. On Sonnet it is 14 of 16 against 6. In 16 of the 32 it said nothing at all, and plain Claude Code never did. It still speaks up to flag something you would want to stop. Or when it is stuck and needs you.` Cut `Count interruptions instead of words` — that is methodology in a public doc. (2) Line 134, the `silent sessions` cell: 15 of 32 becomes 16 of 32, matching the harness that ships. Leave the column meaning zero words and leave the four rival rows alone: their batch, `records-archive/rm280-7e554675`, carries no `narrationTexts` and no `assistantMsgs`, so `METRICS.interruptions` would return a fabricated 0 for every one of them. (3) TL;DR line 28: `Nearly all of the play-by-play goes.` becomes `One message, then nothing until the answer.`, and `Our latest run came out cheaper on all eight jobs.` becomes `Our latest run came out cheaper.` (4) Line 98: the cost bar is gone, so stop fronting the bill — lead on the two places the cut reaches, keep the 38% output figure, delete `The 22% saving is one run, though.` (5) Line 106: `So this run hush came out cheaper on all eight jobs.` becomes `So on this run the trims outweighed that fixed cost.` (6) Line 185: delete `19% lower,`, keep `$0.1907 a session against $0.2340`. (7) Line 191: delete `On the bill the two came out close this run. Concise's average was a few percent lower. hush's one losing job carries most of that gap. On the loud jobs hush was well ahead. It was 37% cheaper on the log triage. It was 26% cheaper on the release digest.` — aggregate and per-job cost comparisons from a retired batch — and open the paragraph at `Where they part is everything else.` Also correct line 164: anchored links are 24 of 32 on Opus (`three of four` is right) but 6 of 16 on Sonnet, not 9 of 16 — 9 is the any-link count — so `closer to one in two` becomes `closer to one in three`. `Plain Claude did not link a file in any of its 48 sessions` is verified: 0 links, 0 anchored, both batches.

**Done when:** No headline on the page rests on a zero-message session; no signed suite-cost percentage appears anywhere; the strict-silence number reads 16 wherever it appears; and every count on the page reproduces from `records/rm300-93b2a811` and `records/sn300-b0703e71`.

### 5. Re-judge the two published batches with the shipped judge, then update the four answer-quality cells.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/hush/runner/answerable.js -> hush/README.md lines 152-158`   **Cost:** ~$3. 96 Sonnet judge calls (64 in `rm300`, 32 in `sn300`), one per record: `node runner/answerable.js --records records/rm300-93b2a811 --go` and the same for `sn300-b0703e71`. Records are hash-sealed and write-once, so this writes only `published/`.

**Why:** The four percentages on the page (Opus 100%/97% and 88%/90%, Sonnet 81%/88% and 88%/92%) match `published/answerable.md` in both batches exactly — but those artifacts were written at 12:49 and 12:52, and `answerable.js` was changed at 14:30 with a header stating in its own words that numbers from before that date are not comparable. The release ships that judge. Without a re-judge the page publishes four numbers the shipped harness no longer produces, and the gate cannot catch it: `moneyFigures` is `/\$\d+\.\d+/g` and sees dollar figures only. Do not carry over the lens proposals here — the Opus q2 is already 100% for both arms so the scope fix cannot move that table, and line 160's `it trails by one session in 32` is a live description of 96.9% q1, not a resolved caveat.

**Done when:** Both `published/answerable.md` files are regenerated by the current `answerable.js`, and the four README cells plus lines 144, 160 and 162 read what those files say. The alternative, if the owner declines the spend: hold the judge-prompt change out of this release and ship only the `published/answerable.md` writer, so the shipped judge still reproduces the published table.

### 6. Hold the plan-turn code rule out of 1.11.0.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/hush/output-styles/hush.md line 49`   **Cost:** free

**Why:** `Asked how you would do it? Show the code you would write, not numbered steps.` is measured 0/8 to 7/8 on Sonnet and 0/6 to 6/6 on Opus, and it is the fix for the owner's original complaint — but `docs/hush/research/hush-plan-turn-code-2026-08-29.md` ends with an unsettled silence question on it and says in its own words that nothing should ship before that runs. The Opus regression on the published suite read silence 10 of 16 against the control's 10, falling to 6 of 16, with narration 2.5 to 4.4. The trigger was tightened afterwards and the cost headline did not survive, but the tightened wording was only measured at two reps a task, and `optight-dcb8a227` shows it firing 2/2 on `failing-suite`, which is a published job. This release makes at-most-one silence the headline of the whole page. Publishing 32 of 32 while shipping a clause with measured evidence it might lower silence is the one thing the page must not do. Everything else in the style diff is safe to ship: the `Next:` contract was live during `rm300`/`sn300` (32 of 32 and 16 of 16 replies carry a `Next:` line), `A finding is not a message` can only tighten silence, the base-prompt quote correction is settled by the binary recon, and the `I'll` clause can only raise strict silence, which makes the published 16 of 32 conservative rather than wrong.

**Done when:** The shipped `output-styles/hush.md` carries all of this session's changes except line 49, and line 49 is parked for the batch in `later`. If the owner buys that batch first instead, ship line 49 and re-plot the whole page from the new records.

### 7. Write the 1.11.0 CHANGELOG entry.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/hush/CHANGELOG.md`   **Cost:** free

**Why:** Minor, not patch: 1.10.1 set the precedent that a README-only change earns a patch, and this changes the shipped voice's behaviour. Two short paragraphs under the intro, newest first, house voice, current behaviour only, no methodology. `## 1.11.0 — 2026-08-29` / `Every message now ends with a line that starts with `Next:`. When there is nothing left to do it says `Next: nothing` and why, instead of inventing work.` / `A finding no longer arrives on its own while the work is still running. It waits for the message at the end.` Deliberately not in the entry: the `I'll` clause — it halves the opener on Opus and does nothing on Sonnet, so a public line promising quieter openings is a claim the product only half keeps. Also not in it: the plan-turn rule, which is not shipping.

**Done when:** The entry is two paragraphs, dated, newest first, and names no batch, scorer or measurement.

### 8. Green check before any commit.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/hush/scripts/readiness-gate.js`   **Cost:** free

**Why:** The gate reads every `published/claims.md` against what the modified `publish.js` regenerates. Verified this session with the working-tree harness: 10 of 10 in 19.3s, all six batches byte-identical, so the two new metric tables are already in sync and nothing needs regenerating. Plugin suite verified 527/527.

**Done when:** `node benchmarks/hush/scripts/readiness-gate.js` reads 10 of 10; `node --test hush/tests/*.test.js` 527/527; `node --test benchmarks/hush/tests/*.test.js` green.

### 9. Commit the harness alone, in the parent, first.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/hush/`   **Cost:** free

**Why:** `benchmarks/hush/` never reaches an installer, and a release commit carrying nine harness files makes the pin bump unreviewable. `git add benchmarks/hush` is not blocked by the records guard — its pattern needs `benchmarks/.../records|results` and this path matches neither — and a dry run stages the eight modified files plus `fixtures/plan-apply/`, `runner/retold.js` and the new test, with no record data. Never `git add -A` here: the parent working tree also carries a dirty `foreman` submodule pointer.

**Done when:** One parent commit whose diff is `benchmarks/hush/` only, and `git status` still shows `M foreman` untouched.

### 10. Commit and push the plugin.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/hush/`   **Cost:** free

**Why:** Five files ship: `output-styles/hush.md`, `skills/craft-style/SKILL.md`, `README.md`, `assets/hero.svg`, `assets/bench-cuts.svg` — plus `CHANGELOG.md`, which the release lens left out of its own file list. Branch inside the submodule, squash to one commit, then push. The submodule pre-commit hook runs the 527-test suite here. The two poster scripts live under `docs/research/`, gitignored at `.gitignore:14 /docs/*`, so only their SVG output enters the commit.

**Done when:** One squashed commit on `hush` main containing exactly six files, pushed green.

### 11. Bump the pin and push the parent.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/.claude-plugin/marketplace.json`   **Cost:** free

**Why:** The root pre-commit hook `scripts/git-hooks/check-marketplace-sync.js` enforces that `version` and `source.sha` move together, but nothing checks the version number itself — verify that by eye. Edit both in one pass, `source.sha` from `git -C hush rev-parse HEAD`.

**Done when:** `marketplace.json` reads 1.11.0 with a sha that `git -C hush rev-parse HEAD` prints; `git add .claude-plugin/marketplace.json hush`; commit `Release hush 1.11.0`; pushed green.

### 12. Re-run the gate after the pin.

**File:** `D:/Projects/Personal/SoftwareDevelopment/claude-plugins/benchmarks/hush/scripts/readiness-gate.js`   **Cost:** free

**Why:** Standing release discipline: gate before and after.

**Done when:** 10 of 10, and both CIs green.

## LATER — worth doing, not now

### 1. Settle the plan-turn code rule on the published suite, and re-base the page on the style that ships.

**Cost:** ~$37 for the Opus half: 2 arms (baseline, hush at 1.11.0) x 8 jobs x 4 reps = 64 Opus 5 sessions at medium effort, ~$35 at the page's own $0.6125 and $0.4750 per session, plus ~$2 to judge it with `answerable.js --go`. Add ~$8 for the Sonnet half (2 arms x 8 jobs x 2 reps = 32 sessions plus its judge) if the Sonnet section is to describe the shipped style too. ~$45 all in. The cheaper isolation — `clause` against `noclause`, both hush, 8 jobs x 4 reps = 64 Opus sessions, ~$30 — answers the silence question only and leaves the page's numbers still describing 1.10.1.

**Why:** This is the release's one real measurement debt, named by the report that produced the clause: the Opus regression read silence 10 of 16 falling to 6 of 16 with narration 2.5 to 4.4, at two reps a task, and `repo-sweep` has since shown the suite swinging 13.0 to 29.5 tool calls on identical inputs in the control arm alone. The best-value shape is not the clause-versus-control isolation but a full re-base: run plain Claude against the complete 1.11.0 style including line 49, on the eight published jobs, and every figure on the front page then describes exactly what ships, generated by exactly the harness that ships. `rm300` measured the `Next:` contract but not line 49 — 0 of 48 replies in either batch carry a code fence — so this is the only run that closes the gap. Arms must be interleaved in one batch: cost never transfers between batches. If the answer is that silence holds, ship line 49 as 1.12.0 and replot; if it does not, the clause is dead and the owner's original complaint needs a different fix.

### 2. De-confound the `I'll` clause, or leave it as a conservative shipped clause.

**Cost:** ~$36. 2 arms x 6 jobs x 6 reps = 72 Opus sessions at this campaign's ~$0.41 blended rate, both arms built with `mknamearm.js <arm> <edits> "Hush"` so the per-turn reminder string is byte-identical across arms. No judge cost: silence and interruptions come free out of the transcripts.

**Why:** The one clause this campaign shipped was measured in a treatment arm literally named `Noill` against a control named `Hush`, on a channel now known to be a 256-character per-turn system reminder — the batch that moved strict silence 22.2% to 50.0% at z = 2.45 varied two things. Nothing published is contaminated (`rival-arms-2026-08-07/mkarm.js` is gitignored and the public hush arm always ran as the real `hush:Hush`), and the clause can only raise strict silence, so shipping it makes the published 16 of 32 conservative rather than wrong. This is worth buying only if the strict-silence number is ever to be a headline again — under the owner's bar hush is at 32 of 32 without it, so the clause has no headroom left to buy.

### 3. Give the readiness gate a way to trace published session counts, not just dollar figures.

**Cost:** free to build, but blocked on a decision about the archived-batch figures. No measurement.

**Why:** Point 8 traces `moneyFigures`, `/\$\d+\.\d+/g`, against the claim set's cost list, so the hero could carry a stale `15 of 32` for two days while the gate read 10 of 10. That is the hole that let this whole item become the release's biggest open question. It is not a regex widening: `figureIsGenerated` searches `claims.costs` only, so counts need a new generated list through `buildClaims`, its return shape and `benchmark_evidence.test.js`. And it cannot green the page as it stands — six of the README's sixteen `N of M` figures can never trace to a batch in `records/`: the four rival-style rows and the Concise `10 sessions of 16` come from `records-archive/`, which the gate does not read, and `48 of 48` pools 32 Opus with 16 Sonnet across two batches, which `assertOneBatch` forbids by construction. Decide what happens to those six before building the check.

### 4. Publishing the tenth job in the shipped suite.

**Cost:** ~$53. A 10-job x 2-arm x 4-rep Opus batch (80 sessions, ~$44) plus a 10-job x 2-arm x 2-rep Sonnet cross-check (40 sessions, ~$9), to re-baseline the whole front page. Not recommended.

**Why:** `plan-apply` and `crash-origin` both sit outside `defaultTasks` on the same policy. Adding either makes the default run more expensive and orphans every figure on the front page at once — cost, context-per-call, readability, the hero — because the ledger's cost-never-transfers rule means every figure has to be re-run together, not patched. Also worth knowing before it is ever published: `plan-apply`'s entire oracle is `{"type":"keywords","require":3}`, and a keyword rubric punishes the terser arm.

## NEVER — closed, with the receipt

- Packing instructions into the 256-character style name. Ledger refutation 1 — the body binds and out-of-band delivery does not — and the proposed text restates style line 8 verbatim in substance, on a bar where hush is already 32 of 32 on Opus. Nothing left to buy.
- Re-running the plan-turn clause probe on Sonnet. It already ran there, interleaved, at the same n: `records-archive/clause6-1ccbe27b`, 0/8 to 7/8, and on Opus at `records-archive/opclause-417a2d13`, 0/6 to 6/6.
- Adding words to the plan-turn clause to name a second competing rule. The report that built it records both attempts: folding it into the winning rule killed it, and a second copy in the pre-send redo halved it. More words is not the fix, twice over.
- Cutting the 90-word cap to 70. The cap cannot be priced from a mean — the same eight jobs read 67 words in `rm300` and 88-90 in this session's own regression batches — and `focus5` showed that forcing content out of a fixed budget costs 28 points of fact recovery.
- Shipping `brieflouder`. Sonnet-only at n=18, and ledger item 8 is explicit that a Sonnet-only result is not evidence — `nextfact` won big on Sonnet and inverted on Opus. What it moved was final words, and length is no longer the goal.
- Publishing the `retold` probe or the retention numbers on the README. Retention was measured and is not a win; on Opus the baseline still leads the retelling 87.5% to 84.4%, and retold's own headline finding did not survive its own judge fixes.
- Rewriting `activate-style.js` to write an `outputStyle` key. `activate-style.js:52` strips the key only when it equals the style's own bare frontmatter name, so the documented `hush:Hush` is never touched and pick-style users keep the channel; and nothing in the repo establishes that `hush:<name>` resolves by frontmatter name rather than filename.
- Recomputing the four rival-style rows as interruptions. `records-archive/rm280-7e554675` carries no `narrationTexts` and no `assistantMsgs` in any of its 96 records, so the metric's fallback evaluates to 0 for every one — it returns a number rather than NaN, so it would print fabricated ties for a baseline that averaged 56 narration words a session.

## Open questions — only the owner can answer these

1. Ship 1.11.0 free with the plan-turn code rule held out, or buy the ~$37 Opus re-base first and ship it? Holding it means the release does not fix the complaint that started this campaign — hush answering a planning question with prose instead of code. Shipping it without the batch means the page's new headline, 32 of 32 at most one message, describes a style that measured 10 of 16 falling to 6 of 16 on silence under an earlier wording of that same clause.

2. Go or no-go on the ~$3 re-judge of `rm300` and `sn300`? If no, the fallback is to hold `answerable.js`'s judge-prompt change out of this release so the shipped judge still reproduces the four published answer-quality cells.

3. The style name is a live per-turn reminder for a documented `hush:Hush` install and dark for anyone who wrote a bare `Hush` by hand. README line 221 currently tells users to delete the key once it takes. That sentence is being cut in this release so the shipped configuration matches the benchmarked one — confirm that is wanted, since it is the line to revisit the day the name channel ever ships.

4. Is the strict-silence number worth keeping on the page at all? It survives this release only as the `silent sessions` column, at 16 of 32; the ledger's own finding is that silence is a length curve, so a harder suite will drop it and read as a regression while at-most-one stays categorical.


---

# ADDENDUM — las cuatro respuestas del dueño, y lo que ya se hizo

## 1. El batch de $37: HECHO. Batch `rm310-91a1a5fd`, 64 corridas Opus, 64/64 correctas.

Primer lote que mide el estilo que de verdad se publica, con la regla del plan dentro.

| | sin plugin | hush 1.11.0 |
| --- | --- | --- |
| silencio estricto | 0 de 32 | **17 de 32** |
| como mucho un mensaje | 9 de 32 | **32 de 32** |
| peor sesión | 7 mensajes | **1** |
| palabras de relleno | 1015 | **100** |
| palabras del mensaje final | 490.5 | **78.6** |
| facilidad de lectura | 69.0 | **87.6** |
| grado escolar | 7.0 | **2.6** |
| frase más larga | 46 palabras | **20** |
| punto y coma / paréntesis | 62 / 137 | **0 / 1** |
| las tres preguntas | 100% | **100%** |
| hechos de la tarea recuperados | 91.7% | **95.8%** |
| enlace a archivo en la nota | **0%** | 90.6% |

**El silencio NO bajó con la regla del plan dentro.** 17 de 32 aquí contra 16 de 32 en `rm300`
sin ella. La deuda de medición queda pagada y la regla se publica.

**Léelo con cuidado:** hush escribió 1 bloque de código en 32 corridas, así que en esta suite la
regla casi no se dispara. El lote prueba que **no hace daño**, no que funcione. Su beneficio sigue
siendo la prueba aparte, 0 de 8 a 7 de 8.

**Y una fila del costo se dio la vuelta.** 7 de 8 trabajos más baratos, pero **`repo-sweep` sale
24% más caro** ($0.6551 contra $0.8132) donde en `rm300` salía 18% más barato. La frase actual del
README, "cheaper on all eight jobs", **ya es falsa**. Hay que reescribirla.

## 2. El re-juicio: HECHO, $2.40.

`answerable.js` corrió sobre `rm310` y sobre `sn300` con el juez que se publica.

| | q1 | q2 | q3 | las tres | hechos |
| --- | --- | --- | --- | --- | --- |
| Opus, sin plugin | 100% | 100% | 100% | 100% | 91.7% |
| Opus, hush | 100% | 100% | 100% | 100% | **95.8%** |
| Sonnet, sin plugin | 93.8% | 93.8% | 81.3% | 81.3% | 87.5% |
| Sonnet, hush | 100% | 87.5% | 100% | **87.5%** | **91.7%** |

## 3. La línea 221: HECHA.

Decía *"Once it takes you can delete those lines again."* Ahora dice que la dejes puesta, porque
Claude Code la lee al empezar cada turno y esa es la configuración con la que se midió todo.

Corrección importante que salió al verificar: **`/hush:pick-style` NO borra la clave documentada.**
`activate-style.js:52` solo la borra si vale exactamente el nombre pelado del frontmatter, y
`"hush:Hush"` no es `"Hush"`. Mi primera lectura estaba mal.

## 4. El número estricto: se queda como columna, no como titular.

El dato que lo decide, recalculado sobre `rm300` partiendo las sesiones por longitud:

| llamadas a herramientas | n | cero palabras | como mucho un mensaje |
| --- | --- | --- | --- |
| 7–10 | 11 | 36% | **100%** |
| 11–15 | 8 | 75% | **100%** |
| 16–25 | 10 | 60% | **100%** |
| 26 o más | 3 | **0%** | **100%** |

El estricto va del 75% al 0% según la longitud de la sesión. El de un mensaje es 100% en todas las
bandas. Titular categórico, columna emocional, y una línea que explique la columna.

## Lo que queda por hacer

1. Replotear el póster desde `rm310` con la vara nueva.
2. Quitar la barra de costo del gráfico de cortes.
3. La pasada de prosa del README sobre `rm310`, incluida la fila de `repo-sweep` que ahora pierde.
4. CHANGELOG 1.11.0, y ahora la regla del plan SÍ entra.
5. Commits: primero el harness en el padre, luego el plugin, luego el pin.
6. Opcional, ~$8: re-base de Sonnet para que esa sección también describa el estilo publicado.
