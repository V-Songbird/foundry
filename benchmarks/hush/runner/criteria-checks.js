'use strict';
// Everything the criteria judge measures WITHOUT a model.
//
// Jev reads literally, does not count and does not do arithmetic, so every
// count, ratio and pattern lives here. These also cannot drift with the judge:
// a rubric reword moves no number in this file.
//
// Pure functions over text, plus two readers that take a parsed transcript.
// No I/O except fixtureFiles(), which lists a fixture tree once.

const fs = require('node:fs');
const path = require('node:path');

const FENCE = /```[\s\S]*?```/g;
const LINK = /\[([^\]\n]+)\]\((<[^>\n]+>|[^)\s]+)\)/g;
const INLINE_CODE = /`[^`\n]+`/g;
const URL = /https?:\/\/[^\s)>\]]+/g;
// A file the reader might want to open: an optional directory chain, a name,
// a known extension, an optional :line. Extension list is closed on purpose —
// "e.g." and "v1.2" must not read as files.
const FILE_REF = /(?<![\w/\\.-])(?:[\w.-]+[\\/])*[\w.-]+\.(?:js|cjs|mjs|ts|tsx|jsx|json|jsonl|md|log|csv|txt|yml|yaml|toml|py|sh|ps1|html|css|sql)(?::\d+(?:[:-]\d+)?)?(?![\w-])/g;

const words = (s) => (s.match(/\S+/g) || []).length;
const stripFences = (md) => md.replace(FENCE, '\n');

// --- references and link coverage -------------------------------------------
// A reference is linked when the occurrence sits inside a markdown link, in its
// text or its target. A bare http(s) URL counts as clickable: terminals and the
// desktop app both auto-link it. A file name inside an inline-code span that
// also holds a space is a COMMAND (`node verify.js`), not something to open.
function references(md) {
  const text = stripFences(md);
  // Every markdown link is one linked reference, whatever its text says.
  const targets = [...text.matchAll(LINK)].map((m) => m[2].replace(/^<|>$/g, ''));
  // What is left once the links are blanked out can only be bare.
  let rest = text.replace(LINK, (m) => ' '.repeat(m.length));
  rest = rest.replace(INLINE_CODE, (m) => (/\s/.test(m.slice(1, -1).trim()) ? ' '.repeat(m.length) : m));
  const bareUrls = rest.match(URL) || [];
  rest = rest.replace(URL, (m) => ' '.repeat(m.length));
  const unlinked = rest.match(FILE_REF) || [];
  const linked = targets.length + bareUrls.length;
  const total = linked + unlinked.length;
  return { total, linked, unlinked, coverage: total ? linked / total : null, targets };
}

function fixtureFiles(fixtureDir) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p); else out.push(path.relative(fixtureDir, p).replace(/\\/g, '/'));
    }
  };
  if (fixtureDir && fs.existsSync(fixtureDir)) walk(fixtureDir);
  return out;
}

// A target is real when it names a file of the fixture. Sessions run in a copy
// of the fixture under a temp dir, so an absolute target is matched by suffix.
function targetsExist(targets, files) {
  const local = targets.filter((t) => !/^https?:/i.test(t));
  if (!local.length) return { checked: 0, real: 0, ratio: null, missing: [] };
  const missing = [];
  for (const t of local) {
    const clean = decodeURIComponent(t).replace(/\\/g, '/').replace(/#.*$/, '').replace(/:\d+(?:[:-]\d+)?$/, '').replace(/^\.\//, '');
    const hit = files.some((f) => clean === f || clean.endsWith('/' + f));
    if (!hit) missing.push(t);
  }
  return { checked: local.length, real: local.length - missing.length, ratio: (local.length - missing.length) / local.length, missing };
}

// --- shape -------------------------------------------------------------------
function shape(md) {
  const text = stripFences(md);
  const lines = text.split('\n');
  const tableSeps = lines.filter((l) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l)).length;
  const tableRows = Math.max(0, lines.filter((l) => /^\s*\|.*\|\s*$/.test(l)).length - 2 * tableSeps);
  const bullets = lines.filter((l) => /^\s*[-*+] \S/.test(l)).length;
  const numbered = lines.filter((l) => /^\s*\d+[.)] \S/.test(l)).length;
  const headings = lines.filter((l) => /^#{1,6} \S/.test(l)).length;
  const bold = (text.match(/\*\*[^*\n]+\*\*/g) || []).length;
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).length;
  const fences = (md.match(FENCE) || []).length;
  const w = words(text);
  return {
    words: w, lines: lines.filter((l) => l.trim()).length, blocks,
    tables: tableSeps, tableRows, bullets, numbered, headings, bold, fences,
    // Conditions the rubric's `when` field reads. The size cut-off is a
    // mechanical switch for which questions apply, not a quality threshold: a
    // map and a closing recap are only asked of a message long enough to need
    // them. At 150 words the map question fired on a seven-line fix report.
    flags: {
      table: tableSeps > 0,
      bullets: bullets > 0,
      long: w >= 220,
    },
  };
}

// --- readability, descriptive only ------------------------------------------
function proseOnly(md) {
  return stripFences(md)
    .replace(LINK, '$1')
    .replace(INLINE_CODE, ' ')
    .split('\n').filter((l) => !/^\s*\|/.test(l)).join('\n');
}

function readability(md) {
  const prose = proseOnly(md);
  const sents = prose.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => words(s) > 0);
  const lens = sents.map(words);
  const all = prose.match(/[\p{L}]+/gu) || [];
  const long = all.filter((x) => x.length >= 10).length;
  return {
    sentences: sents.length,
    meanWordsPerSentence: lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0,
    longestSentence: lens.length ? Math.max(...lens) : 0,
    longWordShare: all.length ? long / all.length : 0,
  };
}

// --- units Jev picks from ----------------------------------------------------
// Numbered reading units for the hardest-sentence question. Link targets are
// stripped so a link does not read as a hard sentence (it did, in the first
// probe). A table row is one unit. Never split on a colon: "Next: do x" is one.
function sentenceUnits(md, cap = 40) {
  const text = stripFences(md).replace(LINK, '$1');
  const units = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\|?\s*:?-{3,}/.test(line)) continue;
    if (/^\|.*\|$/.test(line)) { units.push(line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()).filter(Boolean).join(' | ')); continue; }
    const clean = line.replace(/^#{1,6} /, '').replace(/^[-*+] /, '').replace(/^\d+[.)] /, '');
    for (const s of clean.split(/(?<=[.!?])\s+/)) if (words(s) > 0) units.push(s.trim());
  }
  const ranked = units.map((u, i) => ({ u, i })).sort((a, b) => words(b.u) - words(a.u)).slice(0, cap).sort((a, b) => a.i - b.i);
  const out = {};
  for (const { u, i } of ranked) out[`s${i + 1}`] = u;
  return out;
}

// Candidate hard terms: long words, acronyms and hyphenated compounds in the
// prose, outside code and links. Real identifiers in backticks are exact names
// the reader copies, not vocabulary, so they are left out.
function termCandidates(md, cap = 30) {
  const prose = proseOnly(md);
  const seen = new Map();
  for (const t of prose.match(/[\p{L}][\p{L}\p{N}]*(?:-[\p{L}\p{N}]+)*/gu) || []) {
    const acronym = /^[A-Z][A-Z0-9]{1,}$/.test(t);
    const compound = t.includes('-') && t.length >= 8;
    if (!(t.length >= 10 || acronym || compound)) continue;
    const key = t.toLowerCase();
    if (!seen.has(key)) seen.set(key, t);
  }
  return [...seen.values()].sort((a, b) => b.length - a.length).slice(0, cap);
}

// --- what was said before and between tool calls ----------------------------
// `events` is the parsed stream-json transcript of ONE `claude -p` call. Blocks
// are walked in order: text before the first tool call is the opener, text
// between tool calls is mid-turn text, and the last text block is the final
// message, which belongs to neither.
const HARNESS_ERROR = /^(API Error|Execution error|Request timed out)\b/;
function spokenParts(events) {
  const seq = [];
  for (const ev of events) {
    if (ev.type !== 'assistant' || !ev.message || ev.isSidechain) continue;
    for (const b of ev.message.content || []) {
      if (b.type === 'text' && b.text && b.text.trim() && !HARNESS_ERROR.test(b.text.trim())) seq.push({ kind: 'text', text: b.text.trim() });
      else if (b.type === 'tool_use') seq.push({ kind: 'tool' });
    }
  }
  const lastText = seq.map((x) => x.kind).lastIndexOf('text');
  const firstTool = seq.findIndex((x) => x.kind === 'tool');
  const opener = [];
  const midTurn = [];
  seq.forEach((x, i) => {
    if (x.kind !== 'text' || i === lastText) return;
    if (firstTool === -1 || i < firstTool) opener.push(x.text); else midTurn.push(x.text);
  });
  return {
    toolCalls: seq.filter((x) => x.kind === 'tool').length,
    opener: opener.join('\n').trim() || null,
    openerWords: words(opener.join(' ')),
    midTurn,
    midTurnWords: words(midTurn.join(' ')),
  };
}

// A line that only says what comes next. English and Spanish, first sentence.
const ANNOUNCE_EN = /^(?:(?:ok(?:ay)?|alright|sure|great|right|now|first|so)[,.!]?\s+)*(?:i['’]ll|i will|let me|i['’]m going to|i am going to|going to|let['’]s|time to)\b/i;
const ANNOUNCE_ES = /^(?:(?:ok|vale|bien|bueno|claro|perfecto|listo|ahora|primero)[,.!]?\s+)*(?:voy a|vamos a|d[eé]jame|perm[ií]teme|empiezo|comienzo|empecemos)\b/i;
const looksLikeAnnouncement = (s) => !!s && (ANNOUNCE_EN.test(s.trim()) || ANNOUNCE_ES.test(s.trim()));

// --- contract ----------------------------------------------------------------
const MARKER_LEAK = /\[hush\b|hush hook|hook reminder|hush:\s/i;
const leaksMarker = (texts) => texts.some((t) => MARKER_LEAK.test(t || ''));

const ES_WORDS = /\b(?:el|la|los|las|que|de|en|un|una|es|se|no|con|por|para|como|pero|más|ya|lo|su|al|del|está|hay|fue|son|esto|esta|este)\b/gi;
const EN_WORDS = /\b(?:the|and|that|of|in|is|it|to|was|for|with|not|this|but|are|on|as|you|at|be|from|has|have|were|which)\b/gi;
function language(md) {
  const prose = proseOnly(md);
  const es = (prose.match(ES_WORDS) || []).length;
  const en = (prose.match(EN_WORDS) || []).length;
  if (es === 0 && en === 0) return null;
  return es > en ? 'es' : 'en';
}

module.exports = {
  words, stripFences, references, fixtureFiles, targetsExist, shape, readability,
  sentenceUnits, termCandidates, spokenParts, looksLikeAnnouncement, leaksMarker, language,
};
