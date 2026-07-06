'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { reasonFor } = require('./helpers');

const CWD = '/home/proj/my-app';

function bash(command, env) {
  return reasonFor({ tool_name: 'Bash', cwd: CWD, tool_input: { command } }, env);
}

test('build commands redirect to build_project and mention get_file_problems', () => {
  for (const cmd of ['npm run build', 'yarn build', 'pnpm build', 'tsc', 'tsc --noEmit', 'npm run tsc']) {
    const reason = bash(cmd);
    assert.match(reason, /mcp__webstorm__build_project/, cmd);
    assert.match(reason, /get_file_problems/, cmd);
  }
});

test('test commands redirect to run configurations', () => {
  for (const cmd of ['npm test', 'npm run test', 'yarn test', 'jest', 'vitest run']) {
    assert.match(bash(cmd), /execute_run_configuration/, cmd);
  }
});

test('cat/head/tail on a source file redirect to read_file', () => {
  assert.match(bash('cat src/app.ts'), /read_file\(file_path="src\/app\.ts"\)/);
  assert.match(bash('head -20 src/app.ts'), /read_file/);
  assert.match(bash('tail -50 src/app.ts'), /read_file/);
});

test('tail -f / --follow bails to native', () => {
  assert.strictEqual(bash('tail -f src/app.log'), null);
  assert.strictEqual(bash('tail --follow src/app.log'), null);
});

test('cat on passthrough or binary paths bails', () => {
  assert.strictEqual(bash('cat README.md'), null);
  assert.strictEqual(bash('cat package.json'), null);
  assert.strictEqual(bash('cat assets/logo.png'), null);
});

test('ls redirects to list_directory_tree, parsing flags correctly', () => {
  assert.match(bash('ls'), /list_directory_tree\(directoryPath="\."\)/);
  assert.match(bash('ls src'), /directoryPath="src"/);
  assert.match(bash('ls -la src'), /directoryPath="src"/);
  assert.match(bash('ls src -la'), /directoryPath="src"/);
});

test('grep/rg redirect to search_text/search_regex', () => {
  const reason = bash('rg handleSubmit src/');
  assert.match(reason, /search_text/);
  assert.match(reason, /search_regex/);
  assert.match(reason, /required parameter is 'q'/);
});

test('simple find -name redirects to search_file with the extracted glob', () => {
  assert.match(bash('find . -name *.ts'), /search_file\(q="\*\.ts"\)/);
  assert.match(bash('find src -iname *Controller*'), /search_file\(q="\*Controller\*"\)/);
});

test('find with richer predicates or without -name bails', () => {
  assert.strictEqual(bash('find . -type f -name *.ts'), null);
  assert.strictEqual(bash('find src -maxdepth 2 -name *.ts'), null);
  assert.strictEqual(bash('find src -name *.ts -or -name *.tsx'), null);
  assert.strictEqual(bash('find . -mtime -1'), null);
});

test('composition bails: pipes, redirection, chaining, backgrounding, heredocs', () => {
  for (const cmd of [
    'cat src/app.ts | grep foo',
    'grep foo < input.txt',
    'grep foo <<< some-input',
    'npm run build && npm test',
    'npm run build & echo done',
    'echo x > out.txt',
    'cat a.ts; cat b.ts',
  ]) {
    assert.strictEqual(bash(cmd), null, cmd);
  }
});

test('quoted arguments bail (unsafe to token-split)', () => {
  assert.strictEqual(bash("cat 'my file.ts'"), null);
  assert.strictEqual(bash('cat "my file.ts"'), null);
});

test('env-var prefixes are peeled, not a bypass', () => {
  assert.match(bash('FOO=1 cat src/app.ts'), /read_file/, 'benign prefix is peeled and still redirects');
  assert.match(bash('env cat src/app.ts'), /read_file/);
});

test('JETBRAINS_ROUTER_* as a command prefix is hard-denied', () => {
  const reason = bash('JETBRAINS_ROUTER_DISABLE=1 cat src/app.ts');
  assert.ok(reason, 'must deny');
  assert.match(reason, /not an agent escape hatch/);
});

test('unknown commands pass through', () => {
  assert.strictEqual(bash('git status'), null);
  assert.strictEqual(bash('docker ps'), null);
});
