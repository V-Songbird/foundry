'use strict';

// Value checks for the benchmark scripts that read their own flags. A bad value is
// a usage line, never a NaN plan or a cap that does not cap. The *Usage forms
// return that line (or null) and never exit, so a caller that runs in-process
// (hillclimb's cli, the foreman API flows) prints it and returns 2; wholeNumber
// and usdCap are the same checks for a script that refuses with exit 2.

function refuse(message) {
  console.error(message);
  process.exit(2);
}

/** The usage line for a count flag that is not a whole number of at least 1, or null. `raw` is printed as given. */
function wholeNumberUsage(name, raw) {
  const n = Number(raw);
  return raw === undefined || raw === '' || !Number.isInteger(n) || n < 1
    ? `usage: --${name} needs a whole number of at least 1, got ${raw}`
    : null;
}

/** A count flag's value: a whole number of at least 1, otherwise a refusal naming the flag. */
function wholeNumber(name, raw) {
  const bad = wholeNumberUsage(name, raw);
  if (bad) refuse(bad);
  return Number(raw);
}

/**
 * The usage line for the USD cap after `name` in argv, or null when the flag is
 * absent or its value is a finite number above 0. A missing value, another flag,
 * abc, 0, a negative and Infinity are refused: batch-judge.js's cap test passes
 * Infinity, so an Infinity cap would send the batch with no limit.
 */
function usdCapUsage(argv, name = '--max-usd') {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const raw = argv[i + 1];
  const n = Number(raw);
  return raw === undefined || raw === '' || !Number.isFinite(n) || n <= 0
    ? `usage: ${name} needs a positive number of USD, got ${raw}`
    : null;
}

/** The USD cap after `name` in argv: null when the flag is absent, the cap when valid, otherwise a refusal. */
function usdCap(argv, name = '--max-usd') {
  const bad = usdCapUsage(argv, name);
  if (bad) refuse(bad);
  const i = argv.indexOf(name);
  return i < 0 ? null : Number(argv[i + 1]);
}

module.exports = { refuse, wholeNumber, wholeNumberUsage, usdCap, usdCapUsage };
