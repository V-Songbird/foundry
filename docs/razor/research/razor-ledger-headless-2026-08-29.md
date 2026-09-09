# Why razor's build ledger "never spoke" in a headless session

**Roadmap entry 270. Closed 2026-08-29. Total spend: $0.1579.**

## Verdict

**It spoke.** The build ledger ran, crossed its threshold, wrote its
once-per-session flag, emitted its question, the host delivered it, and the
model answered it — in **4 of 4** headless razor sessions, on both Sonnet and
Opus, and in **0 of 4** baselines.

Entry 270 offered three possible outcomes:

| | outcome | verdict |
| --- | --- | --- |
| a | the `Stop` hook never runs headlessly | **refuted** |
| b | it runs and its output is discarded | **refuted** |
| c | it runs and the thresholds are wrong | **refuted** |

The answer is a fourth thing: **the premise was a measurement defect in the
probe, not a defect in razor.** No product change is warranted, and no headless
limitation should be documented, because there is no headless limitation. A
fifth session bought afterwards confirms the same in a fresh single-process
run.

## What was actually wrong

Two independent blind spots in `docs/razor/research/scripts/razor-ledger-probe.js`, both of
which had to be fixed before the run could report the truth.

### 1. The state channel read two directories the hook never used

The probe sets `CLAUDE_PLUGIN_DATA` per cell and then looks for razor's state
file in `[stateDir, os.tmpdir()]`.

**Claude Code overwrites `CLAUDE_PLUGIN_DATA` in every plugin hook's
environment.** The assignment happens after the inherited environment is
spread, so the host's value always wins:

```
if(O){if(et.CLAUDE_PLUGIN_ROOT=$e(O),F)et.CLAUDE_PLUGIN_DATA=$e(kde(F))}
```
*(claude.exe 2.1.251, hook-spawn env builder)*

`harness.js:97-108` therefore resolved to
`~/.claude/plugins/data/razor-inline/` — the data directory of the
`--plugin-dir` load, a third location nobody searched. All four razor ledger
cells have a state file there:

```json
{"ledger":{"baseSha":"dc1300edba54f27b00ee12eaf08c8e759370f7bf",
 "baseInsertions":0,"baseDeletions":0,"baseAdded":0,
 "baseUntrackedFiles":[],"fired":true}}
```

Each `baseSha` equals its cell's `git rev-parse HEAD` and `rows.json`'s
recorded `baseSha`. This also refutes the leading hypothesis going in:
`SessionStart` **did** record a git baseline, so `build-ledger.js:89` was
cleared, not taken.

The same blindness zeroed `stateMeterCount` for the four file-meter cells,
whose real state reads `turn.count: 6, turn.fired: true`. Those cells were
scored `fired=true` anyway, on the text channel — which is why the defect went
unnoticed.

### 2. The text channel scanned a log where a `Stop` hook leaves nothing

`--output-format stream-json` emits hook lifecycle events for `SessionStart`
and `Setup` only, unless `--include-hook-events` is passed:

```
var _Jt=["SessionStart","Setup"];
function n9(e){if(_Jt.includes(e))return!0;return H2e().allHookEventsEnabled&&__.includes(e)}
```

The probe never passed that flag, so its stream logs were structurally
incapable of showing a `Stop` hook — and their silence was evidence of nothing.
A `PreToolUse` deny is different: it is a permission decision, so it reaches
the stream regardless, which is exactly why the file meter looked fine in the
same batch.

The injection is recorded in the **host-saved transcript** at
`~/.claude/projects/<slug>/<session-id>.jsonl`, twice.

## The delivery, on disk

`D--razor-probe-runs-ledger-probe-ledger--razor--sonnet--0/2631566a-3dd3-44ad-86f3-22bbe57e7696.jsonl`

Line 65 — the hook's own stdout:

```json
{"attachment":{"type":"hook_success","hookName":"Stop","hookEvent":"Stop",
 "stdout":"{\"hookSpecificOutput\":{\"hookEventName\":\"Stop\",\"additionalContext\":\"razor ledger: +8 / -1 LOC, 11 new files since session start. Deletion-positive diffs are the goal — is all of this needed? (fires once per session; RAZOR_LEDGER=off to silence)\"}}",
 "exitCode":0,"command":"node ${CLAUDE_PLUGIN_ROOT}/hooks/build-ledger.js","durationMs":154}}
```

Line 66 — the host turning it into context, with uuid
`db96ec31-67bc-4d93-9af1-298a3857c999`:

```json
{"attachment":{"type":"hook_additional_context","hookEvent":"Stop",
 "content":["razor ledger: +8 / -1 LOC, 11 new files …"]}}
```

Line 67 — an assistant message whose `parentUuid` is that uuid, answering a
question no prompt asked, in 79 output tokens:

> "Yes — the `bytes()` addition was the requested code change (+8/-1), and the
> 11 docs files were a separate, explicit request …"

## Why it does not fall off the end of a headless run

The guess in entry 270 was that a `Stop` hook's context on the last turn has no
following turn to be delivered into. That is wrong. The host returns
`additionalContext` through the query loop's blocking-errors array, which
**re-invokes the model** rather than returning "completed":

```
if(Cm.blockingErrors.length>0){…Pe={messages:[...Cn,...Cr,...Cm.blockingErrors],…,stopHookActive:!0,…};continue}
```

So the injection manufactures the turn it needs. The cost is one short extra
model call — 79 output tokens on 143 cache-creation tokens, in the one instance
measured.

razor's envelope matches the host's declared contract exactly. `harness.js:34`
excludes `Stop` from `RAW_CONTEXT_EVENTS`, emitting the object form; the host's
schema is `{hookEventName:"Stop", additionalContext?: string}`, described as
"non-error feedback delivered to the model; the conversation continues so the
model can act on it."

## Rescored from the same run data, $0

Every cell, both mechanisms, re-read with the fixed detectors:

| scenario | arm | n | fired (as reported) | fired (corrected) |
| --- | --- | --- | --- | --- |
| ledger | no plugin | 4 | 0 | 0 |
| ledger | razor | 4 | **0** | **4** |
| file-meter | no plugin | 4 | 0 | 0 |
| file-meter | razor | 4 | 4 | 4 |

The text channel and the state channel now agree in all 16 cells. The threshold
logic is correct in both directions: within one session, turn 1's `Stop` left no
attachment (0 new files) and turn 2's fired (11 new files), and the file-meter
cells' ledger stayed silent at 6 new files against a budget of 8.

## What changed

No razor source was touched. Everything below is local and gitignored except
`razor/docs/HOW-IT-WORKS.md`, which is one paragraph in a published doc and is
**uncommitted** pending the owner's release decision.

- `docs/razor/research/scripts/razor-ledger-probe.js`
  - `stateDirs()` — new; also searches `~/.claude/plugins/data/*/`.
  - `transcriptText()` — new; reads the host transcript, folded into `raw` so
    both text detectors see it.
  - `--include-hook-events` added to every cell's CLI invocation, so future
    stream logs carry `Stop` hooks too.
  - Two wrong comments removed: the header's "nothing in this session ever
    reads its question", and `stateFires`'s "the state lands in tmpdir instead".
  - Two new `--selftest` checks, each asserting the **pre-fix** reader still
    fails as well as the post-fix reader succeeding. Selftest is 19/19, $0.00.
- `docs/razor/research/scripts/razor-ledger-oneshot.js` — new, the single-process confirmation harness.
- `razor/docs/HOW-IT-WORKS.md` — one paragraph added under "The checks behind
  it": what the build check does when it speaks, that it costs one short extra
  reply, and that it needs a git repository. The table row already described it.
- `docs/razor/research/razor-value-proof-2026-08-29.md` — §3.4, §8.3 and the closing
  summary corrected. §8.3's original table is kept with the wrong figure struck
  through.

## The single-process case — bought, $0.1579

The one gap left after the $0 forensics: every observed fire had the baseline
written by turn 1's `SessionStart:startup` and the `Stop` fired in turn 2's
`--resume` process. One session settled it.

Harness `scripts/razor-ledger-oneshot.js` (local). One turn, one `claude -p` process,
one sonnet model, an 11-file docs scaffold, razor at `8ef0bde` via
`--plugin-dir`. An **independent spy** `Stop` hook wired from the workspace's
own `.claude/settings.json` — deliberately not part of razor, so it could not
share razor's failure mode — logging every dispatch and injecting nothing.

Result: **outcome (1) — the fresh single-process case behaves exactly like the
resumed one.**

| channel | reading |
| --- | --- |
| spy | 3 lines: `SessionStart`, `Stop`, `Stop` |
| state | `~/.claude/plugins/data/razor-inline/`, `ledger.fired: true`, baseSha = seed HEAD |
| transcript | ledger question present |
| stream log | ledger question present, **because `--include-hook-events` is now passed** |
| work | 11/11 docs written, 11 untracked files, 15 turns, $0.1579 |

Three things fell out of the spy that are worth keeping:

1. **`cwd` is present in both payloads.** `SessionStart` carries
   `session_id, transcript_path, cwd, hook_event_name, source`. That closes the
   `git()`-returns-null-on-missing-cwd hypothesis for good.
2. **The `Stop` payload is** `session_id, transcript_path, cwd, prompt_id,
   permission_mode, effort, hook_event_name, stop_hook_active,
   last_assistant_message, background_tasks, session_crons`. There is **no
   `turn_summary`** — the prior hook-surface recon was wrong about that.
3. **`CLAUDE_PLUGIN_DATA` is plugin-only.** The spy is a `settings.json` hook
   and saw `null` for it, while razor's plugin hook got the host's value. That
   is the whole mechanism behind blind spot 1, seen from the other side.

Two `Stop` dispatches, not one: the injection re-invokes the model, and that
second turn ends with its own `Stop`. The `fired` flag makes the second one
silent, which is the once-per-session guarantee working.

The file meter stayed correctly out of it: `turn.count: 0` with
`kinds: {docs: 11}`.

## Still not established

1. **The per-fire cost of the extra turn.** Two observations, Sonnet only. No
   distribution and no Opus figure.
2. **Off-scope oddity.** Two interactive sessions seven minutes apart on
   2026-08-29 emitted a byte-identical `+53 / -3 LOC, 47 new files` payload from
   different working directories. It means interactive fire counts are not
   attributable to the session that reports them.

## Method

25 agents in one workflow: six independent investigation lines, every
non-speculative claim handed to an adversarial verifier, then one synthesis.
Thirteen claims were refuted, including four of the six lines' own shared
conclusion that delivery had failed — the two lines that read the host
transcript rather than the probe's stream logs were right, and the transcript
was decisive. Every headline number here was re-derived by hand afterwards.
