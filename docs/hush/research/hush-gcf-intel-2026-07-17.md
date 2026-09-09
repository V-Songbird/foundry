# hush × GCF intel — what the wire-format project can teach the harness-level compressor

> **Status 2026-08-18 — HISTORICAL, targets deleted.** Read this for the mining
> method and the rival-truth ledger only. No proposal in this file is actionable:
> hush 1.0.0 (roadmap entries 210–214) deleted the surfaces the recommendations
> aim at — the MCP-exec and cross-turn-delta paths in `compress-tool-output.js`,
> the `/hush:stats` dashboard, the `hush-compress` skill, and the Draft surface.
> A dated record's value is that it says what was believed on its date; nothing
> below has been edited to hide that. The current account of hush's open work is
> `hush-consolidation-2026-08-18.md`.

Date: 2026-07-17. Source clone: `D:\Projects\Knowledge\gcf` (blackwell-systems/gcf, MIT).
Hush baseline: 0.7.0-alpha, `hush/hooks/compress-tool-output.js` (261 tests).
Status: analysis only — no code changed. This file is gitignored (`.gitignore:14 docs/`);
the reference project's name must never leave this layer (house rule).

---

## 1. What GCF is, and where it overlaps hush

GCF is a **token-optimized wire format** for structured data: field names declared once in a
header, pipe-separated positional rows, local IDs for graph edges, plus two multi-turn layers —
session deduplication (bare `@N` references to previously transmitted symbols) and delta
encoding (send only the diff vs a hashed base snapshot). Claimed 50–92% token savings vs JSON
per payload, compounding to ~94% over a 10-call session (README.md:29, 152–158;
docs/guide/sessions.md:13–19).

It operates at a **different layer** than hush. GCF is a producer-side format: the tool (or an
MCP proxy wrapping it) emits GCF instead of JSON. Hush is a consumer-side rewriter: a
PostToolUse hook that shrinks whatever arrived. The overlap is exactly one surface — **hush's
MCP JSON table-ification** (`compress-tool-output.js:354–481`), which already does a
GCF-shaped thing: factor a homogeneous record array into a header + rows, split constant
columns out (`renderMcpTable`, :422–441). Everything transferable clusters around that surface
plus two ideas hush doesn't have yet: nested-object flattening and cross-turn delta.

Their evidence base is large but self-published marketing-grade (2,500+ evals, 43 tokenizers,
self-run comprehension studies). Per the razor-benchmark-audit lesson: use their *mechanism*
findings (vocab dumps are dictionary facts, reproducible), distrust their *comparative accuracy*
numbers until re-measured on our own tasks.

---

## 2. Findings — ranked by expected token value for hush

### F1. Nested-object flattening (`parent>child` path columns) — highest-confidence upgrade

**What they do.** When every row of a tabular array carries the same fixed-shape nested object
(all-scalar leaves, same keys), promote the leaves to path columns: `start: {dateTime, timeZone}`
becomes columns `"start>dateTime"`, `"start>timeZone"`, values inline in the row. Irregular
shapes keep a fallback attachment mechanism (README.md:139; eval/FLATTEN-RESEARCH.md:9–14).

**Measured (theirs).** 20–48% fewer tokens on nested API data, savings growing with nesting
depth — Jira −48.8%, Stripe −39.0%, K8s pods −36.7% vs their own non-flat encoding; 10/10
API shapes won (FLATTEN-RESEARCH.md:63–88). Comprehension: 100% on every proprietary frontier
model across 5 providers, zero regression; open-weight models regress 8–23%
(FLATTEN-RESEARCH.md:405–409). Hush only ever runs under Claude Code → frontier-only → the
open-weight regression is irrelevant to us.

**Where hush stands.** `tableCell()` (compress-tool-output.js:411–416) renders any nested
object cell as `JSON.stringify(v)` — the full brace-quote-colon overhead survives in every row,
i.e. hush currently pays exactly the cost GCF's flatten research quantifies. MCP diagnostics
payloads (the `get_file_problems` family in `MCP_TABLE_RE`, :357–358) are precisely the
"uniform nested shape per row" case: each record tends to carry a fixed `{line, column}` or
`range`/`severity` sub-object.

**How to apply.** In `mcpTableCandidate`/`renderMcpTable`:
1. After the existing key-overlap gate (:400–408), test each object-valued column: if every
   record's value is a plain object with an identical all-scalar key set, replace the column
   with `col>leaf` columns; else keep the `JSON.stringify` cell (their `^` fallback analog).
2. Depth 1 only to start (their data says depth ≥2 is where the big wins are, but our payloads
   are shallow; measure first).
3. Constant-column factoring (:436) then applies to flattened leaves too — `severity=WARNING`
   as a constant leaf column is a realistic extra win on diagnostics payloads.
4. Separator: `>` — their strongest cross-model result (0% BPE merge rate on 43 tokenizers,
   wins or ties comprehension everywhere, decisively wins generation; FLATTEN-RESEARCH.md:17–37,
   421–433). Note their own variance saga (F8c) before trusting any single-run separator claim.

**Gate.** Same probe discipline as Probe 7: re-run the 6,739-tool_result corpus measurement
with flattening on, ship only if the median savings over the existing table renderer clears a
threshold. Keep the `rejected-not-smaller` gate (:470–475) — flatten can lose on shallow data.

### F2. Cross-turn delta encoding — highest ceiling, highest risk

**What they do.** Session layer: symbols already transmitted become 2-token bare references
(`@7  # previously transmitted`) because "the LLM already has @7 in its context window"
(sessions.md:44–50, 89). Delta layer: against a content-hashed base snapshot, send only
`removed`/`added` sections (SESSION-DELTA-INTEROPERABILITY.md:161–224). Measured stack on
500-symbol payloads: format alone 63.8% → +17.1pp session dedup → +7.5pp delta = 88.3% vs
JSON (sessions.md:13–18).

**The hush analog.** Re-run loops: the same test suite / build / lint command fires 3–10× per
session, and today each fire re-enters context nearly whole (hush's `dedupeConsecutive` :62–75
and `collapseTemplates` :112–150 are intra-output only). The analog of a bare reference is:

> `[hush hook: output matches the previous run of this command except the 7 lines below]`
> + only the changed lines (with the same SIGNAL_RE guarantees).

Mechanically: a per-session state file (same pattern as the narration meter / debug manifest,
:770–773) keyed by hash of the cleaned command string, storing the previous cleaned output's
line hashes; on re-fire, LCS-free set/positional diff; emit delta only when far smaller.

**Why their own docs say to be careful — and how each risk maps to hush:**

| Their rule | Their ref | Hush mapping |
|---|---|---|
| Bare ref valid only if the declaration was delivered *and still resolvable* | SESSION-DELTA-INTEROPERABILITY.md:79–83, 94–111 | The referent is a prior tool result **in context**. Compaction destroys it → `postcompact-rearm.js` must also invalidate the delta state file, or the model gets "same as before" pointing at nothing. |
| Delta only when substantially smaller, else full payload | SESSION-DELTA-INTEROPERABILITY.md:216–217 | Hush already has this reflex (`rejected-not-smaller`, :472). Reuse verbatim. |
| Recovery path when consumer lost context | SESSION-DELTA-INTEROPERABILITY.md:105–108 | Hush already ships one: the sidecar (:673–703). A delta marker can carry the sidecar path of the full previous output — self-healing pointer. |
| Periodic full retransmit if accuracy degrades with depth | SESSION-DEDUP-EVAL-DESIGN.md:124–125 | Cap delta chains (e.g. every 3rd re-run goes out full). |

**Their eval is the template for ours.** Their session-dedup eval design measures bare-ref
resolution accuracy at increasing session depth, with explicit success criteria (within 5pp of
full retransmission, ≥90% resolution through call 3) and failure criteria — and even their
projected results show dedup at 93% vs 100% full-retransmit (SESSION-DEDUP-EVAL-DESIGN.md:52–62,
105–112). That 7pp gap is the honest cost of referencing instead of restating. Hush's version is
cheaper to validate than theirs: a "did the model correctly report the test outcome from a
delta'd re-run" harness fits the existing .benchmarks multi-turn machinery (`prompts[]` +
`--continue` already exist).

**Prompt-cache note (in hush's favor).** A delta rewrite only shrinks the *new* turn; all prior
turns are untouched, so Anthropic prompt-cache prefixes stay valid. Every subsequent API call in
the session then re-sends the small delta instead of the big output — the savings compound
exactly the way GCF's session curve compounds (sessions.md:19).

**Verdict.** Do not build from their spec — build the **probe**: mine local transcripts (Probe-7
style) for how often a session re-runs a command whose cleaned output is ≥N% line-identical to
the previous run. If real sessions rarely re-run, the whole feature is YAGNI regardless of how
good the ceiling looks. The probe is a day; the feature is a week.

### F3. Shape-based eligibility, not name-based — widen the table path

**What they do.** GCF encodes *any* homogeneous record array; there is no tool allowlist. Their
premise is that the win is structural, wherever the shape appears (README.md:73–95).

**Where hush stands.** The table path fires only on a hardcoded MCP method-suffix regex
(`MCP_TABLE_RE`, :357–358) grown from one machine's probe corpus, and **never on shell output**.
But `gh api`, `npm ls --json`, `jq`, `az`/`aws` CLI output are the same homogeneous-JSON-array
shape arriving through Bash/PowerShell — hush cleans them (:723–744) but never table-ifies them.

**How to apply.** In the string/object response path (:925–965): if the cleaned text parses as
JSON and `mcpTableCandidate` passes (both functions already exported and shape-only, :388–409),
render the table before falling through to line caps. Zero new detection code — the gates
(≥2KB, ≥5 records, ≥80% key overlap, not-smaller rejection) already encode the safety story.
Risk: a model that intends to re-emit the JSON byte-exact — same tradeoff already accepted on
the MCP path, and shell JSON can always be re-run; note it and move on.

**Gate.** Extend the probe to shell transcripts: count Bash tool_results that would pass
`mcpTableCandidate`. If the hit rate is trivial, skip (the MCP allowlist stays as-is — its
methods were chosen because they actually occur ≥20× in the corpus, :350–353).

### F4. Token-measured validation, char-measured runtime

**What they do.** Every benchmark counts real tokens with per-model tokenizer libraries
(`@lenml/tokenizer-claude`, `js-tiktoken` — package.json deps), because char count and token
count diverge in ways that flip conclusions: JSON's punctuation is heavily pre-merged in BPE
vocabularies (`":"` is one token on 42/43 tokenizers; tokenizer-analysis.md:808–815), so JSON
is *cheaper per character* than plain text — a rewrite that wins on chars can shrink less (or
lose) on tokens.

**Where hush stands.** The runtime gate is chars (`rendered.length >= text.length`, :472) and
Probe 7's 27.9% median was a **char** measurement (:347–350). Fine as a runtime proxy (fast,
zero-dep — a tokenizer dependency in the hook is a razor violation). Not fine as the only
evidence layer.

**How to apply.** Benchmark-side only: add a token counter (dev-dependency, `.scratch/` or
`hush/scripts/`) and re-express the table/flatten/delta savings in Claude-tokenizer tokens.
One-time calibration of the char→token proxy; if the ratio is stable across payload types, the
runtime char gate stays untouched with a documented safety margin.

### F5. Delimiter audit — checked, no action (and the proof it doesn't matter much)

Their most striking mechanism finding: tab is the single worst delimiter on OpenAI tokenizers
(GPT-4 cl100k has **1,173** tab+letter merged vocabulary entries, GPT-4o 1,036 — dictionary
facts from vocab dumps, tokenizer-analysis.md:621–644, 753). Hush's table renderer joins cells
with `\t` (:438). **But the same vocab table shows Claude's tokenizer has 0 tab+letter and 0
pipe+letter entries** (:625) — on the only model hush runs under, tab is clean. No change.

The deeper takeaway is their **grammar-swap experiment**: replacing every delimiter in the
format moved savings by ≤0.4pp across 800 measurements (tokenizer-analysis.md:495–549). The
compression comes from *structure* (names declared once, positional values), not characters.
Hush's constant-column + header factoring is already the structural half; delimiter tuning is
YAGNI. Revisit only if hush ever targets non-Claude harnesses.

### F6. Turn-level savings stats — cheap UX/marketing lift

Their Claude Code plugin ships a Stop-hook notification ("12 tool calls rewritten, 68% fewer
tokens") reading a stats JSON written on each rewrite, plus a `/stats` skill
(docs/guide/claude-code.md:14–19, 39–47). Hush already writes richer data — the
`HUSH_DEBUG=1` manifest logs bytesIn/bytesOut/action per decision (:764–791) — but it's opt-in
and user-invisible. A `/hush:stats` skill (read manifest, sum by action, report) surfaces the
value hush already creates. Zero token cost, small build. Decide separately whether an
always-on stats write is worth the I/O; the manifest's fail-open pattern (:787–790) transfers.

### F7. Null/absent micro-markers — note only

GCF distinguishes null (`-`) from absent (`~`) and auto-quotes colliding literals
(README.md:138–141). Hush's `tableCell` maps undefined→`""` and null→`"null"` (:412–415).
Lossless for reading purposes, and record counts are small enough that the token delta is
noise. Skip unless the flatten probe shows sparse nested payloads where `null` strings repeat
hundreds of times.

---

## 3. Methodology imports (worth stealing regardless of features)

- **a. Budget-solvability framing.** Fixed token budget, variable data: at 16K tokens their
  format fit 338 orders and passed while JSON fit 178 and the answer was *literally absent from
  context* (FLATTEN-RESEARCH.md:437–453). Hush's equivalent claim — "with hush, the session
  answers correctly N turns longer before compaction" — is a stronger, honest marketing number
  than %-saved, and `pressureScale` (:524–532) is already the mechanism that story hangs on.
- **b. Primer rejection = our priming lesson, independently replicated.** A 30-token
  format-explainer helped tiny models ~+8% and *hurt* mid/large models ~−8%; they rejected it
  (FLATTEN-RESEARCH.md:455–466). Third-party confirmation of the prompt-wording house rule:
  extra explanation is noise for models that can infer — keep hush's markers declarative and
  minimal (the `omittedMarker`/NOTE_TEXT design, :164–187, 826–830, is already on the right
  side of this).
- **c. Variance discipline, cautionary tale.** They concluded a deterministic separator
  regression from 3/3 single-arm failures, then overturned it with same-session head-to-heads
  (FLATTEN-RESEARCH.md:194–242, runs 5–10). Matches the razor n=2→n=4 lesson exactly: only
  same-batch paired arms count. Their runs 1–4 vs 5–12 sequence is a good teaching artifact
  for the .benchmarks README.
- **d. Adversarial-surface exhaustiveness.** Their "dump every vocab entry starting with `|`"
  move (tokenizer-analysis.md:714–755) turns a statistical claim into a dictionary fact. When
  hush next argues "marker X can't collide with Y", prefer an exhaustive scan of the finite
  surface over sampling.

---

## 4. What NOT to import, and why

- **The wire format itself.** Hush rewrites arbitrary outputs the model may need byte-exact
  (source files, configs). Hush's path-shaped discipline (isLogPath/isGeneratedPath, :491–515)
  exists precisely to avoid re-encoding anything editable; a general GCF re-encode of tool
  output would break that contract. The table path is the one place re-rendering is safe, and
  hush already owns it.
- **The MCP proxy architecture.** Wrapping servers (`gcf-proxy`) requires per-server config
  mutation and a Python dependency chain — the opposite of hush's zero-setup PostToolUse
  positioning, for the same payloads hush already intercepts in-process.
- **Graph profile / local IDs (`@N`).** No graph-shaped surface in hush's domain; edges and
  distance groups have no analog in shell/log output. YAGNI.
- **Bare-reference session dedup as literal syntax.** Producer-side `@N` refs need a
  producer/consumer state contract hush can't hold alone at the hook layer; their own interop
  doc is 327 lines of the machinery required to make it safe. The delta variant (F2) captures
  most of the value with a model-visible full-recovery path.
- **Their comprehension percentages as ship evidence.** Self-published, and their own logs show
  single-session haiku variance flipping conclusions (F8c). Hush ships on hush's evals only.

---

## 5. Recommended sequence (all gated, no commitments)

1. **Probe A (flatten):** re-run the MCP corpus measurement with depth-1 flattening +
   constant-leaf factoring; ship F1 if median savings over current renderer ≥ threshold.
2. **Probe B (repeat-run):** mine transcripts for same-command re-runs with ≥N% identical
   cleaned lines; decides F2 (delta) and sizes its ceiling honestly.
3. **Probe C (shell JSON):** count Bash/PowerShell results passing `mcpTableCandidate`;
   decides F3 with a one-line integration if it pays.
4. **F4 token calibration** rides whichever probe runs first (same corpus, one extra column).
5. **F6 stats skill** is independent, cheap, and can ship any time.

Fixed reference points if any of this becomes roadmap entries: hush
`hooks/compress-tool-output.js` at 0.7.0-alpha (submodule 00716af); GCF clone at
`D:\Projects\Knowledge\gcf` (SPEC v3.4.1, README.md:181).
