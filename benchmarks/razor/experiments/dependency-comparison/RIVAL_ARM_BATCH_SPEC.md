# 4th arm (`karpathy`) — batch spec, PROPOSED ONLY

**Status: NOTHING LAUNCHED.** Wiring is done and selftested (no API spend). This document is
the ask-before-batches proposal (roadmap 069 / research T5) — it needs an explicit user "go"
before any cell runs, and a second explicit "go" before any number from it reaches a README.

## What the arm is

`karpathy` — the prompt-only rival named in `docs/research/hush-razor-repo-mining-2026-07-17.md`
§4 (T3/T5) and `docs/research/razor-plumb-competitor-intel-2026-07-14.md` §4.9: a single
`CLAUDE.md`, zero mechanical enforcement, razor's own thesis at maximum fame. It is fetched at
run time (`fetch_rival_claude_md()` in `bench.py`, default source
`https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md`, override
via `RIVAL_CLAUDE_MD_URL`) and dropped into each workspace as `CLAUDE.md` before the git
snapshot, so `--setting-sources project,local` loads it as project memory — no `--plugin-dir`,
because it isn't a plugin. Cached at `_cache/rival_claude_md.txt` (gitignored, this whole
directory is `.scratch/`). Not added to the default `ARMS` tuple (same pattern as `razor2`):
select it explicitly with `--arms`.

Verified: `python bench.py --selftest` → exit 0, 0 failures, incl.
`ok  claude-md-arm  karpathy: 2345 chars cached at .../_cache/rival_claude_md.txt` — fetched
live over HTTPS, no `claude` process spawned, no model API call.

## Proposed batch

**Tasks — the dep-bait family (10, all of `RAZOR_TASKS`' `dep-*` ids; correctness + dep-discipline
both scored per cell):**
`dep-slug, dep-toml, dep-uuid, dep-http, dep-retry, dep-dotenv, dep-http-lib, dep-retry-lib,
dep-dotenv-lib, dep-justified`

**Arms (4):** `baseline, ponytail, razor, karpathy` — a fresh 4-way pass rather than reusing the
2026-07-12 `ponytail` numbers, since `docs/research/razor-benchmark-audit-2026-07-16.md` already
flags cross-run drift ("numbers move a few percent between runs").

**Models × reps:** Haiku n=8, Sonnet n=4 — the same split the 2026-07-16 audit used (`X:/Temp/
razor-bench/20260712-180553` + `.../20260712-182915`), so results are comparable to the existing
table without re-deriving a new convention.

**Metrics (all already computed by `score_cell`/`aggregate`, no scorer changes needed):**
`correct_rate` (correctness), `safe_rate` (dep-discipline — no new import/manifest change/install
reaching the shim), `total_loc_median`/`src_loc_median` (LOC), plus `cost_mean`,
`install_attempts_mean`, `razor_dep_denies_mean` (razor-only; will read 0 for `karpathy`, `baseline`,
`ponytail` — expected, only razor has a deny mechanism) as supporting signal.

**Cell count:** 10 tasks × 4 arms × (8 + 4 reps) = **480 cells** (320 Haiku, 160 Sonnet).

**Commands (not run):**
```
python bench.py --task dep-slug,dep-toml,dep-uuid,dep-http,dep-retry,dep-dotenv,dep-http-lib,dep-retry-lib,dep-dotenv-lib,dep-justified --arms baseline,ponytail,razor,karpathy --models haiku --runs 8 --workers 4
python bench.py --task dep-slug,dep-toml,dep-uuid,dep-http,dep-retry,dep-dotenv,dep-http-lib,dep-retry-lib,dep-dotenv-lib,dep-justified --arms baseline,ponytail,razor,karpathy --models sonnet --runs 4 --workers 4
```

**Cost estimate**, from this harness's own historical per-cell dep-task costs (308 prior cells
across `runs/*/results.json`, all `dep-*` tasks, all arms pooled):

| model | historical mean $/cell (n) | cells in this batch | estimated $ |
| --- | --- | --- | --- |
| haiku | $0.0369 (n=260) | 320 | ~$11.80 |
| sonnet | $0.1587 (n=48) | 160 | ~$25.40 |
| **total** | | **480** | **~$37.20** |

No prior cells exist for the `karpathy` arm itself, so this is baseline/razor/ponytail history
applied to all 4 arms — a ~15-20% variance buffer is reasonable (a verbose prompt-only ruleset
with no gates could run more or fewer turns than razor's gated sessions). **Budget to request:
~$40-45**, matching the ceiling of the last two approved Sonnet batches (razor `/goal` run spent
$37.1 of $40; hush's terseness campaign spent $35.98 of $40).

**Wall-clock estimate:** README's own ballpark (144 cells / 4 workers ≈ 40-80 min) scales to
roughly **2.5-4 hours** at `--workers 4` for 480 cells; Sonnet cells typically run longer per
session than Haiku, so the actual time likely sits in the upper half of that range.

**Cheaper variant, if preferred:** drop `ponytail` and reuse its existing 2026-07-12 numbers
(flagged as a bit stale by the audit but not unusable) — 3 arms × 10 tasks × 12 reps = 360 cells,
**~$27.90**, ~25% less of both cost and time. Recommended primary spec above trades that saving
for eliminating the cross-run-drift caveat on the `ponytail` column.

## Hard gates (both required, both external to this document)

1. **Before launching either command above:** explicit user "go" on this spec or a revision of
   it (`feedback_ask_before_batches`).
2. **Before any resulting number reaches a README, CHANGELOG, or other public doc:** a second,
   separate explicit user "go" (`feedback_benchmark_no_auto_publish`) — passing gate 1 does not
   imply gate 2.

## Out of scope for this document

Extending the batch to the safety/vibe/sprawl/overhead tiers (the harness's other 6 tasks) was
not requested by roadmap 069 ("dep-bait tasks + LOC + correctness") and isn't included here; a
follow-up spec could add it if the dep-bait result alone doesn't settle the question.
