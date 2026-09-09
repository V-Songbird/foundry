'use strict';

// URL-safe slug generator.

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

module.exports = { slugify };
