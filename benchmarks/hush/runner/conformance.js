#!/usr/bin/env node
'use strict';
// Settings conformance: does each final message obey the hush settings that
// were active when it was written?
//
// /hush:config saves settings, and a SessionStart hook hands the model one
// module text per moved knob. This reads Claude Code transcripts, recovers
// those settings from the hook's text, finds each turn's final message, and
// checks the message against the settings that can be checked by machine.
//
// Each check reports pass, fail, warn or na. fail is a breach a regex can
// prove: a "Next:" line under next=off, a passed check under checks=off, an
// emoji outside the emoji=on map. warn is a soft rule ("most messages fit in
// 150 words") or a heuristic: a cause word under why=off, a footnote under
// terms=inline. na means the setting asks for judgement this file cannot
// make: why=on, caveats, terms=footnote, headers=off, box=decisions.
//
// turn.noCards marks a session with no file-card tool, as in claude -p: every
// file is then a link, whatever the files setting.
// Like caps.js, this is a second reading of the contract, never its
// definition; where the two disagree, the module text wins.
//
// Settings are recovered by matching the hush checkout's current module
// texts. A session written under an older module text shows as an unmatched
// paragraph and that knob reads as its default; the report counts them.
//
//   node runner/conformance.js --hush <hush checkout> <transcript.jsonl | folder> ...
//   node runner/conformance.js --settings next=off,records=off <transcript.jsonl>
//   node runner/conformance.js --json out.json --examples 5 <folder>
//   node runner/conformance.js --skip "^ROADMAP " ~/.claude/projects
//
// --skip drops turns whose final message matches a regex: replies whose
// format the prompt dictated, such as an orchestrator's worker reports.
// Turns that ended waiting on a background event and synthetic error
// replies are always left out and counted.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { readCaps, analyzeMessage, unitsOf, countWords } = require('./caps.js');

const SETTINGS_LEAD = 'hush settings, chosen by the user';
const WORK_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'Bash', 'PowerShell']);
const WRAP_UP = /(^|__)wrap_up$/;
const AUTOMATED = /^<(?:task-notification|side-sessions-event|ci-monitor-event)\b/;

// --- the contract, read from the hush checkout -------------------------------

function loadContract(hushDir) {
  if (!fs.existsSync(path.join(hushDir, 'modules'))) {
    throw new Error(`conformance.js: ${hushDir} has no modules/; pass --hush with a hush checkout that has message settings`);
  }
  const { KNOBS, DEFAULTS } = require(path.join(hushDir, 'hooks', 'style-settings.js'));
  const style = fs.readFileSync(path.join(hushDir, 'output-styles', 'hush.md'), 'utf8');
  const budget = style.match(/Most messages fit in (\d+) words/);
  if (!budget) throw new Error('conformance.js: could not read the word budget from the style file');
  const modules = [];
  for (const [knob, values] of Object.entries(KNOBS)) {
    for (const value of values.slice(1)) {
      const file = path.join(hushDir, 'modules', `${knob}-${value}.md`);
      modules.push({ knob, value, text: fs.readFileSync(file, 'utf8').trim() });
    }
  }
  return { KNOBS, DEFAULTS, modules, caps: readCaps(style), budget: Number(budget[1]), ...emojiMapOf(modules) };
}

/** The emoji=on module's map: every emoji it allows, and the ones a bold result may open with. */
function emojiMapOf(modules) {
  const text = modules.find((m) => m.knob === 'emoji' && m.value === 'on')?.text;
  if (!text) return {};
  const emojiMap = new Set(), resultEmoji = new Set();
  for (const [, block, cell] of text.matchAll(/^\|([^|\n]+)\|\s*([^|\n]+?)\s*\|$/gm)) {
    if (!EMOJI.test(cell)) continue;
    const e = cell.replace(/️/g, '');
    emojiMap.add(e);
    if (/bold result/i.test(block)) resultEmoji.add(e);
  }
  return { emojiMap, resultEmoji };
}

/** Settings named by one SessionStart context, plus paragraphs no module matched. */
function settingsFromContext(text, contract) {
  const settings = { ...contract.DEFAULTS };
  let rest = text.slice(text.indexOf('\n\n') + 2);
  for (const m of contract.modules) {
    if (rest.includes(m.text)) {
      settings[m.knob] = m.value;
      rest = rest.replace(m.text, '');
    }
  }
  const unmatched = rest.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
  return { settings, unmatched };
}

function parseSettings(arg, contract) {
  const settings = { ...contract.DEFAULTS };
  for (const pair of String(arg).split(/[,\s]+/).filter(Boolean)) {
    const [k, v] = pair.split('=');
    if (!contract.KNOBS[k] || !contract.KNOBS[k].includes(v)) throw new Error(`--settings: "${pair}" is not a known knob=value`);
    settings[k] = v;
  }
  return settings;
}

// --- transcripts --------------------------------------------------------------

const textOf = (content) => (typeof content === 'string' ? content
  : (content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n'));

function isPrompt(e) {
  if (e.type !== 'user' || e.isMeta || e.isSidechain || e.isCompactSummary) return false;
  const c = e.message?.content;
  return typeof c === 'string' || (Array.isArray(c) && c.some((b) => b.type === 'text' || b.type === 'image'));
}

/**
 * One transcript -> its turns. A turn's final message is the text after its
 * last tool call, wrap_up included: the desktop app does not show text written
 * before a tool call as the message. Text cut off by a later tool call is
 * narration.
 */
/** Parsed lines of a JSONL file, read in chunks: a transcript can pass Node's string limit. */
function* entriesOf(file) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(1 << 20);
  let rest = Buffer.alloc(0);
  const parse = (s) => { try { return s.trim() ? JSON.parse(s) : null; } catch { return null; } };
  try {
    for (let n; (n = fs.readSync(fd, buf, 0, buf.length, null)) > 0;) {
      const chunk = Buffer.concat([rest, buf.subarray(0, n)]);
      let start = 0;
      for (let i; (i = chunk.indexOf(10, start)) >= 0; start = i + 1) {
        const e = parse(chunk.toString('utf8', start, i));
        if (e) yield e;
      }
      rest = chunk.subarray(start);
    }
    const e = parse(rest.toString('utf8'));
    if (e) yield e;
  } finally {
    fs.closeSync(fd);
  }
}

function readTranscript(file, contract) {
  const entries = entriesOf(file);
  let hush = false, style = null, current = { settings: { ...contract.DEFAULTS }, unmatched: 0 }, turn = null;
  const turns = [];
  const close = () => { if (turn) turns.push({ ...turn, final: turn.tail.join('\n\n').trim() }); };
  for (const e of entries) {
    const a = e.attachment;
    // Context attachments land just after the prompt they serve, so they
    // still apply to a turn that has no reply yet.
    const fresh = turn && !turn.replied;
    if (e.type === 'attachment' && a?.type === 'output_style_instructions') {
      hush = /hush/i.test(a.style?.name || '');
      style = { id: crypto.createHash('sha1').update(String(a.style?.prompt || '')).digest('hex').slice(0, 8), at: e.timestamp || '' };
      if (fresh) Object.assign(turn, { hush, style });
    }
    if (e.type === 'attachment' && a?.type === 'hook_additional_context' && a.hookEvent === 'SessionStart') {
      const text = [].concat(a.content || []).find((c) => String(c).startsWith(SETTINGS_LEAD));
      if (text) current = settingsFromContext(String(text), contract);
      if (text && fresh) Object.assign(turn, current);
    }
    if (isPrompt(e)) {
      // A turn answered by an automated event, such as a finished background
      // task, ended while it waited: its last text is a status, not the
      // message the reader returns to.
      if (turn) turn.waiting = AUTOMATED.test(textOf(e.message.content).trimStart());
      close();
      turn = { index: turns.length + 1, hush, style, ...current, tail: [], narration: 0, work: false, ask: false, replied: false };
      continue;
    }
    // Claude Code writes errors such as a usage limit as synthetic replies.
    if (!turn || e.type !== 'assistant' || e.isSidechain || e.isApiErrorMessage || e.message?.model === '<synthetic>') continue;
    turn.replied = true;
    turn.entry ||= e.entrypoint || 'unknown';
    for (const b of e.message?.content || []) {
      if (b.type === 'text') turn.tail.push(b.text);
      if (b.type !== 'tool_use') continue;
      if (WRAP_UP.test(b.name) && typeof b.input?.ask === 'string' && b.input.ask.trim()) turn.ask = true;
      if (WORK_TOOLS.has(b.name)) turn.work = true;
      turn.narration += turn.tail.reduce((n, t) => n + countWords(t), 0);
      turn.tail = [];
    }
  }
  close();
  return turns;
}

// --- one message --------------------------------------------------------------

const FENCE = /```[\s\S]*?(?:```|$)/g;
const DIFF = /```diff[^\n]*\n([\s\S]*?)(?:```|$)/g;
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;
const LEAD_EMOJI = /^(?:(?![©®™])\p{Extended_Pictographic}️?\s*)/u;
const RULE = /^(?:-{3,}|\*{3,}|_{3,})$/;
const FOOTNOTE = /^\[\^[^\]]+\]:/;
const NEXT_WORD = /^(?:next(?: step)?|siguiente(?: paso)?|pr[oó]ximo paso|prochaine [ée]tape|n[äa]chster schritt|pr[oó]ximo passo)$/i;

/** Lines outside code, trimmed, blank ones kept so blocks survive. */
const linesOf = (text) => text.replace(FENCE, '').split('\n').map((l) => l.trim());

/** A "Next:" line: bold, as a bold header line, or plain as older styles wrote it. */
function isNextLine(line) {
  const l = line.replace(LEAD_EMOJI, '');
  const m = l.match(/^\*\*([^*\n]{2,40}?)\s*(:?)\*\*\s*(:?)(.*)$/);
  if (m) return NEXT_WORD.test(m[1].trim()) && (Boolean(m[2] || m[3]) || !m[4].trim());
  const p = l.match(/^([^:*\n]{2,40}):\s+\S/);
  return Boolean(p && NEXT_WORD.test(p[1].trim()));
}

const nextIndex = (nonEmpty) => nonEmpty.findIndex(isNextLine);

function bodyBlocks(text) {
  return text.replace(FENCE, '').split(/\n[ \t]*\n/).map((b) => b.trim()).filter(Boolean).slice(1)
    .filter((b) => !RULE.test(b) && !FOOTNOTE.test(b) && b !== '&nbsp;');
}

// A passed check in prose: a command in inline code, a pass word, no fail word.
const COMMAND = /`[^`\n]* [^`\n]*`/g;
const PASS_WORD = /\b(?:pass(?:es|ed)?|green|succeed(?:s|ed)?|clean|\d+ of \d+)\b/i;
const FAIL_WORD = /\b(?:fail(?:s|ed|ing)?|errors?|broke|did not|didn't|not run)\b/i;
const BULLET = /^(?:[-*+]|\d+\.)\s+/;

/** Each sentence or list item outside code that reports a passed check. The Next line is left out. */
function passedItems(nonEmpty) {
  const out = [];
  for (const line of nonEmpty) {
    if (isNextLine(line)) continue;
    for (const sentence of unitsOf(line)) {
      const commands = (sentence.match(COMMAND) || []).length;
      if (commands && PASS_WORD.test(sentence) && !FAIL_WORD.test(sentence)) out.push({ text: sentence, commands, bullet: BULLET.test(line) });
    }
  }
  return out;
}

// A file named in inline code, where the setting wants a link.
const FILE_CODE = /^[\w./-]*\w\.(?:[cm]?js|jsx|tsx?|json|md|py|sh|ps1|txt|log|ya?ml|toml|csv|html?|css|go|rs|rb|java)(?::\d+(?:-\d+)?)?$/;
const CAUSE = /\b(?:because|caused|due to|since|which made|that is why|the cause)\b/i;
const RECORD = /\b(?:updated|wrote|added|saved|recorded|logged|noted|kept)\b[^.\n]*(?:\.md\b|\bnotes?\b|\bmemory\b)/i;
const leadOf = (block) => block.replace(/^\*\*/, '').match(/^((?![©®™])\p{Extended_Pictographic})/u)?.[1];

const result = (status, why = '') => ({ status, why });

function checkMessage(text, s, turn, contract) {
  const lines = linesOf(text);
  const nonEmpty = lines.filter(Boolean);
  const rules = nonEmpty.filter((l) => RULE.test(l)).length;
  const ni = nextIndex(nonEmpty);
  const plain = s.markdown === 'plain';
  const out = {};

  out.result = /^\*\*[^*].*?\*\*/.test((nonEmpty[0] || '').replace(LEAD_EMOJI, ''))
    ? result('pass') : result('fail', `first line is not bold: "${(nonEmpty[0] || '').slice(0, 60)}"`);

  // A box that asks ends the turn with no message, so any message after it is a breach.
  if (turn.ask && s.box !== 'text') {
    out.next = result('fail', 'the box asked, yet a message follows it');
  } else if (s.next === 'off') {
    out.next = ni < 0 ? result('pass') : result('fail', `Next line present under next=off: "${nonEmpty[ni].slice(0, 60)}"`);
  } else if (ni < 0) {
    out.next = result('fail', `no Next line under next=${s.next}`);
  } else if (!plain && !nonEmpty[ni].replace(LEAD_EMOJI, '').startsWith('**')) {
    out.next = result('fail', 'the Next word is not bold');
  } else if (s.next === 'end') {
    const last = nonEmpty.filter((l) => l !== '&nbsp;');
    out.next = nextIndex(last) === last.length - 1 || (nonEmpty[ni].replace(LEAD_EMOJI, '').match(/^\*\*[^*]+\*\*$/) && nextIndex(last) === last.length - 2)
      ? result('pass') : result('fail', 'Next line is not the last line');
  } else {
    out.next = ni === 1 ? result('pass') : result('fail', `Next line is line ${ni + 1}, not right under the result`);
  }

  if (plain || s.rules === 'off') {
    out.rules = rules === 0 ? result('pass') : result('fail', `${rules} rule line(s) under ${plain ? 'markdown=plain' : 'rules=off'}`);
  } else if (nonEmpty.length < 2) {
    out.rules = result('na', 'result line only');
  } else {
    const anchor = s.next === 'top' && ni === 1 ? 1 : 0;
    const errs = [];
    if (!RULE.test(nonEmpty[anchor + 1] || '')) errs.push(`no rule after line ${anchor + 1}`);
    if (s.next === 'end' && ni > 1 && !RULE.test(nonEmpty[ni - 1])) errs.push('no rule above the Next line');
    out.rules = errs.length ? result('fail', errs.join('; ')) : result('pass');
  }

  const wordCap = s.sentences === '20' ? 20 : contract.caps.wordCap;
  const blockCap = s.sentences === '20' ? 60 : contract.caps.blockCap;
  const caps = analyzeMessage(text, { wordCap, blockCap });
  out.sentences = caps.overWordCap ? result('fail', `${caps.overWordCap} sentence(s) over ${wordCap} words, longest ${caps.longestWords}`) : result('pass');
  out.blocks = caps.overBlockCap ? result('fail', `${caps.overBlockCap} block(s) over ${blockCap} words, longest ${caps.longestBlockWords}`) : result('pass');

  const budget = { normal: contract.budget, short: 80, full: 300 }[s.detail];
  const prose = text.replace(FENCE, '\n').replace(/\[([^\]\n]*)\]\(([^)\s]*)\)/g, '$1');
  const words = unitsOf(prose).reduce((n, u) => n + countWords(u), 0);
  out.length = !budget ? result('na', 'detail=bare has no word number')
    : words <= budget ? result('pass') : result('warn', `${words} words outside code, budget ${budget}`);

  // The style writes passed checks as one plain sentence with no marks, such
  // as "`npm test` passes, 212 of 212." Older styles marked them in a diff
  // block: "+ ✓" passed, "- ✗" failed, "  ○" not checked. Both are read.
  const diffLines = [...text.matchAll(DIFF)].flatMap((m) => m[1].split('\n'));
  const checkLines = [...nonEmpty.filter((l) => l.includes('✓')), ...diffLines.filter((l) => /^\+\s*✓/.test(l))];
  const passed = passedItems(nonEmpty);
  const loose = nonEmpty.filter((l) => /^(?:[-*]\s+)?[✓✗○]\s/.test(l)).length;
  if (loose) {
    out.checks = result('fail', `${loose} check line(s) outside a diff block`);
  } else if (s.checks === 'off' || s.detail === 'bare') {
    const n = checkLines.length + passed.length;
    out.checks = n ? result('fail', `${n} passed check(s) under ${s.detail === 'bare' ? 'detail=bare' : 'checks=off'}, such as "${(passed[0]?.text || checkLines[0]).slice(0, 60)}"`) : result('pass');
  } else if (s.checks === 'each') {
    const shared = checkLines.filter((l) => (l.match(/✓/g) || []).length > 1).length + passed.filter((p) => p.commands > 1).length;
    const prose = passed.filter((p) => !p.bullet).length;
    out.checks = shared ? result('fail', `${shared} line(s) share several passed checks`)
      : prose ? result('fail', `${prose} passed check(s) in prose, not a bullet`) : result('pass');
  } else {
    const n = checkLines.length + passed.length;
    // detail=full lets a check that is part of the evidence take its own sentence.
    out.checks = n > 1 ? result(s.detail === 'full' ? 'warn' : 'fail', `${n} sentences or lines hold passed checks, the setting allows one`) : result('pass');
  }

  const blocks = bodyBlocks(text);
  if (s.emoji === 'off') {
    const hit = nonEmpty.find((l) => EMOJI.test(l.replace(/`[^`\n]+`/g, '')));
    out.emoji = hit ? result('fail', `emoji under emoji=off: "${hit.slice(0, 60)}"`) : result('pass');
  } else {
    const all = [nonEmpty[0] || '', ...blocks];
    const bare = all.filter((b) => !leadOf(b)).length;
    const errs = [];
    if (contract.emojiMap) {
      const found = all.map((b) => [...b.replace(/`[^`\n]+`/g, '').matchAll(new RegExp(EMOJI.source, 'gu'))].map((m) => m[0]));
      const off = [...new Set(found.flat().filter((e) => !contract.emojiMap.has(e)))];
      if (off.length) errs.push(`emoji outside the map: ${off.join(' ')}`);
      const inside = all.filter((b, i) => found[i].length > (leadOf(b) ? 1 : 0)).length;
      if (inside) errs.push(`${inside} block(s) hold an emoji that does not open them`);
      const lead = leadOf(nonEmpty[0] || '');
      if (!contract.resultEmoji.has(lead)) errs.push(`the bold result opens with ${lead || 'no emoji'}, not ${[...contract.resultEmoji].join(' ')}`);
    }
    out.emoji = errs.length ? result('fail', errs.join('; '))
      : bare ? result('warn', `${bare} of ${all.length} block(s) open without an emoji; a block of another kind may rightly have none`) : result('pass');
  }

  if (s.headers === 'on') {
    const missing = blocks.filter((b) => !/^\*\*[^*\n]+\*\*$/.test(b.split('\n')[0].replace(LEAD_EMOJI, ''))).length;
    out.headers = missing ? result('warn', `${missing} of ${blocks.length} body block(s) open without a bold header line`) : result('pass');
  } else {
    out.headers = result('na', 'the no-stock-label rule needs judgement');
  }

  const forbidden = [[/<details>|\[!(?:NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]|```mermaid|<sub>|<sup>/, 'a form the app shows raw']];
  if (s.markdown !== 'rich') {
    forbidden.push([/^\[\^[^\]]+\]:/m, 'a footnote'], [/```search_tree|```math|\$\$/, 'search_tree or math'], [/<kbd>/, '<kbd>'],
      [/~~[^~]+~~/, 'strikethrough'], [/!\[[^\]]*\]\(/, 'an image'], [/\]\(#(?:terminal\/|local_)/, 'an app link']);
  }
  if (plain) {
    forbidden.push([/^\s*\|.*\|\s*$/m, 'a table'], [/\[[^\]\n]+\]\([^)\s]+\)/, 'a link'], [/^#{1,6}\s/m, 'a heading'],
      [/^\s*[-*] \[[ x]\]/m, 'a task list'], [/^>/m, 'a quote block']);
  }
  const outside = text.replace(FENCE, (m) => (/^```(?:search_tree|math|mermaid)/.test(m) ? m : ''));
  const found = forbidden.filter(([re]) => re.test(outside)).map(([, name]) => name);
  out.markdown = found.length ? result('fail', `markdown=${s.markdown} forbids ${found.join(', ')}`) : result('pass');

  // Under files=link, or in a session with no file-card tool, every file
  // is a link: a file name in inline code outside a link is a breach.
  if (s.markdown !== 'plain' && (s.files === 'link' || turn.noCards)) {
    const named = [...text.replace(FENCE, '\n').replace(/\[[^\]\n]*\]\([^)\s]*\)/g, '').matchAll(/`([^`\n]+)`/g)]
      .map((m) => m[1]).filter((t) => FILE_CODE.test(t));
    out.files = named.length ? result('fail', `${named.length} file(s) in inline code, not a link, such as ${named[0]}`) : result('pass');
  // A warn, not a fail: the meter cannot see whether the session had the
  // file-card tool, and without it every file is rightly a link.
  } else if (s.files === 'card' && s.markdown === 'rich') {
    const whole = [...text.replace(FENCE, '\n').matchAll(/\[[^\]\n]+\]\(([^)\s#][^)\s]*)\)/g).map((m) => m[1])]
      .filter((t) => !/^[a-z][\w+.-]*:\/\//i.test(t) && !/:\d+(?:-\d+)?$/.test(t) && /\.\w+$/.test(t));
    out.files = whole.length ? result('warn', `${whole.length} whole-file link(s), such as ${whole[0]}`) : result('pass');
  } else {
    out.files = result('na', s.markdown === 'rich' ? 'files=link' : `markdown=${s.markdown} has no cards`);
  }

  if (s.records === 'off' || s.detail === 'bare') {
    // The Next line may still link a doc the next step needs.
    const hit = nonEmpty.find((l) => /📝/.test(l) || /\b(?:memory|memoria|task note|nota de tarea)\b/i.test(l) || (!isNextLine(l) && RECORD.test(l)));
    out.records = hit ? result('warn', `may be a records line: "${hit.slice(0, 60)}"`) : result('pass');
  } else {
    out.records = result('na', 'records=line is optional');
  }

  if (s.box === 'text') out.box = turn.ask ? result('fail', 'the box asked under box=text') : result('pass');
  else if (s.box === 'work') out.box = turn.ask && !turn.work ? result('fail', 'the box asked on a turn with no edit or command') : result('pass');
  else out.box = result('na', 'box=decisions needs judgement');

  // Heuristics, so warns: a cause word opening the body, a footnote with no link.
  if (s.why === 'off') {
    const first = blocks.find((b) => !isNextLine(b.split('\n')[0]))?.split('\n').filter((l) => !/^\*\*[^*\n]+\*\*$/.test(l)).join(' ') || '';
    const sentence = unitsOf(first)[0] || '';
    out.why = CAUSE.test(sentence) ? result('warn', `the body may open with a cause sentence: "${sentence.slice(0, 60)}"`) : result('pass');
  } else {
    out.why = result('na', 'needs judgement');
  }
  if (s.terms === 'inline' || s.terms === 'none') {
    const notes = nonEmpty.filter((l) => FOOTNOTE.test(l) && !/\]\(|https?:\/\//.test(l));
    out.terms = notes.length ? result('warn', `${notes.length} footnote(s) with no source link may explain a term: "${notes[0].slice(0, 60)}"`) : result('pass');
  } else {
    out.terms = result('na', 'needs judgement');
  }
  out.caveats = result('na', 'needs judgement');
  return out;
}

// --- many transcripts -----------------------------------------------------------

/** A transcript, a project folder of them, or a folder of project folders such as ~/.claude/projects. */
function filesOf(targets) {
  return targets.flatMap((t) => {
    if (!fs.statSync(t).isDirectory()) return [t];
    const entries = fs.readdirSync(t, { withFileTypes: true });
    const own = entries.filter((e) => e.isFile() && e.name.endsWith('.jsonl')).map((e) => path.join(t, e.name));
    return own.length ? own : filesOf(entries.filter((e) => e.isDirectory()).map((e) => path.join(t, e.name))
      .filter((d) => fs.readdirSync(d).some((f) => f.endsWith('.jsonl'))));
  });
}

function score(files, contract, { override, skip } = {}) {
  const rows = [];
  const stats = { files: files.length, turns: 0, hushTurns: 0, empty: 0, waiting: 0, skipped: 0, unmatched: 0 };
  for (const file of files) {
    for (const turn of readTranscript(file, contract)) {
      stats.turns++;
      if (!turn.hush && !override) continue;
      stats.hushTurns++;
      if (!turn.final) { stats.empty++; continue; }
      if (turn.waiting) { stats.waiting++; continue; }
      if (skip && skip.test(turn.final)) { stats.skipped++; continue; }
      if (turn.unmatched && !override) stats.unmatched++;
      const settings = override || turn.settings;
      rows.push({ file: path.basename(file), turn: turn.index, entry: turn.entry, style: turn.style, settings, narration: turn.narration,
        checks: checkMessage(turn.final, settings, turn, contract) });
    }
  }
  // The base rules moved between hush releases, so a breach under an older
  // style text may have been no breach then. byStyle keeps them apart.
  const tally = (rs) => {
    const t = {};
    for (const r of rs) {
      for (const [k, v] of Object.entries(r.checks)) {
        t[k] ||= { pass: 0, fail: 0, warn: 0, na: 0 };
        t[k][v.status]++;
      }
    }
    return t;
  };
  const byStyle = {};
  for (const r of rows) {
    const id = r.style?.id || 'none';
    byStyle[id] ||= { first: r.style?.at || '', rows: [] };
    if (r.style?.at && r.style.at < byStyle[id].first) byStyle[id].first = r.style.at;
    byStyle[id].rows.push(r);
  }
  for (const v of Object.values(byStyle)) { v.turns = v.rows.length; v.totals = tally(v.rows); delete v.rows; }
  return { stats, totals: tally(rows), byStyle, rows };
}

// --- CLI --------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const flags = {};
  const targets = [];
  for (let i = 0; i < argv.length; i++) {
    if (['--hush', '--settings', '--json', '--examples', '--skip'].includes(argv[i])) flags[argv[i].slice(2)] = argv[++i];
    else if (argv[i].startsWith('--')) { console.error(`unknown flag ${argv[i]}`); process.exit(2); }
    else targets.push(argv[i]);
  }
  if (!targets.length) {
    console.error('Usage: conformance.js [--hush <dir>] [--settings k=v,...] [--json <out>] [--examples <n>] <transcript.jsonl | folder> ...');
    process.exit(2);
  }
  const contract = loadContract(path.resolve(flags.hush || require('../../paths.js').pluginDir('hush')));
  const override = flags.settings ? parseSettings(flags.settings, contract) : null;
  const skip = flags.skip ? new RegExp(flags.skip, 'm') : null;
  const res = score(filesOf(targets), contract, { override, skip });
  if (flags.json) fs.writeFileSync(flags.json, JSON.stringify(res, null, 2));

  const { stats } = res;
  console.log(`${stats.files} transcript(s), ${stats.turns} turns, ${stats.hushTurns} under hush, ${res.rows.length} scored, ${stats.empty} with no final text, ${stats.waiting} ended waiting on a background event, ${stats.skipped} matched --skip`);
  const entries = {};
  for (const r of res.rows) entries[r.entry] = (entries[r.entry] || 0) + 1;
  console.log(`scored turns by entrypoint: ${Object.entries(entries).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (stats.unmatched) console.log(`${stats.unmatched} scored turn(s) carry a settings paragraph no current module matched; those knobs read as default`);
  const narrated = res.rows.filter((r) => r.narration > 0);
  console.log(`${narrated.length} turn(s) wrote text between tool calls, ${narrated.reduce((n, r) => n + r.narration, 0)} words in all\n`);
  console.log(['check', 'pass', 'fail', 'warn', 'na'].join('\t'));
  for (const [k, t] of Object.entries(res.totals)) console.log([k, t.pass, t.fail, t.warn, t.na].join('\t'));
  const keys = ['result', 'next', 'rules', 'sentences', 'blocks', 'length'];
  console.log(`\nfails (warns for length) by style text, oldest first\nstyle\tfirst seen\tturns\t${keys.join('\t')}`);
  for (const [id, v] of Object.entries(res.byStyle).sort((a, b) => a[1].first.localeCompare(b[1].first))) {
    console.log([id, v.first.slice(0, 10), v.turns, ...keys.map((k) => v.totals[k][k === 'length' ? 'warn' : 'fail'])].join('\t'));
  }
  console.log('');
  const n = Number(flags.examples ?? 3);
  for (const k of Object.keys(res.totals)) {
    const bad = res.rows.filter((r) => ['fail', 'warn'].includes(r.checks[k].status)).slice(0, n);
    for (const r of bad) console.log(`${k} ${r.checks[k].status}: ${r.file} turn ${r.turn}: ${r.checks[k].why}`);
  }
}

if (require.main === module) main();

module.exports = { loadContract, settingsFromContext, parseSettings, readTranscript, checkMessage, nextIndex, score };
