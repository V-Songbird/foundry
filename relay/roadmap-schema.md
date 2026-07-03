# Relay — ROADMAP.jsonl schema

<!-- relay:roadmap-schema lastmod:2026-07-03 -->

`ROADMAP.jsonl` lives at the **project root** (not inside this plugin) and is
committed to git — it's a visible, shared record of the project's plan, not
internal Relay state. One JSON object per line (JSON Lines, not a JSON
array): one line = one task. Line-per-task is deliberate — changing one
task's status touches exactly one line, so `git diff` on this file shows a
clean one-line change per update instead of reformatting the whole file.

There is no parser/writer script for this file. Reading and writing it is a
handful of short lines, done rarely — read it with `Read`, edit it with
`Edit`, following the invariants below. Skip building tooling for this; it
would be solving a problem this file doesn't have.

---

## Fields

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Zero-padded sequential id (`"001"`, `"002"`, ...). Compute as `max(existing ids) + 1` over a **fresh full parse of the file**, immediately before writing. |
| `title` | string | yes | Short imperative summary, e.g. `"Add JWT refresh middleware"`. |
| `why` | string | yes | The rationale — the problem or need this task addresses. |
| `what` | string | yes | What the task concretely consists of. |
| `status` | enum | yes | `planned \| in_progress \| done \| dropped \| rejected`. See below. |
| `source` | enum | yes | `user` (added directly by a person) or `claude-suggested` (originated from the commit-hook discovery flow). |
| `depends_on` | array\<string\> | yes (may be `[]`) | Ids of tasks that must be `done` before this one is unblocked. |
| `touches` | array\<string\> | yes (may be `[]`) | Flat file/area path hints, e.g. `"src/auth/middleware.ts"` or `"src/auth/"`. Plain strings only — no need for glob/AST matching at this scale, this is for eyeballed collision checks. |
| `commits` | array\<string\> | yes (may be `[]`) | Short SHAs (`git rev-parse --short HEAD` output) that implemented this task. |
| `created_at` | string (`YYYY-MM-DD`) | yes | Set once, at creation, never rewritten. |
| `updated_at` | string (`YYYY-MM-DD`) | yes | Rewritten on every change to the entry. |
| `notes` | string | yes (may be `""`) | Free text. **Append-only** — add to it, never overwrite what's already there. |

### `status` values

- `planned` — not started. May be blocked (see below).
- `in_progress` — actively being worked.
- `done` — finished; `commits` should be non-empty.
- `dropped` — was `planned`/`in_progress`, later decided not worth doing.
- `rejected` — a `claude-suggested` entry the user explicitly declined at
  proposal time. It never becomes `planned`. Kept on record (instead of just
  not writing it) so the discovery flow can check existing `rejected`
  entries before re-suggesting the same idea on a future commit.

**There is no stored `blocked` status.** Blocked-ness is derived at read
time: a `planned` task with any `depends_on` id whose entry isn't `done` yet
is blocked. Computing this live means there's one less state that can drift
out of sync with reality.

---

## Write invariants

Every writer (`relay:init`, `relay:roadmap`, or the commit hook's
instructions) follows these:

1. **Parse before writing.** Read the whole file, `JSON.parse` every line.
   If a line fails to parse, stop and surface the corrupt line to the user —
   don't write on top of unknown-bad state. This full parse is also how the
   next `id` gets computed (`max + 1`).
2. **Parse after writing.** Re-read the file and re-parse every line to
   confirm it's still well-formed JSONL before reporting success.
3. **`notes` is append-only.** Never replace existing text in `notes` —
   add to it (e.g. with a `; ` separator) so earlier context stays legible.
4. **`updated_at` changes on every write to an entry.** `created_at` never
   does.

---

## Worked example

A 4-task file showing a dependency chain and one Claude-suggested entry:

```jsonl
{"id":"001","title":"Design auth token schema","why":"No agreed token shape before middleware work starts.","what":"Decide access/refresh token fields and expiry policy.","status":"done","source":"user","depends_on":[],"touches":["docs/auth-design.md"],"commits":["a1b2c3d"],"created_at":"2026-06-20","updated_at":"2026-06-22","notes":""}
{"id":"002","title":"Add JWT refresh middleware","why":"Sessions expire mid-request under load; users get silently logged out.","what":"Refresh the access token in middleware before its 15-min expiry.","status":"in_progress","source":"user","depends_on":["001"],"touches":["src/auth/middleware.ts"],"commits":[],"created_at":"2026-06-22","updated_at":"2026-07-03","notes":""}
{"id":"003","title":"Add refresh-token revocation endpoint","why":"No way to force-expire a stolen refresh token today.","what":"POST /auth/revoke — deletes the refresh token server-side.","status":"planned","source":"user","depends_on":["002"],"touches":["src/auth/routes.ts"],"commits":[],"created_at":"2026-06-22","updated_at":"2026-06-22","notes":""}
{"id":"004","title":"Extract duplicated retry logic in fetch wrapper","why":"Same exponential-backoff loop copy-pasted in 3 API clients, spotted while implementing task 002.","what":"Pull the retry loop into one shared helper, point all 3 callers at it.","status":"planned","source":"claude-suggested","depends_on":[],"touches":["src/api/"],"commits":[],"created_at":"2026-07-03","updated_at":"2026-07-03","notes":"surfaced via post-commit discovery scan on commit a1b2c3d"}
```

`003` is blocked right now — derived, not stored — because `002` isn't
`done` yet. `004` shows the discovery flow's shape: `source:
"claude-suggested"`, and a `notes` breadcrumb pointing back at the commit
that surfaced it.

---

## `.relay/config.json`

Sibling runtime file, also at the project root, also committed:

```json
{"discoverySuggestions": true}
```

The one field `relay:init`'s key question sets. Missing or unparseable →
treated as `false` everywhere it's read (silent, no nudging — a project that
never ran `relay:init` gets nothing from Relay's commit hook).

---

## Who reads and writes this file

- `relay:init` — creates it.
- `relay:roadmap` — reads it (all three menu branches), writes it (Pick
  next task sets `in_progress`; Add a task appends a `planned` entry).
- `relay/hooks/post-commit.js` — reads it read-only (a cheap substring
  check for `"status":"in_progress"` to decide whether to mention
  status-sync at all). It never writes to the file itself — it only emits
  instructions telling Claude to update it, keeping every actual write in a
  reviewable, skill- or Claude-driven path rather than a script's hands.
