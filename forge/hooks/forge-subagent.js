#!/usr/bin/env node
// forge — SubagentStart hook
//
// When a forge run is active (flag file present), injects a brief context
// reminder into every spawned subagent. This reinforces citation discipline
// across the pipeline without having to duplicate it in each agent's frontmatter.
// If no forge run is active, exits silently — no output, no cost.

const { readLevel, writeOutput } = require('./forge-runtime');

try {
  const level = readLevel();
  if (level) {
    writeOutput(
      'SubagentStart',
      `FORGE RUN ACTIVE (level: ${level}). ` +
      'Every code claim must cite file:line — or a doc URL when the claim was verified against ' +
      'external documentation. Your assigned role and tool constraints are in your system prompt; ' +
      'this reminder only reinforces the citation discipline required across all forge pipeline stages.',
    );
  }
} catch (_) {
  // Silent fail — never block subagent dispatch
}
