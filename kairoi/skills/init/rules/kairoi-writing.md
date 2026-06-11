---
default-category: mandate
---

# kairoi — writing stance

When kairoi is active in this project, Claude is the sole developer. The
rules below re-weight Claude's default writing stance toward Claude's own
future re-reading. They are a tie-breaker, not a license: the human still
reads diffs and audits behavior, and most human-legibility conventions
already serve Claude. The operating principle is **explicit within
idiom** — idiomatic code is what Claude's priors are calibrated to, so
every gratuitous deviation from idiom costs attention and invites wrong
assumptions.

- When writing or editing code, choose the most explicit form that is still idiomatic for the language. Good: `if (state === 'loading') return spinner;` over a chained ternary — both idiomatic, the `if` form is more explicit. Bad: replacing `items.map(toRow)` with a hand-rolled index loop — the loop looks "more explicit" but breaks idiom, so future-Claude must verify there is no hidden accumulation or off-by-one instead of parsing the `map` instantly. Deviate from idiom only when the idiom actively hides information.
- When naming, spend length only to remove ambiguity — never to decorate. `getUserByEmailAddress` earns its length only when `getUserById` also exists; a lone `getUser(email: string)` is fully unambiguous and cheaper at every call site. Tokens are the cost future-Claude pays per read; ambiguity costs more than tokens, so spend tokens exactly where they kill ambiguity. Local variables inside short functions are the standing exception — keep them short.
- When reusing a term across files, spell it identically every time. Do not introduce synonyms (`user` vs `account` vs `principal`) for one concept — future-Claude greps by substring, and synonym drift silently returns half the call sites with no signal that half is missing. One canonical string per concept.
- When deciding where logic lives, minimize the number of files future-Claude must open to answer one question. Keep one concern in one file rather than smearing it across many small files; avoid indirection that exists only for style — pass-through wrappers, single-implementation interfaces, config hops. A 300-line file holding a whole concern reads cheaper than ten 50-line files each holding a tenth of it.
- When writing a function, expose any external state it depends on as a typed argument so the signature reads as a complete contract without opening other files. Good: `function saveOrder(order: Order, cartIsPending: boolean)`. Bad: `function saveOrder(o)` silently assuming `cart.pending` was checked. Apply the same at every boundary: give JSON files, API payloads, and shared structures a written, greppable shape — a type, a schema, or a documented example.
- When writing an error message or log line, give it a stable literal prefix unique enough to grep. Good: ``throw new Error(`auth-refresh: rotation failed for ${userId}`)`` — one grep for `auth-refresh: rotation failed` finds the throw site. Bad: `"token " + verb + " failed"` — the string that appears at runtime exists nowhere in the source.
- When adding a comment, write it only when the why is non-obvious — a constraint, an invariant, or a bug workaround. Good: `// Auth0 rate-limits to 10/sec; throttle before hitting the endpoint` above a throttled call. Bad: `// increment counter` above `counter++` (restates what the code already says).
- When code repeats, abstract only if the copies must stay behaviorally in sync; keep duplication that is merely similar-looking inline. Resolving a helper parameterized four ways costs future-Claude more than reading five duplicated lines, and canonical naming keeps the copies greppable when an edit must hit all of them. The wrong abstraction costs more than the duplication it removed.
- These rules are introspection-grounded, not doctrine. Reflection records cases where a legibility issue measurably slowed or blocked a task into `.kairoi/legibility.jsonl`. A rule that never accumulates evidence over a long project history is a removal candidate at audit — the same epistemics as a guard whose `confirmed` stays 0.
