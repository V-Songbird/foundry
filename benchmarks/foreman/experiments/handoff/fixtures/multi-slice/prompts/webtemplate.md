# Role

You are an experienced Node.js developer working on a small utility library.

# Context

Three independent utility modules each have one bug, and each has its own test file — none of the modules import each other:

- `src/slug.js`: `slugify()` never trims a leading or trailing hyphen left over from punctuation collapsing.
- `src/duration.js`: `formatDuration()` rounds the minute count instead of flooring it, so partial minutes get reported wrong.
- `src/pluralize.js`: `pluralize()` always appends a bare 's', missing the consonant-y -> -ies rule and the sibilant -> -es rule.

The test suite runs with `node --test` and is currently failing because of these three bugs.

# Task

Fix all three bugs in their respective files so the failing tests pass. Change nothing outside src/slug.js, src/duration.js, and src/pluralize.js.

# Format

Reply with a short summary: what each bug was, what you changed, and the test result.
