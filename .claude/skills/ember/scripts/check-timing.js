'use strict';
// Checks every <animate>/<animateTransform> in an SVG for the lists SMIL
// needs: keyTimes sorted from 0 to 1, values count equal to keyTimes count,
// keySplines count one less. Prints each offender; exit 1 if any.
//
//   node check-timing.js path/to/mascot.svg
const fs = require('node:fs');

const file = process.argv[2];
if (!file) { console.error('usage: node check-timing.js <svg>'); process.exit(2); }
const svg = fs.readFileSync(file, 'utf8');
let bad = 0, total = 0;
for (const m of svg.matchAll(/<animate(?:Transform)?\b[^>]*>/g)) {
  const tag = m[0];
  const attr = (n) => (tag.match(new RegExp(` ${n}="([^"]*)"`)) || [])[1];
  const keyTimes = attr('keyTimes');
  if (!keyTimes) continue;
  total++;
  const why = [];
  const kt = keyTimes.split(';').map(Number);
  const ks = attr('keySplines');
  const values = attr('values');
  if (kt[0] !== 0) why.push(`starts at ${kt[0]}`);
  if (kt[kt.length - 1] !== 1) why.push(`ends at ${kt[kt.length - 1]}`);
  for (let i = 1; i < kt.length; i++) if (kt[i] < kt[i - 1]) { why.push(`unsorted at ${i}`); break; }
  if (ks && ks.split(';').length !== kt.length - 1) why.push(`${ks.split(';').length} splines for ${kt.length} keyTimes`);
  if (values && values.split(';').length !== kt.length) why.push(`${values.split(';').length} values for ${kt.length} keyTimes`);
  if (why.length) { bad++; console.log(`${why.join(', ')} :: ${tag.slice(0, 160)}`); }
}
console.log(`${total} animations, ${bad} problems`);
process.exit(bad ? 1 : 0);
