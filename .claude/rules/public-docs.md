---
paths:
  - "**/README.md"
  - "**/CHANGELOG.md"
---

# Public docs: READMEs and CHANGELOGs

These files are read by end users of the plugins. Every line must help a user decide or act — nothing else earns a place.

- Describe what the plugin does and what a release changes **for the user**. Never document internal process: no benchmark methodology, run tags, sample sizes, per-rep numbers, A/B setups, transcript quotes, or investigation narratives. That detail lives in private memory only.
- CHANGELOG entries are short and user-facing — "Fixed an issue where…", "Added…" — a few lines at most. State the effect, not the journey. No design rationale, no lessons learned, no wording-choice commentary.
- READMEs describe **current** behavior only. Never narrate history ("used to X, now closed") and never keep a caveat for an issue that is already resolved — the CHANGELOG is the record of the past.
- A known limitation belongs in the README only while it is real, current, and user-relevant. When it's fixed, delete the caveat entirely; don't soften it to "mostly closed".
- Never name competitor plugins anywhere in public material; contrast with generic categories and sell on own merits.
- Match the canonical skeleton/tone in `.github/PLUGIN_README_TEMPLATE.md` (razor and hush are the reference implementations).
