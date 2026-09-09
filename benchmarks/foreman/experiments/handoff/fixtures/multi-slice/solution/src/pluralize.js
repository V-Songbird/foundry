'use strict';

// English pluralization for simple nouns.

function pluralize(word, count) {
  if (count === 1) return word;
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  if (/(?:s|x|z|ch|sh)$/.test(word)) return word + 'es';
  return word + 's';
}

module.exports = { pluralize };
