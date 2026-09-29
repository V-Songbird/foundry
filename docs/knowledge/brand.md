---
type: knowledge
summary: "How the flat-ink artwork of Foundry and its plugins is drawn, rebuilt, checked and copied into a plugin's assets/, and which copies stay there unreferenced; read before changing any icon, banner, wordmark, social card, host card, Ember scene or evidence graphic."
related_files:
  - brand/identity/build.cjs
  - brand/identity/build-review.cjs
  - brand/mascot/build.cjs
  - brand/graphics/build.cjs
  - brand/check-timing.js
---

# Brand kit

Every image on a plugin's README comes from `brand/`. Change the sources or the generators there,
rebuild, review both themes, then copy the result into the plugin's `assets/` on a topic branch
in the plugin's repository. Never edit an exported PNG, or a plugin's copy, by hand: the next
copy overwrites it.

## Style

Soft, recognizable silhouettes, flat fills and slightly uneven ink outlines, readable at 32 px.
No paint texture, gradients, gloss, corner highlights, decorative sparkles or dimensional shading.
Text stays straight: names in lowercase bold Segoe UI, supporting copy in regular Segoe UI. Keep
generous empty space and one short promise, and never invent a performance claim. Do not
regenerate the identity with an image model.

Each symbol is a hallmark seal: one filled outline per brand with a glyph inside it.

| Brand | Seal | Glyph inside | Fill in both themes |
| --- | --- | --- | --- |
| Foundry | Shield | Ember's flame, no spark | `#BE5D27` |
| Hush | Pebble | Crescent moon | `#2C75A5` |
| Foreman | Tag with clipped corners | Plumb line | `#21553B` |
| Razor | Blade hexagon | Trimmed block | `#BF4935` |
| Flint | One faceted stone, no spark and no second stone | Its facets: one paper-filled, three ink lines | `#C18423` |

The light theme uses ink `#252820` on `#FFFFFF`; the dark theme uses ink `#EEE9DE` on `#191C1B`.
Seal fills and geometry stay identical between themes. Only ink, background and the glyph's
paper fill change; the flame keeps Ember's own orange in both themes.
Semantic diff, error and success colors keep their meaning and are never brand accents.

## What lives where

| Path | Holds | Rebuild |
| --- | --- | --- |
| `brand/identity/source/` | Each brand's icon, one file per theme, and the host cards `edition-codex.svg`, `edition-claude.svg` and `edition-antigravity.svg` | Edited by hand |
| `brand/identity/build.cjs` | Social card, README banner, wordmark and icon for every brand and theme, as PNG and SVG, plus `manifest.json` and `build-environment.json` | `node brand/identity/build.cjs` |
| `brand/identity/build-review.cjs` | Fixed light and dark previews of every scene, evidence graphic and host card, and the gallery `brand/identity/index.html` | `node brand/identity/build-review.cjs` |
| `brand/mascot/` | The Ember scene for Hush, Foreman and Razor, built from the approved Hush drawing and each plugin's original scene in `source/` | `node brand/mascot/build.cjs` |
| `brand/graphics/` | The evidence graphics, restyled from their recorded originals in `source/`; `validation.json` records what each build preserved | `node brand/graphics/build.cjs` |

Each generator resolves paths from its own location and writes only its own outputs. None copies
anything into a plugin or publishes anything. After a mascot or graphics build, run
`build-review.cjs` so the gallery picks up the change.

## Identity deliverables

Every brand gets four types in both themes, each as a PNG and an editable SVG:

| Type | PNG size | Background | Files |
| --- | --- | --- | --- |
| Social card | 1280 × 640 | Opaque theme background | `social-light`, `social-dark` |
| README banner | 2172 × 724 | Opaque theme background | `banner-light`, `banner-dark` |
| Wordmark | 1400 × 420 | Transparent outside the artwork | `logo-light`, `logo-dark` |
| Icon | 1024 × 1024 | Transparent outside the artwork | `icon-light`, `icon-dark` |

Icon sources use a 128 × 128 viewBox. Use the icon alone on small cards. A plugin banner stacks
symbol, name and promise on the center axis; the Foundry and Flint banners put the name beside the
symbol. A GitHub social preview is a repository setting: building a social card does not upload it.

The host cards are small navigation art for a README's `Available on` line: a terminal for Codex,
an asterisk for Claude, and for Antigravity the name `antigravity` in lowercase bold inside the
same rounded frame as the Codex card, all in flat ink that follows the theme. The Antigravity card
carries no mark of the host's own; its name is the only artwork. The cards are drawn by hand in
`brand/identity/source/`, and a plugin copies them from there. The only generated copies are the
fixed-theme previews `build-review.cjs` writes to `brand/identity/hosts/` for the gallery, and
no plugin copies those.

## Copying into a plugin

Identity files come from `brand/identity/<plugin>/`, the scene from `brand/mascot/` and the
evidence graphics from `brand/graphics/`. Copy with these names:

| Kit file | Plugin file | Set |
| --- | --- | --- |
| `brand/identity/<plugin>/banner-light.png`, `banner-dark.png` | `assets/banner-light.png`, `assets/banner-dark.png` | Identity |
| `brand/identity/<plugin>/icon-light.png`, `icon-dark.png` | `assets/icon-on-light.png`, `assets/icon-on-dark.png` | Identity |
| `brand/identity/<plugin>/logo-light.png`, `logo-dark.png` | `assets/logo-on-light.png`, `assets/logo-on-dark.png` | Identity |
| `brand/identity/<plugin>/logo-light.svg`, `logo-dark.svg` | `assets/logo.svg`, `assets/logo-dark.svg` | Identity |
| `brand/identity/source/edition-codex.svg`, `edition-claude.svg`, `edition-antigravity.svg` | `assets/edition-codex.svg`, `assets/edition-claude.svg`, `assets/edition-antigravity.svg` | Host card |
| `brand/mascot/<plugin>.svg` | `assets/mascot.svg` | Ember scene |
| `brand/graphics/<plugin>-<name>.svg`, such as `razor-demo.svg` | `assets/<name>.svg`, such as `assets/demo.svg` | Evidence graphic |

Copy the identity set, every Identity row above, whole into each plugin's `assets/`, even the
files that nothing in the plugin references. Host cards follow the same rule: copy every one whole
into each plugin, even when no page shows it. Copy an Ember scene or an evidence graphic only when
a page in the plugin references it, and remove one that no page references.

The Codex manifests point at `assets/icon-on-light.png` and `assets/icon-on-dark.png`, so a new
icon reaches Codex through the same copy. Flint takes the identity files only.

## Ember

Ember is round and orange, with a friendly face and an expressive flame. No rocky crust, fissures
or shine. Its body, flame outline and face stay in dark ink `#252820` in both themes and never get
a white outline; props and text around it may adapt to a dark background.

Each plugin tells one story. Hush goes from stressed typing to calm work. Foreman starts
overwhelmed by crooked folders and torn paper, gathers Task #1, Side Request and Issue 104 into a
plan and points only at the end, with Issue 104 still unchecked. Razor thinks, learns the
checklist, then works. The scene accents are Hush `#2C75A5` and `#79B6DE`, Foreman `#21553B` and
`#9EC8AC`, Razor `#BF4935` and `#EB8D79`, light and dark.

Every scene ends the same way. After the answer card appears, a stamp presses the plugin's seal
onto the card's lower right corner and lifts; the seal stays until the card fades. The build takes
the seal from the light icon source in `brand/identity/source/`, so a changed seal reaches the
scenes on the next mascot build.

The scenes are illustrations, not measurements: never present their timing as a result. Each
keeps the closing line of its original scene, and the build stops if that line changes. Keep the
reduced-motion state and a readable final hold. Under reduced motion the stamp is hidden and the
card shows the seal.

## Evidence graphics

The graphics build restyles frames and labels only. Recorded text, plotted marks, measured bars
and replay animation stay exactly as recorded, and the build fails if any of them changes. Each
frame also carries the plugin's seal, from the light icon source, in empty space on the right that
the build sets per graphic; the seal follows the theme's ink and paper. In the
Razor demo, code indentation and diff highlighting may change presentation, never code tokens.
The demo replays animate with SMIL; under reduced motion each one rests on its final recorded frame.

## Rebuilding

The mascot, graphics and gallery builds need Node.js 22 or later and nothing else. The identity
build also needs Sharp, resolved normally or through `NODE_PATH`, and a licensed Segoe UI
installation. Never commit font files. The identity build verifies sizes and matching alpha
between themes, writes SHA-256 hashes to `manifest.json` and records Node and Sharp versions in
`build-environment.json`. Byte-identical PNGs need those recorded versions and the same fonts;
otherwise review the new PNGs and report the difference.

## Before copying

1. Run `node brand/check-timing.js <svg>` on every SVG with SMIL animation, today every
   demo. It checks that `keyTimes`, `values` and `keySplines` agree.
2. Open `brand/identity/index.html` in a web browser, straight from disk, and review every brand
   on both backgrounds, with icons at 128, 64 and 32 px, and the host cards under "host cards" at
   128, 80 and 32 px. A preview that loads the page without its folder, such as a chat or editor
   preview, shows every image broken. Check spelling, clipping, contrast and transparency in the
   real PNGs.
3. Foundry and Flint carry no spark.
4. Follow the [plugin README contract](plugin-readme-template.md) for where each image goes.
