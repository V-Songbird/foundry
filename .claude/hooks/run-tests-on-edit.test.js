'use strict';

// Tests for .claude/hooks/run-tests-on-edit.js -- repo-wide dev hook (not
// shipped with any plugin) that reruns whichever plugin's own test suite
// after an Edit/Write lands in that plugin's scripts/ or hooks/ dir.
//
// Covers:
//   - findPluginRoot only matches <plugin>/<scripts|hooks>/... when that
//     plugin folder has a .claude-plugin/plugin.json marker
//   - case-insensitive on the scripts/hooks segment, ignores non-.js files,
//     ignores files outside scripts/hooks, ignores files outside the repo
//   - end-to-end: reruns the owning plugin's tests, silent on green,
//     surfaces failure via additionalContext on red

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK_PATH = path.join(__dirname, 'run-tests-on-edit.js');
const { findPluginRoot, testGlob, runTests } = require('./run-tests-on-edit');

function runHook(payload, env) {
  return spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, ...(env || {}) },
  });
}

/** Build a throwaway repo root with one fake plugin folder (marked via .claude-plugin/plugin.json). */
function makeFakeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'foundry-hook-'));
  const pluginRoot = path.join(root, 'demo-plugin');
  fs.mkdirSync(path.join(pluginRoot, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), '{"name":"demo-plugin"}', 'utf-8');
  fs.mkdirSync(path.join(pluginRoot, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(pluginRoot, 'tests'), { recursive: true });
  return { root, pluginRoot };
}

describe('findPluginRoot', () => {
  test('resolves a Codex edition in a deep worktree from a project-relative path', () => {
    const { root } = makeFakeRepo();
    try {
      const edition = path.join(root, '.claude', 'worktrees', 'platform-isolation', 'demo-Codex');
      fs.mkdirSync(path.join(edition, '.codex-plugin'), { recursive: true });
      fs.writeFileSync(path.join(edition, '.codex-plugin', 'plugin.json'), '{}');
      assert.equal(findPluginRoot(root, path.relative(root, path.join(edition, 'hooks', 'lib', 'x.js'))), edition);
      assert.equal(findPluginRoot(edition, 'scripts/x.js'), edition);
      assert.equal(findPluginRoot(root, path.join(edition, 'docs', 'scripts', 'x.js')), null);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('does not run tests for archived copies or an outside directory', () => {
    const { root } = makeFakeRepo();
    try {
      for (const directory of ['.scratch', 'benchmarks', 'node_modules', 'fixtures']) {
        const edition = path.join(root, directory, 'demo');
        fs.mkdirSync(path.join(edition, '.codex-plugin'), { recursive: true });
        fs.writeFileSync(path.join(edition, '.codex-plugin', 'plugin.json'), '{}');
        assert.equal(findPluginRoot(root, path.join(edition, 'scripts', 'x.js')), null);
      }
      assert.equal(findPluginRoot(root, '../outside/scripts/x.js'), null);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('matches a file under <plugin>/scripts/ when plugin.json marker exists', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      const found = findPluginRoot(root, path.join(pluginRoot, 'scripts', 'x.js'));
      assert.equal(found, pluginRoot);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('matches a file under <plugin>/hooks/, case-insensitively', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      const found = findPluginRoot(root, path.join(pluginRoot, 'HOOKS', 'x.js'));
      assert.equal(found, pluginRoot);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('does not match without a .claude-plugin/plugin.json marker', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'foundry-hook-'));
    try {
      const notAPlugin = path.join(root, 'not-a-plugin');
      fs.mkdirSync(path.join(notAPlugin, 'scripts'), { recursive: true });
      assert.equal(findPluginRoot(root, path.join(notAPlugin, 'scripts', 'x.js')), null);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('ignores non-.js files', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      assert.equal(findPluginRoot(root, path.join(pluginRoot, 'scripts', 'notes.md')), null);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('ignores files outside scripts/ and hooks/', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      assert.equal(findPluginRoot(root, path.join(pluginRoot, 'tests', 'x.test.js')), null);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('missing file_path is not a match', () => {
    assert.equal(findPluginRoot(process.cwd(), undefined), null);
  });
});

describe('testGlob', () => {
  test('is a *.test.js glob under <plugin>/tests, not a bare directory', () => {
    assert.equal(testGlob('/some/plugin'), path.join('/some/plugin', 'tests', '*.test.js'));
  });
});

describe('main (end-to-end against a real plugin)', () => {
  test('runs both owning suites for a Codex patch issued from a subdirectory', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      const peer = path.join(root, '.claude', 'worktrees', 'platforms', 'peer');
      fs.mkdirSync(path.join(peer, '.codex-plugin'), { recursive: true });
      fs.writeFileSync(path.join(peer, '.codex-plugin', 'plugin.json'), '{}');
      fs.mkdirSync(path.join(peer, 'tests'), { recursive: true });
      for (const edition of [pluginRoot, peer]) fs.writeFileSync(path.join(edition, 'tests', 'red.test.js'),
        "require('node:test')('red', () => { throw Error('expected fixture failure'); });");
      const patch = ['*** Begin Patch', '*** Update File: scripts/x.js', '@@', '-old', '+new',
        '*** Update File: ../.claude/worktrees/platforms/peer/hooks/y.js', '@@', '-old', '+new', '*** End Patch'].join('\n');
      const result = runHook({ tool_name: 'apply_patch', cwd: pluginRoot, tool_input: { command: patch } }, { CLAUDE_PROJECT_DIR: root });
      assert.equal(result.status, 0, result.stderr);
      const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
      assert.match(context, /demo-plugin\/tests\/ failed/);
      assert.match(context, /peer\/tests\/ failed/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  test('runs in the owning checkout and removes inherited Git routing', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'cwd.test.js'),
        `const assert = require('node:assert/strict'); require('node:test')('context', () => {
          assert.equal(process.cwd(), ${JSON.stringify(pluginRoot)});
          assert.equal(process.env.GIT_DIR, undefined);
          assert.equal(process.env.GIT_WORK_TREE, undefined);
        });`);
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: 'demo-plugin/scripts/x.js' } }, {
        CLAUDE_PROJECT_DIR: root, GIT_DIR: '/invalid-parent', GIT_WORK_TREE: '/invalid-parent',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, '');
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('reports a timeout separately from an assertion failure', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'slow.test.js'),
        "require('node:test')('slow', async () => new Promise(resolve => setTimeout(resolve, 500)));");
      const result = runTests(pluginRoot, 50);
      assert.equal(result.passed, false);
      assert.equal(result.timedOut, true);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  test('stays silent when the owning plugin\'s tests are green', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(
        path.join(pluginRoot, 'tests', 'ok.test.js'),
        "require('node:test')('passes', () => {});"
      );
      const payload = { tool_name: 'Edit', tool_input: { file_path: path.join(pluginRoot, 'scripts', 'x.js') } };
      const result = runHook(payload, { CLAUDE_PROJECT_DIR: root });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, '');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports a failure via additionalContext when the owning plugin\'s tests are red', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(
        path.join(pluginRoot, 'tests', 'broken.test.js'),
        "const assert = require('node:assert/strict'); require('node:test')('fails', () => assert.equal(1, 2));"
      );
      const payload = { tool_name: 'Edit', tool_input: { file_path: path.join(pluginRoot, 'scripts', 'x.js') } };
      const result = runHook(payload, { CLAUDE_PROJECT_DIR: root });
      assert.equal(result.status, 0, result.stderr);
      const out = JSON.parse(result.stdout);
      assert.match(out.hookSpecificOutput.additionalContext, /demo-plugin\/tests\/ failed after this edit to x\.js/);
      assert.match(out.hookSpecificOutput.additionalContext, /# fail \d/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('non-Edit/Write tool call stays silent', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      const payload = { tool_name: 'Read', tool_input: { file_path: path.join(pluginRoot, 'scripts', 'x.js') } };
      const result = runHook(payload, { CLAUDE_PROJECT_DIR: root });
      assert.equal(result.stdout, '');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
