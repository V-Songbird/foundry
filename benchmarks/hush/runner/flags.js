'use strict';

// Value checks for the judge scripts that read their own flags. A bad value is a
// usage refusal (exit 2, the message alone), never a NaN plan or a cap that does
// not cap.

function refuse(message) {
  console.error(message);
  process.exit(2);
}

/** A count flag's value: a whole number of at least 1, otherwise a refusal naming the flag. */
function wholeNumber(name, raw) {
  const n = Number(raw);
  if (raw === undefined || raw === '' || !Number.isInteger(n) || n < 1) {
    refuse(`usage: --${name} needs a whole number of at least 1, got ${raw}`);
  }
  return n;
}

/**
 * The USD cap after `name` in argv: null when the flag is absent, the cap when
 * the value is a finite number above 0. A missing value, another flag, abc, 0,
 * a negative and Infinity are refused: batch-judge.js's cap test passes
 * Infinity, so an Infinity cap would send the batch with no limit.
 */
function usdCap(argv, name = '--max-usd') {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const raw = argv[i + 1];
  const n = Number(raw);
  if (raw === undefined || raw === '' || !Number.isFinite(n) || n <= 0) {
    refuse(`usage: ${name} needs a positive number of USD, got ${raw}`);
  }
  return n;
}

module.exports = { refuse, wholeNumber, usdCap };
