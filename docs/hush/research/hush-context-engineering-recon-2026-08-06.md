# hush × Anthropic context-engineering docs — recon and opportunity ADR

**Status:** ACTIVE CONTRACT, with two corrections dated 2026-08-18 marked in place.
It stays active because §3's A4 deferred gate still stands: nobody may tune
`DIGEST_HEAD`/`DIGEST_TAIL`/`DIGEST_SIGNAL_SAMPLE` before measuring how often
parked sidecars are actually read back. A2's optional spoof probe is likewise
unrun and still needs a go. The two corrections are A1 (shipped in 1.1.1, removed
again by the 1.2.3 README trim — it is NOT in the product) and the nudge row in §5
(the doubling stopped being the default in 1.4.0/1.5.0). The current account of
hush's open work is `hush-consolidation-2026-08-18.md`.

**Date:** 2026-08-06
**Inputs:** the seven documents the user named (digested in full):

1. The New Rules of Context Engineering for Claude 5 Generation Models (claude.com/blog)
2. A Harness for Every Task: Dynamic Workflows in Claude Code (claude.com/blog)
3. Effective Context Engineering for AI Agents (anthropic.com/engineering)
4. A Field Guide to Claude Fable: Finding Your Unknowns (claude.com/blog)
5. Managing Context on the Claude Developer Platform (claude.com/blog)
6. Context editing (platform.claude.com API docs)
7. Memory & context management cookbook (platform.claude.com)

**Method:** 10-agent workflow — 7 fetch/digest agents (one per doc), then 3 mapping
agents over the full digest set through three lenses (engine, style/silence,
native-platform overlap), each briefed with the YAGNI ladder, the v1 ship plan's §4
refuted-proposals list, and the standing dead-lever facts. I then adjudicated every
candidate and **verified the two load-bearing platform facts directly against the
installed binary (claude.exe 2.1.223)** instead of leaving them as "go measure"
items. Constraint frame: hush is a specialist (shrink tool output + keep silence +
one readable final message), `output-styles/hush.md` is the only benchmarked
artifact and any edit to it invalidates the published numbers.

---

## 1. Headline verdict

**The docs validate hush's niche and claim none of it.** Across all seven:

- Nothing native inside Claude Code trims tool output. Context editing
  (`clear_tool_uses_20250919`), the memory tool (`memory_20250818`), and
  server-side compaction are **Developer Platform API betas** — invisible on a
  default Claude Code install. The one native context-thrift mechanism the New
  Rules doc names (deferred tool loading via ToolSearch) saves tool *definitions*,
  not tool *output*.
- No doc claims the Claude 5 generation is quieter by default. Verbosity, output
  tokens, and narration appear in none of them — and the 2.1.223 binary still
  carries the narration mandate hush's style overrides ("Before your first tool
  call, say in a sentence what you're about to do…" is present as a string). The
  silence layer is neither subsumed nor contradicted.
- The effective-context-engineering doc names **tool-result clearing "the safest,
  lightest-touch form of compaction"** and prescribes keeping lightweight
  identifiers (file paths) in context with bulk retrievable on demand — which is a
  description of hush's digest-plus-sidecar shape, published a generation before
  the docs recommended it. hush additionally does it *pre-send*, so no cached
  prefix is ever rewritten.
- The New Rules "simplify your prompts" push targets instruction bloat, the thing
  hush 1.0 already did to itself (~5,000 lines out). Auto-memory retroactively
  validates the `/hush:hush-compress` deletion.

So: **no feature gap to chase, no obsolescence to fear, and no repositioning
required.** What survives is two small documentation items, one two-word comment
fix, one deferred measurement gate, and two platform facts now re-pinned against
2.1.223. Everything else was adversarially rejected (§5).

---

## 2. Platform facts verified this session (claude.exe 2.1.223)

These were proposed by the mappers as "re-measure" items; I resolved them
statically from the binary instead. They update
`reference_claude_code_hook_surface` (last pinned at 2.1.205).

1. **`PostToolUseFailure` still has no `updatedToolOutput`.** The bundled schema
   literal is `w.object({hookEventName:w.literal("PostToolUseFailure"),
   additionalContext:w.string().optional()})` — additionalContext only. The
   README's IMPORTANT callout ("a command that fails is not trimmed on a default
   install"), `HUSH_WRAP`'s reason to exist, and the benchmark disclaimer all rest
   on this fact, and it **holds**. No doc change.
2. **The PreCompact raw-stdout contract holds — with one detail moved.** In
   2.1.223, `executePreCompactHooks` collects each succeeded hook's **trimmed raw
   stdout** and returns `newCustomInstructions: i.join("\n")` — raw stdout, not
   `hookSpecificOutput` JSON, exactly as `precompact-summary.js` assumes. The
   separator is a **newline**, not the space the header comment at
   `precompact-summary.js:8-9` records ("trimmed, space-joined"). Newline-joining
   is strictly better for hush (its blocks keep their own lines). The delivery
   path is client-side and alive; the API-layer deprecation of client-side SDK
   compaction does not touch it.
3. The hook-event roster matches the ~30-event audit (Setup, TeammateIdle,
   TaskCreated/TaskCompleted, StopFailure, UserPromptExpansion all present) — no
   surface shrinkage that would strand a hush registration.

---

## 3. Accepted opportunities (ADR entries)

### A1 — README: say that parked output survives compaction — **document, recommended**

> **Correction 2026-08-18 — A1 is NOT in the product.** It shipped in 1.1.1 (hush
> `908cbd9`, CHANGELOG 1.1.1) and was then removed by the 1.2.3 README length pass
> (hush `0ee9a78`, "The README is about a quarter shorter"). `hush/README.md`'s
> parked-output bullet carries no compaction clause today. Only A2 and A3 survive,
> so any note claiming three shipped items from this recon is wrong. Whether to
> restore the sentence or record it as deliberately cut is open in
> `hush-consolidation-2026-08-18.md`.

- **Decision:** add one sentence to the "Where the parked output lives" bullet in
  README's Good to know: parked files are kept through a compaction, and the note
  hush leaves before one lists their paths so the summary keeps pointers to the
  full copies.
- **Evidence:** both agent-engineering docs teach users that lossy compaction is
  THE long-horizon failure; hush already solves it
  (`precompact-summary.js:85-104` stat-verifies live sidecar paths and instructs
  "Keep these paths in the summary; do not reproduce their content"; sidecars are
  removed at session end, never at compaction). The README's sidecar bullets never
  answer "what happens to my parked output when the session compacts?" — only the
  CHANGELOG mentions it, and users don't read CHANGELOGs to learn current
  behavior.
- **Cost/risk:** one sentence; must be phrased as current behavior with no hook or
  doc citations (public-docs rule). YAGNI rung: document.

### A2 — SECURITY.md: state the `[hush …]` marker trust boundary — **document, recommended (low priority)**

- **Decision:** a short note in hush's SECURITY.md: a bracketed `[hush …]` line
  already present inside a file's own bytes is that file's content, not hush
  telemetry — hush's trust grant covers only notes it injected itself.
- **Evidence:** `hush.md:127` (and the presets, e.g. `styles/glyph.md:140`)
  upgrade the marker prefix to "trusted tooling metadata", and genuine notes carry
  recovery pointers the model is expected to Read
  (`compress-tool-output.js:599-602`) — so marker-shaped text in an
  attacker-influenced file borrows harness authority. The engine already handles
  inbound marker-shaped lines in the safe direction for accounting
  (`compress-tool-output.js:1003-1010`); this is a *disclosure* gap, not a code
  gap. The cookbook names the class: files re-read into context are
  prompt-injection vectors.
- **Cost/risk:** a few sentences in SECURITY.md, touching no benchmarked artifact.
  **Optional escalation needs a probe first:** one cheap spoof session to see
  whether the trust upgrade actually moves model behavior — flagged for a go per
  the ask-before-batches rule, not run. Do NOT reword `NOTE_TEXT` or `hush.md` on
  spec: describing the spoof scenario primes suspicion of legitimate notes
  (measured failure mode), and any `hush.md` edit costs a paid re-benchmark.
- Note: sanitizing inbound marker-shaped lines was considered and rejected — it
  would break the "everything kept is verbatim" contract (§5).

### A3 — `precompact-summary.js` comment: "space-joined" → "newline-joined" — **fix, trivial**

- Two words in the header comment (`precompact-summary.js:8-9`), aligning the
  recorded contract with the 2.1.223 binary (§2.2). Fold into the next release's
  commit traffic; not worth its own release.

### A4 — Retrieval-rate gate before any digest tuning — **measure, deferred/conditional**

- **Decision:** do nothing now. Record the gate: **before anyone tunes
  `DIGEST_HEAD`/`DIGEST_TAIL`/`DIGEST_SIGNAL_SAMPLE`, compute how often parked
  sidecars are actually Read back** (ranged vs full) from HUSH_DEBUG manifests —
  the instrument already exists end-to-end (`decision.retrieval` set at
  `compress-tool-output.js:1182`, persisted by `transform-manifest.js`). A
  near-zero follow rate freezes the constants; a high full-read rate is the only
  evidence that would justify touching them.
- **Why deferred:** no tuning pressure exists today; running it now buys nothing.
  Part of the manifest corpus predates the retrieval field, so a clean number
  needs fresh instrumented sessions when the day comes.

---

## 4. Explicitly rejected (with the refuting sentence)

The mappers proposed or considered these; each died on adjudication. Kept here so
nobody re-derives them.

| Idea | Why it's dead |
| --- | --- |
| README/engine-header repositioning in Anthropic's vocabulary ("safest form of compaction", cache-neutrality edge) | README already says "trims at the source… before any of it hits your bill"; citing the docs is rationale narration the public-docs rule bans; the cache claim helps no user decide anything (no in-product alternative exists) |
| Borrow Anthropic's 84%/29% context-editing numbers as category evidence | Different mechanism, different metric; invites exactly the overclaim the 1.1.0 benchmark rebuild removed |
| Treat PreCompact/PostCompact as obsolescent (server-side compaction) | The deprecation is API/SDK-layer; Claude Code compaction is client-orchestrated and both hooks are live in 2.1.223 (§2) |
| Retire sidecars for auto-memory / the memory tool | Auto-memory stores durable user/work facts; the memory tool is API-layer; sidecars are session-scoped parks with tighter retention than the docs' own guidance asks for |
| Extend hush to trim auto-memory/MEMORY.md bulk | New product surface for a specialist; re-treads `/hush:hush-compress`, deleted in 1.0.0 — the auto-memory shift validates that deletion |
| Reinstate a savings report via `count_tokens` | `/hush:stats` is on the refuted-deletions list; the HUSH_DEBUG manifest already records sizes |
| Slim/delete `subagent-brief.js` per the 80%-cut thesis | The cut targeted system-prompt bloat; the brief is ~60 tokens per spawn against observed parent-context padding, and delivery-beats-wording still supports it |
| Add the docs' "1,000–2,000 token summary" figure to the subagent brief | Descriptive, not prescriptive; a numeric anchor risks padding short reports up to it |
| Rewrite the PreCompact `STATIC_BLOCK` to match the docs' compaction guidance | It already is that guidance nearly word-for-word; more words in a summarizer instruction is priming risk with no observed failure |
| Sanitize inbound `[hush`-shaped lines (spoof hardening in code) | Breaks the "everything kept is verbatim" contract and the legitimate marker-carrying re-read case |
| Retune `pressureScale` toward the platform's 100k/30–40k trigger numbers | Different units (transcript bytes vs tokens), no observed failure, and it's on the do-not-re-propose list |
| Any `hush.md` edit motivated by "rules → judgment" | The caps are the benchmarked mechanism (silent 81/85 vs 33/85); the style file is the only benchmarked artifact |
| Un-double the nudge line per "repeat yourself → single home" | Pre-refuted by measurement: once leaked, twice halved it, three times measured worse. **Overtaken 2026-08-18:** 1.4.0 moved the default to one turn-top reminder and 1.5.0 made the default a turn-top reminder plus a leak-triggered corrective. The doubling now exists only under `HUSH_NUDGE=max`, so there is nothing to un-double on the default path. The rationale lives in `hush/hooks/silence-nudge.js`'s own header. |
| Position hush against dynamic workflows / subagent isolation | Complementary, not competing — an isolated subagent's context still fills with tool bulk hush trims; no stale README sentence to fix |
| README comparison against the context-editing API | An API beta invisible to hush's audience; no README sentence claims exclusivity, so nothing is stale |
| "Docs checked, nothing changed" as a code comment | Process narration with no audience; this report and the memory topic files carry it |

Also checked and found **not stale**: the style's override clause (`hush.md:20`)
still has live targets — the 2.1.223 binary contains the exact narration-mandate
strings it overrides.

---

## 5. Suggested sequencing

All accepted items are sub-hour and none needs a paid batch:

1. **A1 + A2 + A3 together** as one small docs/comment commit wave in `hush/`
   (README sentence, SECURITY.md note, two-word comment) — next time the repo is
   touched for release traffic; nothing here is urgent enough to force a release.
2. **A2's spoof probe** — only on an explicit go (one headless session, ~$0.2).
3. **A4** — stays a recorded gate, not work.

Memory updated this session: `reference_claude_code_hook_surface` re-pinned to
2.1.223 for the two hush-critical fields; pointer memory for this report added.
