#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function projectDir() {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
}

function configPath(root) {
  return path.join(root, ".foreman", "config.json");
}

// Fail-soft, same spirit as post-commit.js's readConfig: a missing or
// corrupt config.json never blocks prompt assembly, it just means no
// custom sections this time.
function readCustomSections(root) {
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath(root), "utf-8"));
    return Array.isArray(parsed?.customSections) ? parsed.customSections : [];
  } catch {
    return [];
  }
}

const TAG_RE = /^[a-z][a-z0-9_]*$/;

// Every tag the fixed template already owns — a custom section can never
// shadow a guardrail block like scope_discipline or truth_grounding.
const RESERVED_TAGS = new Set([
  "task_context",
  "truth_grounding",
  "scope_discipline",
  "tone",
  "background",
  "relevant_files",
  "context",
  "task_rules",
  "example",
  "output_format",
]);

function escapeXml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Validates and renders customSections into inline XML. Never throws —
// each malformed entry is skipped with a warning instead of failing the
// whole prompt assembly.
function render(root) {
  const raw = readCustomSections(root);
  const sections = [];
  const warnings = [];
  const seenTags = new Set();

  raw.forEach((entry, i) => {
    const tag = entry?.tag;
    const content = entry?.content;
    if (typeof tag !== "string" || !TAG_RE.test(tag)) {
      warnings.push(`customSections[${i}]: tag ${JSON.stringify(tag)} must match ^[a-z][a-z0-9_]*$ — skipped`);
      return;
    }
    if (RESERVED_TAGS.has(tag)) {
      warnings.push(`customSections[${i}]: tag "${tag}" is reserved by the template — skipped`);
      return;
    }
    if (seenTags.has(tag)) {
      warnings.push(`customSections[${i}]: tag "${tag}" duplicates an earlier entry — skipped`);
      return;
    }
    if (typeof content !== "string" || !content.trim()) {
      warnings.push(`customSections[${i}] ("${tag}"): content must be a non-empty string — skipped`);
      return;
    }
    seenTags.add(tag);
    sections.push({ tag, xml: `<${tag}>\n${escapeXml(content.trim())}\n</${tag}>` });
  });

  return { sections, warnings };
}

function main() {
  const result = render(projectDir());
  process.stdout.write(JSON.stringify({ ok: true, ...result }));
}

if (require.main === module) {
  main();
}

module.exports = {
  projectDir,
  configPath,
  readCustomSections,
  escapeXml,
  render,
  TAG_RE,
  RESERVED_TAGS,
};
