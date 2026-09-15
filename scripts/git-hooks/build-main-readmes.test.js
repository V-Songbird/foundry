"use strict";
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { render } = require('../build-main-readmes');
const { SHARED_SECTIONS, checkCommon } = require('./check-main-frontpage');
const { editionPlugins } = require('./check-platform-marketplaces');
function edition(name) {
  return `<div align="center">\n<h1>Example</h1>\n</div>\n> **TL;DR** — Shared purpose.\n<p align="center"><img src="assets/mascot.svg" alt="Shared animation"></p>\n` +
    `<!-- foundry:hero -->\n<img src="assets/hero.svg">\nRecorded Claude evidence.\n<img src="assets/demo.svg">\n<!-- /foundry:hero -->\n` +
    SHARED_SECTIONS.map(h => `## ${h}\nShared ${h}\n`).join('\n') +
    `\n## Install\n<!-- foundry:platform install -->\n${name} install command\n<!-- /foundry:platform install -->\n`;
}
test('overview retains the whole shared story without copying native installation commands', () => {
  const a = edition('Claude'), b = edition('Codex'), main = render('example', a, b, ['example']);
  assert.deepEqual(checkCommon(main, a, b), []);
  assert.match(main, /assets\/mascot\.svg/);
  assert.match(main, /assets\/hero\.svg/);
  assert.match(main, /assets\/demo\.svg/);
  assert.match(main, /Recorded Claude evidence/);
  assert.match(main, /## Get started/);
  assert.doesNotMatch(main, /Claude install command|Codex install command|foundry:platform/);
});
test('Hush keeps its unavailable Codex status visible at the entrance and edition choice', () => {
  const main = render('hush', edition('Claude'), edition('Codex'), ['hush']);
  assert.match(main, /not currently installable/);
  assert.match(main, /\| Codex \| Not currently installable \|/);
});
test('a package plugin pinned on main has no selector to generate', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'foundry-selectors-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.claude-plugin'));
  fs.writeFileSync(path.join(root, '.claude-plugin', 'marketplace.json'), JSON.stringify({ plugins: [
    { name: 'foreman', source: { ref: 'main' } }, { name: 'example', source: { ref: 'Claude' } }] }));
  const plugins = editionPlugins(root);
  assert.throws(() => render('foreman', edition('Claude'), edition('Codex'), plugins), /not a plugin with Claude and Codex editions/);
  assert.doesNotThrow(() => render('example', edition('Claude'), edition('Codex'), plugins));
});
