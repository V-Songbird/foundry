"use strict";

// Shared project-maintenance input adapter. Codex reports apply_patch using
// tool_input.command; Claude Edit/Write report tool_input.file_path.
function editPaths(data) {
  if (!data || typeof data !== "object") return [];
  if (data.tool_name === "Edit" || data.tool_name === "Write") {
    return typeof data.tool_input?.file_path === "string" ? [data.tool_input.file_path] : [];
  }
  if (data.tool_name !== "apply_patch" || typeof data.tool_input?.command !== "string") return [];
  const paths = [];
  for (const line of data.tool_input.command.split(/\r?\n/)) {
    const match = line.match(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/);
    if (match) paths.push(match[1]);
  }
  return [...new Set(paths)];
}

module.exports = { editPaths };
