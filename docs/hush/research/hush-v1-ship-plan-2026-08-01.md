# hush v1 ship plan — 2026-08-01

**Status:** EXECUTED — closed 2026-08-18. Entries 210–217 are all `done` and the
release this plan aimed at shipped as hush 1.0.0 on 2026-08-01; hush is at 1.6.2
today. Nothing below is a live work order: the baseline above, §1's definition of
done, §5's eight per-entry orders and §6's working rules are point-in-time record.
§4 (refuted cuts) and §7 (evidence appendix) are still worth reading, with the two
rows corrected in §4. **The byte-untouched prohibition on `output-styles/hush.md`
is LIFTED** — §4's row and §6 rule 6 no longer bind; see the corrected §4 row.
The current account of hush's open work is `hush-consolidation-2026-08-18.md`.

**Read this before touching hush.** It is the scope contract for the v1 release.
Written after a 14-agent product audit (7 dimension auditors, 7 adversarial
refuters) plus first-party live probes in the auditing session. Every cut below
survived refutation; every refuted cut is listed in §4 so it is not re-litigated.

Baseline at time of writing: hush `HEAD 5760ec3`, 796/796 tests green,
31 commits unreleased over the `0.16.4-alpha` pin in the parent
`.claude-plugin/marketplace.json`. `origin/main` is diverged — reconcile before
any push.

---

## 1. The goal

Ship **hush 1.0.0**: a plug-and-play plugin a user installs and forgets, which
keeps their sessions quiet and their tool output small, with no configuration to
learn.

Everything that does not serve that sentence is out of the product.

### Definition of done — Foreman's, not a new one

This plan is executed through `ROADMAP.jsonl` entries **210–217** at the repo
root. The project's `.foreman/config.json` does not set `requireVerification`,
so it is **`true`** (the default). That gives every entry this lifecycle:

```
planned ──> in_progress ──> awaiting_acceptance ──> done
                                   │
                                   └── user says "not ready" ──> in_progress
```

- `in_progress` — being worked. Partial, blocked, and **verification-failed**
  work all sit here. Work that merely committed is still `in_progress`.
- `awaiting_acceptance` — the implementation is finished **and its checks ran**.
  The only thing missing is the user's yes. It is an **open** status: it does not
  satisfy a dependent, it is never offered as a next pick, and it cannot be
  archived.
- `done` — the user confirmed. Only the user's yes moves an entry here.

**An entry is not done because the session believes it is done.** It is done when
its `Run:`/`Expected:` checks were actually executed, the result was reported,
and the user accepted. A session that closes straight to `done` has broken the
contract.

Every entry below therefore carries a **Verification (REQUIRED)** block in the
Foreman `prompt-template.md` shape: an exact command and an exact expected
signal. From `prompt-template.md`:

> Do NOT claim success without running this. If it fails, fix and re-run — but
> after two failed fix attempts, stop and report what is still failing instead of
> widening the change to make the check pass.

### Roadmap mechanics

- Never `Read`/`Edit` `ROADMAP.jsonl` directly — `hooks/guard-roadmap-edit.js`
  denies it. Everything goes through `node foreman/scripts/roadmap.js`.
- Open an entry: `update-status` to `in_progress`.
- Close an entry: `update-status` to `awaiting_acceptance` with the commit sha,
  and put the findings in `notes` (append-only, the durable home for evidence).
- The user's yes is what writes `done`.

---

## 2. What hush is

The one-sentence identity the code actually earns:

> **hush is a `PostToolUse` hook that shrinks tool output before it reaches the
> context window, plus a forced output style and one reminder hook that keep
> Claude silent until the work is done.**

That product is `hooks/` + `output-styles/hush.md` — about 3,100 lines — and it
is genuinely install-and-forget.

Two facts that should shape every decision in this release:

1. **hush wins where Claude *reads* bulk, and loses where Claude *runs* things.**
   In its own published table it takes every log-reading row and loses all three
   failing-build rows. It is a specialist and the docs should say so plainly.
2. **A failing command is not trimmed at all on a default install.** Verified
   live: a 400-line command exiting 3 came back whole, and no `PostToolUse` hook
   fired. Confirmed against the shipped binary's own hook schema —
   `PostToolUseFailure` accepts `additionalContext` only, with no
   `updatedToolOutput`. `hooks/preserve-exit-code.js` is the only workaround and
   it is gated to `bypassPermissions` or `HUSH_WRAP=1`. The benchmark harness
   sets `HUSH_WRAP: '1'` (then `benchmarks/runner/run.js:229`; the harness moved
   out of the plugin in entry 214 and the line is now
   `benchmarks/hush/runner/run.js:225`), so **the published
   numbers were produced on a configuration a default install does not get.**
   This is a platform limit, not a bug to fix — it gets disclosed, not hidden.

---

## 3. Scope

### In: eight entries

| Entry | Title | Removes |
|---|---|---|
| 210 | Remove the Draft surface | ~950 lines, 1 command |
| 211 | Remove the stats dashboard | ~940 lines, 1 command |
| 212 | Remove dead engine paths | ~420 lines |
| 213 | Remove the narration meter | ~470 lines |
| 214 | Move benchmarks and the readiness gate out | ~1,650 lines, ~30 MB |
| 215 | Collapse the settings surface | docs + 4 constants |
| 216 | Rewrite the public docs to one surface | docs only |
| 217 | Release 1.0.0 | — |

Net: about **5,000 lines and 30 MB out**, two of four slash commands gone.

### Out of scope, by the user's explicit decision

**The Voices surface stays.** `/hush:pick-style`, `/hush:craft-style`,
`styles/*.md`, `scripts/{activate,list,verify}-style.js` and their tests are
**not** to be touched by this release. The user finds them valuable for users.
The audit's recommendation to cut them is overruled and closed.

One known liability to *document*, not fix, in entry 216:
`scripts/activate-style.js:116` writes the plugin's own installed
`output-styles/hush.md`. A `/plugin update` overwrites it and hands the slot back
to stock. The code already detects this (`restoredOverTakeover`) and warns, so no
user work is lost — but a user who picked Pirate is quietly back on stock after
an update. Say so in the README. Do not redesign activation in this release.

---

## 4. Do NOT cut these — already refuted

An adversarial pass killed these proposals. Each is listed with the reason, so a
later session does not spend the budget again.

| Proposal | Verdict | Why it stays |
|---|---|---|
| `hooks/preserve-exit-code.js` | **KEEP** | It is the *only* mechanism that lets a failing command be trimmed at all. `PostToolUseFailure` has no `updatedToolOutput`. Cutting it removes the capability outright, it does not "fall back to sniffing". |
| The doubled line in `silence-nudge.js` | **KEEP** — **CORRECTED 2026-08-18: no longer the default** | The measurement stands (once left a residual leak, twice halved it, three times measured worse), but since 1.5.0 the default emits no per-tool-result reminder at all: it is one turn-top reminder plus a leak-triggered corrective. The doubling survives only under `HUSH_NUDGE=max`. The line numbers this row cited have drifted; read the nudge-cadence rationale in `hush/hooks/silence-nudge.js`'s own header instead. |
| `hooks/postcompact-rearm.js` | **KEEP** | 94 lines of which ~51 are comment. The executable body is ~43 lines. The proposed "simpler" shape is the current file. |
| `pressureScale` + `FLOOR_PASS`/`FLOOR_FAIL` | **KEEP** | It is an automatic policy, not a user dial. Its README-contradiction claim was a misreading. |
| `requestsEnumeration` | **KEEP** | Removing the carve-out made the one fixture that triggers it 8.4× worse. |
| `output-styles/hush.md` | ~~**KEEP, byte-untouched**~~ **CORRECTED 2026-08-18 — the prohibition is lifted** | The file has been edited twice since: hush `50bda3b` (1.6.0, the reading-ease rewrite) and `00aeb6b` (1.6.2, mermaid out). It is still the only benchmarked artifact, so the rule is now a cost, not a ban: any edit to it needs a re-measured publish batch before the README numbers can stand. Do not read this row as forbidding a style edit. |
| `hooks/lib/transform-manifest.js` | **KEEP** | It looks like telemetry but it is the trust boundary. `recoveryGap`/`sizeGap`/`fieldGap` run on **every** handled output regardless of `HUSH_DEBUG`, and they are what make an inline `[hush …]` marker's promise true. Only `appendRecord` is flag-gated. |
| `scripts/git-hooks/` | **KEEP** | The house reference-name rule's only submodule-side enforcement. |
| **Template collapsing** | **KEEP** | The audit called it net-negative on the four benchmark log fixtures and was **wrong for real sessions**. Measured on realistic tool output in the auditing session: `ls -la` of a large directory 8,962 → 6,408 bytes (**−28%**), 120 repeated "added package" lines 5,299 → 111 bytes (**−98%**), `git log` and file listings pass through untouched. It fired twice during the audit session itself. Do not revisit without evidence from real session output, not log fixtures. |

---

## 5. The entries

Every entry runs against the `hush/` submodule. Run the suite the way CI does:

```bash
cd hush && node --test tests/*.test.js
```

Baseline is **796 pass, 0 fail**. Each entry states its own expected count.

---

### 210 — hush v1: remove the Draft surface

**Why.** `/hush:hush-compress` is a document rewriter. It never runs during a
session, nothing in the hooks consumes it, and it is the opposite of
install-and-forget. It also carries the product's whole secret-file refusal list
and a nine-step human review protocol — real risk surface bought for a
capability outside the goal.

**What.** Delete `skills/hush-compress/`, `scripts/verify-compression.js`,
`scripts/cache-stability-check.js`, `tests/verify_compression.test.js`,
`tests/cache_stability_check.test.js`. Add one user-facing `CHANGELOG.md`
Unreleased line. Leave `README.md` alone — entry 216 owns the doc rewrite.

**Planned touches.** `hush/skills/hush-compress/`,
`hush/scripts/verify-compression.js`, `hush/scripts/cache-stability-check.js`,
`hush/tests/verify_compression.test.js`,
`hush/tests/cache_stability_check.test.js`, `hush/CHANGELOG.md`

**Invariants.**
- `grep -rn "verify-compression\|cache-stability" hush/hooks hush/output-styles`
  returns nothing before and after.
- No file under `hush/hooks/` changes.

**Verification (REQUIRED).**
```
Run: cd hush && node --test tests/*.test.js
Expected: 0 fail. Test count drops from 796 to about 730.
Run: cd hush && grep -rn "hush-compress\|verify-compression\|cache-stability" --include=*.js --include=*.json hooks/ scripts/ skills/ .claude-plugin/
Expected: exit 1, no matches.
```

---

### 211 — hush v1: remove the stats dashboard, keep the trust boundary

**Why.** `/hush:stats` needs `HUSH_DEBUG=1` set *before* the work being measured,
and then tells the user its own numbers are not a savings figure. A
plug-and-forget product does not need a dashboard, least of all one requiring
foresight to enable.

**What.** Delete `skills/hush-stats/`, `scripts/stats.js`,
`tests/stats.test.js`. Add a `CHANGELOG.md` Unreleased line.

**Do not delete `hooks/lib/transform-manifest.js`.** It is the trust boundary,
not telemetry — see §4. Keep `appendRecord` and `HUSH_DEBUG`; the benchmark
harness reads the manifest and `README.md:151` tells users to reproduce the
suite. Keep `tests/hush_debug_manifest.test.js` for whatever survives the
`stats.js` removal.

**Planned touches.** `hush/skills/hush-stats/`, `hush/scripts/stats.js`,
`hush/tests/stats.test.js`, `hush/tests/hush_debug_manifest.test.js`,
`hush/CHANGELOG.md`

**Invariants.**
- `recoveryGap`, `sizeGap` and `fieldGap` still run on every handled output with
  `HUSH_DEBUG` unset.
- `hooks/lib/transform-manifest.js` still exports `appendRecord` and
  `debugManifestPath`.

**Verification (REQUIRED).**
```
Run: cd hush && node --test tests/*.test.js
Expected: 0 fail.
Run: cd hush && node -e "const m=require('./hooks/lib/transform-manifest');console.log(typeof m.recoveryGap, typeof m.sizeGap, typeof m.fieldGap, typeof m.appendRecord)"
Expected: function function function function
```

---

### 212 — hush v1: remove the dead engine paths

**Why.** Two blocks in `hooks/compress-tool-output.js` never fire in any recorded
run and serve inputs a plug-and-play user does not have.

**What — part A, the MCP vendor paths (clean cut).**
Delete `mcpTableCandidate`, `findMcpRecordsArray`, `renderMcpSiblings`,
`renderMcpTable`, `extractMcpText`, `compressMcpTable`, `MCP_EXEC_RE`,
`isMcpExecTool`, `compressMcpExec` and their dispatch at
`compress-tool-output.js:1551-1561`. Shrink the `hooks.json:78` matcher to
`^(Bash|PowerShell|Read|Grep)$`. Drop the `mcp-table`/`mcp-exec` entries from
`hooks/lib/transform-manifest.js`. Remove the matching test describes.

Evidence: 231 lines gated on nine hardcoded JetBrains method names; zero
`mcp-table` and zero `mcp-exec` actions across all 28 benchmark run manifests; no
benchmark fixture exercises MCP; `README.md` never mentions MCP. `CHANGELOG.md`
lines describing the behavior become historical record and stay as they are.

**What — part B, the re-read delta (measure first, then decide).**
Two reviewers disagreed on this one, so it is **not** an unconditional cut.

Measure it first:
1. Confirm `invalidateDeltaPath` is unreachable in production — `hooks.json`'s
   matcher excludes `Edit`/`Write`/`MultiEdit`, so a self-edited file's baseline
   is never invalidated and a re-read of it would be announced as changed.
2. Replay the four benchmark log fixtures through a changed re-read and compare
   the delta view's bytes against the ordinary capped view. `maybeDelta` runs
   *before* `compress`, so a delta can be larger than the view it replaces.

If both hold, delete `DELTA_FORCE_FULL_EVERY`, `deltaStatePath`,
`readDeltaState`, `writeDeltaState`, `invalidateDeltaPath`, `hashLines`,
`changedLineIndexes`, `renderDelta`, `maybeDelta`, the `EDIT_TOOLS` set and its
dispatch, the `delta` action in `transform-manifest.js`, the `deltaPath` line in
`hooks/postcompact-rearm.js`, and the matching tests.

If the replay shows the delta view is genuinely smaller, **keep it** and record
the numbers in the entry's `notes`. Either outcome closes the entry; a "we cut it
because the audit said so" close does not.

**Planned touches.** `hush/hooks/compress-tool-output.js`, `hush/hooks/hooks.json`,
`hush/hooks/lib/transform-manifest.js`, `hush/hooks/postcompact-rearm.js`,
`hush/tests/compress_tool_output.test.js`,
`hush/tests/transform_properties.test.js`,
`hush/tests/postcompact_rearm.test.js`, `hush/CHANGELOG.md`

**Invariants.**
- Template collapsing still fires: a 120-line run of same-shape lines still
  collapses. (See §4 — this is the transform that must survive.)
- The sidecar still fires on output ≥ 15,000 chars.
- A passing command's view is still capped at 60 lines and a failing one at 250.

**Verification (REQUIRED).**
```
Run: cd hush && node --test tests/*.test.js
Expected: 0 fail.
Run: cd hush && node -e "const h=require('./hooks/compress-tool-output.js');const l=Array.from({length:120},(_,i)=>'added package foo-'+i+'@1.'+i+'.0');const o=h.collapseTemplates(l,[]).join('\n');console.log(o.length < 500 ? 'COLLAPSE OK' : 'COLLAPSE BROKEN')"
Expected: COLLAPSE OK
Run: cd hush && node -e "console.log(JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')).hooks.PostToolUse[0].matcher)"
Expected: ^(Bash|PowerShell|Read|Grep)$
```

---

### 213 — hush v1: remove the narration meter

**Why.** `hooks/narration-meter.js` fires when mid-turn narration crosses 120
words. Across the 286 recorded hush-arm benchmark runs exactly one session
exceeded that budget, and that figure is a whole-session total against a
per-turn budget. `silence-nudge.js` already states the rule twice on every tool
result, with a measured ~90% cut. The meter is a third layer on a rule that is
already working.

**What.** Delete `hooks/narration-meter.js`, its `PostToolUse` registration in
`hooks/hooks.json`, `tests/narration_meter.test.js`, and the `meterPath` unlink
in `hooks/postcompact-rearm.js:68` with its assertion. Check whether
`hooks/lib/transcript.js` loses its last consumer of `readTailLines` —
`compress-tool-output.js` uses `lastUserPromptText`, so verify before removing
anything from that lib. Add a `CHANGELOG.md` line. Removes one node process
spawn per tool call.

**Planned touches.** `hush/hooks/narration-meter.js`, `hush/hooks/hooks.json`,
`hush/hooks/postcompact-rearm.js`, `hush/tests/narration_meter.test.js`,
`hush/tests/postcompact_rearm.test.js`, `hush/CHANGELOG.md`

**Invariants.**
- `silence-nudge.js` still emits its line on `UserPromptSubmit` and on every
  `PostToolUse`, and the `PostToolUse` line is still stated twice.
- `hooks/lib/transcript.js` still exports whatever
  `compress-tool-output.js` imports from it.

**Verification (REQUIRED).**
```
Run: cd hush && node --test tests/*.test.js
Expected: 0 fail.
Run: cd hush && node -e "const s=require('./hooks/silence-nudge.js');console.log(s.TOOL === s.STEP + ' ' + s.STEP ? 'DOUBLED OK' : 'DOUBLING LOST')"
Expected: DOUBLED OK
Run: cd hush && node -e "const j=JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8'));console.log(JSON.stringify(j).includes('narration-meter') ? 'STILL WIRED' : 'UNWIRED')"
Expected: UNWIRED
```

---

### 214 — hush v1: move benchmarks and the readiness gate out of the shipped plugin

**Why.** A Claude Code plugin is delivered as the whole repo. `benchmarks/` is
1,918 files and about 30 MB — 28% of tracked bytes — of which
`benchmarks/results/` alone is 1,848 committed per-run JSON records. Nothing
under `hooks/`, `output-styles/`, `skills/`, `styles/` or `.claude-plugin/`
references it. `scripts/readiness-gate.js` is the maintainer's own pre-1.0
checklist with no caller but its own test. A user downloads all of it and can use
none of it.

**What.**
1. **First**, relocate the one fixture the test suite actually needs:
   `benchmarks/fixtures/sidecar-follow/logs/test-output.log` (22,208 B) moves to
   `tests/fixtures/` and `tests/sidecar_follow_fixture.test.js` is repointed.
   Verify no other test reads anything under `benchmarks/`.
2. Move `benchmarks/` and `scripts/readiness-gate.js` to the parent `foundry`
   repo. They travel together — `readiness-gate.js:26-27` and `:252` bind it to
   `benchmarks/runner` and `benchmarks/config.json`.
3. Delete `tests/benchmark_evidence.test.js`, `tests/benchmark_metrics.test.js`
   and `tests/readiness_gate.test.js` from the plugin, or move them alongside the
   harness. They test the marketing pipeline and the harness parser, not the
   product.
4. `README.md`'s "Reproduce it yourself — see benchmarks/" link changes in entry
   216 to point at the new home.

**Planned touches.** `hush/benchmarks/`, `hush/scripts/readiness-gate.js`,
`hush/tests/benchmark_evidence.test.js`, `hush/tests/benchmark_metrics.test.js`,
`hush/tests/readiness_gate.test.js`, `hush/tests/sidecar_follow_fixture.test.js`,
`hush/tests/fixtures/`, `hush/CHANGELOG.md`

**Invariants.**
- No file under `hush/hooks/`, `hush/output-styles/`, `hush/skills/`,
  `hush/styles/` or `hush/.claude-plugin/` references `benchmarks`.
- The published benchmark records still exist somewhere reachable — this is a
  move, not a deletion. Losing them would make every README number unverifiable.

**Verification (REQUIRED).**
```
Run: cd hush && node --test tests/*.test.js
Expected: 0 fail.
Run: cd hush && grep -rn "benchmarks" hooks/ output-styles/ skills/ styles/ .claude-plugin/
Expected: exit 1, no matches.
Run: cd hush && du -sk . --exclude=.git
Expected: under 1,000 KB.
```

---

### 215 — hush v1: collapse the settings surface to two switches

**Why.** `README.md:175` says "There are no compression levels and no profiles.
hush has one policy" — two lines below a table containing
`HUSH_NARRATION_BUDGET=120`, which is a dial. The code reads **26** environment
variables while the README documents seven. That is the exact "complex
configuration" the product promises it does not have.

**What.**
1. **Inline as constants** the four knobs no shipped document mentions and no
   user can be relying on: `HUSH_CAP_ENUMERATE` → `2000`, `HUSH_GREP_MIN` →
   `4000`, `HUSH_GREP_KEEP` → `3`, `HUSH_TEMPLATE_MIN_RUN` → `5`.
2. **Keep working, stop documenting** — `HUSH_CORE`, `HUSH_QUIET`,
   `HUSH_SIDECAR`, `HUSH_DELTA`, `HUSH_NARRATION_BUDGET` and the rest. Do **not**
   delete `hooks/lib/gate.js` or the surface switches: their tests already pin
   the precedence and removing them is a code change where a docs change does the
   whole job.
3. The README table (rewritten in entry 216) keeps exactly two rows:
   `HUSH_DISABLE=1` and `HUSH_DEBUG=1`.

**Planned touches.** `hush/hooks/compress-tool-output.js`, `hush/tests/`,
`hush/CHANGELOG.md`

**Invariants.**
- `HUSH_DISABLE=1` still silences every hook, and it still beats every surface
  and per-hook flag.
- `tests/disable_conformance.test.js` and `tests/surface_conformance.test.js`
  still pass unchanged in substance.

**Verification (REQUIRED).**
```
Run: cd hush && node --test tests/*.test.js
Expected: 0 fail.
Run: cd hush && grep -c "HUSH_CAP_ENUMERATE\|HUSH_GREP_MIN\|HUSH_GREP_KEEP\|HUSH_TEMPLATE_MIN_RUN" hooks/compress-tool-output.js
Expected: 0
```

---

### 216 — hush v1: rewrite the public docs to the one-surface identity

**Why.** The README currently sells four named surfaces — Core, Quiet, Voices,
Draft — for one plugin, in a document whose own line 51 says "No workflow to
learn". Two of those surfaces no longer exist after 210 and 211, and the
`plugin.json` description spends half its 45 words on benchmark methodology,
which the project's own `public-docs.md` rule bans from user-facing copy.

**What.** Follow `.claude/rules/public-docs.md` and
`.github/PLUGIN_README_TEMPLATE.md` throughout. Current behavior only, no
methodology, no history narration, no resolved-issue caveats.

1. **Surfaces.** Two: the trimming and the quiet. Voices stays as the one extra —
   `/hush:pick-style` and `/hush:craft-style` — presented as an optional shelf,
   not a surface. Delete the Draft and stats rows from "What you can do".
2. **The habits table.** Currently five rows; drop the rows for anything 212 and
   213 removed.
3. **Settings.** Two rows, `HUSH_DISABLE=1` and `HUSH_DEBUG=1`. Delete the
   precedence paragraph.
4. **The failing-command disclosure — the important one.** Add a
   `> [!IMPORTANT]` block stating plainly: a command that exits non-zero is not
   trimmed unless the session runs in `bypassPermissions` or sets `HUSH_WRAP=1`,
   because the harness gives a failed tool call no channel to replace its output.
   Say that the benchmark figures were measured with `HUSH_WRAP=1`. This is the
   one place in the release where clarity beats brevity — it is a limitation
   users need in order to read the numbers correctly.
5. **The styles caveat.** One line: a plugin update hands the style slot back to
   stock, so re-pick after updating.
6. **Descriptions.** Replace the 45-word string in **both**
   `hush/.claude-plugin/plugin.json:3` and the parent
   `.claude-plugin/marketplace.json` hush entry. Suggested text, ~34 words:
   > Trims command output, logs, and Claude's play-by-play before they reach your
   > context, so long, noisy sessions cost less. Install and forget — nothing to
   > configure. Short, no-tool questions cost a little more.

   In the parent file **touch only the `description` key** — `sha` and `version`
   are under pre-commit and CI enforcement.
7. **Benchmarks link** repointed to wherever entry 214 put the harness.

**Planned touches.** `hush/README.md`, `hush/.claude-plugin/plugin.json`,
`.claude-plugin/marketplace.json`, `hush/CHANGELOG.md`

**Invariants.**
- Every number in the README still traces to a committed benchmark record.
- No competitor or reference-project name appears outside `README.md`.
- The README describes only current behavior — no "used to" caveats.

**Verification (REQUIRED).**
```
Run: cd hush && node --test tests/*.test.js
Expected: 0 fail.
Run: cd hush && node scripts/git-hooks/check-reference-names.js
Expected: exit 0.
Run: node -e "const a=require('./hush/.claude-plugin/plugin.json').description;const m=require('./.claude-plugin/marketplace.json').plugins.find(p=>p.name==='hush').description;console.log(a===m?'DESCRIPTIONS MATCH':'MISMATCH')"
Expected: DESCRIPTIONS MATCH
```

Then run the `doc-consistency-reviewer` agent over `hush/README.md` and
`hush/CHANGELOG.md` and act on anything it flags.

---

### 217 — hush v1: release 1.0.0

**Why.** Nothing has shipped since the `0.16.4-alpha` pin, and 31 commits sit
unreleased. The whole point of the plan is a finished product.

**What.**
1. Reconcile the diverged `origin/main` before anything else.
2. Roll the `CHANGELOG.md` Unreleased block into a `## 1.0.0 — <date>` section,
   user-facing voice only.
3. Bump `version` to `1.0.0` in the parent `.claude-plugin/marketplace.json` hush
   entry and update its `source.sha` to the release commit.
4. Run the parent repo's release gates: `manifest-curator`, the pre-commit hooks,
   and the full suite.
5. **Stop.** Do not push and do not publish without the user's explicit go, per
   the standing rule.

**Planned touches.** `hush/CHANGELOG.md`, `.claude-plugin/marketplace.json`

**Invariants.**
- The `sha` in the parent manifest resolves to a real commit on `hush`'s
  `main`.
- The suite is green at the exact commit being pinned.

**Verification (REQUIRED).**
```
Run: cd hush && node --test tests/*.test.js
Expected: 0 fail.
Run: git -C hush rev-parse HEAD && node -e "console.log(require('./.claude-plugin/marketplace.json').plugins.find(p=>p.name==='hush').source.sha)"
Expected: the two shas are identical.
```

---

## 6. Working rules for the executing session

1. **Serial, one entry at a time.** Every entry touches `CHANGELOG.md`, so they
   collide deterministically. Do not run them in parallel or in worktrees.
2. **One commit per entry**, on a branch inside the `hush` submodule — not the
   parent. Squash-merge before reporting. Never hand back a list of
   `task n/N:` shas.
3. **Open before working, close after checking.** `update-status` to
   `in_progress` first; `update-status` to `awaiting_acceptance` with the commit
   sha and a findings paragraph in `notes` after the checks ran.
4. **`awaiting_acceptance` is where you stop.** Only the user writes `done`.
5. **Nothing is pushed, published, or released without an explicit go** — that
   includes the parent `marketplace.json` and any benchmark number.
6. ~~**Do not touch `output-styles/hush.md`.**~~ **LIFTED 2026-08-18** — it is
   still the only measured artifact, so an edit costs a re-measured publish batch,
   but it is no longer off limits. 1.6.0 and 1.6.2 both rewrote it.
7. **Do not touch the Voices surface.** The user kept it.
8. If a cut turns out to break something this plan did not anticipate, stop and
   report. Do not widen the change to make a check pass — after two failed fix
   attempts, report what is still failing.

---

## 7. Evidence appendix

Measurements taken first-party during the audit session, reproducible:

| Claim | Method | Result |
|---|---|---|
| Failing commands are not trimmed by default | Ran a 400-line command exiting 3 in a live hush session | Output arrived whole, no `[hush …]` marker, no `PostToolUse` hook fired |
| `PostToolUseFailure` cannot replace output | Byte-scanned the installed `claude.exe` hook-output schema | `E.object({hookEventName:E.literal("PostToolUseFailure"), additionalContext:E.string().optional()})` — no `updatedToolOutput` |
| Benchmarks ran with wrapping on | Read `benchmarks/runner/run.js:229` (path as of 2026-08-01; now `benchmarks/hush/runner/run.js:225`) | `const extra = { HUSH_WRAP: '1' }` |
| `force-for-plugin` only binds inside a plugin | Byte-scanned `claude.exe` | `"has force-for-plugin set, but this option only applies to plugin output styles. Ignoring"` |
| Template collapsing is valuable in real sessions | Ablated `collapseTemplates` over realistic tool output | `ls -la` −28%, repeated install lines −98%, `git log` and file listings unchanged |
| Repo weight | `du -sk` over the working tree | `benchmarks/` 29,964 KB of 30,568 KB total; `benchmarks/results/` alone 29,685 KB across 1,848 files |
| Shipped runtime vs tests | `wc -l` | `hooks/` + `output-styles/` = 3,123 lines; `tests/` = 9,357 lines |
| Suite baseline | `node --test tests/*.test.js` | 796 pass, 0 fail, 7.6s |
