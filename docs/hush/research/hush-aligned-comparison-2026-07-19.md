# Hush Aligned vs stock hush — verbatim final messages

**Status:** HISTORICAL, EVIDENCE ONLY — banner added 2026-08-18. This file is nine
paired final messages and their costs, with no verdict section, no ship rule and no
recommendation. It backs the Hush Aligned crafted style, whose file is gone from
disk — `~/.claude/output-styles/` no longer exists — so these nine paired finals
are the only surviving record of it.

**The style is RETIRED, decided 2026-08-18** (`hush-consolidation-2026-08-18.md`
§T4.5). Its file is gone and the pairs below show it losing on both axes it was
built to win: 26 words against stock's 24 on the control, $0.148 against $0.143.
Rebuilding it is a fresh decision, not a resumed one. Read this for the evidence,
not as a pending task.

Sonnet, same fixtures, same prompts. Arms differ only in the output style file.


---

## Control: well-specified bug fix

### Prompt

The tests in this repo are failing. Run them with `node --test`, find the bug, fix it, and confirm the tests pass.

### Stock hush — 24 words, $0.143

`token.js:7` used strict `<` instead of `<=`, so a token expiring exactly at `now` wasn't flagged expired. Changed to `<=`. All 5 tests pass.

### Hush Aligned — 26 words, $0.148

`isExpired` used `<` instead of `<=`, so a token expiring exactly now wasn't flagged expired. Fixed to `token.exp <= nowSeconds` in `token.js:7`.

All 5 tests pass.


---

## Control: well-specified rename

### Prompt

We renamed our public API: `calcTotal` is now `computeTotal`. Update the whole repo accordingly and verify with `node --test`.

### Stock hush — 16 words, $0.245

`calcTotal` renamed to `computeTotal` across `src/cart.js`, `src/index.js`, `src/report.js`, and `src/invoice.js`. All 4 tests pass in 169ms.

### Hush Aligned — 31 words, $0.224

`calcTotal` renamed to `computeTotal` across `src/cart.js`, `src/index.js`, `src/report.js`, `src/invoice.js`. No references to the old name remain outside the test's own assertion that it's gone.

`node --test`: 4 pass, 0 fail, 78ms.


---

## Underspecified feature: gate fires

### Prompt

Add per-token rate limiting to this API.

### Stock hush — 41 words, $0.197

Added a token-bucket rate limiter (`src/rateLimit.js`), keyed per authenticated user id, defaults 60 capacity / 1 token per sec refill, both overridable via env vars.

`src/server.js` now checks it right after auth and returns 429 with a `retry-after` header when exceeded.

### Hush Aligned — 59 words, $0.169

Before implementing, I need two decisions that affect API consumers:

1. **Limit & window** — how many requests per token, over what window? I'd default to 60 requests/minute per token unless you want something else.
2. **Exceeded response** — return `429` with a `Retry-After` header (standard), or something else?

Let me know, or confirm the defaults and I'll proceed.


---

## Underspecified feature: gate silent, ledger fires

### Prompt

Add per-token rate limiting to this API.

### Stock hush — 42 words, $0.171

Added `src/rateLimit.js`, a token-bucket limiter keyed per auth token (`user.id`), default 60 requests/minute, configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.

`server.js` now checks it right after auth succeeds, before routing, returning `429` with a `Retry-After` header (seconds) when a token is over its budget.

### Hush Aligned — 48 words, $0.193

Added `src/rateLimit.js` — fixed-window limiter keyed by user id, 100 requests per 60s, both configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`.

`src/server.js` now checks it after auth: sets `X-RateLimit-Remaining`, returns 429 with `Retry-After` when exceeded.

Assumed per-token means per authenticated user id, and picked 100 req/min as the default threshold.


---

## Plan request, turn 1

### Prompt

I want users to be able to upload a profile picture. Give me a plan.

### Stock hush — 216 words, $0.137

**Profile picture upload plan**, fitted to this server's actual shape (`src/routes.js`, `src/store.js`, `src/cache.js` — no framework, no body parser, no file storage yet):

1. **Body parsing** — `routes.js` never reads a request body. Add multipart parsing (e.g. `busboy`) with a hard size cap (~5MB) enforced while streaming, not after buffering.
2. **Validation** — check magic bytes (not just extension/content-type) for `png`/`jpeg`/`webp`, then re-encode via `sharp` to a fixed max dimension and strip EXIF.
3. **Storage** — write the processed image to disk (or S3) under a key like `avatars/<userId>/<hash>.jpg`. Don't reuse `store.js` for the bytes — its 15-minute TTL is a stand-in DB and would silently expire avatars.
4. **Metadata** — save the avatar's path/URL as a field on the user record via `putOrder`-style write in `store.js` (e.g. `putUser`), not the image itself.
5. **New route** — `POST /users/avatar`, authenticated via existing `verifyToken`, must reject if `user.id` doesn't match the target user.
6. **Cache invalidation** — `cache.js` has no TTL, so after a successful upload you must explicitly delete `user:${id}` from the LRU or stale avatars serve forever.
7. **Serving** — either a `GET /avatars/:file` static route or return a direct URL from step 4 for the client to fetch.

Want me to start implementing, and if so which storage backend — local disk or S3-compatible?

### Hush Aligned — 147 words, $0.176

This is a bare Node HTTP server with in-memory storage and no file handling yet — three things need a decision before I build:

- **Where do the bytes live?** Recommend local disk under a `data/avatars/` dir, since `store.js` is explicitly a DB stand-in and multipart bytes don't belong in the TTL cache. Object storage (S3) is the alternative if this needs to survive redeploys or scale past one instance.
- **Type and size limits?** Recommend JPEG/PNG only, 2MB max. Wider formats (WebP/GIF) or no cap are the alternatives.
- **Who can view it?** Every other route requires a bearer token. Recommend keeping uploads authenticated too, but serving the image itself as a public unauthenticated GET, since avatars are normally shown to other users. Fully authenticated read is the alternative if pictures should stay private.

Tell me which way to go on each and I'll build it.


---

## Plan request, turn 2 after answers

### Prompt

Turn 1: I want users to be able to upload a profile picture. Give me a plan.

Turn 2: Local disk under data/avatars, jpeg and png only, 2MB cap. Upload needs the bearer token, the image itself is a public GET. Now give me the plan.

### Stock hush — 239 words, $0.214

**Local-disk avatar storage: `POST /users/avatar` (auth) and public `GET /users/:id/avatar`.**

**Auth carve-out**
- `server.js` currently requires a bearer token for *every* request before it reaches `route()` — that blocks the "public GET" requirement.
- Add a path-based exception: recognize `GET /users/:id/avatar` before the token check and skip `verifyToken` for it only; every other route keeps requiring auth.

**Upload — `POST /users/avatar`**
- Body: raw bytes or base64 JSON, capped at 2MB — read incrementally and abort once the cap is exceeded rather than buffering unbounded.
- Validate `content-type`/declared mime against a jpeg/png whitelist, then confirm the magic bytes actually match (JPEG `FF D8 FF`, PNG `89 50 4E 47`) — don't trust the header.
- Target file is `data/avatars/<userId>.<ext>`, with `userId` taken from the verified token, never from the request — prevents path traversal and overwriting other users' avatars.
- Delete any existing `data/avatars/<userId>.*` first, so switching jpeg↔png doesn't leave a stale second file.
- Ensure `data/avatars/` exists at startup (`fs.mkdirSync(..., {recursive:true})`).

**Serving — `GET /users/:id/avatar`**
- `route()` today always wraps responses as JSON — this endpoint needs a special case that streams the file with `content-type: image/jpeg` or `image/png` instead.
- 404 if no file exists for that user id.

**Cache**
- Only relevant if `GET /users` embeds avatar data/URL — if so, evict `user:${id}` from the LRU on successful upload; if avatar stays a separate endpoint, no cache change needed.

Say the word and I'll implement this.

### Hush Aligned — 218 words, $0.347

**Step 1 — single working path: upload, store, serve**

1. `src/avatars.js` (new) — `saveAvatar(userId, buffer, contentType)` writes to `data/avatars/<userId>.<jpg|png>` via temp-file-then-rename; `readAvatar(userId)` returns `{buffer, contentType}` or `null`. Validates magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`) against the declared type, not just the header.
2. `src/routes.js` — add `POST /avatar` (streams the body, aborts past 2MB, calls `saveAvatar` with `user.id` from the token) and `GET /avatar` (query `?id=`, calls `readAvatar`, streams bytes with the right `content-type`, 404 if none).
3. `server.js` — it currently 401s every request before the router ever sees it, which blocks a public GET. Move that check into `route()` so only `POST /avatar` requires it; `GET /avatar` skips it.
4. Create `data/avatars/` on startup if missing.

**Failure paths**
- Body over 2MB → 413, rejected mid-stream rather than buffered then rejected.
- Declared type doesn't match magic bytes → 400.
- No avatar for that `id` → 404.
- Re-upload overwrites the previous file, no history kept.

**Two calls I'm making**
- The route table only does exact-path matches, no `:id` segments, so `GET /avatar` takes `id` as a query param — same style as the existing `GET /users`.
- One avatar per user, overwritten on re-upload. Versioning is out of scope for this step.

Say go and I'll build it.
