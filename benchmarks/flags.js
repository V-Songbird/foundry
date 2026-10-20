'use strict';

// Value checks for the benchmark scripts that read their own flags. A bad value is
// a usage line, never a NaN plan or a cap that does not cap. The *Usage forms
// return that line (or null) and never exit, so a caller that runs in-process
// prints it and returns 2 (hillclimb's cli, the foreman API flows) or throws it
// (batch-judge.js, sdk-session.js); wholeNumber and usdCap are the same checks
// for a script that refuses with exit 2. flagOr reads a text flag with the same
// missing-value check and a default, and flagAll does the same for a repeatable flag;
// throwUsage is their `fail` for a script whose failures exit 1 through a throw.
// wholeNumberFlag reads a count flag as typed, so its refusal words a missing value.

// A flag name is taken with or without its dashes ('reps' or '--reps'); messages always print it with them.
const dashed = (name) => (name.startsWith('--') ? name : `--${name}`);

// What a refusal prints for the value it got: a missing one is the word "nothing", not undefined or null.
const shown = (raw) => (raw === undefined || raw === null || raw === '' ? 'nothing' : raw);

function refuse(message) {
  console.error(message);
  process.exit(2);
}

/** The usage line for a count flag that is not a whole number of at least 1, or null. `raw` is printed as given. */
function wholeNumberUsage(name, raw) {
  const n = Number(raw);
  return raw === undefined || raw === '' || !Number.isInteger(n) || n < 1
    ? `usage: ${dashed(name)} needs a whole number of at least 1, got ${shown(raw)}`
    : null;
}

/** A count flag's value: a whole number of at least 1, otherwise a refusal naming the flag. */
function wholeNumber(name, raw) {
  const bad = wholeNumberUsage(name, raw);
  if (bad) refuse(bad);
  return Number(raw);
}

/**
 * The usage line for a value flag whose value `v` (argv[i + 1]) is missing or is
 * itself another flag, or null. An empty value is allowed unless `allowEmpty` is false.
 */
function valueUsage(name, v, allowEmpty = true) {
  return v === undefined || v.startsWith('--') || (!allowEmpty && v === '')
    ? `usage: ${dashed(name)} needs a value${v === undefined ? ' but none was given' : `, got ${shown(v)}`}`
    : null;
}

/** The value after the flag at argv[i], or `fail(usage line)` when it is missing or is another flag. */
function valueAt(argv, name, i, fail) {
  const bad = valueUsage(name, argv[i + 1]);
  return bad ? fail(bad) : argv[i + 1];
}

/** The value after the flag at argv[i], otherwise a refusal naming the flag. */
function flagValue(argv, name, i) {
  return valueAt(argv, name, i, refuse);
}

/**
 * The value of the flag `name` in argv: `dflt` when the flag is absent, otherwise its
 * value, or `fail(usage line)` when the value is missing or is another flag. `fail`
 * defaults to the exit-2 refusal; a reader whose failures exit 1 passes throwUsage.
 */
function flagOr(argv, name, dflt, fail = refuse) {
  const i = argv.indexOf(dashed(name));
  return i < 0 ? dflt : valueAt(argv, name, i, fail);
}

/** Every value of a repeatable flag, each checked as flagOr checks one; [] when the flag is absent. */
function flagAll(argv, name, fail = refuse) {
  const flag = dashed(name);
  return argv.flatMap((a, i) => (a === flag ? [valueAt(argv, name, i, fail)] : []));
}

/** A count flag in argv: `dflt` when absent, otherwise a whole number of at least 1 or a refusal. It reads the value as typed, so wholeNumber words a missing one. */
function wholeNumberFlag(argv, name, dflt) {
  const i = argv.indexOf(dashed(name));
  return wholeNumber(name, i < 0 ? dflt : argv[i + 1]);
}

/** A `fail` for flagOr that throws, for a script that reports a usage error through its own catch or an uncaught exit 1. */
function throwUsage(message) {
  throw new Error(message);
}

/**
 * The usage line for the USD cap after `name` in argv, or null when the flag is
 * absent or its value is a finite number above 0. A missing value, another flag,
 * abc, 0, a negative and Infinity are refused: batch-judge.js's cap test passes
 * Infinity, so an Infinity cap would send the batch with no limit.
 */
function usdCapUsage(argv, name = '--max-usd') {
  name = dashed(name);
  const i = argv.indexOf(name);
  return i < 0 ? null : usdCapValueUsage(name, argv[i + 1]);
}

/**
 * The usage line for a cap value already read (a string as typed, a number, or
 * undefined for a missing one), or null when it is a finite number above 0. For
 * a caller that requires the cap, such as batch-judge.js and the live flows.
 */
function usdCapValueUsage(name, raw) {
  name = dashed(name);
  const n = Number(raw);
  return raw === undefined || raw === null || raw === '' || !Number.isFinite(n) || n <= 0
    ? `usage: ${name} needs a positive number of USD, got ${shown(raw)}`
    : null;
}

/** The USD cap after `name` in argv: null when the flag is absent, the cap when valid, otherwise a refusal. */
function usdCap(argv, name = '--max-usd') {
  name = dashed(name);
  const bad = usdCapUsage(argv, name);
  if (bad) refuse(bad);
  const i = argv.indexOf(name);
  return i < 0 ? null : Number(argv[i + 1]);
}

module.exports = { refuse, flagValue, flagOr, flagAll, wholeNumberFlag, throwUsage, valueUsage, wholeNumber, wholeNumberUsage, usdCap, usdCapUsage, usdCapValueUsage };
