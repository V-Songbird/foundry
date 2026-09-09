# From script to README

Paths are relative to the foundry root. `node` is on PATH only after
`fnm env --use-on-cd | Out-String | Invoke-Expression` in PowerShell; the
Bash tool already sees it.

## 1. Build to scratch

```
node docs/launch/mascot/ember-<plugin>.js <scratchpad>/mascot-<plugin>.svg
```

The hush script takes no output argument and writes `mascot-hush.svg` beside
itself; move it. Never write straight into `<plugin>/assets/`.

## 2. Check it

```
node .claude/skills/ember/scripts/check-timing.js <scratchpad>/mascot-<plugin>.svg
python -c "import xml.dom.minidom as m,sys; m.parse(sys.argv[1]); print('xml ok')" <scratchpad>/mascot-<plugin>.svg
```

The timing check reports `0 problems` or lists each bad `<animate>`. An XML
error is usually a duplicated attribute or a stray newline inside a string.

## 3. Look at it, both themes

Serve the scratch folder and open a page that shows the SVG on a white ground
and again inside a `color-scheme: dark` block:

```
python -m http.server 8766        # from the scratch folder, in the background
```

```html
<style>body{margin:0;padding:20px;background:#fff}.d{background:#0d1117;color-scheme:dark;padding:20px;margin-top:20px}img{width:700px;display:block}</style>
<img src="mascot-x.svg"><div class="d"><img src="mascot-x.svg"></div>
```

Open it in the Browser pane (`navigate` to `http://localhost:8766/…`; a
`file://` tab cannot be driven), resize to about 800×760, and screenshot at
2–3 s, 5.5 s, 8 s and 12.5 s. Those four frames are the review. Stop the
server when done.

For a PNG of a frame (launch posts), headless Edge works only as
`msedge.exe --headless --disable-gpu --no-first-run --disable-extensions
--user-data-dir=<scratch> --hide-scrollbars --force-device-scale-factor=2
--window-size=740,<h> --screenshot=<out.png> file:///<page>`; add
`--force-dark-mode` for the dark frame. `--headless=new` hangs on this machine.

## 4. Ship

1. Copy the SVG to `<plugin>/assets/mascot.svg`.
2. In `<plugin>/README.md` the mascot sits directly under the `---` that
   follows the `> **TL;DR**` block, above the `assets/demo.svg` replay, as
   `<p align="center"><img src="assets/mascot.svg" alt="…" width="700"></p>`.
   The `alt` is the SVG's `aria-label`, HTML-escaped; regenerate it whenever
   the label changes.
3. Add a dated entry at the top of `<plugin>/CHANGELOG.md`, user-facing, a
   few lines, ending "Nothing <plugin> does in a session changed."
4. Release with the `cut-release` sequence: commit and push inside the plugin
   submodule, then bump `version` and `source.sha` together in
   `.claude-plugin/marketplace.json`, run
   `node scripts/git-hooks/verify-marketplace-pins.js`, commit the pin with
   the submodule pointer, push, and let the manifest audit and CI run.

## 5. Record it

Keep the authoring script under `docs/launch/mascot/` (local). Note the
release in the plugin's state memory and, if the character or a rule
changed, in `docs/adr/0006-readme-mascot-cartoon.md`.
