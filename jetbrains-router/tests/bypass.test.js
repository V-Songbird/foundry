'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { reasonFor, runHook } = require('./helpers');

const READ = {
  tool_name: 'Read',
  cwd: '/home/proj/my-app',
  tool_input: { file_path: '/home/proj/my-app/src/app.ts' },
};

test('JETBRAINS_ROUTER_DISABLE=1 kill-switches every redirect', () => {
  assert.strictEqual(reasonFor(READ, { JETBRAINS_ROUTER_DISABLE: '1' }), null);
});

test('JETBRAINS_ROUTER_BYPASS exempts listed tools only', () => {
  const env = { JETBRAINS_ROUTER_BYPASS: 'Read,Edit' };
  assert.strictEqual(reasonFor(READ, env), null, 'Read is bypassed');
  const grep = reasonFor(
    { tool_name: 'Grep', cwd: '/home/proj/my-app', tool_input: { pattern: 'x' } },
    env
  );
  assert.ok(grep, 'Grep still redirects');
});

test('subagent calls (agent_id present) pass through', () => {
  assert.strictEqual(reasonFor({ ...READ, agent_id: 'agent-123' }), null);
});

test('unknown tools and malformed input pass through without error', () => {
  assert.strictEqual(reasonFor({ tool_name: 'NotebookEdit', tool_input: {} }), null);
  assert.strictEqual(reasonFor({}), null);

  const garbage = runHook(undefined, {});
  assert.strictEqual(garbage.status, 0);
  assert.strictEqual((garbage.stdout || '').trim(), '');
});

test('hook always exits 0 (deny is JSON, not an exit code)', () => {
  const result = runHook(READ);
  assert.strictEqual(result.status, 0);
});
