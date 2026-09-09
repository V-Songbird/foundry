# hush × clauditor intel — the session-rotation auditor, read whole

> **Status 2026-08-18 — HISTORICAL, mostly unswept.** Read this for the mining
> method and the rival-truth ledger. L5 is dead: hush 1.0.0 (roadmap entries
> 210–214) removed the `hush-compress` skill it reframes. L1 (`pressureScale`,
> still at `hooks/compress-tool-output.js:679`), L2, L3 and L4 (`STATIC_BLOCK`,
> still at `hooks/precompact-summary.js:31`) all still have live targets and are
> unswept candidates. A dated record's value is that it says what was believed on
> its date; nothing below has been edited to hide that. The call on the survivors
> sits in `hush-consolidation-2026-08-18.md`.

Date: 2026-07-17. Source clone: `D:\Projects\Knowledge\clauditor` (IyadhKhalfallah/clauditor,
MIT, npm `@iyadhk/clauditor` 1.30.0, last commit 2026-04-16 — ~3 months stale vs current
Claude Code). Every hook, feature module, daemon file, install path, and config surface was
read; hub/TUI/CLI-rendering skimmed at the call-site level.
Hush baseline: 0.7.0-alpha. Status: analysis only — no code changed. Gitignored layer
(`.gitignore:14 docs/`); competitor name never leaves it (house rule).

---

## 1. What clauditor is, and where it sits vs hush

A globally-installed npm CLI (not a plugin — it edits `~/.claude/settings.json` directly,
install.ts:73-136) built on one thesis: **conversation history grows linearly, so tokens/turn
grows with session length; detect the waste and force a session rotation**, saving a handoff
file and re-injecting it in the fresh session. Seven hook handlers, a local knowledge layer
(error index, file tracker), a TUI dashboard, and an optional team hub (RAG'd summaries,
shared error fixes).

Layer map: clauditor decides **when to abandon a session**; hush shrinks **what enters the
session**. Their own README places output-compression tools as a compatible different layer
(README.md:250-262). The overlap is thinner than gcf's — but this tool reads the same
transcript JSONL hush does, and several of its *measurements* (not its interventions) are
directly importable.

Trust calibration up front: the codebase is tested (275 tests) and the transcript-parsing
layer is competent, but §2 documents its flagship "compression" being discarded and a shape
assumption that likely disables its headline blocking path on current Claude Code. Import
measurements, not claims.

## 2. Verified-broken / claim-vs-code findings (record before borrowing anything)

### B1. The bash "compression" is computed, then thrown away

`compressBashOutput()` (bash-filter.ts:25-102) builds a genuinely reasonable compressed
version — progress-bar strip, repeat collapse, package-manager summarization, preserve-pattern
head/tail — and returns it in `result.output`. The PostToolUse handler
(post-tool-use.ts:89-107) uses only `result.compressed` and the two length numbers to append
an `additionalContext` NOTE: `"[clauditor]: \`cmd\` output compressed from X to Y."`.
`result.output` is never emitted. `HookDecision` (types.ts:210-214) has **no output-rewrite
channel at all** — no `hookSpecificOutput.updatedToolOutput` anywhere in the repo (grep
confirmed: only hush has that string in this comparison).

Net effect: the model receives the FULL bash output **plus** a false statement that it was
compressed. Tokens are added, none removed, and the injected claim ("output compressed from
59.7k to 2.0k chars") describes text the model can see is not 2.0k chars — injection-shaped
confusion hush's own marker design goes to great lengths to avoid
(compress-tool-output.js:164-187). The module docstring lists "Compress verbose bash output"
as responsibility #1 (post-tool-use.ts:20-30). Same claim-vs-shipped-code class as the
token-goat injection-scanning finding.

### B2. `tool_response` typed as string; current Claude Code sends an object for Bash

`PostToolUseHookInput.tool_response: string` (types.ts:198). On current Claude Code builds,
Bash `tool_response` arrives as a structured object carrying `stdout`/`stderr` — the shape
hush's own hook has handled since day one (compress-tool-output.js:937-946). Walk their code
with an object:

- `toolResponse.length >= 500` → `undefined >= 500` → false → compression branch silently
  never fires (post-tool-use.ts:91) — consistent with B1 never being noticed;
- `detectBashError` → `output.length < 20` false, regex `.test(object)` coerces to
  `"[object Object]"` → never matches (post-tool-use.ts:786-798);
- `toolResponse.includes('error')` at post-tool-use.ts:162 → **TypeError**, which propagates
  out of `processToolResult` to the top-level `.catch` (post-tool-use.ts:846-850) → hook
  outputs `{}` and exits.

That thrown TypeError aborts everything queued *after* the Bash branch in the same handler —
including the session-health check and the **PostToolUse rotation block**, the tool's
headline feature during autonomous work (post-tool-use.ts:299-310, 513-516). The
UserPromptSubmit rotation path (its own file) still works. Lesson, not schadenfreude:
hush's practice of handling both response shapes and testing against captured live hook
input is what prevents exactly this; their 275 tests all feed strings.

### B3. Install/postinstall hook-set mismatch

`clauditor install` registers 6 hooks (install.ts:40-65) — **PreToolUse is missing**, so the
error-index injection (their best knowledge feature) is dead on a fresh install. It only
appears when `postinstall.ts` runs on a later npm upgrade (REQUIRED_HOOKS includes it,
postinstall.ts:18-26). README says "registers 7 hooks" (README.md:94).

### B4. Documented config that nothing reads

README documents `rotation.threshold: 100000` "Tokens/turn average to trigger block"
(README.md:281-285); no code reads it — blocking thresholds come exclusively from
`loadCalibration().wasteThreshold` (user-prompt-submit.ts:78-88, post-tool-use.ts:633-645).
`RotationConfig.tokensPerTurnThreshold` and `writeToClaudeMd` exist only as type/defaults
(types.ts:178-179, 262-263; grep shows zero readers). Dead-config drift — the check-prompt/
manifest-gate class of defect foreman's tooling exists to prevent.

### B5. Performance anti-pattern in a per-tool-call hook

Every PostToolUse fire (30s rate-limit permitting) re-reads and re-parses the ENTIRE
transcript (post-tool-use.ts:344-345), and `extractTurns` runs a nested O(turns×records)
tool-result matching loop that re-filters the record list per tool call
(parser.ts:148-170). `findTranscriptPath` tests file existence by fully READING each
candidate JSONL (post-tool-use.ts:539-541). On a 300-turn transcript this injects real
latency into every tool call. Hush's counter-discipline: one bounded tail-read per fire
(compress-tool-output.js:883-885). Keep it that way.

## 3. What hush can learn — ranked

### L1. Usage-derived context pressure (upgrade `pressureScale`'s proxy)

**Theirs.** Tokens/turn from the transcript's own `usage` records:
`input + output + cache_creation + cache_read` per assistant record; context fullness =
last turn's `input + cache_creation + cache_read` against a model-aware limit (Opus 1M vs
200K, post-tool-use.ts:404-413); model read from the transcript (parser.ts:201-212).

**Hush today.** `pressureScale` uses transcript FILE SIZE as the pressure proxy
(compress-tool-output.js:524-532) — bytes on disk, which count thinking blocks, tool noise,
and JSONL overhead that compaction and caching treat very differently from live context.

**Why import.** The last assistant record's usage triple IS the context size — exact, free,
and sitting in the same file hush already tail-reads for `lastUserPromptText`
(hooks/lib/transcript.js). A tail-read of the last ~50KB finds the final usage record without
parsing the whole file — B5's trap avoided. Tighter caps exactly when auto-compaction is
actually near, no false pressure from a bloated-but-compacted transcript.

**Gate.** Probe: across the local transcript corpus, rank sessions by file size vs by
last-usage context total; if the orderings agree (Spearman high), the proxy is fine and this
is YAGNI — ship nothing. If they diverge on the big sessions, swap the signal (keep the
byte-size fallback for the no-usage-record case).

### L2. Calibrate thresholds from the user's own history (philosophy-aligned)

**Theirs.** `calibrate()` scans past sessions, computes per-session baseline/final/waste, a
break-even model, then sets thresholds from percentiles of the user's own data — falling
back to conservative defaults below n=3, tightening at n≥10 (calibration.ts:72-179). Every
number from the user's data; the one hardcoded value (rotation cost) is documented with its
reasoning (calibration.ts:216-230).

**Hush today.** Pressure tiers are hardcoded guesses: 400KB/1MB, ×0.75/×0.5
(compress-tool-output.js:524-527).

**Why import.** This is the user's design philosophy implemented by a competitor: measured
evidence over prescribed heuristics. A `hush calibrate`-style dev script (not runtime
machinery) could derive the two tier boundaries from the local corpus — where do this user's
sessions actually start degrading? Rides the same corpus scan as L1's probe. Runtime stays a
dumb table read; only the numbers become earned.

### L3. Cache-degradation detection — the biggest token lever in the file

**Theirs.** `cacheRatio = cache_read / (input + cache_read + cache_creation)` per turn
(parser.ts:87); "broken" = flat cache_read + growing cache_creation + ratio < 0.5 over the
last 4 turns (cache-health.ts:36-46); resume-triggered variant keyed off `compact_boundary`
records (resume-detector.ts:16-62); one-shot in-context warning telling the model to advise
`/clear` (post-tool-use.ts:353-365). Grounded in real, cited Claude Code issues.

**Why it matters more than compression.** A broken cache re-processes the whole prefix every
turn — their 10-20x figure. When that fires, one warning is worth more tokens than every
byte hush's compression will ever save in that session. Hush already runs a PostToolUse hook,
already tail-reads the transcript, and already cares about cache stability
(scripts/cache-stability-check.js exists to prove hush itself doesn't break caching —
this would be its runtime sibling watching the *harness's* cache).

**Fit check.** Observe-and-inject, never block — inside hush's lane (the meter injects;
razor blocks). One-shot per session via the existing sentinel pattern
(claimSessionNote, compress-tool-output.js:837-853).

**Gate.** Probe incidence first: scan the local corpus for the degradation signature. If it
never occurs in this user's real sessions (plausible — several cited bugs are fixed
upstream, and this codebase is 3 months stale), the detector guards a non-event: the razor
0.3.7/0.3.8 lesson verbatim — validate against the CURRENT harness, not the bug reports that
inspired the rival.

### L4. Handoff-quality scoring — a free eval for hush's PreCompact wager

**Theirs.** Mechanically extract verifiable facts from the transcript (files modified/read,
commits, key commands, errors hit/fixed, command order — handoff-quality.ts:82-231), then
score any summary by fact coverage, with knowledge-overwriting and order-drift detectors
(handoff-quality.ts:240-409). Their handoffs also *merge* LLM prose with mechanical
extraction because each fails differently (session-state.ts:127-252; README.md:311-324
citing the Size-Fidelity Paradox paper).

**Hush today.** `precompact-summary.js` shapes the summarizer's instructions ("preserve
every path/identifier/decision verbatim, one fact per line", precompact-summary.js:28-32) —
but nothing ever measures whether the resulting summary obeyed. The instruction's value is
currently an article of faith.

**Why import.** Their extractor + coverage scorer is a *benchmark harness for hush's own
STATIC_BLOCK*: extract facts pre-compaction, score the post-compaction summary, A/B with the
block on/off. Turns an unmeasured prompt clause into a measured one — the exact discipline
memory says to apply before trusting any wording clause. Dev-time only; nothing ships in the
hook.

**Cross-plugin.** The merge-both-layers insight and the FAILED_APPROACHES /
WHAT_SURPRISED_ME / GOTCHAS section vocabulary (post-tool-use.ts:689-701) belong to
**foreman**'s handoff-prompt template, whose own 5-arm harness already proved structure
beats vibe — these are two extra sections worth considering there, not in hush.

### L5. CLAUDE.md cost framing — marketing math for hush-compress

`memory-guard.ts` prices a memory file per session: N tokens × every turn as cache reads;
"a 15k-token CLAUDE.md in a 100-message session = 1.5M cache reads just from instructions"
(memory-guard.ts:211-237); flags entries >150 chars as "inline data, not pointers"
(memory-guard.ts:129-164). The hush-compress skill does the fix but sells it per-file
("cut input tokens every session it's loaded" — skills/hush-compress/SKILL.md). The
×turns-per-session framing is the honest, bigger number. README/skill wording import only;
no code.

### L6. Minor patterns worth a line each

- **State-file pruning:** `pruneStaleStateFiles()` caps every state file at 200 session
  entries, run once per SessionStart (shared.ts:78-117). Hush leaves tmp state to OS temp
  cleaning (compress-tool-output.js:834-836 comment) — fine on Windows temp, but the
  bounded-map pattern is the right shape if hush's debug manifest ever grows an index.
- **Noise-gating knowledge capture:** transient/typo errors are filtered *at capture time*
  (`isNoiseError`, error-index.ts:17-54), and confidence decays with a 45-day half-life
  (error-index.ts:30-36) so stale facts fade instead of accumulating. General principle for
  any future hush persistent state: gate at write, decay at read.
- **Outcome feedback on injections:** PreToolUse warning → PostToolUse checks whether the
  command then succeeded → confidence ±0.1/−0.15 (pre-tool-use.ts:39-62,
  post-tool-use.ts:169-202). Closed-loop injection efficacy — same shape as token-goat's
  hint self-suppression; the honest version of "did my note help?".

## 4. What NOT to import

- **Session-rotation blocking.** Hush never blocks — its whole design is rewrite-and-inform;
  deny/block surfaces belong to razor, and the user's stack already
  rejected the intensity-dial school of intervention. Also their own calibration file admits
  rotation costs ~30 turns of baseline warmup (calibration.ts:216-230) — an expensive
  intervention justified only by their linear-growth framing, which prompt caching already
  blunts (cache reads are the cheap 90% of those "170k/turn" numbers; their weighted
  cost model concedes this at quota-burn.ts:50-61 with a 0.1 cache-read weight).
- **The "continue" resume UX and SessionStart re-injection protocol** (session-state.ts,
  user-prompt-submit.ts:231-335, session-start.ts:70-105). Out of hush's mission; and the
  SessionStart injection wording ("⚠️ BEFORE doing ANYTHING else, you MUST show this message
  EXACTLY", session-start.ts:78-84) is the shouting-at-the-model school hush's
  prompt-wording lessons argue against.
- **Loop blocking via Stop** (stop.ts:46-114) — out of hush's scope; hush never blocks.
  Their input+output-hash fingerprint (loop-detector.ts:50-55) is a reasonable mechanism
  note to keep on file, just not for hush. Their rotation-handoff capture heuristic (`msg.includes('burning') &&
  msg.includes('quota')`, stop.ts:130-134) is the false-positive-prone kind of sniffing to
  avoid.
- **Team hub / memory sync.** Out of scope entirely; also note it uploads Claude Code
  auto-memory files to their SaaS (memory-sync.ts:31-82) — scrubbed, opt-in via login, but a
  privacy surface hush should never grow.
- **Skill suggestion from workflow mining** (skill-suggest.ts) — foreman-adjacent at best;
  the injected "ask the user if they want a skill" prompt is chat-noise by hush's standards.
- **Buggy-CC-version warnings** (parser.ts:234-240) — version-pinned trivia that rots; their
  own range already reads as historical.

## 5. Recommended sequence (all probe-gated, matching the gcf report's discipline)

1. **Corpus scan probe** (one script, powers L1+L2+L3): over local transcripts — file-size
   vs usage-derived context correlation; per-session baseline/final token curves; incidence
   of the cache-degradation signature. Three go/no-go answers from one pass.
2. **L4 handoff scorer** as a `.scratch/` harness measuring hush's STATIC_BLOCK — small,
   independent, and produces the first hard number on the PreCompact hook's value.
3. **L5 framing edit** to hush-compress SKILL/README wording whenever docs are next touched.
4. Record B1-B5 in the competitor-truth ledger; if hush ever markets against this category,
   the compression-that-adds-tokens finding is load-bearing and re-verifiable in two file
   reads (post-tool-use.ts:89-107, types.ts:210-214).

Fixed reference points: hush `hooks/compress-tool-output.js` + `hooks/precompact-summary.js`
at 0.7.0-alpha (submodule 00716af); clauditor clone at commit 91e5b0d (2026-04-16).
