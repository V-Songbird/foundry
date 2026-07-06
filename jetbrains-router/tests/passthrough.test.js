'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { reasonFor } = require('./helpers');

const CWD = '/home/proj/my-app';

function readReason(filePath) {
  return reasonFor({ tool_name: 'Read', cwd: CWD, tool_input: { file_path: filePath } });
}

test('non-code paths pass through to native tools', () => {
  const passthrough = [
    `${CWD}/.gitignore`,
    `${CWD}/.claude/settings.json`,
    `${CWD}/.idea/workspace.xml`,
    `${CWD}/src/.hidden/x.ts`, // interior dotfolder segment
    `${CWD}/README.md`,
    `${CWD}/docs/guide.mdx`,
    `${CWD}/package.json`,
    `${CWD}/data/records.jsonl`,
    `${CWD}/docs/anything.txt`,
    `${CWD}/ci.yml`,
    `${CWD}/config.yaml`,
    `${CWD}/pyproject.toml`,
    `${CWD}/setup.ini`,
    `${CWD}/app.cfg`,
    `${CWD}/nginx.conf`,
    `${CWD}/gradle.properties`,
    `${CWD}/yarn.lock`,
    `${CWD}/prod.env`,
  ];
  for (const fp of passthrough) {
    assert.strictEqual(readReason(fp), null, `expected passthrough for ${fp}`);
  }
});

test('binary extensions pass through', () => {
  for (const ext of ['png', 'jpg', 'pdf', 'zip', 'exe', 'dylib', 'woff', 'mp4']) {
    assert.strictEqual(readReason(`${CWD}/assets/logo.${ext}`), null, `expected passthrough for .${ext}`);
  }
});

test('source files still redirect (control)', () => {
  assert.ok(readReason(`${CWD}/src/app.ts`), 'source file must redirect');
});

test('absolute path outside the project root passes through', () => {
  assert.strictEqual(readReason('/etc/hosts'), null);
});

test('absolute path with empty cwd passes through', () => {
  const reason = reasonFor({ tool_name: 'Read', cwd: '', tool_input: { file_path: '/etc/hosts' } });
  assert.strictEqual(reason, null);
});

test('Grep scoped to a passthrough dir passes through; whole-project still redirects', () => {
  const scoped = reasonFor({
    tool_name: 'Grep',
    cwd: CWD,
    tool_input: { pattern: 'foo', path: `${CWD}/docs` },
  });
  assert.strictEqual(scoped, null);

  const whole = reasonFor({ tool_name: 'Grep', cwd: CWD, tool_input: { pattern: 'foo' } });
  assert.ok(whole, 'whole-project Grep must redirect');
});

test('Grep scoped outside the project root passes through', () => {
  const reason = reasonFor({
    tool_name: 'Grep',
    cwd: CWD,
    tool_input: { pattern: 'foo', path: '/etc' },
  });
  assert.strictEqual(reason, null);
});

test('Glob scoped to a passthrough dir passes through', () => {
  const reason = reasonFor({
    tool_name: 'Glob',
    cwd: CWD,
    tool_input: { pattern: '*.md', path: `${CWD}/.claude` },
  });
  assert.strictEqual(reason, null);
});

test('Edit on a nonexistent file passes through (replace_text_in_file would 404)', () => {
  const reason = reasonFor({
    tool_name: 'Edit',
    cwd: '/tmp/jbr-nonexistent-dir',
    tool_input: { file_path: '/tmp/jbr-nonexistent-dir/missing.ts', old_string: 'a', new_string: 'b' },
  });
  assert.strictEqual(reason, null);
});

test('Write on an existing file passes through (native keeps read-before-write)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jbr-'));
  const file = path.join(dir, 'existing.ts');
  fs.writeFileSync(file, 'x');
  const reason = reasonFor({
    tool_name: 'Write',
    cwd: dir,
    tool_input: { file_path: file, content: 'y' },
  });
  assert.strictEqual(reason, null);
  fs.rmSync(dir, { recursive: true, force: true });
});
