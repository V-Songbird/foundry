'use strict';

// selfcheck.js compares each frozen foreman.md against the truth_grounding
// block of foreman/prompt-template.md. The template carries one block per host
// and stage; the frozen prompts are interactive Claude Code handoffs, so the
// block they must match is host="claude" with no stage attribute.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { templateTruthGrounding } = require(path.join(__dirname, '..', 'selfcheck.js'));

const TEMPLATE = `
<task_context>x</task_context>

<truth_grounding host="claude">
Interactive   claude
  block.
</truth_grounding>
<truth_grounding host="claude" stage="workflow-agent">
Workflow agent block.
</truth_grounding>

<truth_grounding host="codex">
Codex block.
</truth_grounding>
`;

test('picks the host="claude" block without a stage, whitespace-normalized', () => {
  assert.equal(templateTruthGrounding(TEMPLATE), 'Interactive claude block.');
});

test('the order of the variants does not matter', () => {
  const reordered = TEMPLATE.replace(/<truth_grounding host="claude">[\s\S]*?<\/truth_grounding>\n/, '')
    + '<truth_grounding host="claude">\nInteractive claude block.\n</truth_grounding>\n';
  assert.equal(templateTruthGrounding(reordered), 'Interactive claude block.');
});

test('throws when the template has no interactive Claude Code block', () => {
  const none = TEMPLATE.replace(/<truth_grounding host="claude">[\s\S]*?<\/truth_grounding>\n/, '');
  assert.throws(() => templateTruthGrounding(none), /no <truth_grounding host="claude"> block/);
});
