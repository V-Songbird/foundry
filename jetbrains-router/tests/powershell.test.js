'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { reasonFor } = require('./helpers');

const CWD = 'D:/proj/my-app';

function ps(command) {
  return reasonFor({ tool_name: 'PowerShell', cwd: CWD, tool_input: { command } });
}

test('Get-Content and aliases redirect to read_file', () => {
  assert.match(ps('Get-Content src/app.ts'), /read_file\(file_path="src\/app\.ts"\)/);
  assert.match(ps('gc src\\app.ts'), /read_file\(file_path="src\/app\.ts"\)/);
  assert.match(ps('cat src/app.ts'), /read_file/);
  assert.match(ps('type src/app.ts'), /read_file/);
});

test('Get-Content with range flags still redirects; -Wait bails', () => {
  assert.match(ps('Get-Content src/app.ts -TotalCount 50'), /read_file/);
  assert.match(ps('Get-Content src/app.ts -Tail 20'), /read_file/);
  assert.strictEqual(ps('Get-Content src/app.log -Wait'), null);
});

test('Get-Content on passthrough paths bails', () => {
  assert.strictEqual(ps('Get-Content README.md'), null);
  assert.strictEqual(ps('gc package.json'), null);
});

test('Get-ChildItem and aliases redirect to list_directory_tree', () => {
  assert.match(ps('Get-ChildItem src'), /list_directory_tree\(directoryPath="src"\)/);
  assert.match(ps('gci'), /directoryPath="\."/);
  assert.match(ps('ls src'), /directoryPath="src"/);
  assert.match(ps('dir src'), /directoryPath="src"/);
});

test('Get-ChildItem with flags bails (PS flag parsing is out of scope)', () => {
  assert.strictEqual(ps('Get-ChildItem -Recurse src'), null);
});

test('Select-String redirects to search tools', () => {
  assert.match(ps('Select-String foo src/app.ts'), /search_text/);
  assert.match(ps('sls foo src/app.ts'), /search_regex/);
});

test('build and test commands redirect in PowerShell too', () => {
  assert.match(ps('npm run build'), /build_project/);
  assert.match(ps('npm test'), /execute_run_configuration/);
});

test('pipes, variables, subexpressions, and quotes bail', () => {
  for (const cmd of [
    'Get-Content src/app.ts | Select-String foo',
    'Get-Content $file',
    'gc "my file.ts"',
    'ls; gc src/app.ts',
    'Get-Content src/app.ts > out.txt',
  ]) {
    assert.strictEqual(ps(cmd), null, cmd);
  }
});
