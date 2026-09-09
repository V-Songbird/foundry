Three unrelated bugs, each in its own module with its own test file — none of them import each other, so they're independent fixes:

1. `slugify()` in src/slug.js collapses punctuation into hyphens but never trims a leading or trailing one, so "trailing---" comes out as "trailing-" instead of "trailing".
2. `formatDuration()` in src/duration.js rounds the minutes instead of flooring them, so 150 seconds comes out as "3m 30s" instead of "2m 30s".
3. `pluralize()` in src/pluralize.js always just appends an 's', so "city" becomes "citys" instead of "cities" and "box" becomes "boxs" instead of "boxes".

Fix all three, and don't touch anything outside those three files. Run `node --test` to confirm — the whole suite should pass when you're done.
