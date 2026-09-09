"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { editPaths } = require("./edit-paths");

test("extracts all changed paths and rename destinations from Codex's documented payload", () => {
  assert.deepEqual(editPaths({ tool_name: "apply_patch", tool_input: { command:
    "*** Begin Patch\n*** Update File: one/hooks/a.js\n*** Move to: two/hooks/a.js\n@@\n-previous\n+next\n*** Add File: one/hooks/b.js\n+new\n*** Delete File: one/hooks/old.js\n*** End Patch" } }),
  ["one/hooks/a.js", "two/hooks/a.js", "one/hooks/b.js", "one/hooks/old.js"]);
});
test("ignores patch-looking content of Read and Bash and malformed inputs", () => {
  for (const data of [null, {}, { tool_name: "Read", tool_input: { file_path: "plugin.json" } },
    { tool_name: "Bash", tool_input: { command: "*** Delete File: plugin.json" } },
    { tool_name: "apply_patch", tool_input: { command: [] } }]) assert.deepEqual(editPaths(data), []);
});
test("does not treat added patch-looking text as a changed path", () => {
  assert.deepEqual(editPaths({ tool_name: "apply_patch", tool_input: { command:
    "*** Begin Patch\n*** Add File: notes.md\n+*** Delete File: plugin.json\n*** End Patch" } }), ["notes.md"]);
});
