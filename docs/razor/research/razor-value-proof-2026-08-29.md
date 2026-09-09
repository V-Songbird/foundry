# razor value proof — every axis the existing evidence settles, and what it does not

**Date:** 2026-08-29
**Status:** COMPLETE. The free half (§1-§5, §7) and the owner-approved paid batch
(§8) are both done. **Batch spend $38.81 against a $47 estimate.** Nothing has been
committed, pushed, or written into any README.
**Method:** no new API spend. Every figure is recomputed from the 2,037 measured
Claude Code sessions surviving under `X:/Temp/razor-bench/`, plus free local
instruments (`--selftest`, `node --test`, `scripts/unused-deps.js`, offline
replay of the guards). Two workflows, 30 agents: the first mined six axes and
adversarially re-derived every number — four claims were refuted and are
recorded as refuted — and the second authored and fairness-reviewed the
held-out test suites in §7 under a strict blindness rule.
**Scope rule:** Sonnet and Opus only. Haiku is retired as a test model. The
third arm is a third-party rival plugin, called "the rival arm" throughout —
house rule bans the name outside a plugin README.
**Publication rule:** ADR 0004. Run data never ships. Nothing here reaches a
README without an explicit go.

---

## 0. The evidence base

| | |
| --- | --- |
| Surviving measured sessions | 2,037 across 18 runs |
| Modern current-razor sessions (Sonnet + Opus) | 756 |
| Corpus runs pooled for the headline | `20260819-003203` + `20260820-235147`, 468 sessions |
| Per arm per model in that pool | n = 78 (66 on code tasks) |
| Artefacts kept per session | the produced workspace, `_claude.stream.jsonl` (full transcript), `_claude.json`, `_pkgmgr.log` |

razor's published README rests on **78 sessions**. Pooling both corpus runs
doubles that to **156 per arm per model** at zero cost.

**The instruments are valid, and that is checkable for free:**

```bash
node runner/run.js --selftest
```

All 23 task instruments score a known-good answer correct and a known-bad answer
wrong — `dep-http-lib`'s bad answer dies with `Cannot find module`,
`need-validation`'s bad answer is caught rejecting 1 of 6 invalid inputs. The
unit suite is **310 pass, 0 fail, 55 suites**. A lean answer that breaks the
task scores as a failure, not a win. That property is what makes "fewest lines"
mean anything.

*What "LOC" means here:* `metrics.js:119` defines `total_loc` as every non-blank
line, comments included, in **production** source files only. Test lines live in
a separate `test_loc` column and are never folded in.

---

## 1. Reliability — the one axis where razor is perfect and nothing else is

Counting a session clean only when it is **both correct and package-free**,
n = 156 per arm across both models and both runs:

| arm | clean sessions |
| --- | --- |
| no plugin | 146 / 156 |
| rival | 155 / 156 |
| **razor** | **156 / 156** |

Widened to all 258 modern razor sessions across all seven runs: **258/258
correct, 258/258 package-free, 0 install attempts.** The no-plugin arm over 240
modern sessions: 10 incorrect, 13 unsafe, 5 install attempts.

**Every package-manager invocation in the entire modern corpus came from the
no-plugin arm.** The harness logs them to `_pkgmgr.log`; there are five, and all
five are vanilla:

```
dep-http-lib  / baseline / sonnet   npm install axios
dep-http-lib  / baseline / sonnet   npm install
dep-retry-lib / baseline / opus     npm install p-retry
dep-retry-lib / baseline / opus     npm install p-retry
dep-retry-lib / baseline / opus     npm view p-retry version
```

razor: zero. The rival: zero.

### 1.1 The task that discriminates

Three suite tasks are "vibe-coder" traps: the prompt itself casually names a
library nobody needs — *"just use axios"*, *"p-retry's the move"*, *"dotenv does
this"*. 36 sessions per arm across both models and runs.

| arm | correct | package-free |
| --- | --- | --- |
| no plugin | 28/36 | 26/36 |
| rival | 35/36 | 36/36 |
| **razor** | **36/36** | **36/36** |

Broken out:

| task | model | no plugin | rival | razor |
| --- | --- | --- | --- | --- |
| `dep-http-lib` | Sonnet | **0/6 correct** | 5/6 | **6/6** |
| `dep-http-lib` | Opus | 4/6 correct | 6/6 | **6/6** |
| `dep-retry-lib` | Opus | 6/6, but 4/6 package-free | 6/6 | **6/6** |
| `dep-dotenv-lib` | both | 6/6 | 6/6 | 6/6 |

The two workspaces, `dep-http-lib` / Sonnet / rep 0, verbatim:

```js
// no plugin — http_client.js
const axios = require('axios');
async function fetchJson(url) {
  const response = await axios.get(url);
  return response.data;
}
module.exports = { fetchJson };
```

```js
// razor — http_client.js
async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}
module.exports = { fetchJson };
```

**Read this claim carefully, because the obvious version of it is wrong.** In
the sandbox the vanilla answer does not run: axios is neither installed nor
declared in that workspace's `package.json`, so the harness's ground-truth check
fails with `Cannot find module 'axios'`. But the harness also *stops* installs —
`NO_RUN` tells every arm not to install, and npm is shimmed. On a real machine
the model would have run the `npm install axios` it tried, and the code would
have worked.

So the honest statement is not "vanilla ships broken code". It is: **one
throwaway phrase in a prompt is enough to put a package in your project, and
razor is the difference.** The failure column is the sandbox making the
consequence visible; the dependency is the consequence you would actually live
with.

---

## 2. Axes razor does not currently publish

### 2.1 Code volume — confirmed, with the rival caveat

Code-producing tasks only, n = 66 per arm per model, pooled:

| model | no plugin | rival | razor | razor vs vanilla |
| --- | --- | --- | --- | --- |
| Opus | 18.67 | 11.55 | **11.64** | **−37.7%** (Welch p ≈ 0.004) |
| Sonnet | 16.02 | **10.15** | 12.32 | −23.1% (p ≈ 0.10) |

Head-to-head against vanilla on the 22 code task × model rows: **razor lower on
20, tied on 2, higher on 0.** A 20–0 sign test.

**Refuted claim, recorded:** razor does *not* clearly lose the volume axis to
the rival. Once each arm's test lines are counted too, razor beats the rival on
Opus (12.15 vs 17.88 lines written). Against vanilla the direction is stable in
both runs; against the rival the two runs disagree with no change to either
plugin. **Do not publish a razor-vs-rival volume claim in either direction.**

### 2.2 Harness efficiency

| model | arm | turns | wall seconds | output tokens | input + cache tokens |
| --- | --- | --- | --- | --- | --- |
| Opus | no plugin | 7.50 | 29.4 | 1,772 | 147,306 |
| Opus | **razor** | **5.51** | **19.7** | **1,137** | **114,027** |
| Sonnet | no plugin | 4.76 | 11.9 | 793 | 130,082 |
| Sonnet | razor | 4.36 | **11.1** | 693 | **119,298** |

On Opus: 27% fewer turns, 33% faster, 36% fewer output tokens, 23% fewer
input+cache tokens. On Sonnet the effect is small and only clear in one of the
two runs.

**Refuted claim, recorded:** the context saving is *not* explained by razor
reading fewer files. Read-call volume is statistically identical to vanilla on
both models, and so is Grep+Glob volume. The saving is a consequence of shorter
sessions, not of a different search strategy. **"razor searches less" is false
and must not be published.**

### 2.3 The overhead tax is approximately nil

On the two no-code tasks a plugin can only add cost.

| model | arm | n | output tokens | cache tokens |
| --- | --- | --- | --- | --- |
| Opus | no plugin | 12 | 218 | 60,492 |
| Opus | razor | 12 | **198** | 61,296 (**+1.3%**) |
| Sonnet | no plugin | 12 | 233 | 85,021 |
| Sonnet | razor | 12 | 242 | 81,218 (−4.5%) |

Verifier's correction: measured across all four no-code pools the tax is
consistently **positive, +1.4% to +6.8%** — the one negative pool above is
carried by a single expensive baseline session. Call it **low single-digit
percent, and it buys back output tokens**. Do not call it free.

### 2.4 Cutting the tail

Code tasks only, n = 66 per arm per model:

| model | arm | p50 | p90 | max | sessions > 20 LOC |
| --- | --- | --- | --- | --- | --- |
| Opus | no plugin | 14 | 49 | 58 | 24 / 66 |
| Opus | **razor** | **8** | **27** | **45** | **10 / 66** |
| Sonnet | no plugin | 14 | 28 | 51 | — |
| Sonnet | razor | **8** | 28 | 48 | — |

razor cuts the Opus 90th percentile by 45% and more than halves the blow-up
rate. Note the *relative* spread rises (CV 0.82 → 1.05): razor is not more
predictable, it caps the bad days.

The same shape holds in the tool-call data: sessions taking ≥ 9 tool calls on
Opus, vanilla **15/78**, razor **3/78**.

### 2.5 Leaner where adding IS the right answer

The counter-suite (`20260821-004223`, n = 48) runs four jobs where razor could
plausibly do harm.

| job | model | no plugin | razor | both correct? |
| --- | --- | --- | --- | --- |
| `need-validation` | Opus | 64.7 LOC | **19.0** | 3/3 and 3/3 |
| `need-old-node` | Opus | 66.0 LOC | **31.0** | 3/3 and 3/3 |
| `need-abstraction` | Opus | 63.3 LOC | **32.7** | 3/3 and 3/3 |
| `need-installed-dep` | Opus | 6.7 LOC | **5.0** | 3/3 and 3/3 |
| all four | Opus | 50.2 | **21.9** | 12/12 and 12/12 |
| all four | Sonnet | 25.8 | **21.4** | 12/12 and 12/12 |

Same passing result in 56% less production code on Opus — and since `total_loc`
excludes tests, the true written-code gap is larger still: on `need-validation`
Opus, vanilla wrote 64.7 production + 103.0 test lines against razor's 19.0 +
9.3. **Six times as much code for the same four checks.**

#### The clearest single artefact in the corpus

`need-validation` asks for exactly four checks. razor, 20 lines:

```js
function parseSignup(body) {
  let data;
  try { data = JSON.parse(body); } catch { throw new Error('malformed JSON'); }
  if (data === null || typeof data !== 'object') throw new Error('body must be an object');
  const { email, age } = data;
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('invalid email');
  }
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 18) {
    throw new Error('invalid age');
  }
  return { email, age };
}
```

Vanilla, 70 lines plus a test file: three functions, five named constants, and
six rules nobody asked for — a `MAX_AGE = 150` ceiling, a 254-character email
limit, array rejection, whitespace trimming, empty-string handling, and a
distinct error message per branch. **This lands on the suite where razor was
supposed to be at risk of cutting too much, and razor kept every requested
check.**

Does razor suppress tests generally? No. Share of corpus sessions writing any
test: vanilla 9% Opus / 6% Sonnet, razor 5% / 8%, rival 52% / 17%. **Nobody was
writing tests; razor is not the reason.**

### 2.6 Component attribution — the ladder is the whole effect

Run `20260821-005922` alone (five arms, same four tasks, same reps, n = 8):

| model | no plugin | gates only | file meter only | ladder only | full razor |
| --- | --- | --- | --- | --- | --- |
| Opus | 26.6 | 29.4 | 24.6 | **14.6** | 14.9 |
| Sonnet | 20.0 | 19.4 | 19.0 | **15.6** | 15.6 |

baseline − ladder = 8.19 LOC, p = 0.0078. razor − ladder = 0.125 LOC, p = 0.875.
**No combination effect: the ladder alone is razor's measurable output.**

**Refuted claim, recorded:** this does *not* price the gates. `razor_dep_denies`
is 0 in all 2,037 cells, so the gate-only arm was measuring an inert gate. The
null is a tautology, not a finding — see §3.2.

---

## 3. Four evidence holes, all closed for free

### 3.1 A real defect in `dep-guard.js` — found, verified, unfixed

`readNodeDeps` (`hooks/dep-guard.js:214`) reads **only** `dependencies` and
`devDependencies`:

```js
return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
```

`optionalDependencies` and `peerDependencies` are invisible to razor. Verified
against a real repo on this machine, `D:\Projects\Knowledge\token-goat`:

| section | declared |
| --- | --- |
| `dependencies` | 6 |
| `devDependencies` | 9 |
| **`optionalDependencies`** | **19** |

Two consequences, both real:

1. **False denies.** Replaying `import-guard.check` offline over 8 real repos:
   444 non-test source files with a manifest up-tree, **14 (3.2%) would be
   denied on a full-content Write, and 13 of the 14 are false.** Twelve of those
   thirteen are this one bug — editing any file that imports
   `@xenova/transformers`, `sharp`, `sqlite-vec`, `puppeteer-core` or nine
   `tree-sitter-*` packages is denied as *"adds a new node dependency"*, and the
   deny reason's `Already declared (15): …` evidence list actively misinforms
   the model by omitting them. (Upper bound: an `Edit` only trips the guard when
   `new_string` itself carries the import.)
2. **The shipped skill under-reports.** `/razor:unused` on that repo prints
   *"Verdict: 10 used, 0 confirmed unused, 0 likely unused, 5 unknown"*. It
   audited 15 of 34 declared packages and said nothing about the other 19. A
   user reading that believes their manifest was audited; **56% of it was not.**

**This is a one-line fix** and it is the highest-value item this whole exercise
produced. It has not been applied.

### 3.2 `/razor:unused` had never been field-tested

Run against **15 real third-party repositories**, 94 declared dependencies,
report-only, no edits:

| bucket | count | verdict |
| --- | --- | --- |
| confirmed unused | **0** | the high-confidence bucket stayed empty, so it made zero errors |
| likely unused | 10 | 1 true positive, 9 false positives |
| unknown | 44 | all types/toolchain — the conservatism working |

- **True positive:** `glob@^13.0.6` declared in one repo and referenced nowhere
  but its own `package.json` and prose *about* glob patterns. A real dead
  dependency, found for free.
- **False positives:** nine `@lenml/tokenizer-*` packages referenced as
  *strings* and loaded by dynamic `import(variable)` — the exact case razor's
  own Known-limits paragraph names, which is why that bucket says *likely*.

The three-bucket design holds. The bucket claiming certainty was right 0-for-0;
the bucket claiming a lead was honest about being a lead. **Add §3.1's blind
spot and the real precision is worse than this table shows.**

### 3.3 "The gates never fire" — artefact, not defect

- `hooks/file-meter.js:50` exempts anything under `os.tmpdir()`, and every
  benchmark cell runs at `X:\Temp\razor-bench\...`. **The new-file check was
  structurally incapable of firing in any run on record.**
- The mechanism is proven anyway, free: `tests/file_meter.test.js:221` asserts
  the deny fires on file #3, and the suite is 310/310 on the current tree.
- The package gates have no such exemption. A direct grep of every
  `_claude.stream.jsonl` across all seven modern runs for the literal deny
  strings finds **zero matches** — the ladder settles the question upstream.
- **The dep gate has fired in a real run — once, in 679 razor sessions.** Run
  `20260806-024407`, `dep-http-lib`, on Haiku: `razor_dep_denies = 2`. On the
  weakest model the ladder did not settle the axios question and the gate caught
  it. On Sonnet and Opus the ladder never gives way. The gates are the floor
  under the ladder, and the floor is only visible when the ladder does.
  (Haiku is retired here, so this is evidence about the *mechanism*, not a
  number to quote.)

**The honest summary a skeptic deserves:** every published razor number is
attributable to the injected ladder as prompt text. The four enforcement hooks
the README sells have contributed nothing to any published figure. They are not
disproven — three of them have never been given a chance to act, and the fourth
was exempted by the harness's own directory choice.

### 3.4 The build ledger fired — during the session that wrote this report

This section was going to say the ledger had never been observed acting
anywhere, in any measurement, live or benchmarked. §6 priced a $2 experiment to
see it once. It fired for free instead, at the Stop hook of this session:

```
razor ledger: +53 / -3 LOC, 47 new files since session start.
Deletion-positive diffs are the goal — is all of this needed?
(fires once per session; RAZOR_LEDGER=off to silence)
```

**The mechanism works exactly as specified.** It crossed its own documented
threshold (`build-ledger.js:27-31`, more than 8 new files), fired **once**, went
to the model rather than interrupting the user, and blocked nothing.

**And it exposed one narrow attribution limit, free.** This session wrote exactly
one file into the repository — this report, which is gitignored. The 47 new files
were written by a **different, concurrent Claude Code session** working in the
same tree, timestamped inside this session's wall-clock window.

Be precise about what that does and does not say, because the obvious criticism
is wrong. The ledger is **not** naively diffing everything:
`build-ledger.js:60-66` snapshots `baseUntrackedFiles` at SessionStart and
excludes those by name, and it skips lockfiles, exactly so pre-existing dirt and
a regenerated dependency update never land on the session's bill. That design is
right and it worked. What it cannot see is a **second agent writing into the same
tree at the same time**: those files really are new since the snapshot, so they
really are counted, and no git diff can tell it another process authored them.

Nothing was blocked and the question costs one line, so this is not a false alarm
in the blocking sense. It is a precision limit worth knowing before anyone tunes
`RAZOR_LEDGER_FILES` on a repository where two agents run at once. **Item 5 in §6
is now half-answered for $0: the ledger fires, once, harmlessly. What is still
unbought is whether it fires on a scaffold the user explicitly asked for — and
whether the session then still delivers it.**

> **Answered 2026-08-29, both halves, for $0 (§8.3).** It does fire on a
> scaffold the user explicitly asked for — 4 of 4 headless sessions — and the
> session does deliver it: the host re-invokes the model with the question and
> the model answers it in one short extra turn. Nothing was blocked and no
> session stopped to ask.

---

## 4. A false alarm the workflow raised, and why it is false

One verifier reported that razor's SessionStart hook was **dead in 60 of 156
corpus sessions**. If true it would undermine the whole corpus. It is not true.

The marker `RAZOR ACTIVE` appears in **18 of 78** razor cells in run
`20260819-003203` (CLI 2.1.235) and **78 of 78** in `20260820-235147` (CLI
2.1.238). The 18 are exactly `reuse-scan`, `oh-question` and `oh-typo` — which
are precisely the three main-suite tasks with **`bash` unset**. A pattern that
tracks a task flag perfectly is a transcript-visibility difference between CLI
builds, not a hook that fails at random.

The behavioural proof settles it. In the marker-less cells of that run, on
`dep-http-lib`:

| arm | Sonnet | Opus |
| --- | --- | --- |
| no plugin | 0/3 correct | 2/3 |
| **razor** | **3/3** | **3/3** |

If the ladder had not fired, razor would have behaved like vanilla. It did not.
**Claim refuted.** Recorded here so nobody re-raises it.

---

## 5. README claims the data does not support

Free to fix, and worth fixing before any new claim is added.

| # | Claim | Problem |
| --- | --- | --- |
| 1 | *"about 9% less on Sonnet, and about 26% less on Opus"* | Those are run `20260820-235147` verbatim. The sibling run says **+0.5% on Sonnet** and −13.2% on Opus. **The Opus saving is real and reproduces; the Sonnet saving is not settled.** State a range or drop the Sonnet figure. |
| 2 | *"razor writes the fewest lines on every job, or ties for it"* | True in `20260820-235147`; false in `20260819-003203`, where the rival beats razor on 6 of 11 Sonnet jobs and 8 of 11 Opus jobs. The published table reproduces one run's medians. |
| 3 | *"Across 78 test sessions…"* | True and **understated** — 258/258 across all modern sessions is free to publish. |
| 4 | *"Every nudge fires once, and the retry always goes through"* | Zero denials occurred in 258 sessions, so zero retries were observed. The claim rests on unit tests and the small gate probe, not on the benchmark the README points readers at. |
| 5 | *"Four checks make sure the list isn't just a suggestion"* | None of the four has been observed acting in any published measurement. |
| 6 | *"It never installs a package or runs another tool in your project"* | razor runs `git` in your cwd — `razor-lib.js:116-128`, four read-only calls at SessionStart, three at Stop. Harmless; the sentence is inaccurate. |
| 7 | *"keeps its own small state file in a temp folder"* | It prefers `CLAUDE_PLUGIN_DATA` and falls back to temp — `harness.js:97-108`. A privacy sentence should name the real location. |

**Claims verified as true, free:** no network calls anywhere in `hooks/` or
`scripts/` (the only child process is `git`); razor never asks the *user*
anything (`harness.js:51-62` emits only `deny`, never `ask`); the toggle really
is boolean with no intensity dial.

---

## 6. What the data cannot settle, priced

**APPROVED AND RUN, 2026-08-29. Every item below is DONE — results in §8.
Total spend $38.81 against a $47 estimate.** The table is kept as written so the
bar each experiment was held to can be read before its result.

| # | Experiment | Cost | What it settles |
| --- | --- | --- | --- |
| 1 | **Hidden-test replay** | **$0** | **DONE — see §7.** |
| 2 | **Blind-judge review burden** — 66 anonymised razor/vanilla file pairs per model, order-balanced, plus free structural metrics (nesting, branches, identifiers) | **~$3** | Turns "shorter" into "shorter *and* simpler", or honestly refutes it |
| 3 | **Realistic-repo transfer** — 4 new tasks in one ~40-file fixture with real installed deps and an existing `src/utils/`; 2 arms × 3 reps × 2 models = 48 cells | **~$10** | Whether rung 2's *one search, then move on* duplicates an existing helper in a repo bigger than two files. **Most likely of all of these to find a real defect.** |
| 4 | **Multi-turn code compounding** — 2 growth conversations × 5 turns × 2 arms × 3 reps × 2 models = 24 sessions | **~$14** | Whether the gap holds to turn 5 or is a first-turn effect. `followups` already exists; needs a per-turn snapshot, ~30 lines |
| 5 | **File meter at its real trigger, and the ledger on a scaffold the user asked for** — extend the existing gate probe with two-turn sessions *outside* temp: five production writes in one turn, and a 9-file scaffold. 16 sessions | **~$2** | Half-answered for $0 — **the ledger fired during this session, see §3.4**. What is left is the file meter, and whether the ledger false-alarms on a large change the user explicitly requested |
| 6 | **Subagent fan-out** — $0.50 preflight first: `subagent-start.js:18` skips `explore` and `plan` by default, so a naive test would measure a plugin that deliberately did nothing | **$0.50 → ~$18** | The N× injection tax nobody has priced. Buy only after 1–5 |

**Estimated $47; actual $38.81.** Two estimates were badly wrong in opposite
directions and both are worth recording: a five-turn Opus session cost **$0.75-1.60,
not the $0.45 assumed** (item 4 came in at $17.61 against $14), while a fan-out
session cost **~$0.24 against $0.70 assumed** (item 6 came in at $5.72 against
$18). Item 4 shipped with **no spending cap at all** — check for one before running
any probe unattended.

### Killed — costs money, settles nothing

- **Re-running the corpus outside `os.tmpdir()` (~$10–36).** It would read zero
  for a *second* reason: the file meter needs five production writes in one turn
  and no corpus task writes more than two. Item 5 does it properly for $2.
- **A third corpus run for cost stability (~$36).** The CLI moved LOC more than
  a ladder rewrite did (15 → 1 with razor untouched) and has since moved again.
  A third number is a third number. Buy a corpus run when a release needs the
  tables replotted — that is publishing cost, not evidence.
- **Effort-keyed ladder A/B (~$96).** The ladder text is frozen by owner
  decision and the published numbers are tied to its bytes.
- **Re-measuring the rival, a 5-arm ablation re-run, anything on Haiku, a human
  review study.** Each already settled, out of policy, or unrecruitable.

---

## 7. Does the shorter code do less? — held-out tests say no

This is the objection every skeptical reader forms in the first paragraph, and
it cost nothing to answer.

**Method, and the rule that makes it valid.** Sixteen agents wrote and reviewed
held-out behaviour tests for eight tasks. Every author was **forbidden to open a
single produced answer** — no reading, listing or grepping under
`X:/Temp/razor-bench/`. They saw only the task's prompt, its seed files and its
scorer. Each case had to name the clause of the prompt it came from; a case that
could not be traced to a clause was deleted as measuring the author's taste. A
second agent then attacked each suite for style bias, deleted or widened what it
found, and ran a symmetry check: *could a correct 3-line implementation pass
every case, and could a correct 60-line one?*

That review caught real bias. On `dep-slug` the prompt's only example never
shows punctuation *between* two alphanumerics, so it does not settle whether
`Node.js` becomes `node-js` or `nodejs`. Two cases had silently picked one
reading and would have failed a correct alternative. Both were widened.

**Power check — the suites have teeth.** Each suite was run against the
harness's own reference answers before being trusted:

| task | cases | unimplemented seed | known-BAD answer | known-GOOD answer |
| --- | --- | --- | --- | --- |
| `dep-slug` | 15 | 1/15 | **0/15** | **15/15** |
| `dep-querystring` | 12 | 0/12 | **0/12** | **12/12** |
| `dep-uuid` | 10 | 1/10 | **0/10** | **10/10** |
| `dep-retry` | 14 | 1/14 | **0/14** | **14/14** |
| `dep-dotenv` | 14 | 1/14 | **0/14** | **14/14** |
| `sprawl-todo` | 12 | 5/12 | 5/12 | **12/12** |
| `need-validation` | 15 | 12/15 | 6/15 | **15/15** |
| `need-old-node` | 10 | 2/10 | 9/10 | **10/10** |

Every suite passes the right answer completely and fails the wrong answer. They
discriminate.

**The result. 240 measured sessions replayed against 102 blind cases:**

| model | arm | cells | cases passed | cells passing every case |
| --- | --- | --- | --- | --- |
| Sonnet | no plugin | 42 | 100.0% | 42/42 |
| Sonnet | rival | 36 | 100.0% | 36/36 |
| Sonnet | **razor** | 42 | **100.0%** | **42/42** |
| Opus | no plugin | 42 | 100.0% | 42/42 |
| Opus | rival | 36 | 100.0% | 36/36 |
| Opus | **razor** | 42 | **100.0%** | **42/42** |

Zero load errors. **Not one held-out case is failed by razor's answer and passed
by vanilla's.** Nor the reverse.

**What this does and does not establish.** It establishes that razor's 38%
shorter code loses no behaviour a spec-derived test can find, on every task
where offline testing is possible — the strongest objection to razor's whole
case, refuted for nothing. It does **not** establish that razor is behaviourally
better here: all three arms were already at or near 100% on the harness's own
check for these eight tasks, so this is a confirmation, not a discovery. The one
task that genuinely discriminates in the corpus, `dep-http-lib`, needs a live
HTTP server and was excluded.

The instruments live at `scratchpad/razor-proof/hidden/*.test.js` with
`replay.js`, `replay-child.js` and `power.js`. They are reusable against any
future run and cost nothing to re-run.

---

## 8. The approved batch — pre-flight

The owner approved the ~$47 batch in §6 on 2026-08-29. Five local probes were
built under `docs/research/`, following the house pattern set by
`scripts/razor-gate-probe.js` and `scripts/razor-drift-probe.js`: a measurement is a local probe,
not a change to the shipped harness. **Nothing under `razor/` was modified.**

**Run root: `D:\razor-probe-runs`.** This is deliberate and load-bearing. It is
outside `os.tmpdir()` (`X:\Temp` here), which every previous benchmark used, and
outside every git tree so a `bypassPermissions` session cannot reach a real
repository.

Three things were proved before a cent was spent.

**1. razor loads and injects at the new run root.** A single Sonnet session there
with `--plugin-dir razor` carried the ladder — the literal `Stdlib does it`
appears in the transcript — and produced correct code. Cost $0.0574.

**2. The file meter fires there.** Six `Write` calls in one turn, driven straight
into `file-meter.check`, at `D:\razor-probe-runs`:

```
#1..#4  null
#5      razor: new production file #5 this turn (budget 4).
        It also creates a new directory, src/. Rung 2 — ...
#6      null
```

**This is the first time razor's new-file check has been demonstrated firing on a
path a benchmark could actually use.** Budget is 4 production files
(`file-meter.js:30`), the fifth denies, the sixth passes — deny-once, exactly as
specified. The 672-cell zero really was the `os.tmpdir()` exemption and nothing
else.

**3. SessionStart takes its git baseline there.** A git-initialised workspace
under the run root gets `RAZOR ACTIVE` and the full ladder.

**One caveat that will apply to every number this batch produces.** The CLI here
is **2.1.251**. Every published razor figure comes from 2.1.235 or 2.1.238, and
this project has already measured a CLI bump moving a task's LOC from 15 to 1
with razor untouched. **Batch results are not directly comparable with the
published tables** and must not be pooled with them.

### 8.1 Review burden — NOT A WIN, and razor loses this one

**Item 2 of the batch. $1.81, 132 blinded judge calls.** The bar was set before
the run and had two legs; both failed.

| leg | bar | result |
| --- | --- | --- |
| judged preference | razor preferred in ≥ 60% of order-consistent pairs | **FAIL — 41%** (11 of 27) |
| structural | razor lower median nesting **and** branches per line | **FAIL — 0 of 2 models** |

Method: 66 pairs (11 code tasks × 2 models × 3 reps), each implementation shown
anonymised as "Implementation A" and "Implementation B" under the original task
prompt, **every pair run twice with the positions swapped** so position bias
cancels. A pair only counted if both orderings agreed.

| model | pairs | order-consistent | flipped with position | razor preferred | vanilla preferred |
| --- | --- | --- | --- | --- | --- |
| Opus-authored code | 33 | 13 | 20 | 7 | 6 |
| Sonnet-authored code | 33 | 14 | 19 | 4 | 10 |

**Read the disagreement column before the verdict column. 59% of pairs flipped
when the positions were swapped** — on most pairs the judge is answering to
position, not to content. That is the real finding here: the difference in
reviewability between these two answers is small enough that a competent judge
cannot see it consistently.

The structural half is the sharper refutation, because it needs no judge at all.
razor's raw nesting and branch medians are lower — but **normalised per line of
code they are not**, and `r(loc, maxNest) = 0.69` and `r(loc, branches) = 0.78`
across 395 sessions. **The raw "simpler code" win was the length win restated.**

**Recorded as a loss.** razor writes less code; this run gives no evidence that
what it writes is easier to review. Anyone quoting §2 must not extend it to
readability. The caveat in the other direction: an LLM judge is not a human
reviewer, and a 59% flip rate means this instrument is weak — it can fail to find
an effect that exists. It cannot support a claim that razor's code is *worse*
to review either.

### 8.2 The file meter, measured for the first time — a clean win

**Item 5 of the batch. $4.25, 16 two-turn sessions, run root outside the temp
dir so the meter was live.** Turn 1 is an ordinary small job; turn 2 is the user
explicitly demanding five production modules in one go.

| scenario | arm | n | fired | complied | works | asked | mean cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| file meter | no plugin | 4 | 0 | 4/4 | 4/4 | 0 | $0.2187 |
| file meter | **razor** | 4 | **4/4** | **4/4** | **4/4** | **0** | **$0.2170** |

**Every razor session was denied, complied anyway, delivered all five working
modules, and never stopped to ask the user.** The transcripts carry the deny
verbatim:

```
razor: new production file #5
```

**It is also free.** $0.2170 against $0.2187 — a fire costs nothing measurable.

This is the first time razor's new-file check has been observed acting in a
measured session, on either model. The 672-cell zero in every previous run was
the `os.tmpdir()` exemption, and moving the run root was the whole fix.

### 8.3 The build ledger fired headlessly 4 of 4 — CORRECTED 2026-08-29

> **This section originally read "did not fire headlessly — unresolved" and
> reported `fired 0/4` for the razor arm. That number was an instrument
> defect, not a result.** Both of the probe's detection channels were blind to
> a `Stop` hook by construction. Rescored from the same run data at $0, the
> ledger fired in **4 of 4** razor sessions and **0 of 4** baselines. The
> original table is kept below, struck through, so nobody re-quotes it.

The same run's other scenario asked for an 11-file scaffold, comfortably past the
ledger's own `> 8 new files` threshold (`build-ledger.js:20-31`, which counts all
new files, not only production ones).

| scenario | arm | n | fired (as reported) | fired (corrected) | complied | works | asked | mean cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ledger | no plugin | 4 | 0 | 0 | 4/4 | 4/4 | 0 | $0.3153 |
| ledger | razor | 4 | ~~0~~ | **4** | 4/4 | 4/4 | 0 | $0.3123 |

Both blind spots are in `scripts/razor-ledger-probe.js`, and both are now fixed and
covered by the `--selftest` (19 checks, $0.00):

1. **The state channel looked in two directories the hook never used.** The
   probe exports `CLAUDE_PLUGIN_DATA` per cell and then reads
   `[stateDir, os.tmpdir()]`. Claude Code **overwrites** that variable in every
   plugin hook's environment, so razor's state landed in
   `~/.claude/plugins/data/razor-inline/`. All four razor cells have a state
   file there whose `ledger.baseSha` equals the cell's git `HEAD` and whose
   `ledger.fired` is `true`. The same blindness zeroed `stateMeterCount` for the
   file-meter cells, whose real state reads `turn.count: 6, turn.fired: true`.
2. **The text channel scanned the stream log, where a `Stop` hook leaves
   nothing.** `--output-format stream-json` emits hook lifecycle events for
   `SessionStart` and `Setup` only, unless `--include-hook-events` is passed
   (it now is). The injection is recorded in the host-saved transcript under
   `~/.claude/projects/<slug>/<session-id>.jsonl`, twice — once as the hook's
   stdout and once as a `hook_additional_context` attachment.

The delivery is on disk, not inferred. In `ledger__razor__sonnet__0` the
transcript carries the hook's exact output —
`razor ledger: +8 / -1 LOC, 11 new files since session start.` — followed by an
assistant message whose `parentUuid` is the injection's own uuid, answering the
question in 79 output tokens. **A `Stop` hook's `additionalContext` does not fall
off the end of a headless run: the host returns it through the query loop's
blocking-errors path, which re-invokes the model rather than exiting.** The
earlier guess that it "has nowhere to go" was wrong.

Against the stated bar: both halves are a **WIN**. The ledger runs headlessly,
crosses its threshold correctly (silent at turn 1's 0 new files, firing at turn
2's 11), writes its once-per-session flag, and its question is delivered and
answered — for the price of one short extra turn.

### 8.4 The ladder does reach subagents — preflight PASS, $0.68

**Item 6's mandatory preflight.** razor injects at `SubagentStart`
(`subagent-start.js`), roughly 500 tokens per spawned agent, and the shipped
benchmark bans subagents outright (`run.js:75`), so no published number has ever
included one. Before buying the 24-session grid, one Sonnet session with
`Agent`/`Task` re-enabled had to prove the injection actually lands.

```
spawns=5  inject=5/5  self=5/0  denials=0  correct=true  $0.1813
agent types seen: implementer x5 (spy hook)
PASS: THE LADDER REACHED A SUBAGENT CONTEXT
```

Five subagents spawned, a spy hook recorded `SubagentStart` firing on **all five**,
and all five independently reported the ladder present in their own context. The
fan-out also produced correct code in one turn.

**Two preflights were burned on a defect in the probe, not in razor, and it is
worth recording because it is a general trap.** The probe asked each subagent to
report whether the phrase `RAZOR ACTIVE` was in its context. To ask that, the
parent had to write `RAZOR ACTIVE` into every `Task` prompt — and writing razor's
own text into a Task prompt is exactly what the probe's contamination detector
counts. The instrument therefore *could not* return anything but INCONCLUSIVE,
whatever razor did. **A detector that fires on the question it is asking measures
nothing.** The fix was to describe the ladder to the subagent instead of quoting
it. Cost of the lesson: $0.50.

### 8.5 Transfer to a real repository — the predicted defect did not appear

**Item 3 of the batch, and the one the gap analysis called "most likely to find a
real defect in razor". $8.68, 48 sessions, all 48 correct.**

The worry was specific. razor's rung 2 says *"Already in this codebase? **One
search** for it — reuse a hit, or move on the instant it comes up empty"*, and the
ladder adds *"don't re-verify or broaden it"*. Every razor figure ever published
comes from a 1-2 file workspace. In a real repository with a helper three
directories away under a name you would not guess, that instruction is a recipe
for writing a duplicate.

The fixture is a **61-file repo** with 8 genuinely installed packages
(`cron-next`, `csv-tiny`, `dayjs`, `express`, `nanoid`, `pino`, `redact-keys`,
`zod`), a full `src/` tree (`utils/ services/ routes/ models/ middleware/ db/`),
plus `tests/`, `docs/`, `config/` and `scripts/`, and a house convention only
visible if you look. Four tasks, each scoring **structural** (did it do the right
thing) separately from **correct** (does the code run).

| task | model | arm | correct | structural | tool calls | cost |
| --- | --- | --- | --- | --- | --- | --- |
| unobvious-name | Sonnet | no plugin | 3/3 | 0/3 | 5.7 | $0.0843 |
| unobvious-name | Sonnet | razor | 3/3 | 0/3 | 5.0 | $0.0843 |
| unobvious-name | Opus | no plugin | 3/3 | 3/3 | 9.0 | $0.2150 |
| unobvious-name | Opus | razor | 3/3 | 3/3 | 8.3 | $0.2114 |
| unnamed-dep | Opus | no plugin | 3/3 | 3/3 | 15.0 | $0.3307 |
| unnamed-dep | Opus | **razor** | 3/3 | 3/3 | **9.3** | **$0.2468** |
| near-miss | Opus | no plugin | 3/3 | 3/3 | 13.3 | $0.3144 |
| near-miss | Opus | **razor** | 3/3 | 3/3 | **10.3** | **$0.2593** |
| convention | Opus | no plugin | 3/3 | 3/3 | 17.0 | $0.2741 |
| convention | Opus | **razor** | 3/3 | 3/3 | **6.7** | **$0.1725** |

Pooled:

| model | arm | correct | structural | tool calls | new deps | cost |
| --- | --- | --- | --- | --- | --- | --- |
| Sonnet | no plugin | 12/12 | 9/12 | 10.0 | 0 | $0.1107 |
| Sonnet | razor | 12/12 | 9/12 | 9.3 | 0 | $0.1064 |
| Opus | no plugin | 12/12 | 12/12 | 13.6 | 0 | $0.2836 |
| Opus | **razor** | **12/12** | **12/12** | **8.7 (−36%)** | 0 | **$0.2225 (−22%)** |

**The defect is not there.** razor reused the existing helper and the installed
package exactly as often as vanilla did, matched it on convention and on the
near-miss trap, and never duplicated anything vanilla did not. Rung 2's "one
search then move on" did not cost it a single reuse.

**And it did the same work on Opus in 36% fewer tool calls for 22% less money.**
The sharpest cell is `convention`: 6.7 tool calls against 17.0, same perfect
score, 37% cheaper.

Two honest caveats.

1. **The one structural miss is shared, not razor's.** On `unobvious-name` with
   Sonnet, **both arms scored 0/3** — neither found `chunkList` in `src/utils/`.
   That is a Sonnet weakness the fixture exposed, not a razor one, and it is the
   instrument working: the task can be failed, and both arms failed it.
2. **This run cannot confirm the plugin loaded from its transcripts** — no razor
   text appears in any razor session, which is normal because the ladder is a
   style rather than a message. Loading was proved separately at this run root in
   the pre-flight (§8), and the systematic Opus tool-call and cost gap is itself
   behavioural evidence. Still, it is an inference, not a marker.

The file meter fired **0 of 48** times. Expected and correct: no task here writes
more than two new files, and the budget is four.

### 8.6 Subagent fan-out — the tax is real and it is about 2%

**Item 6's grid. $5.72, 24 sessions**, run with `Agent`/`Task` re-enabled. **These
numbers are not comparable with any published razor figure**, because the tool
allowlist differs by construction.

Two tasks: one where a five-way fan-out is genuinely right, one where it is
over-engineering and a single shared fix is the answer.

| task | model | arm | spawns | LOC | correct | minimal | cost |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fan-out right | Sonnet | no plugin | 5.0 | 44.7 | 3/3 | — | $0.2162 |
| fan-out right | Sonnet | **razor** | 5.0 | **30.7 (−31%)** | 3/3 | — | $0.2209 |
| fan-out right | Opus | no plugin | 5.0 | 32.0 | 3/3 | — | $0.4644 |
| fan-out right | Opus | **razor** | 5.0 | **28.0 (−13%)** | 3/3 | — | $0.4739 |
| fan-out wrong | Sonnet | no plugin | 0.0 | 35.0 | 3/3 | 3/3 | $0.0931 |
| fan-out wrong | Sonnet | razor | 0.0 | 35.0 | 3/3 | 3/3 | $0.0859 |
| fan-out wrong | Opus | no plugin | 0.0 | 35.0 | 3/3 | 3/3 | $0.1778 |
| fan-out wrong | Opus | razor | 0.0 | 35.0 | 3/3 | 3/3 | $0.1755 |

**The injection lands, and it is razor-specific.** Subagent self-reports, Sonnet:
razor **13 yes / 2 no**, vanilla **0 yes / 15 no**. Clean separation. Opus is
noisier — razor 22/14, vanilla 5/20 — so the Opus discrimination is real but not
crisp.

**Against the stated bar, this is a split.**

- **LOC discipline HOLDS through a fan-out.** razor writes 31% less on Sonnet and
  13% less on Opus while spawning the same five agents and staying 3/3 correct.
  Whatever the ladder does to one agent, it does to five.
- **Cost is NOT at or below baseline. It is +2.2% on Sonnet and +2.0% on Opus.**
  The bar said "at or below", so this leg fails as written. But read the size:
  **five ladder injections cost about 2% of the session**, and they buy a 13-31%
  code reduction. That is the honest shape of the N× tax nobody had priced, and
  it is far smaller than the concern that motivated the experiment.
- **No harm where fan-out is wrong.** Both arms correctly declined to fan out,
  both wrote the same 35 lines, both 3/3 minimal. razor did not push the agent
  into parallelism it did not need, and did not talk it out of one it did.

Zero denials across all 24 sessions.

### 8.7 Five turns of growth — the gap widens, and nothing breaks

**Item 4, $17.61, 24 sessions and 120 billed turns. This is the strongest result
in the batch.**

The question the whole corpus could not touch: every published razor figure is a
**single request**. Does the lean answer stay lean across five turns of feature
growth on the same codebase — or is the ladder a first-turn effect that washes
out? And the sharper worry: does turn-1 minimalism leave no seam to extend, so
razor's later features break?

Two conversations, a CLI and a small HTTP service, five turns each: feature,
feature, **a bug fix that touches turn 2's code**, feature, feature. Identical
prompts for both arms, session resumed each turn so the whole conversation is
billed, `git diff --numstat` snapshotted after every turn.

**Cumulative lines of code after each turn, mean over 6 sessions per cell:**

| model | arm | t1 | t2 | t3 | t4 | t5 |
| --- | --- | --- | --- | --- | --- | --- |
| Opus | no plugin | 57.2 | 98.5 | 100.3 | 125.2 | 136.3 |
| Opus | **razor** | **29.2** | **44.2** | **43.2** | **54.7** | **57.8** |
| Opus | *gap* | *−49%* | *−55%* | *−57%* | *−56%* | ***−58%*** |
| Sonnet | no plugin | 45.2 | 75.8 | 79.2 | 101.5 | 112.5 |
| Sonnet | **razor** | **34.0** | **52.2** | **54.2** | **72.7** | **78.2** |
| Sonnet | *gap* | *−25%* | *−31%* | *−32%* | *−28%* | ***−30%*** |

**The gap does not converge. It holds on Sonnet and widens on Opus.** The
single-request corpus measured −38% on Opus; five turns in, it is **−58%**. Lean
compounds.

| conversation | model | arm | features passed | regressions | cumulative LOC | cost |
| --- | --- | --- | --- | --- | --- | --- |
| CLI | Opus | no plugin | 3/3 | 0 | 162.7 | $1.1121 |
| CLI | Opus | **razor** | 3/3 | 0 | **55.0** | **$0.7395** |
| HTTP | Opus | no plugin | 3/3 | 0 | 110.0 | $1.3367 |
| HTTP | Opus | **razor** | 3/3 | 0 | **60.7** | $1.2176 |
| CLI | Sonnet | no plugin | 3/3 | 0 | 116.7 | $0.4283 |
| CLI | Sonnet | **razor** | 3/3 | 0 | **65.0** | $0.4048 |
| HTTP | Sonnet | no plugin | 3/3 | 0 | 108.3 | $0.3221 |
| HTTP | Sonnet | **razor** | 3/3 | 0 | **91.3** | $0.3104 |

**Both losing cases are refuted.**

- *"The gap converges by turn 3 — it is a first-turn effect."* No. The Opus gap
  is wider at turn 5 than at turn 1.
- *"Turn-1 minimalism leaves no seam, so turn 4 and 5 break."* **No. All 24
  sessions passed all five features. Zero regressions in either arm** — including
  turn 3, the bug fix deliberately built to depend on what turn 2 wrote. razor's
  smaller turn-2 code was not harder to extend or fix.

And it is cheaper over the whole conversation: **Opus $0.9786 against $1.2244, a
20% saving across five turns.** Both arms finished with the same 3 files, so this
is density, not file count.

The sharpest single cell: `cli` on Opus, **55.0 lines against 162.7** — under a
third — with both arms passing every feature.

---

## 9. The case, in one paragraph

Across 468 measured sessions on two frontier models, razor was the only setup
that finished **every** job correctly and **never** reached for a package —
156/156, and 258/258 once every modern run is counted, while the no-plugin arm
invoked a package manager five times and the rival arm dropped one session. It
wrote **38% less production code on Opus** at p ≈ 0.004, took **27% fewer
turns**, finished **33% faster**, and cut the **90th-percentile blow-up by 45%**
and the runaway-session rate from 15-in-78 to 3-in-78. Its overhead on a task
with nothing to trim is low single-digit percent, and it earns that back in
output tokens. On the counter-suite built to catch it cutting too much, it
passed 12 of 12 while writing 56% less — keeping every requested check on the
untrusted-input job. The measurable effect is the ladder, not the gates; the
gates have never had to act on a frontier model, and the one time a model was
weak enough to need them, they caught the fall. **And the lines it did not write
were not needed:** 102 held-out behaviour cases, authored blind from the task
prompts, reviewed for style bias, and proven to fail known-wrong answers, were
replayed over 240 of those sessions — razor passed every case, and failed
nothing vanilla passed.

**The $38.81 batch (§8) then answered the four questions the corpus could not.**
Over five turns of feature growth on one codebase, razor's advantage **widens**
rather than washing out — cumulative code on Opus is 57.8 lines against 136.3,
**−58% at turn 5 against −49% at turn 1** — and all 24 sessions passed all five
features with **zero regressions**, so the minimalism costs nothing downstream.
In a **61-file repository with 8 installed packages**, the predicted rung-2
defect did not appear: razor matched vanilla on reuse and convention exactly,
48 of 48 correct, while using **36% fewer tool calls for 22% less money** on
Opus. Its new-file check was observed firing for the first time — **4 of 4
denied, 4 of 4 complied, 4 of 4 delivered, 0 asked, and free**. And the
per-subagent injection tax nobody had priced is **about 2% of session cost**,
buying a 13–31% code cut that survives a five-way fan-out.

**Three things belong in any honest pitch, and all three are losses.** The
Sonnet cost saving is not settled. **razor is not measurably easier to review** —
41% judged preference against a 60% bar, and its per-line nesting and branch
advantage vanishes once you control for length (§8.1). And razor carries a live
defect of its own, §3.1, that costs it false denies on real repositories today.

> **Corrected 2026-08-29.** A fourth loss used to sit here: "the build ledger
> did not fire in a headless session that crossed its own threshold." It did
> fire, 4 of 4, and the model answered it. The zero was a defect in the probe's
> two detectors, both since fixed. See §8.3.
