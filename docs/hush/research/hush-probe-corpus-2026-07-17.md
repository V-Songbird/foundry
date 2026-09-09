# Corpus probe verdicts — ROADMAP 063 / brief T1

**Status:** HISTORICAL — banner added 2026-08-18. Entry 063 is `done` and the one
probe this file left open (the scoped JetBrains probe) was closed DO NOT BUILD in
its own addendum; its target was deleted from the engine in hush 1.0.0 anyway. Read
for the corpus numbers, not for a next step. The current account of hush's open
work is `hush-consolidation-2026-08-18.md`.

Generated 2026-07-17T21:18:14.488Z. Read-only scan of `C:\Users\Songbird\.claude\projects`. Full numbers in the
sibling JSON report (`hush-corpus-probe-results.json` in `.scratch/`, gitignored).

## Corpus

- Total session files on disk: 5758
- Excluded as benchmark-harness (non-independent, cwd under a `benchmarks`/`.benchmarks` dir or the OS temp root): 5071
- Excluded as unreadable: 0
- **Included (organic) sessions measured: 687**
- Sessions with no recoverable `cwd` (kept, not excluded): 4

---

## (a) Same-command re-run incidence — gates ROADMAP 066(a), informs T6 re-run delta

- Shell (Bash/PowerShell) tool calls measured: 12520
- Re-run pairs found (same tool + exact command string, re-run within the same session): **511** (rate 4.1% of all shell calls)
- Overlap distribution on cleaned outputs (stripAnsi + resolveCarriageReturns, hush's own cleaning pass):
  - exact-identical: 95
  - 90-100% line overlap: 9
  - 70-90% line overlap: 39
  - 50-70% line overlap: 61
  - below 50% line overlap: 307
- Share of re-run pairs at exact-identical or >=70% overlap: 28.0%

**Verdict: DO NOT BUILD** (gate: >=20 re-run pairs AND >=30% of them exact-identical or >=70% overlap).
Re-run pair *volume* clears the bar (511 >= 20), but the overlap share (28.0%) falls just under the 30% line — a close call, not a clean null result like RDXmin's 0-hit replay or hush's 0.3.7 refutation. Exact-identical alone is 95 of 511 pairs (18.6%); the bulk of re-run pairs (60.1%) share under half their lines, meaning most same-command re-runs genuinely produce different output. Treat as a soft no for now; re-run this probe after the corpus grows before ruling it out for good.

---

## (b) Re-Read incidence of files whose content changed — gates ROADMAP 066(b), informs T6 re-read delta

Only full-file re-reads (no offset/limit on either side of the pair) are compared — a partial
read at a different offset/limit isn't a valid content comparison. Changed re-reads are further
split by whether the same session Edited/Wrote that exact path in between: T6's re-read-delta
target is explicitly non-source (logs/generated) paths that changed for a reason **outside**
the session's own editing, so an edit-then-verify-read (expected, not a delta candidate) is
counted separately from a genuinely external change.

- Read tool calls with recoverable file content: 3619
- Full-file re-reads of a previously-read path within the same session: **267**
- Of those, content changed since the prior read: 203 (76.0% of re-reads)
  - changed with an Edit/Write/MultiEdit on that path in between (expected, self-caused): 170
  - changed with **no** self-edit seen in between (the external-change signal T6 targets): **33** (12.4% of re-reads)

**Verdict: BUILD candidate** (gate: >=20 externally-changed re-reads).
External-change re-read volume clears the gate — worth sizing the token-optimizer-style diff-delta half of T6.

---

## (c) Transcript file size vs last-usage context tokens — informs ROADMAP 064(c), pressureScale proxy quality

- Sessions with at least one usable `usage` record: 619
- Spearman rho (file size in bytes vs last assistant record's input + cache_read + cache_creation): 0.883

This item has no build/no-build gate of its own — it informs ROADMAP 064(c) (whether to swap
`pressureScale`'s file-size proxy for a real usage-token read).

**Verdict: PROXY HOLDS** Strong positive correlation — file size is a solid free proxy for context pressure; `pressureScale`'s current file-size heuristic is well grounded, low priority to replace with a real usage-token read.

---

## (d) Cache-degradation signature incidence — gates the cache-health candidate (Tier 2, R7)

Operationalized from the mined description (clauditor `cache-health.ts:36-46`; source not
available to us, PolyForm-NC clean-room reference only) as: over a sliding 4-turn
window of assistant `usage` records, flat cache_read (relative range <= 0.15) AND
growing cache_creation (grows by >= 20% end-to-end, no single-step drop > 10%) AND cacheRatio < 0.5. Two independent readings of the ratio condition are reported since the
source didn't specify aggregate-vs-per-turn:

- Sessions with >=4 usage records (eligible): 499
- 4-turn windows examined: 68097
- Windows hitting flat+growing+ratio<0.5 (aggregate-over-window ratio): 45
- Windows hitting flat+growing+ratio<0.5 (every individual turn's ratio): 31
- **Sessions with >=1 hit (aggregate ratio): 21 (4.2% of eligible sessions)**
- Sessions with >=1 hit (per-turn ratio, stricter): 13 (2.6% of eligible sessions)

**Verdict: DO NOT BUILD** (gate: >=10 eligible sessions AND >=5% aggregate-ratio incidence).
The aggregate-ratio incidence (4.2% of 499 eligible sessions) sits just under the chosen 5% line, not near zero — this is a close call, not a clean non-event like razor's 0.3.7/0.3.8 result. 21 real sessions did show the flat-cache_read + growing-cache_creation + sub-0.5-ratio shape. Read as a soft no at this threshold; a slightly lower bar (or a larger corpus) would flip it to a build candidate, so this is worth a second look rather than a closed door.

---

## (e) Bash/PowerShell results parsing as JSON and passing mcpTableCandidate — gates ROADMAP 067(e) / T7

- Shell tool results measured: 12520
- Results >=2KB (mcpTableCandidate's own size floor): 1950
- Of those, JSON-parseable: 100
- Of those, passing the full mcpTableCandidate gate (>=5 homogeneous objects, >=80% key overlap) as reused verbatim from `hush/hooks/compress-tool-output.js`: **9**

**Verdict: DO NOT BUILD** (gate: >=20 passing results, mirroring the scale of the original MCP corpus probe that sized `renderMcpTable`).
Shell-JSON volume passing the full gate is too low on this corpus to justify extending mcpTableCandidate to shell output; most large shell JSON either isn't homogeneous-record-shaped or doesn't clear the 2KB/5-record/80%-key-overlap bar.

---

## Addendum 2026-07-17 (f) — MCP nested-flatten gate — ROADMAP 067 / T7

Re-ran the Probe-7 MCP-table measurement (see `MCP_TABLE_RE` comment in
`hush/hooks/compress-tool-output.js`) with depth-1 `parent>child` flattening + constant-leaf
factoring added on top of the current `renderMcpTable`. Harness: `benchmarks/hush/experiments/output-probes/hush-flatten-probe.js`
(new; reuses `hush-corpus-probe.js`'s transcript-walking + exclusion logic), full results in
`benchmarks/hush/experiments/output-probes/hush-flatten-probe-results.json` (gitignored).

- Organic sessions scanned: 688 (same exclusion rule as the rest of this report)
- MCP tool calls seen on the current `isMcpTableTool` allowlist: 1122
- Eligible payloads (pass `mcpTableCandidate`: >=2KB, >=5 homogeneous records, >=80% key overlap): **298**
- Of those, payloads with **any** depth-1-flattenable column (every record's value at that
  column a plain object with an identical all-scalar key set): **0**
- Median savings of the flattened renderer over the current `renderMcpTable`: **0%**

**Verdict: DO NOT BUILD** (gate: >=20 eligible payloads AND >=15% median savings; eligible count
clears the bar, median savings does not — 0% vs the 15% floor).
The flatten mechanism itself is correct (verified on a synthetic nested payload: `start:
{dateTime, timeZone}` correctly becomes `start>dateTime`/`start>timeZone` columns, with the
constant leaf hoisted same as any other constant column) — the corpus simply doesn't have the
shape it targets. Every real MCP payload measured on this machine (`get_file_problems`,
`search_regex`, and the rest of the `MCP_TABLE_RE` allowlist) is already flat scalar records
(file/line/column/snippet-shaped); none carry a uniform nested sub-object the way the mined
project's Jira/Stripe/K8s API examples do. `renderMcpTable` is unchanged; no code shipped.
