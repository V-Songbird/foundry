'use strict';

// Human-readable duration formatting.

function formatDuration(totalSeconds) {
  const minutes = Math.round(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

module.exports = { formatDuration };
