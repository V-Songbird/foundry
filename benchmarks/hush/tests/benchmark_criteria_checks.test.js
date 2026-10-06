'use strict';
// The criteria judge's mechanical half: link coverage, shape, the units Jev
// picks from, and what a session said before and between tool calls.
//
// Every sample is a literal message or a literal event list, so a changed regex
// shows up here as a changed number.

const { describe, test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const c = require('../runner/criteria-checks.js');

const LINKED = [
  '**The pricing tests pass again.**',
  '',
  'The fix is one line in [pricing.js:41](src/pricing.js:41).',
  'I ran `node run-tests.js` after the change.',
  '',
  'Next: open [pricing.js:41](src/pricing.js:41) and read it.',
].join('\n');

const BARE = 'The fix is in `src/pricing.js` and the cases live in cases.js. See https://example.com/docs for more.';

describe('references: every reference, and whether it can be clicked', () => {
  test('a link counts once, not once for its text and once for its target', () => {
    const r = c.references(LINKED);
    assert.strictEqual(r.total, 2);
    assert.strictEqual(r.linked, 2);
    assert.strictEqual(r.coverage, 1);
    assert.deepStrictEqual(r.targets, ['src/pricing.js:41', 'src/pricing.js:41']);
  });

  test('a file name inside a command is not a reference', () => {
    assert.deepStrictEqual(c.references(LINKED).unlinked, []);
  });

  test('a bare path is unlinked, in backticks or not, and a bare URL still clicks', () => {
    const r = c.references(BARE);
    assert.deepStrictEqual(r.unlinked, ['src/pricing.js', 'cases.js']);
    assert.strictEqual(r.linked, 1);
    assert.strictEqual(r.total, 3);
  });

  test('a fenced block is quoted evidence, not a reference', () => {
    const r = c.references('```\nat decode (/srv/api/src/auth/tokens.js:6:24)\n```\nSee [refresh.js:15](src/auth/refresh.js:15).');
    assert.strictEqual(r.total, 1);
    assert.strictEqual(r.coverage, 1);
  });

  test('no reference at all reads as not applicable, never as full coverage', () => {
    assert.strictEqual(c.references('All good. Nothing to open.').coverage, null);
  });

  test('a version number or an abbreviation is not a file', () => {
    assert.strictEqual(c.references('Bumped to v1.2 e.g. for the fix.').total, 0);
  });
});

describe('targetsExist: a link has to land somewhere real', () => {
  const files = ['src/pricing.js', 'cases.js', 'logs/gateway.log'];

  test('relative, line-suffixed and absolute temp-dir targets all resolve by suffix', () => {
    const t = c.targetsExist(['src/pricing.js:41', './cases.js', 'C:/tmp/run/logs/gateway.log:612'], files);
    assert.strictEqual(t.real, 3);
    assert.strictEqual(t.ratio, 1);
  });

  test('an invented target is named', () => {
    const t = c.targetsExist(['src/prices.js:41', 'https://example.com'], files);
    assert.strictEqual(t.checked, 1);
    assert.deepStrictEqual(t.missing, ['src/prices.js:41']);
  });

  test('the fixture walker lists the real failing-suite tree', () => {
    const list = c.fixtureFiles(path.join(__dirname, '..', 'fixtures', 'failing-suite'));
    assert.ok(list.includes('src/pricing.js'));
    assert.ok(list.includes('run-tests.js'));
  });
});

describe('shape: what the message is built from', () => {
  const TABLED = ['**Done.**', '', '| When | What |', '|---|---|', '| 02:13 | config flipped |', '| 02:14 | first 503 |', '', '- one', '- two', '', 'Next: roll back.'].join('\n');

  test('tables, rows and bullets are counted, and the header is not a row', () => {
    const s = c.shape(TABLED);
    assert.strictEqual(s.tables, 1);
    assert.strictEqual(s.tableRows, 2);
    assert.strictEqual(s.bullets, 2);
    assert.strictEqual(s.bold, 1);
    assert.strictEqual(s.flags.table, true);
    assert.strictEqual(s.flags.bullets, true);
  });

  test('plain prose sets no flag, and only a long message is asked for a map and a recap', () => {
    const s = c.shape('Fixed it. One line changed.');
    assert.deepStrictEqual(s.flags, { table: false, bullets: false, long: false });
    assert.strictEqual(c.shape(Array.from({ length: 220 }, () => 'word').join(' ')).flags.long, true);
  });

  test('a fenced block costs no words', () => {
    assert.strictEqual(c.shape('Two words.\n```\nmany many many many words here\n```').words, 2);
  });
});

describe('sentenceUnits and termCandidates: what Jev picks from', () => {
  test('a link target never reads as part of a sentence', () => {
    const u = c.sentenceUnits(LINKED);
    assert.ok(Object.values(u).every((s) => !s.includes('](')));
    assert.ok(Object.values(u).includes('The fix is one line in pricing.js:41.'));
  });

  test('a colon does not split a sentence', () => {
    assert.ok(Object.values(c.sentenceUnits('Next: open the file and read it.')).includes('Next: open the file and read it.'));
  });

  test('a table row is one unit and the separator row is none', () => {
    const u = Object.values(c.sentenceUnits('| When | What |\n|---|---|\n| 02:13 | config flipped |'));
    assert.deepStrictEqual(u, ['When | What', '02:13 | config flipped']);
  });

  test('the cap keeps the longest units and their original numbering', () => {
    const md = Array.from({ length: 50 }, (_, i) => (i === 7 ? 'This one is by far the longest sentence of them all here.' : `Short ${i}.`)).join(' ');
    const u = c.sentenceUnits(md, 5);
    assert.strictEqual(Object.keys(u).length, 5);
    assert.ok(u.s8.startsWith('This one'));
  });

  test('terms are long words, acronyms and compounds, never identifiers in backticks', () => {
    const t = c.termCandidates('The `quantization` step caused IEEE-754 accumulation discrepancies in post-summation. It is fine.');
    assert.ok(t.includes('discrepancies'));
    assert.ok(t.includes('accumulation'));
    assert.ok(t.includes('post-summation'));
    assert.ok(!t.includes('quantization'));
    assert.ok(!t.includes('fine'));
  });
});

describe('spokenParts: the opener, the text between tool calls, and neither', () => {
  const asst = (...blocks) => ({ type: 'assistant', message: { content: blocks } });
  const text = (t) => ({ type: 'text', text: t });
  const tool = () => ({ type: 'tool_use', name: 'Bash', input: {} });

  test('text before the first tool is the opener, text between tools is mid-turn, the last text is the final message', () => {
    const p = c.spokenParts([asst(text('I will run the suite.')), asst(tool()), asst(text('Found it.')), asst(tool()), asst(text('**Done.** All green.'))]);
    assert.strictEqual(p.opener, 'I will run the suite.');
    assert.deepStrictEqual(p.midTurn, ['Found it.']);
    assert.strictEqual(p.toolCalls, 2);
  });

  test('a silent turn has no opener and no mid-turn text', () => {
    const p = c.spokenParts([asst(tool()), asst(tool()), asst(text('**Done.**'))]);
    assert.strictEqual(p.opener, null);
    assert.deepStrictEqual(p.midTurn, []);
  });

  test('a turn with no tool call has only a final message', () => {
    const p = c.spokenParts([asst(text('The answer is 4.'))]);
    assert.strictEqual(p.opener, null);
    assert.strictEqual(p.midTurnWords, 0);
  });

  test('a harness error line is not the model talking', () => {
    const p = c.spokenParts([asst(text('API Error: Connection lost mid-response.')), asst(tool()), asst(text('Done.'))]);
    assert.strictEqual(p.opener, null);
  });
});

describe('announcement, marker leak and language', () => {
  test('an announcement is caught in English and in Spanish', () => {
    assert.ok(c.looksLikeAnnouncement("Now I'll run the test suite."));
    assert.ok(c.looksLikeAnnouncement('Okay, let me look at the logs first.'));
    assert.ok(c.looksLikeAnnouncement('Ahora voy a correr la suite.'));
    assert.ok(!c.looksLikeAnnouncement('The suite fails in three places.'));
  });

  test('a reply that names the hush markers or a hook reminder leaks', () => {
    assert.ok(c.leaksMarker(['As the [hush hook: 12 lines omitted] note says']));
    assert.ok(c.leaksMarker(['Per the hook reminder, I stayed quiet.']));
    assert.ok(!c.leaksMarker(['The build went quiet after the fix.']));
  });

  test('language is read from the prose, not from code or names', () => {
    assert.strictEqual(c.language('Las pruebas ya pasan. El error estaba en el redondeo de los precios.'), 'es');
    assert.strictEqual(c.language('The tests pass again. The bug was in how the cart rounds money.'), 'en');
  });
});
