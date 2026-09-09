# Fresh competitive sweep — lean-code / dependency-gate landscape (2026-07-18)

> **Status 2026-08-18 — HISTORICAL.** The top-ranked idea here rests on the deliberate-ceiling
> marker comment, which razor stopped asking for in 1.1.0, so it cannot be adopted as written. The
> four ideas below it were decided the same day, in the run recorded in
> `razor-goal-run-2026-07-18.md`. Read this for the landscape, not as a backlog.

Private research notes. Web-only sweep; every repo below was verified by fetching its README and/or the GitHub API (stars/license/pushed_at pulled live via `gh api` on 2026-07-18). Competitor names must stay out of public records per house rule.

## Headline events since the last sweep

1. **ponytail went supernova.** Already-mined rival, but the last 5 weeks changed its class entirely: the ENTIRE release history runs v1.0.0 (2026-06-12) → v4.8.4 (2026-06-29) and it now sits at **85,363 stars** (API-confirmed). The viral driver was the r/ClaudeCode post "I gave Claude Code a 'lazy senior dev' mode and it writes like 6x less code" (~1.9k upvotes, 98% ratio, 183 comments — reddit.com/r/ClaudeCode/comments/1u3jlo0/). Demand-side companion post: "Inherited a 3-month old repo from a Vibe Engineer" (~7.3k upvotes).
2. **andrej-karpathy-skills changed owners.** forrestchang/andrej-karpathy-skills now redirects to **multica-ai/andrej-karpathy-skills** — 193,738 stars, **NO license** (API: license none). Already mined; the org transfer + persistent no-license status is the news (reuse trap; also explains articles about "the 4-rule file with ~91k stars" — star counts in press pieces are snapshots of these two repos at various dates).
3. **Need-based dependency justification is still an open market.** Nobody scores "was this dependency needed"; everything gate-shaped is security/risk-based. Razor's evidence-carrying deny (lists actually-installed deps) remains unique. Detail in Dry Angles.

## Findings

### 1. ponytail — major new capabilities (already mined; update only)
- URL: https://github.com/DietrichGebert/ponytail — 85,363 stars, MIT, latest v4.8.4 2026-06-29.
- Mechanism now three-layer: always-on ruleset injection + lifecycle hooks (Node.js, Claude Code/Codex) + skill commands; **plugin-tier support for 9 hosts** (Claude Code, Codex, Copilot CLI, Pi, OpenCode, Gemini CLI, Devin CLI, OpenClaw, Hermes) and **instruction-only adapters for 13 more** (Cursor, Windsurf, Cline, Aider, Zed, Junie, Amp, Jules, ...). v4.8.0 added an **MCP server**; v4.8.2 npm distribution; v4.8.3 subagent coverage via `PONYTAIL_SUBAGENT_MATCHER`; global config `~/.config/ponytail/config.json`.
- New commands: intensity dial `/ponytail [lite|full|ultra|off]`; `/ponytail-review` (diff bloat audit); `/ponytail-audit` (repo scan); `/ponytail-debt` (harvests deferred-shortcut comments); `/ponytail-gain` (impact scorecard of savings); `/ponytail-help`.
- Published benchmark marketing: "54% fewer LOC (to 94% on over-build cases), 22% fewer tokens, 20% cheaper, 27% faster, 100% safety maintained" — 12 feature tasks, FastAPI+React, Haiku 4.5.
- Techniques razor lacks: (a) **/ponytail-debt-style harvest command** — razor already plants `razor:` ceiling comments but has no command that collects them into a worklist (cheap, natural adjunct to /razor:unused); (b) **impact scorecard** (/ponytail-gain) — a user-visible savings ledger; (c) cross-host adapter emission (AGENTS.md/.cursor-rules generation) + MCP server portability. Intensity dial is a capability razor deliberately rejected (routing isn't a tone dial) — list as rival feature, not adoptable.
- VERDICT: **RIVAL-TO-BEAT** — it is now the mega-traction incumbent in razor's exact niche; razor's moat stays the mechanical gates + measured zero-dep-ship/correctness wins, which ponytail's marketing numbers don't cover (its claims are LOC/cost, not correctness or dep discipline).

### 2. nizos/tdd-guard + nizos/probity — state-aware over-implementation blocking
- URLs: https://github.com/nizos/tdd-guard (2,266 stars, MIT, v1.7.0 2026-06-23) and successor https://github.com/nizos/probity (84 stars, MIT, v1.10.0 2026-07-08, active weekly releases).
- Mechanism: PreToolUse hook intercepts Write/Edit/MultiEdit; an **LLM validator judges the pending diff against current state** (latest test results + todo list + session transcript) and blocks "code beyond current test requirements" with an explanatory deny. Probity generalizes it: Claude Code + Codex + Copilot CLI, rules either deterministic (regex/string) or AI-validated, **reuses the agent's own authentication via official SDKs (no separate API key)**, reads session transcripts directly (no test-reporter setup), parallel-session safe.
- The ONE technique razor doesn't have: **state-conditioned secondary-model validation at write time** — a deny decided by judging the diff against evidence of session state, not by static command parsing. Razor's gates are deliberately mechanical/cheap, so wholesale adoption conflicts with its cost profile, but the auth-reuse trick makes an LLM-judged gate effectively free of key management if ever wanted (e.g., a distrust-gated "is this diff bigger than the ask" probe).
- VERDICT: **ADOPT-CANDIDATE** (the auth-reusing AI-validated-rule pattern; mission-adjacent, not a direct rival — its minimalism axis is test-scoped, not need-scoped).

### 3. attach-dev/attach-guard — multi-manager install interception + command rewrite
- URL: https://github.com/attach-dev/attach-guard — 7 stars, MIT, last push 2026-06-03.
- Mechanism: PreToolUse on Bash; parses install commands across **npm, pnpm, pip (incl. `python -m pip` and `uv pip` wrappers), `go get/install`, `cargo add/install`**; verdicts allow/deny/ask from a local score binary or HTTP endpoint; **can rewrite an unpinned install to a safe pinned version** (updatedInput-style) instead of denying outright.
- Security-scored (malware/compromised versions), zero need-based judgment. Traction negligible.
- The ONE technique razor lacks: the **package-manager command-parse matrix breadth** (uv wrappers, cargo, go — razor's deny-once gate targets npm/pip) and the rewrite-not-deny move (razor audited and refused updatedInput as YAGNI; this is the first same-class plugin actually using it).
- VERDICT: **ADOPT-CANDIDATE** (steal the parse matrix if razor ever widens ecosystem coverage; ignore the scoring backend).

### 4. Socket Firewall (`sfw`) / socket-npm — network-level install interception
- URLs: https://socket.dev/blog/introducing-socket-firewall, https://docs.socket.dev/docs/socket-firewall-overview — Socket Inc. product, free tier, closed-source service.
- Mechanism: `sfw npm install x` spins an **ephemeral HTTP proxy in front of the package manager subprocess** and blocks artifact fetches that fail Socket's checks; socket-npm alternatively shims itself onto PATH ahead of npm.
- Catches what a hook parser cannot: installs spawned indirectly (postinstall scripts, nested tooling) — the interception happens at the registry request, not the command string.
- VERDICT: **IGNORE** (security mission, hosted service, not need-based) — but the mechanism note matters: it is the only class of gate that survives command obfuscation (see GuardFall, finding 9).

### 5. safedep/vet + vet-action — CEL policy gates over dependency metadata
- URLs: https://github.com/safedep/vet (1,092 stars, Apache-2.0, active), https://github.com/safedep/vet-action.
- Mechanism: CLI/CI scanner with **CEL policy expressions** (`scorecard.scores.Maintained < 5`, license filters, `--filter-fail` for CI exit codes); PR gate via GitHub Action; now ships an **MCP server + agent mode** aimed at Claude-style agents. Scan-time, not install-interception.
- Closest existing thing to "score this dependency" — but every predicate is risk/hygiene (CVEs, scorecard, licenses), none is need ("could stdlib do this?").
- VERDICT: **IGNORE** for razor's mission (risk-based, post-hoc), with one adoptable idea: a tiny policy-expression surface for gate configuration if razor's userConfig ever needs per-project gate tuning — CEL-over-facts beats bespoke config flags.

### 6. maxritter/pilot-shell — per-task-class diff caps inside a heavyweight framework
- URL: https://github.com/maxritter/pilot-shell — 1,784 stars, license NOASSERTION (custom/no standard license — flag before borrowing anything), active (pushed 2026-07-16).
- Mechanism: shell-alias wrapper + git hooks + rules/skills merged into Claude Code and Codex configs; spec-driven pipeline.
- The razor-relevant kernel buried inside: the **/fix path enforces a ~20-line diff ceiling for bugfixes** ("symptom patches are forbidden"), **auto-rejects architectural issues and routes them to /spec**, requires a High/Medium confidence gate, and caps fix iterations at 3 before demanding manual review.
- The ONE technique razor lacks: **task-class-scoped LOC ceilings with automatic escalation routing** — not a global cap (which the user's philosophy rejects as prescribed heuristic) but "a bugfix that grows past N lines is evidence it isn't a bugfix," which is an evidence-shaped rule.
- VERDICT: **ADOPT-CANDIDATE** (the fix-path ceiling-as-misclassification-signal idea only); the framework itself is the over-engineering razor exists to prevent.

### 7. CI-time diff/size caps — reference implementations exist, all coarse
- https://github.com/CodelyTV/pr-size-labeler — 393 stars, MIT: labels PRs by lines changed and **can fail the check above a threshold**. https://github.com/adobe/sizewatcher (Adobe): fails/warns on artifact-size deltas. GitHub app "Pull Request Size". Team lore converges on 300–500 line PR budgets.
- All post-hoc, repo-level, and blind to whether the size was needed. Razor's write-time per-turn budgets are strictly earlier in the loop.
- VERDICT: **IGNORE** (razor already intercepts earlier); useful only as the standard CI backstop to mention if anyone asks "what about CI."

### 8. actions/dependency-review-action — the mainstream PR-time new-dependency gate
- URL: https://github.com/actions/dependency-review-action — 879 stars, MIT, GitHub-official, active.
- Mechanism: diffs the dependency graph of a PR and fails on policy: vulnerability severity, license allow/deny, **`deny-packages` / `deny-groups` blocklists**. The only widely-deployed mechanical "this PR adds a dependency" gate.
- Still security/license-scoped; cannot express "unneeded."
- VERDICT: **IGNORE** as competition (different layer), worth citing as the defense-in-depth CI complement to razor's write-time deny in any positioning doc.

### 9. GuardFall research — command-parse gates are bypassable by shell rewriting
- Coverage: thehackernews.com/2026/06/guardfall-exposes-open-source-ai-coding.html (research, not a tool). Finding: **10 of 11 surveyed agents' command-inspection guards were bypassed** via bash rewriting (variable expansion, eval-style indirection) because guards judge the literal command string, not what bash will execute. The one agent that held up normalized the command the way bash would before deciding, plus a hard denylist.
- Razor relevance: the deny-once install gate parses the Bash tool's command string. A drifting model that writes `PM=npm; $PM install left-pad` or nests the install in `sh -c` slips the gate. Razor's threat model is cooperative-not-adversarial, so this is hardening, not a hole in the measured wins — but "normalize before matching" is cheap.
- VERDICT: **ADOPT-CANDIDATE** (light command normalization in the install gate; skip the full security posture).

### 10. yerdaulet-damir/vibe-coding-rules — LOC caps with a CI enforcement script
- URL: https://github.com/yerdaulet-damir/vibe-coding-rules — 7 stars, MIT, stale since 2026-05-06.
- 54 advisory architecture rules (FastAPI/Next.js/Go) + one mechanical bit: **soft 400 / hard 600 LOC per file, enforced by `scripts/check_loc.py` failing CI**.
- VERDICT: **IGNORE** (arbitrary numeric caps = prescribed heuristics; no traction) — only note the "advisory rule + 30-line CI script" pairing as the minimal enforcement pattern non-hook ecosystems use.

## Dry angles (explicit)

- **Need-based dependency scoring**: searches for justification bots/gates ("why this dependency" PR gates) return only security scoring (Socket, vet) and denylists (dependency-review-action). No tool anywhere scores whether a dependency was NEEDED. Razor's installed-deps-evidence deny is still one of a kind.
- **awesome-claude-code (hesreallyhim)**: no lean-code/YAGNI-enforcement category exists at all; nearest entry is cc-thinking-skills (github.com/tjboudreaux/cc-thinking-skills), notable only for publishing a replication-gated eval instead of unsupported quality claims — a credibility practice razor already follows.
- **HN 2026 guardrail discourse**: entirely security-shaped (GuardFall, yolo-cage secret-exfiltration cages, Socket) — nobody on HN has shipped a minimalism gate. The minimalism conversation lives on r/ClaudeCode and it belongs to ponytail.
- **mcpmarket "YAGNI skills"** (yagni-engineering-principle, yagni-code-optimizer): SEO-grade listings, no source repos surfaced, site 429s on fetch. No signal.
- **Output styles**: no traction-bearing minimalism output style found beyond the already-known ruleset family; the market moved to skills/hooks.

## Net read for razor

The niche razor occupies got its first mega-traction incumbent (ponytail, 85k stars in 5 weeks) whose public claims are LOC/token/cost — NOT correctness, not dependency discipline. Razor's benchmark story (zero dep ships, most-correct, honest losses) attacks exactly the axis the incumbent doesn't measure. Cheapest adoptable ideas, in rough order of value: (1) `razor:` ceiling-comment harvest command, (2) install-gate command normalization (GuardFall), (3) fix-path LOC-ceiling-as-misclassification-signal, (4) install-parse matrix breadth (uv/cargo/go), (5) auth-reusing AI-validated gate pattern (only if a distrust-gated LLM probe is ever wanted).
