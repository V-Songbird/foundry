# hush + razor repo-mining sweep — 10 new repos, ranked against all prior intel

> **Status 2026-08-18 — HISTORICAL for razor.** Both razor items this sweep lists as pending have
> shipped, and the third, parked behind a goal run, was covered by `../../razor/research/razor-goal-run-2026-07-18.md`.
> **HISTORICAL for hush too, checked 2026-08-18:** T6 (cross-turn delta) and T7
> (flatten + shell-JSON tables) both target engine paths deleted from
> `compress-tool-output.js` by hush 1.0.0 (roadmap entry 212), so neither is
> actionable. Read the hush half for the mining method and the rival ledger only.
> The current account of hush's open work is `../../hush/research/hush-consolidation-2026-08-18.md`.

Date: 2026-07-17. Clones: `D:\Projects\Knowledge\hush - razor\` (10 shallow clones, this sweep)
plus the 9 prior clones under `D:\Projects\Knowledge\`. Mining executed by 5 parallel Explore
agents (2 repos each); every claim below carries the agent-verified file:line refs. Status:
analysis only — no plugin code changed. Gitignored layer; competitor names never leave it.

Baselines: hush 0.7.0-alpha (261 tests), razor 0.4.2-alpha (179 tests).

---

## 1. The ten new repos — one-paragraph verdicts

| # | Repo (dir) | License (LICENSE file read) | One-line verdict |
|---|---|---|---|
| 1 | `squeez` (Rust, 7-host hook compressor) | **Apache-2.0** | The serious hush rival. Same `updatedToolOutput` + char-gate + fail-open philosophy, plus shipped cross-call dedup, reversible retrieve blobs, self-teaching protocol. 560 tests. |
| 2 | `token-optimizer` (alexgreensh, Python) | **PolyForm-NC** → clean-room only | The reimplementation blueprint for delta-on-re-read + the most honest measurement culture seen anywhere (measured vs estimated never summed). |
| 3 | `context-mode` (mksglu, MCP sandbox) | **Elastic-2.0** (not open source) | Routing, not shrinking: savings depend on the model choosing sandbox tools; "98%" is a self-defined bytes-diverted ratio (`analytics.ts:444-449`). Fake enterprise logos. |
| 4 | `claude-context-optimizer` (CCO) | MIT | Waste-observability plugin; 10 real detector categories but every headline number is chars÷ratio heuristic; ROI hardcodes a 35% baseline with no data (`roi.js:93-95`). |
| 5 | `ccusage` (Rust core) | MIT | The reference implementation for token accounting from transcript `usage` fields — copyable (MIT) aggregation, dedup, pricing, 5-hour blocks. |
| 6 | `claude-rolling-context` (proxy) | MIT | Cautionary artifact: retroactive history edits (cache-breaking each injection turn), zero tests, dead e2e harness, forwards Claude auth headers to user-set summarizer URLs. |
| 7 | `claude-hooks` (decider) | MIT | "Comprehensive clean code enforcement" = 4 naive heuristic checks + vaporware docs; author's own note admits hooks weren't firing (`proof-hooks-not-running.md:1-40`). |
| 8 | `claude-code-hooks-mastery` (disler) | **NO LICENSE** → reference only | Best public catalog of hook surfaces (14 events); several stale claims; no enforcement. |
| 9 | `andrej-karpathy-skills` | MIT-by-assertion (no LICENSE file) | Razor's biggest prompt-only rival: ~90k stars, 4 principles, **zero enforcement**. A marketing masterclass and a benchmark arm waiting to happen. |
| 10 | `knip` (webpro-nl) | ISC | The resolution authority for dead deps; settles the `/razor:unused` design question decisively (defer, don't clone). |

Claim-vs-code casualties this sweep (for the competitor-truth ledger): context-mode's
"self-learning 3-stage compression pipeline" has zero implementing code (grep-verified);
squeez's "AST extraction" is line-prefix matching (`fs.rs:131-228` vs the protocol's claim at
`protocol.rs:46`) and "zero runtime deps" hides a hard python3 hook dependency
(`pretooluse.sh:11`); rolling-context's e2e suite references a nonexistent `test/` dir;
claude-hooks documents magic-number/complexity/duplication detection that does not exist;
CCO's `globalStats.estimatedTokensSaved` field actually accumulates *waste*
(`tracker.js:406-408`).

---

## 2. What the sweep changes — the big convergences

**C1. Cross-turn dedup/delta is now the most corroborated unbuilt hush feature.** Before this
sweep it was one analogy (gcf's session dedup, different layer). Now THREE shipped
implementations exist at hush's own layer:

- **squeez cross-call dedup** — exact FNV-1a-64 hash+length plus fuzzy trigram-MinHash
  Jaccard≥0.85 with 0.80 length-ratio guard (`context/redundancy.rs:24-60`,
  `context/cache.rs:467-530`), persisted in `~/.claude/squeez/sessions/context.json` written
  atomically, marker cites the exact prior call (`[squeez: identical to bash#N — output
  omitted]`, `wrap.rs:261-273`). Correctness guards worth copying verbatim as *design*:
  fuzzy dedup suppressed after the file was Written/Edited (`compress_output.rs:110-124`);
  MCP results exact-dedup-only, never fuzzy (`:129-139`).
- **token-optimizer delta-on-re-read** — deny the re-Read, return a unified diff:
  keyed on resolved-path × session/agent (`read_cache.py:1073-1074`), cached content ≤50KB
  credential-redacted, `difflib.unified_diff(n=1)` with a >2000-line skip guard and a
  1500-char diff cap (`delta_diff.py:17-102`), invalidated by Edit/Write hooks
  (`read_cache.py:1689-1720`) and cleared wholesale at PreCompact, 3-denial escape hatch
  (`read_cache.py:406-456`). Only 6 delta events in their own 30-day benchmark
  (`BENCHMARK.md:56`) — honest evidence the trigger is RARE.
- **gcf session dedup/delta** (prior report) — the producer-side formalization, with the
  recovery rules (invalidate on context loss, full-retransmit fallback, "delta only when
  substantially smaller").

**Counter-evidence stays live:** RDXmin's SHA-256 same-output cache found 0 hits in its own
replay corpus, and hush's 0.3.7 duplicate-tool-work guard was refuted. But those tested
*exact whole-output* recurrence; the new blueprints target *re-run commands whose output is
mostly-identical* (fuzzy) and *re-read files that changed slightly* (diff) — different, wider
triggers. **Probe B from the gcf report remains the gate and now has a sharper question:**
measure, on local transcripts, (a) same-command re-runs with ≥N% line overlap (squeez's
case), (b) re-Reads of files whose content changed (token-optimizer's case), separately.
If either shows real volume, build that half only. hush's implementation would be
PostToolUse-side rewrite (normal successful result), avoiding token-optimizer's deny-loop
friction — their own 3-strike escape hatch is the admission the deny channel fights the
model. token-optimizer is PolyForm-NC: reimplement from the design facts above, never from
its code.

**C2. Usage-field token accounting is unanimous and now has copyable MIT code.** Four
independent tools (clauditor, CCO, ccusage, squeez) read transcript `message.usage` rather
than trusting byte sizes. ccusage (MIT) supplies the exact machinery to port:
`contextTokens = input + cache_read + cache_creation` per assistant record; message-id +
request-id dedup with sidechain preference rules (`adapter/claude/mod.rs:240-298`);
per-key accumulators with per-model breakdowns (`summary.rs:39-130`); 5-hour floor-to-hour
billing blocks (`blocks.rs:17-71`); LiteLLM+models.dev pricing with offline snapshots
(`pricing.rs:241-277`). This upgrades three prior candidates at once — clauditor L1
(pressure signal), gcf F4 (token-measured gates), and the /hush:stats idea — from
"design sketch" to "port this shape." CCO contributes the honesty pattern: report savings
NET of the hook's own injected overhead (`dashboard.js:90-96`).

**C3. Razor's market position just got a measurable face.** andrej-karpathy-skills is ~90k
stars of *pure prompt* — byte-for-byte razor's "prompt-only rival" thesis, at maximum fame.
Its CLAUDE.md clauses overlap razor's rungs 6-7 (「No abstractions for single-use code」,
「No error handling for impossible scenarios」, CLAUDE.md L21-25) with zero mechanical
enforcement anywhere in the repo (agent-verified: no hooks, no scripts). Racing it as a
benchmark arm in razor's existing harness would produce the single most legible marketing
number available: razor vs the most-starred alternative on dep-discipline and LOC.
Wording caution from its own text: L25 "If you write 200 lines and it could be 50, rewrite
it" is scenario-describing (primes the 200-line path) — the exact failure mode
prompt-wording-lessons documents; borrow only imperative-negative clauses, never its worked
anti-pattern EXAMPLES.md.

**C4. `/razor:unused` has its verdict.** knip resolves usage through oxc AST + resolver,
unbash script parsing, per-manager binary resolvers, ~150 framework plugins, and installed-
manifest metadata (peer/bin/types) — `DependencyDeputy.ts:197-361`, `manifest/index.ts:12-62`.
Razor's grep provably mishandles: binaries in scripts, config-only deps (eslint/babel),
true `@types` pairing (razor blanket-suppresses the class), and peer-satisfied deps —
the last one produces false "unused" in razor's most-defended direction. Reimplementing
means importing oxc — razor denying razor. **Verdict (b): keep the zero-dep grep for the
high-confidence bucket, detect knip in the target project, and defer everything ambiguous
to it by name as the escalation path.** ISC license, JS/TS-only — razor's exact overlap.

**C5. The deny-channel lessons keep replicating.** claude-hooks and hooks-mastery both ship
unattributed "BLOCKED:" messages, threat escalation ("🚨 YOU WILL BE BLOCKED at session
end"), and loop-forcing imperatives ("Do not stop until…") — the anti-patterns razor's
0.3.6 deny-wording work already corrected. token-optimizer's 3-denial escape hatch and
context-mode's Codex adapter (deny with NO reason channel, README:673) show what happens
without that discipline. No action; razor's current wording is the correction — keep it.

---

## 3. Consolidated ranking — new finds vs all prior finds

Everything actionable from all 19 mined repos (9 prior + 10 new), ranked by
expected-value ÷ effort, with corroboration count. "Probe" = must pass a measurement gate
before any build.

### Tier 1 — build-grade (probe-gated where marked)

| R | Opportunity | Plugin | Origin + corroboration | Status |
|---|---|---|---|---|
| 1 | **Cross-turn dedup/delta** (re-run commands + re-read files) | hush | gcf F2 + squeez + token-optimizer (3 shipped impls) vs RDXmin/0.3.7 null results | **Probe B decides**; blueprints in §2-C1 |
| 2 | **Usage-based pressure + /hush:stats + token-measured benchmark gates** | hush | clauditor L1/L2 + ccusage (portable MIT code) + CCO + squeez | Probe A (corpus scan) sizes it; port targets in §2-C2 |
| 3 | **Razor benchmark arm vs the 90k-star prompt-only rival** | razor | new (karpathy-skills); extends existing 3-arm harness | Needs user-approved batch (ask-before-batches rule) |
| 4 | **/razor:unused → knip escalation** | razor | new (knip); fixes known false-positive classes | No probe needed; small skill edit |
| 5 | **MCP nested-flatten (`parent>child`) + shell-JSON table eligibility** | hush | gcf F1/F3 + token-optimizer's independent tabular compressor with its ≥40%-smaller gate (`archive_result.py:660-711`) | Probe A' (MCP corpus re-run) |

### Tier 2 — cheap, opportunistic

| R | Opportunity | Plugin | Origin | Note |
|---|---|---|---|---|
| 6 | **Sidecar hardening: secrets-guard before write + symlink/TOCTOU** | hush | squeez `retrieve.rs:29-50` (guard-before-stash) + RDXmin's flagged-but-unfixed 2026-07-13 gap | Security debt; do regardless of probes |
| 7 | **Cache-degradation one-shot warning** | hush | clauditor L3 + CCO cache-break detector (`parseEconomicsFromLines:56-87`) | Probe incidence first (bugs may be fixed upstream) |
| 8 | **hush-compress framing: CLAUDE.md ×turns cost math + unused-MCP-server audit** | hush | clauditor L5 + CCO `overhead.js:210-299` (configured-vs-called MCP cross-ref, prints `claude mcp remove`) | Docs + one small skill extension |
| 9 | **Handoff-quality scorer for PreCompact STATIC_BLOCK** | hush | clauditor L4 (fact-coverage scorer) | Dev-time harness, first hard number on the PreCompact wager |
| 10 | **Razor README positioning moves** | razor | karpathy-skills: authority anchor, problem→solution table, "how to know it's working", disarming tradeoff note | Wording only; keep house voice + no competitor naming |

### Tier 3 — note-only / watchlist

- Ladder wording candidates from karpathy (§2-C3): assumption-surfacing, "every changed line
  traces to the request" — A/B-gated, priming-aware; park until the next razor `/goal` run.
- squeez's real-token estimator (`tokens.rs:28-67`, per-content-class divisors) — better than
  chars/4 if hush ever needs runtime token numbers; benchmark-side ccusage approach wins for now.
- hooks-mastery's PermissionRequest `decision{behavior,updatedInput,interrupt}` surface —
  razor's internals audit already ruled updatedInput a YAGNI refusal; re-check only if the
  deny/retry conflict ever resurfaces.
- rolling-context's cache-cheap summarization trick (clone session request shape, cache
  breakpoint on last message, `compressor.py:330-424`) — clever, proxy-layer, out of reach.

### Discards — with grounds (the brainstorm's "not really helpful" pile)

| Discard | Ground |
|---|---|
| Skeleton/sig-mode for source reads (squeez, token-optimizer) | Violates hush's byte-exact-edit contract (isLogPath/isGeneratedPath discipline). Competitor evidence agrees: token-optimizer needed a 3-denial escape hatch, demoted markdown skeletons after dropping load-bearing prose (`read_cache.py:132-137`), and shipped Agent-result skeletons measure-only after a 39.1% harm proxy. |
| Bash input-rewrite wrapping (squeez `wrap`) | Re-executes commands in its own shell — env/cwd divergence from the real Bash tool (`wrap.rs:18-31`). hush rewrites output, never input. |
| Retroactive history compression (rolling-context) | Breaks the prompt-cache prefix on every injection turn; headroom's ~25K-LOC REALIGNMENT already taught this; zero tests seal it. |
| Sandbox/MCP routing (context-mode) | Model-dependent savings (zero if not routed), deny-without-reason on some hosts, ELv2 license, self-defined savings denominator. |
| Session-rotation blocking (clauditor) | Hush never blocks; rotation costs ~30 turns warmup by the rival's own math. |
| Package-age dep gate (claude-hooks) | Network call in the PreToolUse hot path; age≠need; razor's manifest gate is the sound version. |
| FTS5 knowledge base (context-mode) | Out of mission for both plugins; codelore territory if anywhere. |
| CCO waste-detector suite wholesale | Advisory sprawl + heuristic tokens; cherry-picked the MCP-server audit (R8) and nothing else. |
| Self-teaching ~2.4KB protocol payload (squeez) | hush's one-shot NOTE_TEXT is the lean, eval-validated version of the same idea; 2.4KB of every session is the cost hush exists to cut. |
| Prior-report items already superseded | gcf F5 delimiter work (structure-not-chars, proven ≤0.4pp), clauditor buggy-version warnings (version-pinned trivia), token-goat symbol-index (PolyForm + our null-dedup evidence). |

---

## 4. Sonnet-deliverable task briefs

Each brief is self-contained for a spawned Sonnet session; foreman craft rules apply. House
constraints binding on ALL tasks: competitor/reference names never in public code, tests,
commits, or docs (blocklist enforced by check-reference-names.js); PolyForm-NC and
no-LICENSE repos are clean-room/reference-only; hooks-mastery code may not be copied at all;
benchmark batches need explicit user approval BEFORE launch; push at task end.

**T1 — Corpus probe script (gates R1, R2, R7; feeds R5).** Read-only mining of local
transcripts in `~/.claude/projects`. One Node script in foundry `.scratch/` (gitignored)
emitting a single JSON+markdown report: (a) same-command re-run incidence and per-pair line
overlap distribution (cleaned outputs; separate exact-identical vs ≥70% overlap);
(b) re-Read incidence of files whose content hash changed between reads; (c) Spearman
correlation of transcript file size vs last-usage context tokens per session;
(d) cache-degradation signature incidence (flat cache_read + growing cache_creation +
ratio<0.5 over 4 turns); (e) count of Bash results that parse as JSON and pass hush's
`mcpTableCandidate` gates. Ground-truth formulas: usage triple per §2-C2; degradation per
clauditor `cache-health.ts:36-46`. Deliverable: `docs/research/hush-probe-corpus-<date>.md`
with go/no-go verdicts per gated item. No plugin code changes.

**T2 — /hush:stats skill.** New hush skill reading the HUSH_DEBUG manifest
(`hush-debug-<session>.jsonl`: tool/bytesIn/bytesOut/action lines) plus transcript usage,
reporting per-action savings NET of hush's own injected marker bytes (CCO honesty pattern).
Port the accumulator shape and message-id dedup rules from ccusage (MIT — attribute in
NOTICE if code is adapted): per-session rollup, per-model breakdown. Decide (and document in
the skill) whether HUSH_DEBUG must be on; do not make the manifest always-on without a
measured I/O cost check. Update README per public-docs rules (no methodology narration).
Tests in hush's existing node --test suite.

**T3 — Sidecar/state-file hardening.** In hush: (a) run a secrets scan (pattern set:
key-prefix classes like sk-/ghp-/AKIA/xox, PEM blocks, Bearer/Basic, connection-string
credentials — clean-room, patterns are facts) over content BEFORE `safeWriteFileSync` writes
a sidecar; on hit, skip the sidecar (fall through to inline cap) rather than redact —
never persist. (b) Close the 2026-07-13 flagged write-path gaps in
`compress-tool-output.js` sidecar write and `narration-meter.js` state write (symlink
refusal exists at some paths; extend O_NOFOLLOW/atomic-rename discipline to all).
Keep fail-open. Full suite green (261+).

**T4 — /razor:unused knip escalation.** Edit razor's skill + `scripts/unused-deps.js`
presentation only (no resolution rewrite): scope the grep verdicts to the high-confidence
"never mentioned anywhere" bucket; detect knip (installed locally or resolvable) in the
target project and, when present, name it as the authoritative escalation for peers,
`@types`, config-only, and script-invoked deps; keep the zero-dep default path when absent.
KNOWN_LIMITS text updated to match. Report-only contract unchanged. Do not add knip as a
dependency of razor itself.

**T5 — Razor vs prompt-only-rival benchmark arm (PROPOSE, do not run).** Add a 4th arm to
razor's existing harness: the rival CLAUDE.md (fetch at run time into the fixture, do not
commit its text — no-competitor-naming rule covers benchmark fixtures in public repos; keep
it in the gitignored harness layer). Draft the batch spec (arms × tasks × reps × est. cost)
covering dep-bait tasks + LOC + correctness on Haiku and Sonnet, then STOP and present for
approval per the ask-before-batches rule. Nothing publishes without a separate go.

**T6 — (gated on T1a/T1b) Cross-turn delta for hush.** Only the half T1 proves: re-run
delta (PostToolUse: per-session state file keyed by cleaned-command hash storing line
hashes + sidecar path of previous cleaned output; emit `[hush hook: output matches the
previous run of this command except the N lines below]` + changed lines, SIGNAL_RE lines
always shown; rejected-not-smaller gate; postcompact-rearm invalidates state; every 3rd
re-run full) and/or re-read delta (same shape for watched Read paths only — logs/generated,
never source). Clean-room; design facts in §2-C1. New tests mirroring hush's existing
harness style; run the sidecar-follow fixture; expect suite >261.

**T7 — (gated on T1e + MCP corpus) Flatten + shell-JSON tables.** Re-run the Probe-7 MCP
corpus measurement with depth-1 `parent>child` flattening + constant-leaf factoring; if
median savings over the current renderer clears 15%, implement in `renderMcpTable`; if T1e
shows real shell-JSON volume, route cleaned JSON-parsable Bash output through
`mcpTableCandidate` before line caps. Keep `rejected-not-smaller`. Benchmark-side token
counting per T2's tokenizer choice.

Suggested order: T1 first (it gates T6/T7 and informs T2), T3+T4 in parallel any time,
T2 after T1, T5 whenever the user wants to spend benchmark budget.

---

## 5. Prior-intel cross-check (what this sweep confirmed or retired)

- gcf F2 (delta) — **upgraded** to R1 with two more shipped implementations and concrete
  state/invalidations design. F1/F3/F4 — confirmed (R5, R2). F5 — stays closed. F6 (stats)
  — merged into R2 with better source material.
- clauditor L1/L2 — confirmed unanimously (R2). L3 — unchanged, probe-gated (R7). L4/L5 —
  unchanged (R9/R8). Its B1-B5 defects now sit alongside this sweep's casualties in §1.
- headroom's "passthrough is sacred" — re-proven by rolling-context's cache breakage.
- RDXmin/0.3.7 null-dedup — still respected; it narrows R1's probe, doesn't veto it.
- token-goat symbol reads — the skeleton discard (§3) retires the last live idea from it.
- caveman/ponytail — no new overlap; their rigor-as-trust lessons already absorbed.

Fixed reference points: hush submodule 00716af, razor 36fda09, foundry parent fe4c692;
clone dates 2026-07-17; agent transcripts under the session tasks directory.
