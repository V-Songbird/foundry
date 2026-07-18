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
- **Competitor and reference-project names may appear only in a plugin's `README.md`** — that's the marketing surface, and naming a rival to beat it ("beating the giants") is fair game there. Nowhere else: not CHANGELOGs, manifests, code comments, test names and fixtures, branch names, PR text, or **git commit messages** (subject and body), across the root repo and every submodule. Outside a README, contrast with a generic category ("a rival tool", "a public reference") instead. The names live in gitignored private notes (`docs/research/`); a pre-commit + commit-msg hook (`scripts/git-hooks/check-reference-names.js`, blocklist gitignored, fail-open when absent) enforces this mechanically — its staged-change scan skips `README.md` files and it always blocks commit messages.
- Match the canonical skeleton/voice in `.github/PLUGIN_README_TEMPLATE.md` — dry, deadpan, personality-forward (not warm-corporate hype); the template carries a synthetic voice exemplar to calibrate against. Two non-negotiables: no profanity, and never make the joke at a real project's or person's expense — naming a rival to out-compete it is fine, belittling it is not. razor and hush are the reference implementations.
- For a callout that needs visual weight (an honest limitation, a non-destructive guarantee, a cost caveat), use GitHub's alert syntax — `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` — instead of an italic aside. Pick the type by actual stakes: NOTE/TIP for helpful context, IMPORTANT for something the user needs to succeed, WARNING/CAUTION for real risk. Don't reach for WARNING or CAUTION to manufacture urgency a NOTE would cover. Use one or two per file, not one per paragraph.
