'use strict';

// English pluralization for simple nouns.

function pluralize(word, count) {
  if (count === 1) return word;
  return word + 's';
}

module.exports = { pluralize };
