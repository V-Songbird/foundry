"use strict";
const { test } = require('node:test'), assert = require('node:assert/strict');
const { render } = require('../build-main-readmes');
const { SHARED_SECTIONS, checkCommon } = require('./check-main-frontpage');
function edition(name) {
  return `<div align="center">\n<h1>Example</h1>\n</div>\n> **TL;DR** — Shared purpose.\n<p align="center"><img src="assets/mascot.svg" alt="Shared animation"></p>\n` +
    SHARED_SECTIONS.map(h => `## ${h}\nShared ${h}\n`).join('\n') +
    `\n## Install\n<!-- foundry:platform install -->\n${name} install command\n<!-- /foundry:platform install -->\n`;
}
test('overview retains the whole shared story without copying native installation commands', () => {
  const a = edition('Claude'), b = edition('Codex'), main = render('razor', a, b);
  assert.deepEqual(checkCommon(main, a, b), []);
  assert.match(main, /assets\/mascot\.svg/);
  assert.match(main, /## Get started/);
  assert.doesNotMatch(main, /Claude install command|Codex install command|foundry:platform/);
});
test('Hush keeps its unavailable Codex status visible at the entrance and edition choice', () => {
  const main = render('hush', edition('Claude'), edition('Codex'));
  assert.match(main, /not currently installable/);
  assert.match(main, /\| Codex \| Not currently installable \|/);
});
