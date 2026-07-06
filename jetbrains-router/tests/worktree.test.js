'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { reasonFor } = require('./helpers');

function tryGit(args, cwd) {
  try {
    execFileSync('git', args, { cwd, stdio: 'ignore', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

// Real repo + linked worktree in a tmpdir; skip cleanly when git can't.
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jbr-wt-'));
  const main = path.join(root, 'main');
  const wt = path.join(root, 'wt');
  fs.mkdirSync(main);
  if (
    !tryGit(['init', '-q'], main) ||
    !tryGit(['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init'], main) ||
    !tryGit(['worktree', 'add', '-q', wt, 'HEAD', '-b', 'wt-feat'], main)
  ) {
    fs.rmSync(root, { recursive: true, force: true });
    return null;
  }
  return { root, main, wt };
}

function readAt(cwd) {
  return reasonFor({
    tool_name: 'Read',
    cwd,
    tool_input: { file_path: path.join(cwd, 'src', 'app.ts') },
  });
}

test('worktree guard', (t) => {
  const ctx = setup();
  if (!ctx) {
    t.skip('git or git worktree unavailable');
    return;
  }
  try {
    assert.ok(readAt(ctx.main), 'main checkout cwd must still redirect');

    assert.strictEqual(readAt(ctx.wt), null, 'linked worktree cwd must fail open');

    const wtBash = reasonFor({
      tool_name: 'Bash',
      cwd: ctx.wt,
      tool_input: { command: 'cat src/app.ts' },
    });
    assert.strictEqual(wtBash, null, 'worktree fails open for Bash too');

    // Subdir regression pair: --git-dir/--git-common-dir must be anchored to
    // the toplevel or every subdir cwd is misclassified as a worktree.
    const mainSub = path.join(ctx.main, 'src');
    const wtSub = path.join(ctx.wt, 'src');
    fs.mkdirSync(mainSub, { recursive: true });
    fs.mkdirSync(wtSub, { recursive: true });
    assert.ok(readAt(mainSub), 'main-checkout subdirectory must still redirect');
    assert.strictEqual(readAt(wtSub), null, 'worktree subdirectory must fail open');

    const nonGit = path.join(ctx.root, 'not-a-repo');
    fs.mkdirSync(nonGit);
    assert.ok(readAt(nonGit), 'non-git cwd must still redirect');
  } finally {
    fs.rmSync(ctx.root, { recursive: true, force: true });
  }
});
