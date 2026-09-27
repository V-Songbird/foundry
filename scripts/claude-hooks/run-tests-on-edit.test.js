'use strict';

// Tests for scripts/claude-hooks/run-tests-on-edit.js -- repository dev hook
// (shipped with no plugin) that reruns whichever plugin's own test suite
// after an Edit/Write lands in that plugin's scripts/ or hooks/.
//
// Covers:
//   - findPluginRoot only matches <plugin>/<watched>/... when that plugin
//     folder is the outermost one with a .claude-plugin/plugin.json marker,
//     including a plugin worktree at .private/<plugin>-<id>/ or deeper, and
//     never a fixture plugin nested inside another plugin
//   - the root is found past a plugin's own .git file, from a patch event's
//     cwd or from a session project rooted in a plugin checkout or worktree
//   - case-insensitive on the watched segment, takes .js and .mjs, ignores
//     every other extension, ignores files outside the watched dirs, ignores
//     files outside the repo
//   - end-to-end: reruns the owning plugin's tests, silent on green,
//     surfaces failure via additionalContext on red
//   - a test file that fails to load reads as such, not as a failed suite
//   - one run per plugin checkout: a held lock skips, a stale one does not,
//     and an edit landing mid-run triggers a rerun
//   - foreman runs only the test files covering the edited module, by name
//     or else by quoted path, says so when none does, and other plugins keep
//     the whole suite

const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// The hook keeps lock and stamp files in the temp dir; point it, and the fake
// repos, at one folder this file removes.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'foundry-hook-tmp-'));
for (const key of ['TMPDIR', 'TEMP', 'TMP']) process.env[key] = TMP;
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const HOOK_PATH = path.join(__dirname, 'run-tests-on-edit.js');
const { findPluginRoot, coveringTests, runTests, editedPaths, repoRoot, lockPaths, failureContext } = require('./run-tests-on-edit');

function runHook(payload, env) {
  return spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, ...(env || {}) },
  });
}

/** Build a throwaway repo root with one fake plugin folder (marked via .claude-plugin/plugin.json). */
function makeFakeRepo(pluginDir = 'demo-plugin', name = 'demo-plugin') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'foundry-hook-'));
  fs.mkdirSync(path.join(root, '.git'));
  const pluginRoot = path.join(root, pluginDir);
  fs.mkdirSync(path.join(pluginRoot, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), JSON.stringify({ name }), 'utf-8');
  fs.mkdirSync(path.join(pluginRoot, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(pluginRoot, 'tests'), { recursive: true });
  return { root, pluginRoot };
}

describe('findPluginRoot', () => {
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

  test('takes .mjs as well as .js', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      assert.equal(findPluginRoot(root, path.join(pluginRoot, 'scripts', 'x.mjs')), pluginRoot);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('ignores every other extension', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      assert.equal(findPluginRoot(root, path.join(pluginRoot, 'scripts', 'notes.md')), null);
      assert.equal(findPluginRoot(root, path.join(pluginRoot, 'hooks', 'config.json')), null);
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

  test('matches a plugin worktree under .private/, and nothing else there', () => {
    const { root, pluginRoot } = makeFakeRepo(path.join('.private', 'demo-plugin-799'));
    try {
      assert.equal(findPluginRoot(root, path.join(pluginRoot, 'hooks', 'x.js')), pluginRoot);
      assert.equal(findPluginRoot(root, path.join(pluginRoot, 'tests', 'x.test.js')), null);
      assert.equal(findPluginRoot(root, path.join(root, '.private', 'scripts', 'x.js')), null);
      const notAPlugin = path.join(root, '.private', 'notes');
      fs.mkdirSync(path.join(notAPlugin, 'scripts'), { recursive: true });
      assert.equal(findPluginRoot(root, path.join(notAPlugin, 'scripts', 'x.js')), null);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('matches the outermost plugin marker at any depth below the root', () => {
    const { root, pluginRoot } = makeFakeRepo(path.join('.private', 'batch', 'demo-plugin'));
    try {
      assert.equal(findPluginRoot(root, path.join(pluginRoot, 'scripts', 'lib', 'x.js')), pluginRoot);
      const fixture = path.join(pluginRoot, 'tests', 'fixture-plugin');
      fs.mkdirSync(path.join(fixture, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(path.join(fixture, '.claude-plugin', 'plugin.json'), '{}');
      assert.equal(findPluginRoot(root, path.join(fixture, 'scripts', 'x.js')), null);
      assert.equal(findPluginRoot(root, path.join(fixture, 'hooks', 'x.js')), null);
      fs.mkdirSync(path.join(fixture, 'tests'));
      fs.writeFileSync(path.join(fixture, 'tests', 'ok.test.js'),
        "require('node:test')('runs', () => require('fs').writeFileSync('ran.txt', ''));");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: path.join(fixture, 'scripts', 'x.js') } },
        { CLAUDE_PROJECT_DIR: root });
      assert.equal(result.stdout, '');
      assert.equal(fs.existsSync(path.join(fixture, 'ran.txt')), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('missing file_path is not a match', () => {
    assert.equal(findPluginRoot(process.cwd(), undefined), null);
  });
});

describe('runTests', () => {
  // Discovery has to come from cwd: a glob argument to `node --test` is runner
  // dependent, and a "Could not find" exit would read as a suite that did not
  // complete after every edit.
  test('discovers a suite without relying on node --test glob expansion', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(
        path.join(pluginRoot, 'tests', 'ok.test.js'),
        "require('node:test')('passes', () => {});"
      );
      assert.deepEqual(runTests(pluginRoot), { passed: true });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('main (end-to-end against a real plugin)', () => {
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
      assert.match(out.hookSpecificOutput.additionalContext, /demo-plugin\/ failed after this edit to x\.js/);
      assert.match(out.hookSpecificOutput.additionalContext, /# fail \d/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reruns the suite of a plugin worktree under .private/', () => {
    const { root, pluginRoot } = makeFakeRepo(path.join('.private', 'demo-plugin-799'));
    try {
      fs.writeFileSync(
        path.join(pluginRoot, 'tests', 'broken.test.js'),
        "const assert = require('node:assert/strict'); require('node:test')('fails', () => assert.equal(1, 2));"
      );
      const payload = { tool_name: 'Write', tool_input: { file_path: path.join(pluginRoot, 'scripts', 'x.js') } };
      const result = runHook(payload, { CLAUDE_PROJECT_DIR: root });
      assert.equal(result.status, 0, result.stderr);
      const out = JSON.parse(result.stdout);
      assert.match(out.hookSpecificOutput.additionalContext, /node --test \.private\/demo-plugin-799\/ failed after this edit to x\.js\. .* from \.private\/demo-plugin-799\/ /);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reruns the suite when the session is rooted in a plugin checkout or worktree', () => {
    for (const dir of ['demo-plugin', path.join('.private', 'demo-plugin-799')]) {
      const { root, pluginRoot } = makeFakeRepo(dir);
      try {
        fs.writeFileSync(path.join(pluginRoot, '.git'), 'gitdir: unused');
        fs.writeFileSync(path.join(pluginRoot, 'tests', 'broken.test.js'),
          "const assert = require('node:assert/strict'); require('node:test')('fails', () => assert.equal(1, 2));");
        const payload = { tool_name: 'Write', tool_input: { file_path: path.join(pluginRoot, 'scripts', 'x.js') } };
        const result = runHook(payload, { CLAUDE_PROJECT_DIR: pluginRoot });
        assert.equal(result.status, 0, result.stderr);
        const name = dir.split(path.sep).join('/').replace(/\./g, '\\.');
        assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext,
          new RegExp(`node --test ${name}/ failed after this edit to x\\.js`));
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
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

describe('patch events', () => {
  test('extracts all operation paths without reading diff contents', () => {
    const cwd = path.resolve('nested');
    const paths = editedPaths({ tool_name: 'apply_patch', cwd, tool_input: { command: [
      '*** Begin Patch',
      '*** Add File: ../demo-plugin/scripts/new file.js',
      '+*** Delete File: ignored.js',
      '*** Update File: ../demo-plugin/scripts/old.js',
      '*** Move to: ../demo-plugin/hooks/new.mjs',
      '*** Delete File: ../demo-plugin/hooks/gone.js',
      '*** End Patch',
    ].join('\r\n') } });
    assert.deepEqual(paths, [
      '../demo-plugin/scripts/new file.js', '../demo-plugin/scripts/old.js',
      '../demo-plugin/hooks/new.mjs', '../demo-plugin/hooks/gone.js',
    ].map(file => path.resolve(cwd, file)));
    assert.deepEqual(editedPaths({ tool_name: 'apply_patch', tool_input: { command: null } }), []);
  });

  test('finds the root from a nested cwd and a worktree pointer', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.rmdirSync(path.join(root, '.git'));
      fs.writeFileSync(path.join(root, '.git'), 'gitdir: unused');
      assert.equal(repoRoot({ tool_name: 'apply_patch', cwd: path.join(pluginRoot, 'scripts') }), root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('finds the root past a plugin checkout\'s or worktree\'s own .git file', () => {
    for (const dir of ['demo-plugin', path.join('.private', 'demo-plugin-799')]) {
      const { root, pluginRoot } = makeFakeRepo(dir);
      try {
        fs.writeFileSync(path.join(pluginRoot, '.git'), 'gitdir: unused');
        assert.equal(repoRoot({ tool_name: 'apply_patch', cwd: path.join(pluginRoot, 'scripts') }), root);
        assert.equal(repoRoot({ tool_name: 'apply_patch', cwd: pluginRoot }), root);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  test('reruns the suite for a patch made from inside a plugin checkout', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(path.join(pluginRoot, '.git'), 'gitdir: unused');
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'broken.test.js'),
        "const assert = require('node:assert/strict'); require('node:test')('fails', () => assert.equal(1, 2));");
      const result = runHook({ tool_name: 'apply_patch', cwd: pluginRoot,
        tool_input: { command: '*** Begin Patch\n*** Update File: scripts/x.js\n*** End Patch' } });
      assert.equal(result.status, 0, result.stderr);
      assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /node --test demo-plugin\/ failed after this edit to x\.js/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('runs both sides of a cross-plugin move once and combines failures', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      const second = path.join(root, 'other-plugin');
      fs.mkdirSync(path.join(second, '.claude-plugin'), { recursive: true });
      fs.writeFileSync(path.join(second, '.claude-plugin', 'plugin.json'), '{}');
      fs.mkdirSync(path.join(second, 'tests'));
      for (const dir of [pluginRoot, second]) {
        fs.writeFileSync(path.join(dir, 'tests', 'broken.test.js'),
          "const fs = require('fs'); require('node:test')('fails', () => { fs.appendFileSync('runs.txt', 'run\\n'); throw new Error('intentional'); });");
      }
      const cwd = path.join(pluginRoot, 'scripts');
      const result = runHook({ tool_name: 'apply_patch', cwd, tool_input: { command: [
        '*** Begin Patch',
        '*** Update File: old.js',
        '*** Move to: ../../other-plugin/hooks/moved.mjs',
        '*** Add File: another.js',
        '*** Delete File: gone.js',
        '*** End Patch',
      ].join('\n') } }, { CLAUDE_PROJECT_DIR: path.join(root, 'wrong-root') });
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout).hookSpecificOutput;
      assert.equal(output.hookEventName, 'PostToolUse');
      assert.match(output.additionalContext, /demo-plugin\/ failed/);
      assert.match(output.additionalContext, /other-plugin\/ failed/);
      for (const dir of [pluginRoot, second]) {
        assert.equal(fs.readFileSync(path.join(dir, 'runs.txt'), 'utf8'), 'run\n');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('stays silent on green and ignores unwatched or outside paths', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      const marker = path.join(pluginRoot, 'runs.txt');
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'ok.test.js'),
        "require('node:test')('passes', () => require('fs').appendFileSync('runs.txt', 'run\\n'));");
      const invoke = (file) => runHook({ tool_name: 'apply_patch', cwd: root,
        tool_input: { command: `*** Begin Patch\n*** Update File: ${file}\n*** End Patch` } });
      for (const file of ['demo-plugin/tests/ok.test.js', 'demo-plugin/scripts/notes.md', '../outside/scripts/x.js']) {
        assert.equal(invoke(file).stdout, '');
      }
      assert.equal(fs.existsSync(marker), false);
      const result = invoke(path.join(pluginRoot, 'scripts', 'absolute.js'));
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, '');
      assert.equal(fs.readFileSync(marker, 'utf8'), 'run\n');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reports an exhausted shared timeout without launching another suite', () => {
    const result = runTests(__dirname, 0);
    assert.equal(result.passed, false);
    assert.match(result.output, /budget exhausted/);
  });

  test('registered command runs from a repository subdirectory', () => {
    const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../.codex/hooks.json'), 'utf8'));
    const group = config.hooks.PostToolUse[0];
    assert.equal(new RegExp(group.matcher).test('apply_patch'), true);
    const command = group.hooks[0];
    assert.equal(command.timeout, 120);
    const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/sh';
    const args = process.platform === 'win32'
      ? ['-NoProfile', '-Command', command.command] : ['-c', command.command];
    const result = spawnSync(shell, args, {
      cwd: __dirname, input: '{}', encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  });
});

describe('edits between runs', () => {
  const edit = (pluginRoot) => runHook({ tool_name: 'Edit', tool_input: { file_path: path.join(pluginRoot, 'scripts', 'x.js') } },
    { CLAUDE_PROJECT_DIR: path.dirname(pluginRoot) });
  const countRuns = "require('fs').appendFileSync('runs.txt', 'run\\n');";

  test('a test file that cannot load reads as such, not as a failed suite', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(path.join(pluginRoot, 'scripts', 'x.js'), 'module.exports = {');
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'x.test.js'),
        "require('../scripts/x'); require('node:test')('never runs', () => {});");
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'ok.test.js'), "require('node:test')('passes', () => {});");
      const result = edit(pluginRoot);
      assert.equal(result.status, 0, result.stderr);
      const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
      assert.match(context, /demo-plugin\/ could not load a test file after this edit to x\.js\. SyntaxError: .*# fail 1/);
      assert.match(context, /mid-way through a multi-edit change/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('a real failure beside a load failure still reads as failed', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'load.test.js'), "throw new Error('boom');");
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'broken.test.js'),
        "const assert = require('node:assert/strict'); require('node:test')('fails', () => assert.equal(1, 2));");
      const context = JSON.parse(edit(pluginRoot).stdout).hookSpecificOutput.additionalContext;
      assert.match(context, /demo-plugin\/ failed after this edit/);
      assert.doesNotMatch(context, /could not load/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('skips while another run holds the plugin\'s lock', () => {
    const { root, pluginRoot } = makeFakeRepo();
    const { lock, stamp } = lockPaths(pluginRoot);
    try {
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'broken.test.js'), `${countRuns} throw new Error('ran');`);
      fs.writeFileSync(lock, String(process.pid));
      const result = edit(pluginRoot);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, '');
      assert.equal(fs.existsSync(path.join(pluginRoot, 'runs.txt')), false);
      assert.ok(fs.readFileSync(stamp, 'utf8'), 'the skipped edit leaves a stamp for the holder');
      assert.equal(fs.readFileSync(lock, 'utf8'), String(process.pid), 'the holder keeps its lock');
    } finally {
      fs.rmSync(lock, { force: true });
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('takes over a lock whose holder is gone or older than any hook', () => {
    const { root, pluginRoot } = makeFakeRepo();
    const { lock } = lockPaths(pluginRoot);
    try {
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'ok.test.js'), `require('node:test')('passes', () => { ${countRuns} });`);
      fs.writeFileSync(lock, String(spawnSync('node', ['-e', '']).pid));
      assert.equal(edit(pluginRoot).stdout, '');
      fs.writeFileSync(lock, String(process.pid));
      const old = new Date(Date.now() - 10 * 60 * 1000);
      fs.utimesSync(lock, old, old);
      assert.equal(edit(pluginRoot).stdout, '');
      assert.equal(fs.readFileSync(path.join(pluginRoot, 'runs.txt'), 'utf8'), 'run\nrun\n');
      assert.equal(fs.existsSync(lock), false, 'the lock is released after the run');
    } finally {
      fs.rmSync(lock, { force: true });
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('reruns once when another edit lands during the run', () => {
    const { root, pluginRoot } = makeFakeRepo();
    const { stamp } = lockPaths(pluginRoot);
    try {
      // The first run stands in for a concurrent edit by moving the stamp.
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'ok.test.js'), `require('node:test')('passes', () => {
        const fs = require('fs');
        if (!fs.existsSync('runs.txt')) fs.writeFileSync(${JSON.stringify(stamp)}, 'later edit');
        ${countRuns}
      });`);
      const result = edit(pluginRoot);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, '');
      assert.equal(fs.readFileSync(path.join(pluginRoot, 'runs.txt'), 'utf8'), 'run\nrun\n');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('says so when edits landed after the last run the budget allowed', () => {
    const context = failureContext('demo-plugin', 'x.js', { passed: true, untested: true });
    assert.match(context, /demo-plugin\/ passed after this edit to x\.js\. Files changed again during the run/);
  });

  test('a run stopped at the time limit says so instead of quoting a test in flight', () => {
    const { root, pluginRoot } = makeFakeRepo();
    try {
      fs.writeFileSync(path.join(pluginRoot, 'tests', 'slow.test.js'),
        "require('node:test')('slow', () => new Promise((resolve) => setTimeout(resolve, 5000)));");
      const result = runTests(pluginRoot, 1500);
      assert.equal(result.timedOut, true);
      const context = failureContext('demo-plugin', 'x.js', result);
      assert.match(context, /demo-plugin\/ did not complete after this edit to x\.js\. It was stopped at the hook's 110 s limit, not by a test\./);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('selective runs for a plugin whose suite outlasts the budget', () => {
  const marker = (label) => `require('node:test')('${label}', () => require('fs').appendFileSync('runs.txt', '${label}\\n'));`;
  const write = (pluginRoot, file, body) => fs.writeFileSync(path.join(pluginRoot, 'tests', file), body);
  const edit = (root, pluginRoot, file) => runHook({ tool_name: 'Edit', tool_input: { file_path: path.join(pluginRoot, 'hooks', file) } },
    { CLAUDE_PROJECT_DIR: root });

  test('picks tests named after the module, else those naming it in a quoted path', () => {
    const { root, pluginRoot } = makeFakeRepo('foreman', 'foreman');
    try {
      write(pluginRoot, 'post_commit.test.js', '');
      write(pluginRoot, 'post-commit.test.js', '');
      write(pluginRoot, 'staged.test.js', "const hook = path.join(ROOT, 'hooks', 'post-commit.js'); require('../hooks/stop');");
      write(pluginRoot, 'required.test.js', "require('../hooks/post-commit'); const cli = 'stop.js';");
      write(pluginRoot, 'mention.test.js', '// the post-commit and stop hooks, named in prose only');
      write(pluginRoot, 'longer.test.js', "require('../hooks/stop-extra');");
      assert.deepEqual(coveringTests(pluginRoot, ['post-commit.js']), ['tests/post-commit.test.js', 'tests/post_commit.test.js']);
      assert.deepEqual(coveringTests(pluginRoot, ['Post-Commit.JS']), ['tests/post-commit.test.js', 'tests/post_commit.test.js']);
      assert.deepEqual(coveringTests(pluginRoot, ['stop.js']), ['tests/required.test.js', 'tests/staged.test.js']);
      assert.deepEqual(coveringTests(pluginRoot, ['stop.js', 'post-commit.js']),
        ['tests/post-commit.test.js', 'tests/post_commit.test.js', 'tests/required.test.js', 'tests/staged.test.js']);
      assert.deepEqual(coveringTests(pluginRoot, ['unrelated.js']), []);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('foreman runs only the covering test files and stays silent on green', () => {
    const { root, pluginRoot } = makeFakeRepo('foreman', 'foreman');
    try {
      write(pluginRoot, 'post_commit.test.js', marker('named'));
      write(pluginRoot, 'other.test.js', `// require('../hooks/discovery')\n${marker('referenced')}`);
      write(pluginRoot, 'unrelated.test.js', `${marker('unrelated')} throw new Error('not covering');`);
      for (const file of ['post-commit.js', 'discovery.js']) {
        const result = edit(root, pluginRoot, file);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout, '');
      }
      const runs = fs.readFileSync(path.join(pluginRoot, 'runs.txt'), 'utf8').trim().split('\n');
      assert.deepEqual(runs, ['named', 'referenced']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('a covering failure names the files run and the command to rerun them', () => {
    const { root, pluginRoot } = makeFakeRepo(path.join('.private', 'foreman-848'), 'foreman');
    try {
      write(pluginRoot, 'lib.test.js', "const assert = require('node:assert/strict'); require('node:test')('fails', () => assert.equal(1, 2));");
      const context = JSON.parse(edit(root, pluginRoot, 'lib.js').stdout).hookSpecificOutput.additionalContext;
      assert.match(context, /node --test \.private\/foreman-848\/ \(1 test file covering it\) failed after this edit to lib\.js\./);
      assert.match(context, /Run `node --test tests\/lib\.test\.js` from \.private\/foreman-848\//);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('says so in one line when no test file covers the module', () => {
    const { root, pluginRoot } = makeFakeRepo('foreman', 'foreman');
    try {
      write(pluginRoot, 'unrelated.test.js', `${marker('unrelated')} throw new Error('not covering');`);
      const result = edit(root, pluginRoot, 'orphan.js');
      assert.equal(result.status, 0, result.stderr);
      const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
      assert.match(context, /^\[foundry\] No test file in foreman\/tests\/ covers orphan\.js, .* so none ran\. The whole suite takes minutes \(about 100-300 s\): run `node --test` from foreman\/ in the background or with a tool timeout above 300 s before moving on\.$/);
      assert.equal(fs.existsSync(path.join(pluginRoot, 'runs.txt')), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('another plugin still runs its whole suite', () => {
    const { root, pluginRoot } = makeFakeRepo('hush', 'hush');
    try {
      write(pluginRoot, 'post_commit.test.js', marker('named'));
      write(pluginRoot, 'unrelated.test.js', marker('unrelated'));
      assert.equal(edit(root, pluginRoot, 'post-commit.js').stdout, '');
      const runs = fs.readFileSync(path.join(pluginRoot, 'runs.txt'), 'utf8').trim().split('\n').sort();
      assert.deepEqual(runs, ['named', 'unrelated']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('each file set has its own lock, so a rerun covers the same files', () => {
    const pluginRoot = path.join(TMP, 'foreman');
    assert.notEqual(lockPaths(pluginRoot, ['tests/a.test.js']).lock, lockPaths(pluginRoot, ['tests/b.test.js']).lock);
    assert.notEqual(lockPaths(pluginRoot, ['tests/a.test.js']).lock, lockPaths(pluginRoot).lock);
  });
});
