# CodeLore intel + plugin-conversion thesis — 2026-07-17

**PRIVATE (gitignored).** Reference project: `codelore` (github.com/PaulBenchea/codelore, npm
`codelore-mcp`), cloned at `D:\Projects\Knowledge\codelore`. Name added to
`docs/shared/research/reference-names.txt` — it must never reach a public record.

Ground truth: every file in `src/` was read in full (11 modules, ~700 LOC total), plus README,
CHANGELOG, package.json, git log, `.github/`. MIT license. Author: Paul Benchea. v0.1.0
2026-07-15 → v0.3.0 2026-07-17 — the project is **two days old**. Deps:
`@modelcontextprotocol/sdk`, `minisearch`, `zod`. **Zero tests.**

---

## 1. What it actually is

An MCP stdio server that maintains LLM-written code documentation as markdown on disk:

- **Storage**: global root `~/.codelore` (overridable via `--root` / `CODELORE_ROOT`), fixed
  4-level hierarchy `project → category → chapter → topic`. Category is prescribed as
  "a technology" (angular, dotnet, sql), chapter as "a functional area".
- **Two perspectives per topic**: `internal.md` (how the code works) and `usage.md` (how to use
  it). Both are force-created as stubs (`_Not documented yet._`) the moment a topic is defined.
- **Source of truth**: a `.meta.json` (name, description, createdAt, updatedAt) in every
  directory level. `INDEX.md` files at every level are regenerated from disk on every write.
- **9 tools**: `list_projects`, `register_project`, `define_category`, `define_chapter`,
  `define_topic`, `get_project_map` (full TOC in one call — the intended read entry point),
  `search_docs` (MiniSearch, in-memory, re-indexed per call, fuzzy 0.2 + prefix, boost
  topic×3/description×2), `write_doc` (replace/append; server owns frontmatter + generated H1,
  LLM supplies body only), `read_doc` (internal/usage/both, whole file).
- **Convention enforcement**: names slugified (`[^a-z0-9]+ → -`), frontmatter
  (project/category/chapter/topic/kind/updated) machine-generated, `extractBody()` strips
  frontmatter + H1 so round-trips stay clean.

Key structural observation: **no tool ever reads the INDEX.md files.** They are write-only
artifacts intended for humans or filesystem-browsing agents. `get_project_map` re-walks the
tree with `.meta.json` reads instead. This accident matters for the conversion (see §4/D3).

## 2. The idea — what's worth keeping

1. **Map-then-fetch reading.** Cheap TOC → fetch exactly one doc. This targets the single
   biggest cross-session token waste — re-deriving the codebase every session — which nothing
   in our trio touches (hush optimizes within-turn output; razor optimizes written code;
   foreman optimizes handoffs). A durable-knowledge layer is a real open axis.
2. **Audience-split perspectives.** internal-vs-usage is genuinely right: a consumer of a
   component needs recipes, a maintainer needs mechanism, and reading the wrong one wastes
   tokens in both directions.
3. **Machine-owned convention, LLM-owned prose.** The server generates structure, frontmatter,
   titles, indexes; the LLM only ever supplies the body. Indexes regenerate from disk so they
   cannot drift. Same instinct as razor's gates and foreman's check-prompt: mechanical
   enforcement of HOW, not vibes.
4. **Capture at the moment of understanding.** Docs written by the agent that just did the
   work, not reconstructed later.

## 3. Execution failures (ranked)

- **F1 — Nothing keeps docs true (fatal).** A doc carries only an `updated:` date. No file
  anchors, no hashes, no commit linkage. Code changes → doc silently rots → a reader trusts a
  confident stale doc. The foreman handoff campaign already measured exactly this failure
  class: stale premises poisoned the vibe arm 0/4 on the moved-file decoy, and
  cost-of-ignorance ran 30%+. CodeLore doesn't just fail to prevent that — at scale it
  *manufactures* it, because it institutionalizes confident prose with no expiry mechanism.
- **F2 — Nothing makes the loop run.** No hooks, no client integration, no lifecycle. Writing
  depends on the model spontaneously performing a 4–5 tool ceremony mid-task; reading depends
  on it remembering the MCP exists. MCP tool descriptions are the weakest lever in the stack.
  Predictable steady state: docs never written, or written once and never read again.
- **F3 — Prescribed taxonomy.** Fixed 4 levels with prescribed meanings ("category = the
  technology") is an ungrounded a-priori heuristic — precisely what the house philosophy
  rejects. Real codebases don't decompose into tech→area→topic, and the LLM's first taxonomy
  guess is usually wrong…
- **F4 — …and there is no rename/move/delete tool.** Taxonomy mistakes are permanent from the
  tool surface; fixing them means hand-editing `~/.codelore`. Also: slugify silently merges
  "Grid Page" and "grid-page", and throws on fully non-Latin names.
- **F5 — Global root outside the repo.** Not versioned, not PR-reviewable, not team-shared; doc
  and code can't change in the same commit; no history, no blame, no review. Git already solves
  distribution/versioning/review — codelore rebuilds none of it and forfeits all of it.
- **F6 — Token economics asserted, never measured, partly wrong.** `get_project_map` is
  O(entire tree) and grows without bound (per-topic lines with two status fields each);
  `read_doc` is whole-file only, no per-section fetch; frontmatter repeats what the path
  already encodes; forced stubs mean every topic ships two files even when one perspective is
  enough. And there is zero evidence anywhere that doc-first beats code-first on cost or
  correctness.
- **F7 — Write friction.** `register_project → define_category → define_chapter → define_topic
  → write_doc` before one paragraph lands. `ensureAncestors` then auto-creates missing levels
  with empty descriptions — a patch for friction the hierarchy itself created, which leaves
  undescribed nodes the map renders as "(no description)".
- **F8 — Minor mechanics.** Append mode is read-modify-write with no locking (multi-session
  last-write-wins); search re-indexes the whole corpus per call; code-fence content pollutes
  fuzzy matching; `docStatus` measures chars not tokens; zero tests of any kind.

## 4. Conversion thesis — the knowledge layer

**Positioning**: cheaper = hush, leaner = razor, prompts = foreman,
**known = this**. One sentence: *a repo-resident, agent-written knowledge base where every doc
carries mechanical evidence of still being true.* The differentiator nobody has (codelore
included, and none of the six prior-swept rivals): **verified freshness** — a claim-vs-evidence
check applied to knowledge instead of completion.

Design moves, each reversing a failure:

- **D1 — Anchors as first-class (kills F1).** Every doc's frontmatter declares the files (or
  file+symbol) it describes; at write time the plugin records their content hashes (or git blob
  SHAs). Staleness detection = hash diff — mechanical, zero tokens, no LLM judgment. Doc
  states: `fresh` / `stale` / `unverified`. A stale doc is still served, but *with its
  staleness declared* — the reader treats it as hypothesis, not fact. This converts F1's
  cost-of-ignorance into a labeled, measurable risk.
- **D2 — Hooks close both loops (kills F2).**
  - `PostToolUse(Edit|Write)`: edited path ∩ anchor set → mark affected docs stale in a ledger.
    Silent, mechanical, zero tokens.
  - `Stop`: if the turn edited anchored files → one-line nudge naming the now-stale docs.
    Wording per prompt-wording-lessons: no scenario priming, no deny-conflict framing.
  - `SessionStart`: inject a small fresh-docs digest only when coverage exists and freshness
    ratio is decent — hush-grade token budget discipline, silent otherwise.
  - `UserPromptSubmit` (probe, not spec): match prompt terms against the doc index → one-line
    "a fresh doc covers X" hint.
- **D3 — No MCP server (kills half of F6 + F7).** For a Claude Code plugin the read path is
  native: docs are in-repo markdown, INDEX.md files ARE the map, Read/Grep/Glob already fetch
  them with zero protocol overhead. CodeLore's own write-only INDEX.md regeneration
  accidentally proves the MCP surface is unnecessary for this client. Keep a small Node CLI
  (razor/hush-style hook scripts) for the mechanical parts: index regen, anchor hashing,
  staleness ledger, convention validation. An MCP server remains a *future optional add-on*
  for non-Claude clients — that is codelore's actual moat, and not our fight today.
- **D4 — In-repo, free-form tree (kills F3 + F5).** Docs live in the repo (location
  configurable; default something like `docs/<name>/`). Versioned, PR-reviewed, team-shared,
  doc+code atomic commits — git is the stdlib here. Directory depth is free-form: the agent
  organizes as understanding dictates; the plugin enforces only file-level convention
  (frontmatter shape, anchors present, indexes regenerated). Mechanical HOW, agent-discovered
  WHAT — philosophy-filter compliant.
- **D5 — Perspectives optional (fixes forced stubs).** `audience: user | maintainer` as
  frontmatter on however many docs a topic warrants. No auto-created stub pollution.
- **D6 — Write friction ≈ one file write.** The agent writes a markdown file; a
  PostToolUse-triggered validator normalizes frontmatter, computes anchor hashes, regenerates
  indexes — the ceremony chain becomes a gate, like the marketplace's manifest hooks. A
  `/document` skill guides deliberate documentation passes.

## 5. Differentiation audit

| Against | Their shape | Why this is different |
| --- | --- | --- |
| CLAUDE.md | Always loaded, every turn, unanchored, rots identically | Fetch-on-demand + mechanically verified freshness |
| Auto-memory | Private, per-user, conversation-grained | Team-shared, repo-resident, code-anchored |
| foreman | What to do next (roadmap) | What is known (knowledge); handoff prompts can cite fresh docs |
| codelore + rivals | Prose with a date | Prose with receipts (anchors + hash-verified state) |

## 6. Benchmark plan (before believing anything)

Reuse the `.scratch/` harness (multi-turn `prompts[]`, `--resume`, density; mind the two
known traps: rate-limit-poisoned "wins" and chat-grep ground-truth vs file-writing arms).

- **Arms**: cold (no docs) / fresh docs / stale-docs-undeclared (codelore mode) /
  stale-docs-declared (our D1). Fixtured repo where code moved after doc-write — the moved-file
  decoy pattern from the foreman campaign, which is already built and proven discriminating.
- **Metrics**: cost, correctness, cost-of-ignorance, doc-read rate per arm.
- **The product thesis is one delta**: stale-declared vs stale-undeclared. If declaring
  staleness doesn't rescue correctness, the anchor machinery is YAGNI and the plugin collapses
  to "in-repo docs + map hooks" — cheaper to learn that before building D1.
- **Secondary probe**: does the SessionStart digest actually change read behavior, or is it
  ignored? (Measure doc-read rate with/without.)

## 7. Open questions / risks

- **Write-side adoption is the genuinely hard problem.** When does the agent *create* a doc
  (not just refresh a stale one)? Candidates: `/document` skill for deliberate passes; a
  Stop-hook suggestion only after a session did heavy exploration of an undocumented area
  (detection heuristic — probe; risk of nagging is real, priming lessons apply).
- **Doc-body bloat**: nothing stops 500-word essays that cost more to read than the code.
  Possible hush-style length gate on bodies — probe, not spec.
- **Anchor granularity**: file-level hashing is cheap but noisy (any edit → stale); symbol-level
  needs parsing (tree-sitter — a heavy dep razor would veto; git-diff-hunk ∩ line-range may be
  the cheap middle). Start file-level, measure false-stale rate.
- **Naming**: single evocative house word; nothing derived from the reference project ("lore"
  is adjacency-risky — avoid). Candidates: `cairn` (stones stacked to mark the path for the
  next traveler — closest semantic fit), `atlas`, `codex`, `ledger`.
- **Home**: build experimentally outside this repo first, in-tree with no pin gates;
  graduate to foundry only if the §6 benchmark holds.
