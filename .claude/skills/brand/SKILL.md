---
name: brand
description: Creates or revises the flat-ink artwork of Foundry and its plugins from the kit in brand/ (icons, README banners, wordmarks, social cards, host cards, the Ember scenes and the evidence graphics) and copies it into a plugin's assets/. Use for any change to that artwork, for a new host card such as Antigravity, or when a plugin's images drifted from the kit. Not for other brands, interface design or benchmark data.
license: MIT
compatibility: Claude Code and Codex in the Foundry checkout. Requires Node 22 or later; the identity build also needs Sharp and Segoe UI.
metadata:
  version: "1.0"
---

# brand

The colors, symbols, deliverables and copy map live in
[the brand guide](../../../docs/knowledge/brand.md). Read it first; this skill is the order of work.

1. **Change sources, never outputs.** Icons and host cards: `brand/identity/source/`. Scenes:
   `brand/mascot/build.cjs` and `brand/mascot/source/`. Evidence graphics:
   `brand/graphics/build.cjs` and `brand/graphics/source/`. Keep recorded text, numbers, plotted
   marks and replay timing exactly as recorded, and keep each scene's closing line.
2. **Rebuild what changed**, from the repository root:

   ```bash
   node brand/mascot/build.cjs
   node brand/graphics/build.cjs
   node brand/identity/build.cjs
   node brand/identity/build-review.cjs
   ```

   The identity build needs Sharp and Segoe UI. Without them, report it as not run. Always
   finish with `build-review.cjs`, which refreshes the gallery.
3. **Check.** Run `node brand/check-timing.js <svg>` on each SVG with SMIL animation. Then look
   at the built images yourself before the owner does: each changed brand's icon, social card,
   banner and wordmark in both themes, with every icon at 128, 64 and 32 px, and each changed host
   card in both themes at 128, 80 and 32 px, for example through the gallery in a browser tool.
   Say what you saw: spelling, clipping, contrast, transparency, and whether each symbol or card
   still reads at 32 px. Then ask the owner to open `brand/identity/index.html` in a web browser,
   straight from disk; a preview that loads only the page shows every image broken. The owner
   reviews both themes, with icons at 128, 64 and 32 px and changed host cards at 128, 80 and
   32 px, and that review is the final word. A passing build is not a visual review.
4. **Copy.** In the plugin's repository, on a topic branch, copy each file under the name the
   guide's copy map gives it. Place each image as
   [the README contract](../../../docs/knowledge/plugin-readme-template.md) says. Re-pinning the
   plugin is `cut-release`'s job.

Never regenerate the identity with an image model, commit font files, upload a GitHub social
preview or publish. Each is a separate step the owner authorizes.
