# hush × competitor ground-truth — intelligence report + build specs

> **Status 2026-08-18 — Part 4 closed, Part 5 still open.** Read this for the
> mining method and the rival-truth ledger. Specs 1–5 shipped
> (`hooks/precompact-summary.js`, `signalCensus`, `hooks/lib/safe-write.js`,
> `hooks/postcompact-rearm.js`, template collapse in `compress-tool-output.js`);
> Spec 6 is dead, because hush 1.0.0 (roadmap entries 210–214) removed the
> `hush-compress` skill along with the `/hush:stats` dashboard and the Draft
> surface. Probes 8 and 9 are still open and unswept, and so is Probe 7 — though
> its MCP payloads left hush's reach when the PostToolUse matcher narrowed to
> `^(Bash|PowerShell|Read|Grep)$`. A dated record's value is that it says what was
> believed on its date; nothing below has been edited to hide that. The current
> account of hush's open work is `hush-consolidation-2026-08-18.md`.

**Date:** 2026-07-13 · **hush version audited:** 0.5.4-alpha (submodule at `D:\Projects\Personal\SoftwareDevelopment\claude-plugins\hush`) · **Competitor clones:** `D:\Projects\Knowledge\{token-goat, token-optimizer, RDXmin, headroom}`

This document is written to be **directly buildable by a less capable model** (Sonnet/Opus) with no access to the original analysis session. It contains: (0) binding constraints, (1) hush's as-built map, (2) Claude Code platform facts every spec depends on, (3) full ground-truth of the four competitor tools with file:line references, (4) ranked implementation specs, (5) measure-first probes, (6) refused ideas with reasons, (7) licensing/hazards. **Nothing in Part 4 has been approved for building yet — user decision pending.** Do not start implementing without explicit user go.

---

## Part 0 — Binding constraints for any implementer

1. **Repo mechanics:** hush is a git **submodule**. Versions live ONLY in the root `marketplace.json` of the parent repo (`claude-plugins`, marketplace name `foundry`) — bump `version` + `source.sha` **together** there; `plugin.json` has no version field. Pre-commit/CI gates enforce this.
2. **Public docs are user-facing only** (`.claude/rules/public-docs.md`): CHANGELOG lines are terse "Fixed an issue where…"; READMEs describe current behavior; NEVER methodology, history narration, benchmark process, or competitor names. Everything in this report is **private**; none of it may be quoted into README/CHANGELOG.
3. **Never name competitors in published material.** Generic categories only ("the popular 'just be brief' plugin").
4. **Benchmarks:** propose any Haiku/Sonnet batch (arms×tasks×reps + est. cost) and WAIT for user go. Single cheap mechanism probes (n=1 live smoke) are the sanctioned carve-out. Never publish numbers without explicit user approval, even favorable ones.
5. **Licensing:** token-optimizer and token-goat are **PolyForm-Noncommercial-1.0.0** (token-goat's npm `"license": "MIT"` metadata is WRONG; the LICENSE file governs). Ideas and mechanisms are fine; **clean-room reimplementation only** — no copied code, constants, thresholds, or marker wording from those two. RDXmin is genuinely MIT (recipe adaptation fine, still rewrite in hush's idiom). Headroom: treat the same way — port ideas, not code.
6. **Design philosophy (user's):** simplicity; agent autonomy (avoid deny-based mechanisms; hush has never blocked a tool call); evidence-driven (measure before building; dormant correct-by-construction backstops are acceptable); **no intensity dials**; no second-LLM-call designs; zero telemetry; zero network egress; fail-open everywhere (a hush crash must never break a session); non-destructive (hush never mutates user files; hush-compress writes sibling files only).
7. **Cache invariant:** hush never retroactively edits already-sent conversation history. PostToolUse rewrites happen before content enters context — cache-safe by construction. Any future feature must preserve this.
8. **Node:** hooks are plain Node (no deps), tested with `node:test` (158 tests currently). fnm manages node on this machine — shells must self-register PATH (`fnm env --use-on-cd | Out-String | Invoke-Expression` in PowerShell).

---

## Part 1 — hush 0.5.4 as-built map

### Hook wiring (`hush/hooks/hooks.json`)
- **PreToolUse** `^(Bash|PowerShell)$` → `preserve-exit-code.js` (timeout 5)
- **SubagentStart** (no matcher) → `subagent-brief.js` (timeout 5)
- **PostToolUse** `^(Bash|PowerShell|Read)$` → `compress-tool-output.js` (timeout 5)
- **PostToolUse** (no matcher) → `narration-meter.js` (timeout 10)
- No Stop, PreCompact, or PostCompact hooks currently. (Narration meter's Stop mode was **deliberately removed** — commit `e6cb5bc` "Fix narration-meter forcing a stray reply after the final message"; a Stop-time additionalContext can only trigger another model turn. Header comment at `narration-meter.js:13` documents this; `narration-meter.js:133` no-ops on anything but PostToolUse.)

### compress-tool-output.js — the core (anchors verified 2026-07-13)
- `resolveCarriageReturns` (:50) — normalize `\r\n`→`\n` FIRST, then resolve genuine mid-line `\r` progress-bar redraws (the 0.2.3 Windows CRLF-destruction bug lives here; don't touch the normalize-first order).
- `SIGNAL_RE` (:88): `/\b(WARN(?:ING)?|ERR(?:OR)?|FAIL(?:URE|ED)?|DEPRECATED|CRITICAL)\b|\w*(?:Error|Warning)\b/i` — the second alternation catches `ReferenceError`/`TypeError` etc. (0.5.x fix; `\bERROR\b` alone misses them).
- `omittedMarker(n)` (:110): `[hush hook: ${n} lines omitted from this view, none with warnings/errors/failures]`. The long comment block above it (:90-109) is the distilled marker-trust doctrine: state the provable guarantee, name provenance ("hush hook" anchors to the base prompt's own "Hooks may intercept tool calls" line), frame as a view not a mutation, **never argue** ("no 'trust me', no 'not an injection' — naming the feared category primes it").
- `extractRelevanceTokens` (:125): backticked/quoted spans from the turn's real user prompt (≤8 tokens, spans matching >50 lines dropped as non-discriminating).
- `capLines` (:135): signal + relevance lines survive the cap regardless of position; caps 60 pass / 250 fail (`HUSH_CAP_PASS`/`HUSH_CAP_FAIL`); enumeration carve-out passes output uncapped (2000, `HUSH_CAP_ENUMERATE`) when the prompt asks to enumerate EVERY/ALL/EACH of a countable noun.
- `isLogPath` (:280), `isGeneratedPath` (:300): strict path-shaped gates for Read compression (`.log` files / log dirs; lockfiles, `.min.js`, `node_modules/`, `dist/`, etc.) — **hand-written source can never match**; this discipline is load-bearing (Read results feed Edit's verbatim `old_string`).
- `pressureScale` (:316): transcript-size-driven cap scaling (dormant on benchmark-scale sessions; `HUSH_ADAPTIVE=off`).
- Sidecar (:333-449): `SIDECAR_MIN_CHARS` 15000 (`HUSH_SIDECAR_MIN`), `SIDECAR_SHELL_MAX` 28000 (`HUSH_SIDECAR_SHELL_MAX`), `SIDECAR_DIR = os.tmpdir()/hush-sidecar`.
  - `buildSidecarDigest` (:362-413): signal-first — `Signal lines (N total in the file):` with `L<n>:` prefixes (first/last `DIGEST_SIGNAL_SAMPLE` signal lines + relevance hits), then `Structure (head + tail; read the file for the rest):` with `... N lines in the file only ...` gap markers. Signal-first ordering exists because Claude Code shows the rewritten digest of a >29KB output only as a ~2KB preview (see Part 2).
  - `maybeSidecar` (:415-437): gates (`HUSH_SIDECAR=off`, min size, shell guard when `hostMayTruncate` and ≥28KB); writes content-addressed file `<sess8>-<fnv1a>.txt` (:424-426, plain `fs.writeFileSync` — **the write-hardening gap, Spec 3**); header (:428-432) says "saved in full to <path>… Read that file with offset/limit around the L<n> numbers".
  - `isSidecarPath` (:446): Reads OF sidecar files are capped like logs and never re-sidecared; range reads pass untouched.
- Once-per-session provenance note: sentinel file `tmpdir/hush-note-<session_id>` claimed with `flag:"wx"` (:504); the note rides `hookSpecificOutput.additionalContext` on the first rewrite that leaves a `[hush` marker; declarative-mechanism text; `HUSH_NOTE=off`.
- MCP outputs: **not watched** (deliberate; see refusals).

### narration-meter.js
- PostToolUse only; counts mid-turn narration words from a 1MB transcript tail; budget 120 (`HUSH_NARRATION_BUDGET`); fires one corrective `additionalContext` at budget, re-arms per `ceil(budget/4)` of *fresh* narration (growth-based, not a threshold ladder); state file `tmpdir/hush-meter-<session_id>.json` (:110, write at :123 — **hardening gap**); turn boundary = `isRealUserPrompt` from `hooks/lib/transcript.js` (rejects `isMeta`, requires `origin.kind === "human"`); `HUSH_NARRATION=off`.

### preserve-exit-code.js
- Wraps shell commands to preserve exit codes for the compress hook's pass/fail cap decision. **Gated**: only when hook input `permission_mode === "bypassPermissions"` or `HUSH_WRAP=1` — the wrapper (`& { … } 2>&1 | Out-String`) trips Claude Code's PowerShell/Bash static permission analyzers otherwise (full saga: no wrapped form can pass scoped allow rules on either shell; probed exhaustively against cli 2.1.207). Non-bypass sessions lose exit-code preservation; failing commands route to PostToolUseFailure uncompressed (additionalContext-only event; no rewrite possible there).

### subagent-brief.js
- SubagentStart `additionalContext`: ~45-word terse-report brief to ALL subagents (a report is every subagent's product; the output style never reaches sidechains). `HUSH_SUBAGENT=off`.

### output-styles/hush.md
- `force-for-plugin: true`, `keep-coding-instructions: true`. Mid-turn silence (with ✗ examples), rule-4 verdict exception ("a diagnosis that settles the task's central question — state the verdict in one line, then act"; this wording is A/B-calibrated, a past variant exploded thinking 3× — **do not reword without a same-batch A/B on the checkout-bug dual cells**), structured finals (bold outcome lead, one-fact-per-bullet, backticked identifiers), word economy ("selection, not compression"), Register (telemetry line declaring `[hush…]` notes as the plugin's own), Never-compress carve-outs (explicit-request/report — load-bearing, never delete).

### Skill + scripts
- `skills/hush-compress/SKILL.md`: compresses CLAUDE.md/memory files into a **sibling** file (`CLAUDE.hush.md`) — never writes the original (atomicity lesson from a rival's data-loss bug); `scripts/verify-compression.js` mechanically checks headings/code-blocks/URLs/paths/inline-code survive.

### Env gates (complete list)
`HUSH_DISABLE=1` (all), `HUSH_NARRATION=off`, `HUSH_SUBAGENT=off`, `HUSH_NOTE=off`, `HUSH_SIDECAR=off`, `HUSH_ADAPTIVE=off`, `HUSH_WRAP=1`, `HUSH_CAP_PASS`, `HUSH_CAP_FAIL`, `HUSH_CAP_ENUMERATE`, `HUSH_SIDECAR_MIN`, `HUSH_SIDECAR_SHELL_MAX`, `HUSH_NARRATION_BUDGET`.

### Current benchmark standing (private; refresh-sonnet set, 84 runs, Sonnet)
Mean cost −25% vs baseline (brief rival −5%); log-triage −52%, incident-followup (multi-turn sidecar) −42%, pool-leak −21%; noisy-build +11% (Claude-Code-truncation-limited, documented not chased); explain-rerender +18% (Q&A prompt-overhead tax); repo-summary ~flat.

---

## Part 2 — Claude Code platform facts (binary-verified against cli.exe v2.1.205/2.1.207)

These are the facts every spec below depends on. They were established by prior binary archaeology and live probes; treat as ground truth for the current version, re-verify on major Claude Code updates.

1. **Hook events** (~30 in the binary, far more than documented): PreToolUse, PostToolUse, PostToolUseFailure, PostToolBatch, Notification, UserPromptSubmit, UserPromptExpansion, SessionStart, SessionEnd, Stop, StopFailure, SubagentStart, SubagentStop, PreCompact, PostCompact, PermissionRequest, PermissionDenied, Setup, TeammateIdle, TaskCreated, TaskCompleted, Elicitation, ElicitationResult, ConfigChange, WorktreeCreate, WorktreeRemove, InstructionsLoaded, CwdChanged, FileChanged, MessageDisplay.
2. **Rewrite-capable fields per event**: PreToolUse=`updatedInput`/`additionalContext`; PostToolUse=`updatedToolOutput`/`updatedMCPToolOutput`/`additionalContext` (additionalContext + updatedToolOutput allowed TOGETHER by the zod schema); PostToolUseFailure=`additionalContext` only; SubagentStart=`additionalContext`; Stop/SubagentStop=`additionalContext`; MessageDisplay=`displayContent` (display-only, post-billing, zero token effect); UserPromptSubmit=`additionalContext`/`suppressOriginalPrompt` (only with decision=block).
3. **PreCompact is special**: custom summary instructions are built from each hook's **RAW STDOUT** (`l.output.trim()`, joined by space) — NOT a hookSpecificOutput JSON field. The merged text is appended to the summarizer prompt as literal `Additional Instructions: <text>`. The default summary template is a verbose 8-section "continued from a previous conversation" format (lots to trim). The compaction summary REPLACES prior messages and is re-sent on EVERY subsequent call — the one recurring payload PostToolUse can never touch. Manual `/compact` also fires PreCompact (trigger=`manual`) → cheap live validation path.
4. **PostCompact exists**: receives `compact_summary`, can emit `additionalContext` only.
5. **Native large-output persistence**: raw tool outputs >~29KB are persisted by Claude Code itself to `.claude/projects/<session>/tool-results/*.txt`; the model sees `<persisted-output>… Full output saved to: <file>. Preview (first 2KB): …`. Crucially, **PostToolUse hooks receive only a host-truncated ~28KB prefix** of such outputs — the tail (where build errors live) may be gone before hush runs. This is why the shell-sidecar guard exists and why digests must be signal-first and ideally <2KB (the preview window).
6. **MCP tool results**: `tool_response` is a **bare array** of content blocks `[{type:"text",text:…}]`. `updatedToolOutput` replaces MCP results too (takes precedence over `updatedMCPToolOutput`); the replacement must be a plain string or that same bare array — wrapping as `{content:[...]}` throws a harness-side `e.reduce is not a function` error surfaced as a failed tool call.
7. **Hook input fields** (PreToolUse, similar elsewhere): `session_id`, `transcript_path`, `cwd`, `prompt_id`, `permission_mode`, `agent_id`, `agent_type`, `effort`, `tool_use_id`. **No `model` field** — model-conditional behavior is impossible from hooks.
8. **Transcript JSONL schema facts**: genuine human input = `type:"user"` with `origin:{kind:"human"}`; task-notifications = `origin:{kind:"task-notification"}`; ScheduleWakeup = `isMeta:true`, no origin. Subagent transcripts live at `<project>/<session-uuid>/subagents/agent-*.jsonl` (not inline sidechains). Format officially unstable — parse defensively.
9. **Base prompt interactions**: the base system prompt orders the model to flag suspected prompt injection in tool results (this is what makes anonymous bracketed markers dangerous — hush's provenance doctrine exists for this); output styles are system-prompt-level (survive compaction); the harness's own truncation constants (50000/500000) run AFTER PostToolUse rewrites.
10. **Statusline**: statusline stdin JSON carries `cost.total_cost_usd`, context %, and `rate_limits.{five_hour,seven_day}.used_percentage/resets_at` — a zero-token display channel. It is a single user-configured command; plugins cannot append segments non-invasively.
11. **Permission analyzers**: PowerShell commands are statically parsed (AST rules; script-block command names denied as "dynamic expression"); Bash analyzer denies `$?`-style expansions under scoped rules; both run on the POST-rewrite command. This kills any PreToolUse wrapper design outside bypassPermissions (hush already learned this; token-goat/token-optimizer's Bash-rewrite designs would hit the same wall under scoped allow rules).

---

## Part 3 — Competitor ground truth

### 3A. RDXmin (`D:\Projects\Knowledge\RDXmin`, HEAD 6883b8f, v1.2.2, MIT — genuinely)

Multi-tool plugin (Claude Code/Codex/Cursor/Kiro/Windsurf/Gemini/Cline), npm `rdxmin`, zero runtime deps. ~2 weeks old, very actively developed.

**Elision engine** (`hooks\rdx-compress-output.js`, 266 lines; PostToolUse matcher `Bash|Agent|WebFetch|WebSearch|Grep|Glob|mcp__.*`, NOT PowerShell, NOT Read/Edit/Write — their header comment: Read feeds Edit's old_string matching):
- Gate chain (`processPayload` :230-241): mode flag file `<claudeDir>/.rdx-active` (`off` → no-op) → `RDX_COMPRESS=0` → tool allowlist (`SAFE_TOOLS` :51 + any `mcp__*` :61) → `extractText` (:79-97, handles string / block-array / object keys stdout,stderr,output,content,text,result) → dedup → transform.
- **Dedup tier** (:135-160): SHA-256 of the immediately-previous same-tool output only (state `<claudeDir>/.rdx-compress-last.json`, session-scoped, resets on session change); on hit replaces with marker + first-5-lines preview. **Found 0 hits on their own replay corpus** — third independent refutation of output-dedup value.
- **Lossless scrub tier** (:107-126, >1024 chars): ANSI+OSC strip (`/\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g` — hush's ANSI regex does not handle OSC sequences; worth checking), trailing-whitespace strip, `\n{3,}`→`\n\n`, runs of ≥4 identical lines → one copy + `... [rdx: line repeated N×] ...`.
- **Elision tier** (:165-195): mode budgets lite 16000 / full 8000 / ultra 5000 maxChars, head 100/60/40, tail 80/40/30 — the intensity dial is JUST three budget presets, nothing else. Keep head+tail; salvage ≤12 mid-file lines matching `SALVAGE_RE` (:52: error|err!|fail…|exception|traceback|panic|fatal|denied|refused|timed-out|assert|segfault|npe|undefined reference|cannot find|not found|warning, each capped 300 chars); marker `... [rdx: elided N lines — kept first H, last T, and K error-like line(s) below] ...`; single-giant-line fallback keeps maxChars/2 from each end; result kept only if ≥64 chars smaller.
- Stats ledger `.rdx-compress-stats.json` `{savedChars, events}` — feeds their statusline badge.

**File-write hardening — the recipe (Spec 3's source; `hooks\rdx-config.js`)**:
- `safeWriteFlag` (:56-114): mkdir recursive → `lstatSync(dir)`; if dir is a symlink: `realpathSync`, verify directory, then ownership gate — POSIX `realStat.uid === process.getuid()` (:72-76); **Windows fallback = case-insensitive homedir-containment of the resolved real path** (:78-85) → lstat target file, refuse symlink, tolerate only ENOENT (:94-99) → temp `.rdx-active.${pid}.${Date.now()}` in the RESOLVED real dir, open `O_WRONLY | O_CREAT | O_EXCL | (typeof fs.constants.O_NOFOLLOW === 'number' ? O_NOFOLLOW : 0)` mode 0o600 (:101-106; on win32 O_NOFOLLOW degrades to 0 and the lstat checks are the only defense — accepted residual TOCTOU) → `writeSync` + best-effort `fchmodSync(fd,0o600)` (:107-108) → `closeSync` in finally → `renameSync` (:112; MoveFileEx REPLACE_EXISTING semantics on win32). Fail-silent overall, `RDX_DEBUG=1` for diagnostics.
- Hardened READS too (`readFlag` :120-150): lstat-refuse symlink/non-file/size>64B, open `O_RDONLY|O_NOFOLLOW`, 64-byte fixed buffer, content whitelist. Statusline scripts replicate (reparse-point check in .ps1 :13-14 — added only in 1.2.1 after an external bug report; also the Windows crash fix: **`Get-Content -Raw -TotalCount` are mutually exclusive in PowerShell**, throw was swallowed by `SilentlyContinue` — badge silently dead on Windows since launch).
- Rationale for read-hardening: a symlinked flag file would render arbitrary file bytes (e.g. `~/.ssh/id_rsa`) into the terminal every keystroke + terminal-escape injection.
- settings.json writes (`bin\lib\settings.js:71-77`): temp+rename, mode 0600 ("settings often holds tokens").

**Other mechanisms:**
- **SessionStart matcher includes `compact`** — full ruleset re-injected after compaction and `/clear` (their answer to rules being summarized away). Spec 4's inspiration.
- SessionStart npm update check (`rdx-activate.js:39-56`): fetch `registry.npmjs.org/rdxmin/latest`, 1.5s abort, 3-day cache, nags only on major version. (Network egress — hush will not copy.)
- Statusline zero-token dashboard (`rdx-statusline.sh:28-72`): parses statusline stdin `rate_limits` into █/░ bars + reset countdowns; digits-only extraction (escape-injection safe).
- JSONC-tolerant settings merge with Zod-shape pre-validation ("one malformed hook silently discards the WHOLE file"), marker-based idempotent install/uninstall, `.bak` once. Exemplary coexistence.
- Per-turn UserPromptSubmit reinforcement (~40 tokens) of ruleset; natural-language activation with regression-tested false-positive guards ("use rdx to turn off the logger" must not deactivate).
- Versioning footgun to remember: their first commit shipped `"version": "1.0.0"`; resolvers with it cached treat all 0.x as downgrades → they had to leapfrog to 1.1.0; **1.0.0 is burned forever**.

**Benchmark culture (the model for honest numbers):** live 4-arm A/B (vanilla/2 rivals/rdxmin) in hermetic temp CLAUDE_CONFIG_DIR with only credentials, arms differ only by `--append-system-prompt-file`; raw model outputs COMMITTED for third-party audit; deterministic input-axis replay (`benchmarks\replay-compress.js` — feeds every historical tool_result through the exact shipped module; zero LLM). They **retracted "0 backfires"** after a fresh 24-cell run found one (173% on a comparison task), root-caused it, hardened the rule with the measured number baked into prompt text, and re-validated against a 3-trial vanilla mean after discovering their original baseline "was a lucky draw." Old writeups get correction banners, not silent edits. Dedup shipped labeled "0 hits on this corpus… speculative until it earns a number."

**Hazards:** default-on full mode at install; `mcp__.*` wildcard elision can mangle structured JSON other tooling depends on; **direct co-install collision with hush** — both rewrite Bash outputs via `updatedToolOutput` (partial overlap: rdxmin skips PowerShell and Read; hush skips WebFetch/Agent/MCP); no telemetry (verified — only the npm version check).

### 3B. token-optimizer (`D:\Projects\Knowledge\token-optimizer`, v5.11.42, PolyForm-Noncommercial)

Python-stdlib platform; core is a **35,156-line monolith** `skills\token-optimizer\scripts\measure.py`. NOT audit-only — a heavily active hook platform + passive analytics + OS-level daemons. Uses undocumented events PostCompact, CwdChanged, StopFailure. All behavioral analysis parses `~/.claude/projects/**/*.jsonl` directly.

**Active interventions:**
- **PreToolUse Read deny+substitute** (`read_cache.py`, 1,865 lines): denies redundant Reads (`permissionDecision:"deny"`) serving substitutes via the deny reason/additionalContext — (a) AST-derived structure maps of Py/JS/TS (800-2,400 char skeletons, only files >1,000 tok); (b) **delta reads** — caches file content (≤50KB, credential-redacted via 23 patterns) in per-session SQLite, returns a unified diff on changed re-read (:1319-1405); (c) `.contextignore` hard-deny; (d) cohort experiments with a **tripwire that auto-demotes cohorts whose post-substitution edit rates regress** (`evaluate_cohort_tripwire` measure.py:9557); (e) escape hatch — repeat request after a deny passes through (:406).
- **PreToolUse Bash rewrite** (`bash_hook.py` → `bash_compress.py`): whitelisted read-only commands rewritten via `updatedInput` to run under their wrapper, which executes the command itself (subprocess, 60s, 5MB cap) and emits compressed output — ~25 pattern handlers (git status/log/diff, pytest/jest, npm/pip ls, tree, docker/kubectl, builds, stack-frame limiting, generic dedupe+head/tail), credential-line preservation, 10%-minimum-gain gate, tee-raw-on-failure.
- **PostToolUse MCP replacement** (`archive_result.py:894-929`): MCP outputs ≥4,096 chars archived to disk + replaced in-context with typed compressed preview + `[Full result archived… Retrieve with: expand <id>]`; re-expansions are **debited against claimed savings** (`_log_reexpand_debit` measure.py:23850). **Agent/Task results ≥8KB are measured but NOT replaced — replacement failed their harm gate at a measured 39.1% harm proxy** (archive_result.py:853-861). This is independent empirical support for hush's refusal to compress subagent output.
- **PreCompact dynamic instructions** (measure.py:26301-26434): session-aware PRESERVE list (critical decisions verbatim, active errors, files read ≥2×, high-value outputs) + DROP list (one-time reads >200 tok) built from its session store. (Spec 1's convergent evidence.)
- **UserPromptSubmit verbosity-steer** (:32799-32934): tiered conciseness nudges by context fill (gentle 25-74%, strong 75-89%, **suppressed ≥90% to avoid adding tokens**); 3/session, 5-min cooldown; logs an ADMITTED-assumed 10-15%×800-tok saving ("The 10-15% reduction is an ASSUMPTION" in a comment).
- **Context-pressure gating of its own injections** (`context_pressure.py`): every injection carries priority essential/token-saving/informational; ≥75% fill drops informational, ≥90% drops all but essential.
- Checkpoints at fill bands 20/35/50/65/80% + pre-subagent-fanout; SessionStart compact-restore; cross-plugin dedupe protocol via `~/.claude/durable-memory.json` marker / `TO_EXTERNAL_MEMORY` env (suppresses its own continuity when an external memory tool is present).
- **Keep-warm cache pinger** (~2,700 lines): OS-scheduled `claude --resume <sid> -p "Reply with exactly: ok" --max-budget-usd 0.10` to keep the Anthropic prompt-cache warm, with a survival-probability break-even model — **the actual spend path ships disabled** ("LLM-PING KILL").
- **Destructive transcript surgery**: `jsonl trim`/`jsonl dedup` rewrite Claude Code's session files (with .bak). A SessionStart hook installs launchd/systemd/schtasks daemons for a localhost dashboard (port 8080). A growth hook injects "ask the user to star the repo" and runs `gh api PUT /user/starred` on yes.

**Offline detectors** (`scripts\detectors\`, report-only, 7-day/10-session window, findings gated at confidence >0.3 and >5K tok):

| Detector | Signal | Threshold | Savings estimate |
|---|---|---|---|
| retry_churn | same (tool, input[:200]) repeated right after an error result | ≥3 | count×3000 tok, conf 0.8 |
| tool_cascade | consecutive error results | streak ≥4 | streak×2500, conf 0.7 |
| looping | Jaccard word-set similarity of consecutive user msgs >0.75 | streak ≥4 | streak×5000, conf 0.6 |
| overpowered | top-tier model ≥50% tokens + avg output <5K/turn + ≥70% simple tools | — | rate-card arithmetic, conf 0.6 |
| weak_model | Haiku ≥50% + input >100K + ≥10 tool calls | — | advice only |
| bad_decomposition | prompt >800 words with ≥5 imperative verbs | ≥1 | count×8000 |
| wasteful_thinking | thinking > 4× output tokens | ≥4 turns | Σ(thinking−output) |
| output_waste | output/input >3.0 on simple-tool turns; repeated-assistant-msg Jaccard >0.6 | ≥3 | measured excess |
| cache_instability | timestamps/AUTO-GENERATED/volatile @imports in first 60% of CLAUDE.md | >500 tok | chars-after-first-volatile ÷ 4 |

All savings figures are **hardcoded multipliers, not measurements** — the exact ungrounded-prescription pattern hush's philosophy rejects. Real-time variants exist (length-only loop proxy, `systemMessage` nudges with cooldowns).

**Structural audit** (`generate_auto_recommendations` measure.py:6178-6637): MEMORY.md >200 lines (CC loads only first 200); CLAUDE.md aggregate >6K tok; unused skills over 30d; skill descriptions >1,536 chars (truncated by CC!); >30 commands; model-mix flags; broken skill symlinks; duplicate plugin skills from worktrees/node_modules (CC bugs #27721/#27069); rules-dir `paths:` scoping; @imports >500 tok; MCP >2K tok (~15 tok per deferred tool); `includeGitInstructions` (~2K tok); `ENABLE_CLAUDEAI_MCP_SERVERS=false`. Plus a lost-in-the-middle scorer (critical rules whose midpoint falls in the 30-70% file zone = LOW attention) with an auto-rewrite mode, and a MEMORY.md reviewer (orphan links, staleness >180d, duplicate NEVER/ALWAYS rules cross-checked against CLAUDE.md, task leakage).

**Claims vs reality:** "$313/mo measured + $1,877/mo transformation" = one user's self-instrumented 30-day snapshot; "measured" = self-logged assumed counterfactuals (a denied re-read credits the full file as saved). To their credit: measured/estimated/opportunity tiers are never summed (`_get_merged_savings` :31643-31779), the cohort tripwire is real, and the README openly frames output-compressors (hush's category) as "15-25%… Token Optimizer covers the other 75%".

**Verified:** no telemetry (all network is localhost dashboard + documented GitHub checks + the consent-gated star).

### 3C. token-goat (`D:\Projects\Knowledge\token-goat`, v2.6.15, ~41K lines TS, **PolyForm-Noncommercial despite npm saying MIT**)

Tool-agnostic npm CLI; installs by patching settings.json (exemplary: strict parse, `.bak`, marker-idempotent, surgical uninstall preserving foreign hooks). Wires exactly 5 events — PreToolUse, PostToolUse, PreCompact, UserPromptSubmit, SubagentStop — each with a **blanket `matcher: ''`** (a Node process spawns on every tool call; filtering in-process). Also writes a delimited block into `~/.claude/CLAUDE.md` + a skill routing the model to 11 `token-goat` CLI commands.

**Symbol index — the headline, ground-truthed:**
- It is NOT a Read rewrite. The pipeline is: (1) CLAUDE.md/skill instructions tell the model to use `token-goat read "file::symbol"` CLI; (2) **PreToolUse hard-denies Reads** (`decision:"block"`) with the redirect instruction — and often with **replacement content smuggled inside the deny reason** (doc-compact sidecars, `.ipynb` stripped of outputs, markdown heading trees, unified diffs of what changed since the last read); (3) the model then runs the CLI via Bash.
- Deny ladder (`src/hooks_read.ts:454-1006`): unconditional denies for node_modules/lockfiles/.tsbuildinfo/build artifacts; markdown ≥8KB with ≥3 headings → heading tree; re-read dedup (MEMORY.md/.env/session artifacts denied on 2nd read; source files on 3rd; **doc/source re-reads get a unified diff** via 256KB post-read snapshots, `buildLineDiff` max 50 lines :335-386, 775-834); large-file gate 512KB **tightened by heuristic context pressure** (cool 1.0× / warm 0.67× / hot 0.33× / critical 0.18×); honors genuine offset/limit slices by scanning the byte size of the requested window without loading the file (:183-227); Grep exempt.
- Escape-hatch wording appended to denies: a denied Read breaks Edit's read-first precondition, so edits are routed to their own `replace`/`write-file` CLI. (They know the Edit-breaking hazard and route around it with more CLI, rather than not denying.)
- Query surface (`src/read_commands.ts`): `read file::symbol`, `file::Class.method`, `file@10-40`, `section "doc.md::Heading"`, `skeleton`/`outline`, `refs`/`callers`/`call-chain`/`impact`, `semantic "query"` (Xenova/bge-small-en-v1.5, 384-dim, sqlite-vec KNN, BM25 fallback), ~40 more subcommands.
- Storage: ONE **global** SQLite (`%LOCALAPPDATA%\dfk-helper\token-goat\global.db`) for every project on the machine — FTS5 + optional sqlite-vec; tree-sitter grammars as optionalDependencies with regex-adapter fallbacks for ~15 more languages.
- Incremental indexing: no watcher — PostToolUse on Write/Edit appends to a plain-text dirty queue; a **detached daemon** (`worker.ts`, manual `token-goat worker start`, doesn't survive reboot, auto-respawned by the edit hook once running) polls 2s, claims the queue by rename-to-`.draining` (crash-safe, Windows EPERM retry loops, corrupt-quarantine), SHA-gates, reconciles deletions every 30 drains (catches `git mv`/`checkout` which fire no hooks), retry budget 5 persisted per file.
- Stale answer: every read surface prepends `⚠ STALE: index is older than the file on disk` when disk SHA ≠ indexed SHA.

**PreCompact manifest** (`src/hooks_compact.ts` — emitted as top-level `systemMessage`; they found `additionalContext` rejected on PreCompact):
- `## Session context`: Read files (`path (Xkb, N reads[, edited])`), Edited files, Web URLs fetched — 40-row caps; sibling-subagent session blobs merged in so subagent edits survive compaction.
- **`### SAFE_TO_DISCARD (N items — provably inert; each is recallable, not gone)`** (:169-224): superseded identical-command bash re-runs, reads superseded by later edit/re-read, cached bash outputs — each row names the exact `bash-output <id>` recall command. Tells the SUMMARIZER what it can safely drop. ← the most portable idea in the repo (Spec 1).
- The README's fancier adaptive manifest (MUST_PRESERVE / What Worked / pressure-scaled budgets) is **dead code** — reachable only via an inspection CLI, not wired to any hook (their own CHANGELOG says so).

**Other real mechanisms:** Bash rewrite to a compress wrapper via `updatedInput` (130+ per-tool output filters incl. AI CLIs; re-executes under a different shell — Git-Bash on Windows — with own timeout); huge pre-Bash "nanny" deny/hint layer (cat/head/tail/sed → their CLI, find→fd, ls -R→map, repeated-command warnings); content-addressed bash/web/MCP output caches with recall IDs + `--head/--tail/--grep` slicers and cross-cache BM25 `recall`; **MCP output table-ification via genuine `updatedToolOutput`** (≥2KB read-only MCP results: GitHub `*_url`/node_id stripping, homogeneous JSON arrays → header + tab rows + hoisted `constant:` line, applied only if ≥15% smaller, labeled `[token-goat: compressed, full via mcp-output <id>]`); skill-load gating (denies re-loads + >6KB first loads when a compact exists); subagent prompt augmentation (~300-tok briefing appended via PreToolUse rewrite of Agent prompts); SubagentStop hallucination sniff (claims-changes-but-git-clean → console warning only, no block or persistence); **hint-efficacy self-suppression** (`hint_stats.ts`: every discretionary hint logs an emission with a correlator; later tool calls mark it acted-on; a category below `suppress_threshold_pct` auto-suppresses for the session); image shrink (PreToolUse on ≥512KB image Reads; sharp optional; WebP + mozjpeg both, ≤1568px longest edge — Claude Vision optimum; delivered as base64 data-URL in additionalContext — the original Read still proceeds, so the win is questionable on Claude Code); screenshot-redirect deny for MCP screenshot tools lacking a destination path.

**Claims vs reality (the damning list):**
- **Prompt-injection scanning is VAPORWARE in the shipped TS**: README front page claims every fetched page is scanned + fenced; `src/` contains zero scanning code — the `injection` config knob's only consumer is its own serializer. Only the retired Python version had it. README:938 quietly contradicts the front page ("does not filter or sanitize… primary defense is the model's own training").
- Stats accounting: bytes/4 everywhere; a denied re-read credits the ENTIRE file size as saved with zero replacement cost. "1.1 Gt saved" figures are unverifiable (no telemetry exists).
- README documents hooks/allowlists that don't exist: no SessionStart hook (retired), **no `Bash(token-goat:*)` permissions allowlist code anywhere** — so every redirect-to-CLI deny lands the user a Bash permission prompt; the model can get wedged between "Read denied" and "Bash needs approval."
- Undisclosed network: embeddings default ON and `@xenova/transformers` downloads the model from Hugging Face Hub on first index; PreCompact executes any `mem` binary found on PATH (800ms timeout).
- Global unencrypted cross-project store persists file snapshots (up to 256KB/file incl. `.env` if read once), full bash/web/MCP outputs; uninstall never deletes it.

### 3D. headroom (`D:\Projects\Knowledge\headroom`, Rust proxy + retiring Python CCR runtime)

Standalone axum HTTP proxy terminating Anthropic/OpenAI/Bedrock/Vertex wire protocol; Claude Code integration = 2 bootstrap hooks that ensure the proxy runs. Architecturally out of hush's reach as a whole; the portable parts are the classifiers, the trust design, and the post-mortem lessons.

**Live-zone model:** compress ONLY blocks inside the latest `role:"user"` message at/above the customer's `cache_control` frozen floor (`live_zone.rs:34-47, 944-955`); latest assistant message + tool_use/thinking blocks are hot-zone, never touched. **Byte-range surgery, never re-serialize** — replacements spliced by byte offsets recovered via pointer arithmetic on `serde_json::RawValue` (:1229-1237); everything untouched is a literal byte copy (their cache-safety proof; tripwire metric `proxy_passthrough_bytes_modified_total` MUST stay 0).

**Per-block pipeline** (`compress_one_block` :822-938): 512B threshold gate → content-type detection → type dispatch (JsonArray→SmartCrusher, BuildOutput→LogCompressor, SearchResults→SearchCompressor, GitDiff→DiffCompressor; SourceCode/PlainText → no-op) → CCR marker injected BEFORE validation (so accounting includes marker cost) → **tokenizer-validated rejection gate** (compressed ≥ original tokens → keep original, tag `RejectedNotSmaller`) → only then persist original to CCR store (no orphan entries). Per-request manifest tags every block Compressed / RejectedNotSmaller / BelowByteThreshold / CompressorError / Excluded{reason}.

**LogCompressor** (`transforms/log_compressor.rs` — most hush-relevant):
- Format detect (pytest/npm/cargo/jest/make/generic) via Aho-Corasick marker tables over first 100 lines.
- Line scoring: ERROR/FAIL 1.0, WARN 0.5, INFO 0.1, DEBUG 0.05, TRACE 0.02; +0.3 stack-trace membership; +0.4 summary line; cap 1.0.
- Stack-trace state machine with per-language flavors (Python continues across blank lines — chained-exception fix; JS/Java `at`; Rust `-->`; Go goroutines).
- Selection: first+last error ALWAYS kept; warnings deduped **conservatively** (dedupe key = verbatim message prefix before first `:`/`=` + digit/hex/path-normalized suffix — a previous blanket normalization **merged distinct errors sharing address shapes**; bug fixed, don't reintroduce); first 3 stack traces capped 20 lines; ±3 context lines around every survivor; defaults min_lines 50 / max_total 100 / max_errors 10 / max_warnings 5.
- Output ends with **`[N lines omitted: 3 ERROR, 2 WARN, 40 INFO]`** — a per-level census of the dropped content.

**SmartCrusher** (JSON dict-arrays): **lossless-first** — try tabular compaction (schema header `[N]{col:type,…}` + rows); ship only if savings ≥ ratio with nothing dropped; strict `lossless_only` mode exists. Lossy path keeps error-bearing items as a HARD constraint (`detect_error_items_for_preservation`), rare status values, structural outliers, query-anchor matches; dropped rows → `{"_ccr_dropped": "<<ccr:HASH 42_rows_offloaded>>"}` sentinel that preserves the array-of-objects shape so downstream iteration keeps working; opaque cell strings ≥256B (base64 detector requires ≥16 unique chars — diversity filter kills `{xxxx…}` false positives) substituted with typed markers.

**Adaptive keep-count** (`adaptive_sizer.rs`): n≤8 keep all; ≤3 unique-by-simhash keep those; else Kneedle knee-detection on cumulative unique-word-bigram coverage; zlib-ratio sanity bump.

**Content detector** (`content_detector.rs`, regex-only): dispatch order JSON-array(parse, 1.0/0.8) → diff(≥0.7; handles combined/merge `@@@`) → HTML(≥0.7) → search(`^[^\s:]+:\d+:` on ≥30% of lines, ≥0.6) → log/build(10 patterns, ratio ≥0.1 over 200 lines, ≥0.5) → code(per-language anchored patterns, ≥3 hits, ≥0.5) → text. Signal keywords via one Aho-Corasick DFA + ASCII word-boundary post-filter; error set includes abort/timeout/denied/rejected (previously listed-but-never-matched — regex bug they fixed); **`token` deliberately removed from the security set** (false-positives on every LLM-token metric line); context-sensitive scoring (warnings don't score in diffs; security only scores in diffs).

**CCR retrieval:** synthetic tool `headroom_retrieve(hash)`; **session-sticky registration** (once a session ever compresses, the tool stays registered forever — toggling flips the tools-array bytes and busts the cache); the **proxy intercepts and answers** retrieval tool_use itself (~1ms, up to 3 rounds, invisible to client; mixed CCR+other tool calls pass through untouched); **misses return structured errors** — `{"error":"Entry expired (CCR TTL: 1800 seconds; age: 2100 seconds)","status":"expired",…}` so a failed retrieve doesn't teach the model the tool is unreliable; TTL 30min (raised from 5min: "agentic sessions routinely outlive the old default, and an expired entry silently converts 'lossless with retrieval' into 'lossy'"); SQLite backend default, loud init failures (no silent fallback).

**Proactive expansion** (`context_tracker.py`): tracks compression events (hash, tool, counts, 2KB sample, query context, **mandatory workspace_key — fail-closed after a real cross-project leak** where a Python file from project A surfaced in project B's Ruby session); on each new user message scores tracked compressions for relevance (keyword overlap 0.5 + exact-substring bonus, query-context overlap 0.3, tool-name heuristic 0.1, linear age discount over 300s); fires ≤2 expansions/turn above 0.3.

**THE TRUST EVAL (the single most valuable finding):** `tests/test_compression_summary_tool_eval.py` — real Sonnet calls. Given 100 test results compressed to 10 all-passing + bare marker `[90 items compressed to 10. Retrieve more: hash=…]`, the model typically does NOT retrieve and reports "all passing" (wrong — 2 failures were hidden). Given the same data + a **categorical census with named notables** — `[90 items compressed to 10. Omitted: 87 passed, 2 failed, 1 error; notable: test_auth.test_login_expired_token (failed); … Retrieve specific items: headroom_retrieve(hash=…, query=…)]` — the model retrieves with a relevant query. The summary generator (`headroom/transforms/compression_summary.py`) is tiny: categorize dropped dicts by first present field among type/status/kind/level/severity/…, Counter top-5, plus ≤3 "notable" items matching error|fail|critical|warning|exception|crash|timeout|denied|rejected|invalid rendered as `name (matched-word)`. **Doctrine: make elision legible (what was dropped, in categories, how to get it back) — never assert trustworthiness.** This is the eval-proven completion of hush's own 0.3.3→0.3.21 marker arc.

**Measurement worth porting to the harness:** report RejectedNotSmaller counts (otherwise invisible); passthrough-bytes-modified tripwire; per-strategy compressed/original token ratios from real `usage` fields; cache-hit-rate histogram buckets dense near 0 and 1 ("either the cache works or it doesn't"); adversarial suites (already-minified JSON, dense base64 → assert graceful no-op); determinism as a testable property; Claude char-density calibrated at **3.5 chars/token** (generic 4.0).

**REALIGNMENT lessons (25K-LOC rewrite post-mortem):** (1) "compression = choosing what to drop from history" was the founding error — passthrough is sacred, compress only the live zone; (2) telemetry must never influence per-request decisions (made compression non-deterministic); (3) never mutate a shared stable surface (tools array/system prompt) conditionally per-request — sticky-on forever; (4) parse→re-serialize round-trips are mutations (whitespace, key order, `1.0`→`1`) — do surgical byte splices; (5) decode text only after locating structural boundaries in bytes (UTF-8 split across chunks silently drops CJK under errors=ignore); (6) sunk cost stays sunk — a just-merged 2-PR port was deleted without ceremony; (7) refusing a feature gets documented as a decision so nobody re-adds it; (8) when your optimizer actively harms users, ship the passthrough kill-switch immediately, rebuild correctness later; (9) audit project memory against the repo (a 25× wrong LOC figure had steered planning); (10) `tag_protector.rs` — protect `<system-reminder>`-shaped tags from any text compressor via salted placeholder swap.

---

## Part 4 — Build specs (ranked; NOT approved yet — get user go first)

### Spec 1 — PreCompact summary shaping + sidecar-aware SAFE_TO_DISCARD (the 0.6.0 flagship)

**Evidence:** hush's own binary audit already named PreCompact "the one unexploited high-value lever… the last frontier and the natural 0.6.0." Two rivals converge independently: token-optimizer injects session-aware PRESERVE/DROP guidance; token-goat injects a SAFE_TO_DISCARD manifest of provably-recallable items with recall pointers. hush's unique edge: **it knows exactly which tool outputs have full-fidelity sidecar files on disk** — content that is provably recallable and therefore safe for the summary to drop.

**Design — new file `hush/hooks/precompact-summary.js`:**
- Register in `hooks.json`:
```json
"PreCompact": [{ "hooks": [{ "type": "command",
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/precompact-summary.js\"",
  "commandWindows": "node \"$env:CLAUDE_PLUGIN_ROOT\\hooks\\precompact-summary.js\"",
  "timeout": 5 }] }]
```
- Input on stdin: `{session_id, transcript_path, cwd, hook_event_name:"PreCompact", trigger:"auto"|"manual", custom_instructions}`.
- **Output: PLAIN TEXT on stdout** — Part 2 fact #3: PreCompact instructions come from raw stdout, NOT hookSpecificOutput JSON. Do not print JSON. (token-goat stumbled here and fell back to systemMessage; hush's binary audit has the real mechanism.) Empty stdout = no instructions. Always exit 0.
- Gates: `HUSH_DISABLE=1` and `HUSH_COMPACT=off` → print nothing, exit 0. Wrap everything in try/catch (fail-open).
- Static block (always printed when enabled) — format-shaping, never information-dropping:

> Summary format: a compact structured list, not prose. Preserve verbatim every file path, identifier, command, version number, error message, decision, and open thread — losing one forces re-exploration that costs more than the summary saves. Drop narration, pleasantries, step-by-step retellings, and content restated from tool outputs. One fact per line.

- Dynamic block (only when `session_id` present AND sidecar files exist): compute `sess8 = String(session_id).slice(0, 8)`; list `fs.readdirSync(path.join(os.tmpdir(), "hush-sidecar"))` filtered to `startsWith(sess8 + "-") && endsWith(".txt")`, cap 20 entries; print:

> Full tool outputs from this session are preserved on disk (shown in-conversation only as digests): `<path1>`, `<path2>`, … Keep these paths in the summary; do not reproduce their content. If a file is missing later, re-running the producing command regenerates the data.

- Forward-slash the paths (match `maybeSidecar`'s `.replace(/\\/g, "/")` convention).

**Tests (node:test, mirror existing style — spawn the script with stdin JSON, capture stdout):** static block emitted; sidecar block lists only this session's files (create temp files for two sessions); no session_id → static only; `HUSH_COMPACT=off` / `HUSH_DISABLE=1` → empty; malformed stdin → empty, exit 0; cap at 20 files.

**Validation:** unit tests; then ONE live probe — a real session that triggers a sidecar, then manual `/compact`; inspect the post-compaction summary for (a) structured format, (b) retained sidecar path, (c) no lost load-bearing facts. This is the sanctioned single-probe carve-out. Full effect measurement needs a purpose-built long session (auto-compact) — defer; document as open validation in the private memory, not in public docs.

**Risk (load-bearing):** the summary is the most correctness-sensitive artifact in a long session. The instructions must shape FORMAT, never instruct dropping information — the only "droppable" content named is sidecar-backed (provably recallable). Never add "be brief"-style pressure to the summarizer. This is the 0.2.4/0.3.3 signal-destruction failure family; respect it.

### Spec 2 — Census-grade sidecar digests (headroom's eval-proven trust upgrade)

**Evidence:** headroom's real-Sonnet evals (Part 3D "THE TRUST EVAL"): bare counts → model misreports without retrieving; categorical census + named notables → correct retrieval. Direct continuation of hush's self-certifying-marker doctrine (state the provable guarantee; extend it from "whether signal was omitted" to "what kinds of signal exist beyond the sample").

**Changes in `compress-tool-output.js`:**
1. New helper `signalCensus(lines, signalIdx)` → classify each signal line by first match priority: `/\w*Error\b|\bERR(?:OR)?\b/i` → errors; `/\bFAIL(?:URE|ED)?\b/i` → failures; `/\bCRITICAL\b/i` → critical; `/\w*Warning\b|\bWARN(?:ING)?\b/i` → warnings; `/\bDEPRECATED\b/i` → deprecations. Render like `2 errors, 1 failure, 3 warnings` (omit zero categories).
2. `buildSidecarDigest` (:362): section header `Signal lines (${signalIdx.length} total in the file):` → `Signal lines (${signalIdx.length} total: ${census}):`. After the lead lines, if unshown signal lines remain, add ONE line: `Other signal lines (not shown): L23, L88, L112 … (+M more)` — cap ~15 line numbers. This gives the model exact offset/limit targets (headroom's "actionable in one step" lesson) and is a completeness claim hush can prove (signalIdx is exhaustive by construction).
3. `maybeSidecar` header (:428-432): `(${d.signalCount} with warnings/errors/failures)` → `(${census})`; append the structured-miss fallback: `If that file no longer exists, re-run the command instead.` (headroom's expired-entry lesson: a dead pointer must carry its own recovery path.)
4. **Budget check:** the whole digest must stay useful within a ~2KB preview when the host also persists (Part 2 fact #5); the census adds ~40-80 chars — fine, but assert in a test that header + census + first signal lines fit 2048 chars for a representative fixture.

**Tests:** census counts on mixed-signal fixtures; category priority (a line with both FAIL and Error counts once, as error); unshown-signal-lines line appears only when applicable and caps at 15; header wording updates (several existing tests assert exact strings — update them deliberately, not mechanically); 2KB-preview fit.

**Validation:** unit; then rerun the sidecar tasks (incident-followup, log-triage) and the vigilant flag-rate task — **propose the batch and wait for user go** (ask-before-batches). Expect: preserved −42%/−52%, no new marker flags, possibly fewer follow-reads.

### Spec 3 — Hardened state/sidecar writes (closes a flagged gap)

**Evidence:** gap already on record (sidecar write `compress-tool-output.js:426`, meter state `narration-meter.js:123`); RDXmin (MIT) ships the complete recipe (Part 3A).

**Design — new `hush/hooks/lib/safe-write.js`:**
```js
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto");

// Symlink-refusing, atomic-rename file write. Throws on refusal; callers
// already wrap hush's state writes in try/catch, so a refusal degrades to
// the feature silently skipping (fail-open), never a broken session.
function safeWriteFileSync(target, content) {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  let realDir = dir;
  const dstat = fs.lstatSync(dir);
  if (dstat.isSymbolicLink()) {
    realDir = fs.realpathSync(dir);
    const rstat = fs.statSync(realDir);
    if (!rstat.isDirectory()) throw new Error("hush: dir target not a directory");
    if (typeof process.getuid === "function") {
      if (rstat.uid !== process.getuid()) throw new Error("hush: dir owned by another user");
    } else {
      // win32 has no uid: require the resolved dir to live under a root we
      // expect hush state to inhabit (tmpdir or the user's home).
      const roots = [os.tmpdir(), os.homedir()].map(r => path.resolve(r).toLowerCase() + path.sep);
      const real = path.resolve(realDir).toLowerCase() + path.sep;
      if (!roots.some(r => real.startsWith(r))) throw new Error("hush: dir outside trusted roots");
    }
  }
  const realTarget = path.join(realDir, path.basename(target));
  try {
    if (fs.lstatSync(realTarget).isSymbolicLink()) throw new Error("hush: target is a symlink");
  } catch (e) { if (e.code !== "ENOENT") throw e; }
  const tmpPath = path.join(realDir,
    `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`);
  const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0;
  const fd = fs.openSync(tmpPath,
    fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW, 0o600);
  try {
    fs.writeSync(fd, content);
    try { fs.fchmodSync(fd, 0o600); } catch {}
  } finally { fs.closeSync(fd); }
  try { fs.renameSync(tmpPath, realTarget); }
  catch (e) { try { fs.unlinkSync(tmpPath); } catch {} throw e; }
}
module.exports = { safeWriteFileSync };
```
- **Call sites:** `compress-tool-output.js:426` — replace `if (!fs.existsSync(file)) fs.writeFileSync(file, cleaned)` with `if (!fs.existsSync(file)) safeWriteFileSync(file, cleaned)` (keep the existsSync fast path — content-addressed name, a hit means identical content). `narration-meter.js:123` — `safeWriteFileSync(statePath(sessionId), JSON.stringify(state))`. Note sentinel `compress-tool-output.js:504` already uses `flag:"wx"` (O_CREAT|O_EXCL) — add an lstat symlink refusal before it, or route through the lib with empty content.
- Win32 notes: O_NOFOLLOW degrades to 0 (the lstat gates are the only symlink defense — accepted residual TOCTOU, same as RDXmin); rename maps to MoveFileEx(REPLACE_EXISTING); 0600 is advisory.

**Tests:** normal write round-trip; overwrite of existing file; symlinked target refused; symlinked parent dir refused when pointing outside tmp/home (win32 branch: simulate by monkeypatching `process.getuid` absent); temp file cleaned up when rename fails (point target at an existing directory); concurrent-write smoke (two writers, file ends valid).

### Spec 4 — PostCompact note re-delivery (tiny)

**Evidence:** the once-per-session marker-provenance note lives in conversation content → compaction summarizes it away, while the sentinel file still says "already delivered." Post-compaction, `[hush hook:…]` markers arrive with no provenance context → the stochastic injection-flagging risk returns. RDXmin independently re-injects its ruleset on `SessionStart` matcher `compact`; hush's cleaner primitive is PostCompact (exists per binary audit; receives `compact_summary`, additionalContext-only).

**Design — new `hush/hooks/postcompact-rearm.js`, registered on PostCompact (timeout 5):**
- Read stdin JSON; if `session_id`, `fs.unlinkSync(path.join(os.tmpdir(), "hush-note-" + sessionId))` inside try/catch (ENOENT fine). Also unlink `hush-meter-<session_id>.json` (post-compaction turn anchors may be stale; deleting re-arms the meter cleanly — harmless either way).
- Emit nothing (no additionalContext — the next compression re-delivers the note through the existing mechanism, which only fires when a marker is actually present; injecting the note unconditionally post-compact would spend tokens on sessions that never compress again).
- Gates: `HUSH_DISABLE=1` → no-op. (`HUSH_NOTE=off` sessions never created a sentinel; unlink is harmless.)

**Tests:** sentinel + meter state removed when present; absent → silent; no session_id → no-op; malformed stdin → exit 0.

### Spec 5 — Log template mining (lossless-ish rung before the caps)

**Evidence:** headroom's Drain-style `LogTemplate` reformat (Part 3D): consecutive same-template runs collapse to one exemplar + count, order-preserving. hush's `collapseDupes` only merges IDENTICAL consecutive lines; real logs repeat SHAPES (`INFO worker-3 processing job 8841` × 800 with varying IDs). Compounds hush's strongest domain — info-noise logs cut far deeper than the error-cascade worst case.

**Design — new function in `compress-tool-output.js`, applied after dupe collapse, before `capLines`, in the shared cleaning path (shell outputs + log/generated Reads):**
- Clean-room algorithm (do NOT port headroom's code):
  - Tokenize each line on `/\s+/`.
  - Two lines share a template iff: same token count; ≥50% of positions token-identical; **≥2 anchor tokens identical** (anchor = token with ≥3 chars and no digits — prevents merging on timestamps/IDs alone).
  - **A SIGNAL_RE line never joins a run and always breaks one** (hard rule — headroom's fixed-bug list shows over-normalization merged distinct errors; hush sidesteps the whole class).
  - Runs of ≥ `TEMPLATE_MIN_RUN = 5` consecutive template-sharing lines collapse to: first line verbatim + `[hush hook: ${n-1} similar lines collapsed (same shape, varying values)]`. Order preserved; marker matches hush's provenance style.
- Env gate `HUSH_TEMPLATE=off`; constant tunable `HUSH_TEMPLATE_MIN_RUN`.

**Tests:** worker/job runs collapse; two DIFFERENT error lines with similar shape never merge (signal exemption); interleaved non-matching lines break runs; run of 4 (< min) untouched; collapse is stable/idempotent; marker text exact.

**Validation:** free replay first — run the fixtures (719-line redis `app.log`, noisy-build output) and a few real logs through the pipeline with/without the feature; report incremental char reduction beyond dupe-collapse. Only if the replay shows real gains, propose a live batch (ask-before-batches). If replay gains are trivial, don't ship — record the refutation (razor 0.3.8 precedent: the validation loop is allowed to say no).

### Spec 6 — hush-compress skill: cache-stability advisory

**Evidence:** token-optimizer's `cache_instability` detector + headroom's volatile detector, both grounded in documented prompt-cache-prefix mechanics: volatile content early in CLAUDE.md (timestamps, AUTO-GENERATED stamps, volatile imports) breaks the cache prefix on every change, re-billing everything after it on every request.

**Design:** extend `skills/hush-compress/SKILL.md` with one analysis step (advisory-only, never blocks or auto-edits): scan the ORIGINAL file's first ~60% of lines for — ISO dates (`\b\d{4}-\d{2}-\d{2}\b`), times, `AUTO-GENERATED`/`Last updated`/`Generated by`, UUID-v4s (`[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}`), `@import`s whose paths contain dates/build stamps. Report: "these lines change across sessions and sit early in the prompt-cache prefix; every change re-bills the whole prefix — move them to the end of the file or remove them." Optionally add a mechanical checker `scripts/cache-stability-check.js` in `verify-compression.js` style (plain Node, no deps) so the skill's claim is reproducible.

---

## Part 5 — Measure-first probes (build only if the probe says yes)

### Probe 7 — JetBrains MCP JSON table-ification (sanctioned revival of closed item 4)
The prior close-out reserved exactly this reshaped target: "a JSON-record-aware cap for JetBrains search/diagnostics blobs (keep ERROR-severity entries, cap array length, count-based omission note)." Both headroom (SmartCrusher lossless-first) and token-goat (≥15% gate, `constant:` column hoisting) now validate the shape.
- **Probe:** scratchpad script over `~/.claude/projects/**/*.jsonl` (the prior probe found 6,714 MCP tool_results, heavy hitters = JetBrains `search_in_files_by_text` max 50K, `build_project` 45K, `get_file_problems` 32K): for each mcp__ tool_result ≥2KB, parse the text block as JSON; if array of ≥5 objects sharing ≥80% keys, simulate schema-header+rows rendering + hoist constant-valued columns; report the savings distribution.
- **Build threshold:** median ≥15% savings on ≥100 real payloads. If built: hard constraint — any record whose serialized form matches SIGNAL_RE survives verbatim; count-based omission marker in hush's provenance style; **replacement must be a plain string or the same bare content-block array — never `{content:[...]}`** (Part 2 fact #6); widen `WATCHED_TOOLS` + hooks.json matcher (`^(Bash|PowerShell|Read|mcp__jetbrains__.*)$` or similar — scope to measured-heavy tools, not blanket `mcp__.*`).

### Probe 8 — Proactive sidecar surfacing at UserPromptSubmit
Headroom's context_tracker ported to the hook layer: when a NEW user prompt keyword-matches an earlier sidecar digest, inject one additionalContext line pointing at the sidecar path. Session-scoped, fail-closed without session_id (headroom had a real cross-project leak; their fix — mandatory scope key — is the design constraint).
- **Probe first:** scan real transcripts for the failure this would prevent — a command re-run (or file re-read) whose earlier output was sidecar'd in the same session. hush's prior dedup refutations (0 duplicate calls in 207; RDXmin 0 hits) predict this is RARE. If frequency ≈ 0, record the refutation and don't build.

### Probe 9 — Harness upgrades (private `.scratch/` + public `hush/benchmarks/`)
Cheap, high-value, no user-visible surface:
1. **Decision manifest:** under `HUSH_DEBUG=1`, the compress hook appends one JSON line per decision (`{tool, bytesIn, bytesOut, action: sidecar|cap|scrub-only|enumerate-passthrough|shell-guard-skip|rejected-not-smaller}`) to `tmpdir/hush-debug-<session_id>.jsonl`; harness ingests it. Headroom's lesson: "we ran but kept the original" is otherwise invisible.
2. **Adversarial no-op fixtures:** 20KB single-line minified JSON; dense base64 blob — assert graceful passthrough/inline-cap, no corruption, no sidecar overclaim.
3. **Sidecar-follow eval task:** fixture whose digest census shows a failure among many passes; score whether the model Reads the sidecar with offset/limit and names the failing item. Headroom proved this eval shape is cheap and decisive — it's the direct test of Spec 2.
4. **Passthrough invariant:** for tools/outputs hush should not touch, assert byte-identical results end-to-end.

---

## Part 6 — Refused ideas (with reasons; do not re-propose without new evidence)

| Idea (source) | Why refused |
|---|---|
| Delta-reads / diff-on-reread (token-optimizer, token-goat) | Serving a diff instead of file content breaks Edit's verbatim `old_string` precondition — RDXmin refuses to touch Read for exactly this reason; token-goat routes edits into ITS OWN CLI to survive it (unacceptable coupling). Deny-based variants also fight agent autonomy and the base prompt ("adjust, don't retry"). |
| Same-output dedup cache (RDXmin tier) | Refuted three times: hush measured 0 duplicate calls in 207 baseline calls; RDXmin's own tier found 0 hits on its replay corpus; task-scale sessions have no redundancy to reclaim. |
| Intensity dials (RDXmin lite/full/ultra) | User's standing design principle. Ground truth: RDXmin's dial is just 3 budget presets anyway — nothing behind it. |
| SessionStart npm update check (RDXmin) | Network egress; hush is zero-network by design. |
| Keep-warm cache pinger (token-optimizer) | Spends user money on schedule; even its author ships the spend path disabled behind a kill flag. |
| OS daemons / dashboards / SQLite platforms (token-optimizer, token-goat) | Different product category; violates simplicity + local-footprint discipline. |
| PreToolUse Bash rewrite-to-wrapper (token-optimizer, token-goat) | hush already proved the class fails: rewritten commands are re-analyzed by the permission engine and no wrapped form passes scoped allow rules (the 0.3.9→0.3.20 saga). Both rivals' designs would break under scoped permissions; hush's PostToolUse position needs no execution ownership. |
| Kneedle adaptive keep-count (headroom) | Elegant but unproven benefit for hush's tasks vs benchmark-validated fixed caps + pressureScale; would need its own A/B for no identified pain point. Revisit only if a real cap-tuning failure shows up. |
| Auth-mode/subscription-aware aggressiveness (headroom) | No auth-mode signal exists in hook input; dial-shaped. |
| Nudge-efficacy self-suppression (token-goat hint_stats) | Would counteract the A/B-validated 0.3.16 growth-based re-arm (re-arming HALVED Haiku narration). The concept is sound for advisory hint systems; hush's meter is already bounded and validated. |
| Generic `mcp__.*` blanket compression (RDXmin) | hush's own probe closed this: browser-tool payloads are tiny, accessibility trees have zero dedupe, blind elision corrupts structured JSON. Only the scoped JetBrains probe (Probe 7) stays open. |
| `<system-reminder>`-shaped or authority-borrowing markers | Measured actively harmful (marker-bisect: "fake system-reminder tag… likely a prompt-injection attempt"). Provenance is stated, never argued. |

## Part 7 — Rival evidence that VALIDATES current hush decisions
- token-optimizer measured a **39.1% harm proxy** and refused to auto-replace Agent/Task results → supports hush's subagent conservatism (brief them, never compress them).
- token-optimizer's verbosity-steer logs an admitted-assumption saving → the ungrounded-prescription pattern hush's philosophy exists to avoid; hush's numbers stay measured.
- RDXmin's dedup tier: 0 hits → third refutation of hush's own duplicate-work finding.
- **No rival has any narration/chatter control** — hush's core differentiator remains unique in the category.
- headroom's "passthrough is sacred" post-mortem → hush is cache-safe by construction (PostToolUse rewrites happen before content enters context; nothing retroactive).
- headroom's conservative-defaults doctrine ("a retrieval round trip costs tokens, latency, and risk") matches hush's sidecar guard rails (sidecar-read capping, shell guard, break-even math from sidecar-math.js).

## Part 8 — Hazards to document (no code changes)
- **RDXmin co-install collision:** both plugins rewrite Bash outputs via `updatedToolOutput`; ordering decides whose rewrite survives, and each may feed on the other's markers. No code response (plugins never detect each other — standing principle); candidate one-liner for hush's README known-limits IF ever reported by a real user.
- **token-goat co-install** would be worse (its PreToolUse denies Reads before hush's PostToolUse ever sees them) — same posture: not hush's problem to detect.
- Sidecar files persist in tmpdir with 0600-after-Spec-3 perms; they can contain anything a tool printed. Current OS-temp-cleanup story stays documented in README known-limits.

## Part 9 — Source quick-index
- hush: `hush/hooks/compress-tool-output.js` (SIGNAL_RE :88, omittedMarker :110, capLines :135, isLogPath :280, isGeneratedPath :300, pressureScale :316, buildSidecarDigest :362, maybeSidecar :415, sidecar write :426, isSidecarPath :446, note sentinel :504), `hush/hooks/narration-meter.js` (state write :123, event gate :133), `hush/hooks/lib/transcript.js`, `hush/hooks/hooks.json`, `hush/output-styles/hush.md`, `hush/skills/hush-compress/SKILL.md`.
- RDXmin: `hooks/rdx-compress-output.js`, `hooks/rdx-config.js` (safeWriteFlag :56-114, readFlag :120-150), `hooks/rdx-activate.js`, `bin/lib/settings.js`, `benchmarks/replay-compress.js`, `benchmarks/results/2026-07-07-verify-rerun.md`.
- token-optimizer: `skills/token-optimizer/scripts/measure.py` (35K lines; PreCompact instructions :26301-26434, detectors under `scripts/detectors/`), `scripts/read_cache.py`, `scripts/bash_compress.py`, `scripts/archive_result.py`, `scripts/context_pressure.py`, `hooks/hooks.json`.
- token-goat: `src/hooks_read.ts` (deny ladder :454-1006), `src/hooks_compact.ts` (SAFE_TO_DISCARD :169-224), `src/hooks_bash.ts`, `src/mcp_compress.ts`, `src/hint_stats.ts`, `src/install.ts`, `src/worker.ts`, `src/db.ts`.
- headroom: `crates/headroom-core/src/transforms/{live_zone.rs, log_compressor.rs, search_compressor.rs, diff_compressor.rs, content_detector.rs, adaptive_sizer.rs, smart_crusher/}`, `crates/headroom-core/src/signals/keyword_detector.rs`, `headroom/ccr/{tool_injection.py, response_handler.py, context_tracker.py}`, `headroom/transforms/compression_summary.py`, `tests/test_compression_summary_tool_eval.py`, `REALIGNMENT/`.
