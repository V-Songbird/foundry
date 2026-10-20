#!/usr/bin/env node
// Pairwise preference between two arms' messages, judged by TypeSafe Jev.
//
//   node runner/duel.js --tag sf6 --a v2-skim --b v9-linkall
//   node runner/duel.js --tag sf1 --tag sf2 --tag sf3 --a hush --b v2-skim
//
// judge.js scores each message alone, and the arms it compares sit 0.01 to
// 0.03 apart on a composite whose per-rep spread is 0.02 to 0.07. That is a
// blunt instrument for the differences that are left. Asking "which of these
// two would this reader rather have opened at 4am" is a much sharper one, and
// it costs Jev tokens only — the sessions are already on disk.
//
// EVERY PAIR IS JUDGED TWICE, once in each order, and the two are averaged.
// A preference judge that is never shown the reverse order is measuring its
// own position bias as much as the messages, and the bias is reported here
// rather than assumed away.

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { flagAll } = require('../../flags.js');

const ROOT = path.resolve(__dirname, '..');
const RESULTS = path.join(require('../../paths.js').dataDir('hush'), 'results');
const API = process.env.TYPESAFE_API_URL || 'https://api.typesafe.ai/v1/systemone';
const KEY = process.env.TYPESAFE_API_KEY;

const argv = process.argv.slice(2);
const many = (n) => flagAll(argv, n);
const one = (n, d = null) => (many(n)[0] ?? d);

const tags = many('tag');
const armA = one('a');
const armB = one('b');
if (!tags.length || !armA || !armB) {
  console.error('usage: node runner/duel.js --tag NAME [--tag NAME2] --a ARM --b ARM');
  process.exit(2);
}
if (!KEY) { console.error('TYPESAFE_API_KEY is not set in this process env.'); process.exit(2); }

const rubric = JSON.parse(fs.readFileSync(path.join(ROOT, 'rubric.json'), 'utf8'));

function messages(arm) {
  const out = [];
  for (const tag of tags) {
    const dir = path.join(RESULTS, tag, 'runs');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (r.arm === arm && r.finalText) out.push({ key: r.key, text: r.finalText, words: r.finalWords });
    }
  }
  return out;
}

const QUESTIONS = {
  overall: {
    instructions: 'Two messages answer the same request for the reader described in `reader`. Which one would that reader rather have opened at 04:00?',
    criteria: {
      first: 'The first message. It gets them what they need with less effort.',
      second: 'The second message. It gets them what they need with less effort.',
      neither: 'Neither is meaningfully better. Swapping one for the other would change nothing for this reader.',
    },
  },
  ten_seconds: {
    instructions: 'The reader described in `reader` has ten seconds and then has to act. Which message leaves them better placed to act correctly?',
    criteria: {
      first: 'The first message.',
      second: 'The second message.',
      neither: 'No real difference in ten seconds.',
    },
  },
  trust: {
    instructions: 'Which message is more honest about the difference between what was observed and what was worked out, so the reader is less likely to repeat a derived figure as a measured one?',
    criteria: {
      first: 'The first message.',
      second: 'The second message.',
      neither: 'Both handle it the same way, well or badly.',
    },
  },
};

async function ask(state, attempt = 0) {
  const questions = {};
  for (const [id, q] of Object.entries(QUESTIONS)) questions[id] = { type: 'choice', ...q };
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: rubric.model, questions }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 4) throw new Error(`Jev ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    return ask(state, attempt + 1);
  }
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function main() {
  const A = messages(armA);
  const B = messages(armB);
  if (!A.length || !B.length) { console.error(`no messages: ${armA}=${A.length} ${armB}=${B.length}`); process.exit(2); }

  // Every A against every B is n*m pairs and grows fast; pair by position and
  // wrap the shorter list, which keeps it linear and still sees every message.
  const pairs = [];
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) pairs.push([A[i % A.length], B[i % B.length]]);

  const score = {};            // question -> { a, b, neither }
  const positionMass = { first: 0, second: 0, n: 0 };
  let usage = { input_tokens: 0, output_tokens: 0 };

  for (const [a, b] of pairs) {
    // Forward: A is "first". Reverse: B is "first". Average the two so a
    // preference for position cancels and only a preference for content shows.
    for (const forward of [true, false]) {
      const state = {
        reader: rubric.reader,
        situation: rubric.situation,
        first_message: forward ? a.text : b.text,
        second_message: forward ? b.text : a.text,
      };
      const r = await ask(state);
      usage.input_tokens += r.usage?.input_tokens || 0;
      usage.output_tokens += r.usage?.output_tokens || 0;
      for (const [id, ans] of Object.entries(r.answers)) {
        const p = ans.probabilities;
        const s = (score[id] ||= { a: 0, b: 0, neither: 0, n: 0 });
        s.a += forward ? p.first : p.second;
        s.b += forward ? p.second : p.first;
        s.neither += p.neither;
        s.n += 1;
        if (id === 'overall') {
          positionMass.first += p.first;
          positionMass.second += p.second;
          positionMass.n += 1;
        }
      }
    }
  }

  // Across every duel run for this study the shorter message won 9 of 11,
  // r = 0.709 between the word gap and the margin. So the gap is printed with
  // the result: above roughly twenty words, `overall` is mostly reporting
  // length and the composite is the better guide.
  const wA = A.reduce((s, m) => s + (m.words || 0), 0) / A.length;
  const wB = B.reduce((s, m) => s + (m.words || 0), 0) / B.length;
  const gap = Math.round(wA - wB);

  console.log(`${armA} (n=${A.length}, ${Math.round(wA)}w) vs ${armB} (n=${B.length}, ${Math.round(wB)}w)  over ${tags.join(', ')}`);
  console.log(`${pairs.length} pairs, each judged in both orders`);
  console.log(`word gap ${gap >= 0 ? armB : armA} is ${Math.abs(gap)} shorter` +
    (Math.abs(gap) > 20 ? '  <-- large enough that `overall` is mostly length; read the composite too' : '') + '\n');
  console.log('question'.padEnd(14) + armA.padStart(11) + armB.padStart(11) + 'neither'.padStart(10) + '   verdict');
  for (const [id, s] of Object.entries(score)) {
    const a = s.a / s.n, b = s.b / s.n, nn = s.neither / s.n;
    const margin = a - b;
    const verdict = Math.abs(margin) < 0.05 ? 'tie' : `${margin > 0 ? armA : armB} by ${Math.abs(margin).toFixed(3)}`;
    console.log(id.padEnd(14) + a.toFixed(3).padStart(11) + b.toFixed(3).padStart(11) + nn.toFixed(3).padStart(10) + '   ' + verdict);
  }

  const bias = positionMass.first / positionMass.n - positionMass.second / positionMass.n;
  console.log(`\nposition bias, mass on "first" minus "second" across both orders: ${bias >= 0 ? '+' : ''}${bias.toFixed(3)}`);
  console.log('(cancelled by averaging; a large value means read the margins with care)');
  console.log(`Jev usage ${usage.input_tokens} in / ${usage.output_tokens} out`);
}

main().catch((e) => { console.error(e); process.exit(1); });
