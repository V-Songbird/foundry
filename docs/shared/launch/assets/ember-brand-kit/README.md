# Foundry brand kit — approved

Five coordinated brands: Foundry, Hush, Foreman, Razor and Flint. No spark on Foundry or Flint. Identical brand fills across light/dark variants; only ink contrast changes.

Per brand, both themes: social PNG/SVG 1280x640; README banner 2172x724; transparent wordmark 1400x420; transparent icon PNG 1024x1024 and scalable SVG. manifest.json records dimensions and alpha. build.cjs regenerates raster output from the retained icon sources in source/.

Existing mascot and evidence SVGs are included for Hush, Foreman and Razor without altering benchmark text or timing. This is the approved identity source. Building it does not install assets or upload a GitHub social preview.

## Reproduction

Follow the [canonical guide](../../tinta-y-oficio.md). Run `node build.cjs` from this directory, or invoke the script by absolute path. Node.js, Sharp and Segoe UI are required for matching output. Resolve Sharp normally or through `NODE_PATH`; no personal runtime path is embedded. `build-environment.json` records renderer versions. `manifest.json` records sizes and SVG/PNG hashes. The generator verifies theme alpha parity for icons and wordmarks.

Verified: rebuilding from another working directory produced identical hashes for all forty PNGs and forty SVGs in the recorded environment. Another font or rendering-library version requires renewed visual review.

## Complete gallery

Run `node build-review.cjs` to generate the complete gallery and fixed light/dark supporting previews. It uses only the supporting SVG sources included in source/supporting; no sibling repository is needed. Open index.html in a browser. The original auto-theme SVGs remain included alongside the previews. The archive contains all five identity sets and the three plugins' mascot/evidence graphics.
