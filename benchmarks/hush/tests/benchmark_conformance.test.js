'use strict';

// Settings conformance meter (runner/conformance.js). Local and pure: no
// `claude` CLI, no cost. Messages and transcripts are literal samples, and the
// contract is a small fixture, so the tests pin the meter's reading of each
// rule without depending on which hush branch is checked out.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { settingsFromContext, parseSettings, readTranscript, checkMessage, score, loadContract } =
  require('../runner/conformance.js');

const KNOBS = {
  next: ['end', 'top', 'off'], rules: ['on', 'off'], detail: ['normal', 'short', 'full', 'bare'],
  checks: ['line', 'each', 'off'], records: ['line', 'off'], markdown: ['rich', 'basic', 'plain'], files: ['card', 'link'],
  sentences: ['12', '20'], emoji: ['off', 'on'], headers: ['off', 'on'], box: ['decisions', 'work', 'text'],
};
const DEFAULTS = Object.fromEntries(Object.entries(KNOBS).map(([k, v]) => [k, v[0]]));
const CONTRACT = {
  KNOBS, DEFAULTS, caps: { wordCap: 12, blockCap: 40 }, budget: 150,
  modules: [
    { knob: 'next', value: 'off', text: 'No next step. The message has no "Next:" line.' },
    { knob: 'records', value: 'off', text: 'No records line.' },
  ],
};
const TURN = { ask: false, work: false };
const check = (text, settings = {}, turn = TURN) => checkMessage(text, { ...DEFAULTS, ...settings }, turn, CONTRACT);
const statuses = (out, keys) => Object.fromEntries(keys.map((k) => [k, out[k].status]));

const GOOD = [
  '**The login test passes again.**',
  '',
  '---',
  '',
  'The token check read the expiry as text. I changed one line.',
  '',
  '- ✓ `npm test`: 212 tests pass.',
  '',
  '---',
  '',
  '**Next:** read the change in [auth.js:58](src/auth.js:58).',
].join('\n');

describe('checkMessage: the base shape', () => {
  test('a message in the documented shape passes every machine check', () => {
    assert.deepStrictEqual(statuses(check(GOOD), ['result', 'next', 'rules', 'sentences', 'blocks', 'length', 'checks', 'emoji', 'markdown']),
      { result: 'pass', next: 'pass', rules: 'pass', sentences: 'pass', blocks: 'pass', length: 'pass', checks: 'pass', emoji: 'pass', markdown: 'pass' });
  });

  test('a first line that is not bold fails the result check', () => {
    assert.strictEqual(check('Done, the test passes.').result.status, 'fail');
  });

  test('judgement settings are na, never pass', () => {
    const out = check(GOOD);
    for (const k of ['why', 'caveats', 'terms', 'headers', 'box']) assert.strictEqual(out[k].status, 'na', k);
  });
});

describe('checkMessage: next', () => {
  const noNext = '**Done.**\n\n---\n\nOne fact here.';

  test('next=off fails on a Next line in any language and passes without one', () => {
    assert.strictEqual(check(GOOD.replace('**Next:**', '**Siguiente paso:**'), { next: 'off' }).next.status, 'fail');
    assert.strictEqual(check(noNext, { next: 'off' }).next.status, 'pass');
  });

  test('a plain "Siguiente:" line counts as a Next line, and fails as not bold', () => {
    const plainNext = noNext + '\n\n---\n\nSiguiente: responde sí.';
    assert.strictEqual(check(plainNext, { next: 'off' }).next.status, 'fail');
    assert.match(check(plainNext).next.why, /not bold/);
  });

  test('next=end fails when the Next line is not last', () => {
    assert.strictEqual(check(GOOD + '\n\nOne more line.').next.status, 'fail');
  });

  test('next=top wants the Next line right under the result, then the rule', () => {
    const top = '**Done.**\n\n**Next:** open the file.\n\n---\n\nOne fact here.';
    assert.deepStrictEqual(statuses(check(top, { next: 'top' }), ['next', 'rules']), { next: 'pass', rules: 'pass' });
    assert.strictEqual(check(GOOD, { next: 'top' }).next.status, 'fail');
  });

  test('when the box asked, the Next line must be gone', () => {
    const asked = { ask: true, work: true };
    assert.strictEqual(check(GOOD, {}, asked).next.status, 'fail');
    assert.strictEqual(check('**Done.**\n\n---\n\nOne fact here.', {}, asked).next.status, 'pass');
  });

  test('a bold header line "Siguiente paso" counts under headers=on', () => {
    const headed = '**Done.**\n\n---\n\n**Siguiente paso**\nAbre el archivo.';
    assert.strictEqual(check(headed, { headers: 'on' }).next.status, 'pass');
  });
});

describe('checkMessage: layout settings', () => {
  test('rules=off and markdown=plain fail on any rule line', () => {
    assert.strictEqual(check(GOOD, { rules: 'off' }).rules.status, 'fail');
    assert.strictEqual(check(GOOD, { markdown: 'plain' }).rules.status, 'fail');
  });

  test('rules=on fails without a rule after the result or above Next', () => {
    assert.match(check(GOOD.replace('---\n\nThe token', 'The token')).rules.why, /no rule after line 1/);
    assert.match(check(GOOD.replace(/---\n\n\*\*Next/, '**Next')).rules.why, /above the Next line/);
  });

  test('markdown=plain forbids tables and links, basic forbids footnotes', () => {
    const table = '**Done.**\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nSee [x.js](x.js).';
    assert.match(check(table, { markdown: 'plain', rules: 'off' }).markdown.why, /a table, a link/);
    assert.strictEqual(check('**Done.**\n\nA term.[^1]\n\n[^1]: A note.', { markdown: 'basic' }).markdown.status, 'fail');
    assert.strictEqual(check('**Done.**\n\nA term.[^1]\n\n[^1]: A note.').markdown.status, 'pass');
  });

  test('a form the app shows raw fails under every markdown value', () => {
    assert.strictEqual(check('**Done.**\n\n<details>x</details>').markdown.status, 'fail');
  });

  test('sentences=20 raises both caps', () => {
    const long = '**Done.**\n\n' + Array(15).fill('word').join(' ') + '.';
    assert.strictEqual(check(long).sentences.status, 'fail');
    assert.strictEqual(check(long, { sentences: '20' }).sentences.status, 'pass');
  });

  test('length is a warn past the budget, and na under detail=bare', () => {
    const many = '**Done.**\n\n' + Array(20).fill('Ten words in this sentence and it stops right here.').join('\n\n');
    assert.strictEqual(check(many, { detail: 'short' }).length.status, 'warn');
    assert.strictEqual(check(many, { detail: 'bare' }).length.status, 'na');
  });
});

describe('checkMessage: parts', () => {
  test('checks=off and detail=bare fail on a passed-check line', () => {
    assert.strictEqual(check(GOOD, { checks: 'off' }).checks.status, 'fail');
    assert.strictEqual(check(GOOD, { detail: 'bare' }).checks.status, 'fail');
  });

  test('checks=line fails on two ✓ lines, checks=each on a shared line', () => {
    const two = GOOD.replace('- ✓ `npm test`: 212 tests pass.', '- ✓ tests pass.\n- ✓ lint passes.');
    assert.strictEqual(check(two).checks.status, 'fail');
    assert.strictEqual(check(two, { checks: 'each' }).checks.status, 'pass');
    assert.strictEqual(check(GOOD.replace('212 tests pass.', 'tests ✓ lint ✓'), { checks: 'each' }).checks.status, 'fail');
  });

  test('emoji=off ignores inline code and the check marks, and fails on prose emoji', () => {
    assert.strictEqual(check('**Done.**\n\nThe log prints `ℹ` and ✓.').emoji.status, 'pass');
    assert.strictEqual(check('**Done.** 🎉').emoji.status, 'fail');
  });

  test('emoji=on warns when a block opens without one', () => {
    assert.strictEqual(check('✅ **Done.**\n\n💡 The cause.', { emoji: 'on' }).emoji.status, 'pass');
    assert.strictEqual(check('✅ **Done.**\n\nThe cause.', { emoji: 'on' }).emoji.status, 'warn');
  });

  test('records=off warns on a line that names memory or the 📝 cue', () => {
    assert.strictEqual(check('**Done.**\n\n📝 La nota está al día.', { records: 'off' }).records.status, 'warn');
    assert.strictEqual(check('**Done.**\n\nOne fact.', { records: 'off' }).records.status, 'pass');
  });

  test('files=card warns on a whole-file link and lets line, web and app links through', () => {
    const msg = '**Done.**\n\nSee [auth.js:58](src/auth.js:58), [docs](https://x.dev/a.html), [tab](#terminal/1) and [notes.md](docs/notes.md).';
    assert.match(check(msg).files.why, /1 whole-file link\(s\), such as docs\/notes\.md/);
    assert.strictEqual(check(msg.replace(' and [notes.md](docs/notes.md)', '')).files.status, 'pass');
    assert.strictEqual(check(msg, { files: 'link' }).files.status, 'na');
    assert.strictEqual(check(msg, { markdown: 'basic' }).files.status, 'na');
  });

  test('box=text fails when the box asked, box=work when it asked on a plain answer', () => {
    assert.strictEqual(check(GOOD, { box: 'text' }, { ask: true, work: true }).box.status, 'fail');
    assert.strictEqual(check(GOOD, { box: 'work' }, { ask: true, work: false }).box.status, 'fail');
    assert.strictEqual(check(GOOD, { box: 'work' }, { ask: true, work: true }).box.status, 'pass');
  });
});

describe('settings recovery', () => {
  const header = 'hush settings, chosen by the user with /hush:config. The rest stays.';

  test('module texts in the SessionStart context name the settings', () => {
    const ctx = `${header}\n\nNo next step. The message has no "Next:" line.\n\nNo records line.`;
    const { settings, unmatched } = settingsFromContext(ctx, CONTRACT);
    assert.deepStrictEqual([settings.next, settings.records, settings.rules, unmatched], ['off', 'off', 'on', 0]);
  });

  test('a paragraph no current module matches is counted, and its knob stays default', () => {
    const { settings, unmatched } = settingsFromContext(`${header}\n\nAn older module wording.`, CONTRACT);
    assert.deepStrictEqual([settings.next, unmatched], ['end', 1]);
  });

  test('--settings rejects an unknown pair', () => {
    assert.strictEqual(parseSettings('next=off,box=text', CONTRACT).box, 'text');
    assert.throws(() => parseSettings('next=sideways', CONTRACT), /not a known knob=value/);
  });
});

describe('readTranscript', () => {
  const line = (o) => JSON.stringify(o);
  const prompt = (text) => line({ type: 'user', message: { role: 'user', content: text } });
  const style = (prompt, at) => line({ type: 'attachment', timestamp: at, attachment: { type: 'output_style_instructions', style: { name: 'hush:Hush', prompt } } });
  const ctx = (text) => line({ type: 'attachment', attachment: { type: 'hook_additional_context', hookEvent: 'SessionStart', content: [text] } });
  const say = (...content) => line({ type: 'assistant', message: { role: 'assistant', content } });
  const toolResult = line({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] } });

  function write(lines) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hush-conformance-'));
    const file = path.join(dir, 's.jsonl');
    fs.writeFileSync(file, lines.join('\n') + '\n');
    return { dir, file };
  }

  test('the final message is the text after the last tool call; earlier text is narration', () => {
    const { dir, file } = write([
      prompt('fix it'),
      style('v1', '2026-10-17T01:00:00Z'),
      ctx('hush settings, chosen by the user with /hush:config.\n\nNo next step. The message has no "Next:" line.'),
      say({ type: 'text', text: 'Let me look first.' }, { type: 'tool_use', name: 'Bash', input: {} }),
      toolResult,
      say({ type: 'text', text: '**Fixed.**' }),
      say({ type: 'tool_use', name: 'mcp__ccd_turn__wrap_up', input: { recap: 'r', ask: 'Commit?' } }),
      prompt('thanks'),
      say({ type: 'text', text: 'You are welcome.' }),
    ]);
    try {
      const [first, second] = readTranscript(file, CONTRACT);
      assert.deepStrictEqual(
        [first.final, first.narration, first.work, first.ask, first.settings.next, first.hush, first.style.id.length],
        ['**Fixed.**', 4, true, true, 'off', true, 8]);
      assert.deepStrictEqual([second.final, second.work, second.ask], ['You are welcome.', false, false]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('a synthetic error reply is no message, and a turn answered by a background event is waiting', () => {
    const { dir, file } = write([
      prompt('run it'), style('v1', '2026-10-17T01:00:00Z'),
      say({ type: 'text', text: 'Still running.' }),
      prompt('<task-notification>done</task-notification>'),
      say({ type: 'text', text: '**Done.**' }),
      line({ type: 'assistant', message: { role: 'assistant', model: '<synthetic>', content: [{ type: 'text', text: "You've hit your session limit" }] } }),
    ]);
    try {
      const [first, second] = readTranscript(file, CONTRACT);
      assert.deepStrictEqual([first.waiting, second.waiting, second.final], [true, undefined, '**Done.**']);
      const res = score([file], CONTRACT);
      assert.deepStrictEqual([res.stats.waiting, res.rows.length], [1, 1]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('score skips turns outside hush and keeps style texts apart', () => {
    const { dir } = write([
      prompt('a'), style('v1', '2026-10-01T00:00:00Z'), say({ type: 'text', text: '**One.**' }),
      prompt('b'), style('v2', '2026-10-02T00:00:00Z'), say({ type: 'text', text: '**Two.**' }),
    ]);
    fs.writeFileSync(path.join(dir, 'other.jsonl'), [prompt('c'), say({ type: 'text', text: 'plain' })].join('\n'));
    try {
      const res = score([path.join(dir, 's.jsonl'), path.join(dir, 'other.jsonl')], CONTRACT);
      assert.deepStrictEqual([res.stats.turns, res.stats.hushTurns, res.rows.length, Object.keys(res.byStyle).length], [3, 2, 2, 2]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('loadContract', () => {
  const hushDir = require('../../paths.js').pluginDir('hush');
  const hasModules = fs.existsSync(path.join(hushDir, 'modules'));

  test('reads the knobs, every module and both caps from a hush checkout with settings', { skip: !hasModules && 'the hush checkout has no modules/ yet' }, () => {
    const c = loadContract(hushDir);
    assert.ok(c.modules.length > 0);
    assert.strictEqual(c.caps.wordCap, 12);
    assert.strictEqual(c.budget, 150);
  });
});
