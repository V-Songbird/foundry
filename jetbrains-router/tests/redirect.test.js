'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { reasonFor } = require('./helpers');

test('Read on a project source file redirects to read_file with translated path', () => {
  const reason = reasonFor({
    tool_name: 'Read',
    cwd: '/home/proj/my-app',
    tool_input: { file_path: '/home/proj/my-app/src/components/App.tsx' },
  });
  assert.ok(reason, 'should deny');
  assert.match(reason, /^jetbrains-router: /);
  assert.match(reason, /mcp__webstorm__read_file\(file_path="src\/components\/App\.tsx"\)/);
});

test('JETBRAINS_MCP_PREFIX overrides the redirect prefix', () => {
  const reason = reasonFor(
    {
      tool_name: 'Read',
      cwd: '/home/proj/my-app',
      tool_input: { file_path: '/home/proj/my-app/src/main.rs' },
    },
    { JETBRAINS_MCP_PREFIX: 'rider' }
  );
  assert.match(reason, /mcp__rider__read_file/);
});

test('Grep redirects to search_regex with q and mentions search_text', () => {
  const reason = reasonFor({
    tool_name: 'Grep',
    cwd: '/home/proj/my-app',
    tool_input: { pattern: 'handleSubmit' },
  });
  assert.match(reason, /mcp__webstorm__search_regex\(q="handleSubmit"\)/);
  assert.match(reason, /required parameter is 'q'/);
  assert.match(reason, /search_text/);
});

test('Grep scoped to an in-project source dir carries a paths hint', () => {
  const reason = reasonFor({
    tool_name: 'Grep',
    cwd: '/home/proj/my-app',
    tool_input: { pattern: 'foo', path: '/home/proj/my-app/src/api' },
  });
  assert.match(reason, /paths=\["src\/api\/\*\*"\]/);
});

test('Glob redirects to search_file with q', () => {
  const reason = reasonFor({
    tool_name: 'Glob',
    cwd: '/home/proj/my-app',
    tool_input: { pattern: '**/*.tsx' },
  });
  assert.match(reason, /mcp__webstorm__search_file\(q="\*\*\/\*\.tsx"\)/);
  assert.match(reason, /not glob, pattern, namePattern/);
});

test('Edit on an existing file redirects with explicit replaceAll=false', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jbr-'));
  const file = path.join(dir, 'src.ts');
  fs.writeFileSync(file, 'x');
  const reason = reasonFor({
    tool_name: 'Edit',
    cwd: dir,
    tool_input: { file_path: file, old_string: 'x', new_string: 'y' },
  });
  assert.match(reason, /replace_text_in_file\(pathInProject="src\.ts"/);
  assert.match(reason, /replaceAll=false/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Edit with replace_all=true carries replaceAll=true', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jbr-'));
  const file = path.join(dir, 'src.ts');
  fs.writeFileSync(file, 'x');
  const reason = reasonFor({
    tool_name: 'Edit',
    cwd: dir,
    tool_input: { file_path: file, old_string: 'x', new_string: 'y', replace_all: true },
  });
  assert.match(reason, /replaceAll=true/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Write on a new file redirects to create_new_file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jbr-'));
  const reason = reasonFor({
    tool_name: 'Write',
    cwd: dir,
    tool_input: { file_path: path.join(dir, 'new-file.ts'), content: 'x' },
  });
  assert.match(reason, /create_new_file\(pathInProject="new-file\.ts"/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Windows drive-letter case mismatch still translates', () => {
  const reason = reasonFor({
    tool_name: 'Read',
    cwd: 'D:\\Projects\\my-app',
    tool_input: { file_path: 'd:\\Projects\\my-app\\src\\app.ts' },
  });
  assert.match(reason, /file_path="src\/app\.ts"/);
});
