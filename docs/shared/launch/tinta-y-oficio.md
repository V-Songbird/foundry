# Foundry: flat ink art direction

Canonical direction approved by the user. Replaces dry-brush strokes, calligraphic lettering and lighter brand fills in dark mode. The skill keeps its `tinta-y-oficio` name for compatibility. [Legacy guidance](tinta-y-oficio-legacy.md) is historical evidence, not production guidance.

## Sources of truth

- [Identity kit](assets/ember-brand-kit/README.md): edit `source/*.svg` and `build.cjs`, never exported PNGs.
- [Ember scenes](assets/ember-approved/README.md): mascot sources and generator.
- [Evidence graphics](assets/graphics-ink/README.md): retained measurements and presentation generator.

Use these approved sources, not earlier icon-study drafts. Do not regenerate the identity with an image model.

## Visual rules

Soft recognizable silhouettes, flat fills and slightly uneven ink outlines. Friendly and readable at 32 px. No paint texture, gradients, gloss, corner highlights, decorative sparkles or dimensional shading. Text stays straight and legible. Names use lowercase bold Segoe UI; supporting copy uses regular Segoe UI. Exact sizes and spacing live in the generator. Keep generous empty space and one short product promise; do not invent performance claims.

| Brand | Symbol | Fill in both themes |
| --- | --- | --- |
| Foundry | Rounded anvil, no spark | `#BE5D27` |
| Hush | Speech bubble with quiet dash, no finger | `#2C75A5` |
| Foreman | Folded ribbon | `#21553B` |
| Razor | Notched diagonal blade | `#BF4935` |
| Flint | One faceted stone, no spark or second stone | `#C18423` |

Light ink: `#252820`, background: `#FFFFFF`. Dark ink: `#EEE9DE`, background: `#191C1B`. **Keep brand fills and geometry identical between themes.** Only the ink and background adapt. Name bubbles and decorative details use the brand accent. Semantic diff/error/success colors retain their meaning.

## Required deliverables

Every brand gets four types in both themes, with matching editable SVGs:

| Type | PNG dimensions | Background | Filenames |
| --- | --- | --- | --- |
| Social banner | **1280 × 640 px**, recommended | Opaque theme background | `social-light.png`, `social-dark.png` |
| README banner | 2172 × 724 px | Opaque theme background | `banner-light.png`, `banner-dark.png` |
| Wordmark | 1400 × 420 px | Transparent outside artwork | `logo-light.png`, `logo-dark.png` |
| Icon | 1024 × 1024 px | Transparent outside artwork | `icon-light.png`, `icon-dark.png` |

Icon SVGs use a 128 × 128 viewBox. Total: eight PNGs and eight SVGs per brand, forty of each for the five brands. Use icon-only assets in small cards.

The social composition in `build.cjs` uses 86–91 px left text padding, a category near the top, icon and name centrally, promise below, then an accent rule and attribution. Export directly at 1280 × 640; do not stretch a README banner. Deliver both themes; social platforms normally accept one selected image rather than switching themes automatically.

Foreman, Hush and Razor README banners stack the symbol, name and promise on the center axis. Their centered `Available on` selector uses the editable `source/edition-codex.svg` terminal and `source/edition-claude.svg` asterisk in flat ink, with labels below and Codex first. These small SVGs adapt ink to the theme without changing geometry. Copy them to each page's `assets/`; they are navigation art, separate from the eight identity PNGs per brand. Hush keeps Codex struck through and explicitly unavailable. Center the section navigation too.

## Reproduction

Use Node.js and an already available Sharp installation. The generator contains no personal runtime path. If Sharp is provided by a bundled runtime, set `NODE_PATH` to its node_modules directory. Codex desktop's `load_workspace_dependencies` reports that directory.

```powershell
fnm env --use-on-cd | Out-String | Invoke-Expression
# If needed: $env:NODE_PATH = '<runtime node_modules directory>'
node docs/shared/launch/assets/ember-brand-kit/build.cjs
```

Sources resolve relative to the script, so an absolute invocation works from another working directory. The generator overwrites generated kit outputs only. It verifies dimensions and matching theme alpha channels, writes SHA-256 hashes to `manifest.json`, and records Node/Sharp/rendering-library versions in `build-environment.json`.

Segoe UI must be available from an appropriately licensed system installation. Never commit proprietary font files. Arial/sans-serif fallbacks are not pixel-identical. For byte-identical PNGs, use the recorded renderer versions and the same font files, then compare hashes. Otherwise inspect the new PNGs and report environment differences. SVG sources remain the exact geometry reference.

Other reproduction commands, from Foundry:

```text
node docs/shared/launch/assets/ember-approved/build.cjs
node docs/shared/launch/assets/graphics-ink/build.cjs
```

These generate mascot and evidence assets respectively. They do not copy outputs to plugin worktrees, rebuild every gallery, or publish to GitHub.

## Mascot and evidence

Ember stays round and orange, with a friendly face and expressive flame. No rocky crust, fissures or shine. Props use the same ink style. Hush moves from stressed typing to calm work. Foreman starts overwhelmed by crooked folders and torn paper, gathers Task #1, Side Request and Issue 104 into a plan, and points only at the end; Issue 104 remains unchecked. Razor thinks, learns the checklist, then works.

Keep original closing messages, benchmark values and replay timing. Approved code indentation and diff highlighting may change presentation without changing code tokens. Mascot choreography is illustrative, not measured. Preserve reduced-motion states and a readable final hold. Existing evidence and mascot dark palettes remain in their own retained sources; identity regeneration must not silently rewrite historical evidence.

## Validation and integration

Review all brands on both backgrounds; inspect icons at 128, 64 and 32 px. Verify actual PNGs for spelling, clipping, contrast and transparency. Check theme geometry and alpha parity. Foundry and Flint must have no spark. Keep benchmark limitations and negative results; parser success is not proof of source accuracy.

For integration, map `icon-light/dark.png` to existing `icon-on-light/dark.png` and `logo-light/dark.png` to `logo-on-light/dark.png`. Banner filenames already match. Update SVG wrappers consistently. Coordinate main, Claude and Codex through `coordinate-readmes`; Flint is outside the plugin-edition contract. Keep generators and research in Foundry.

GitHub social preview is a separate repository setting. A README update does not upload it. When publishing is authorized, choose one 1280 × 640 PNG, upload it, and inspect the saved preview. Building the kit does not publish, update marketplace pins, or grant merge permission.

Ember theme exception: keep the character's body/flame outlines and facial features in dark ink #252820 in both themes. Surrounding props and text may adapt for dark-background contrast; never give Ember a white outline.
