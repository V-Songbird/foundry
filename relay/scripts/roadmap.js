#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function projectDir() {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
}

function roadmapPath(root) {
  return path.join(root, "ROADMAP.jsonl");
}

function readEntries(root) {
  const p = roadmapPath(root);
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, "utf-8").split("\n");
  const entries = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      throw new Error(`ROADMAP.jsonl line ${i + 1} is not valid JSON: ${err.message}`);
    }
    entries.push(obj);
  });
  return entries;
}

// parse-before-write + parse-after-write invariants, enforced here instead of by prose.
function writeEntries(root, entries) {
  const p = roadmapPath(root);
  const text = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
  fs.writeFileSync(p, text, "utf-8");
  readEntries(root); // throws if the write somehow produced malformed JSONL
}

function nextId(entries) {
  let max = 0;
  for (const e of entries) {
    const n = parseInt(e.id, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(3, "0");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const STATUSES = new Set(["planned", "in_progress", "done", "dropped", "rejected"]);
const SOURCES = new Set(["user", "claude-suggested"]);
// A newly created entry only ever starts as planned or rejected — nothing
// gets created already in_progress/done/dropped, those are transitions
// applied later via update-status.
const CREATE_STATUSES = new Set(["planned", "rejected"]);

function cmdAdd(root, payload) {
  const { title, why, what, source, status, depends_on, touches, notes } = payload || {};
  if (!title || !why || !what) {
    throw new Error("add requires title, why, what");
  }
  if (!SOURCES.has(source)) {
    throw new Error(`source must be one of ${[...SOURCES].join("|")}`);
  }
  const entryStatus = status || "planned";
  if (!CREATE_STATUSES.has(entryStatus)) {
    throw new Error(`add status must be one of ${[...CREATE_STATUSES].join("|")}`);
  }
  const entries = readEntries(root);
  const id = nextId(entries);
  const date = today();
  const entry = {
    id,
    title,
    why,
    what,
    status: entryStatus,
    source,
    depends_on: Array.isArray(depends_on) ? depends_on : [],
    touches: Array.isArray(touches) ? touches : [],
    commits: [],
    created_at: date,
    updated_at: date,
    notes: notes || "",
  };
  entries.push(entry);
  writeEntries(root, entries);
  return { entry };
}

function cmdUpdateStatus(root, payload) {
  const { id, status, commit, notes } = payload || {};
  if (!id || !status) throw new Error("update-status requires id, status");
  if (!STATUSES.has(status)) {
    throw new Error(`status must be one of ${[...STATUSES].join("|")}`);
  }
  const entries = readEntries(root);
  const entry = entries.find((e) => e.id === id);
  if (!entry) throw new Error(`no entry with id ${id}`);
  entry.status = status;
  if (commit) {
    entry.commits = Array.isArray(entry.commits) ? entry.commits : [];
    if (!entry.commits.includes(commit)) entry.commits.push(commit);
  }
  if (notes) {
    // append-only invariant: never replace existing notes
    entry.notes = entry.notes ? `${entry.notes}; ${notes}` : notes;
  }
  entry.updated_at = today();
  writeEntries(root, entries);
  return { entry };
}

function cmdList(root, filters) {
  const entries = readEntries(root);
  const statusFilter = filters.status ? new Set(String(filters.status).split(",")) : null;
  const filtered = statusFilter ? entries.filter((e) => statusFilter.has(e.status)) : entries;
  return { entries: filtered };
}

function normalizeWords(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

const DUPLICATE_THRESHOLD = 0.4;
const MAX_MATCHES = 5;

// Cheap word-overlap check against rejected entries — not semantic understanding,
// just enough to stop re-asking about something already declined.
function cmdCheckDuplicate(root, payload) {
  const { title, why } = payload || {};
  if (!title && !why) throw new Error("check-duplicate requires title and/or why");
  const words = normalizeWords(`${title || ""} ${why || ""}`);
  const rejected = readEntries(root).filter((e) => e.status === "rejected");
  const matches = rejected
    .map((e) => ({
      id: e.id,
      title: e.title,
      score: jaccard(words, normalizeWords(`${e.title || ""} ${e.why || ""}`)),
    }))
    .filter((m) => m.score >= DUPLICATE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES);
  return { duplicate: matches.length > 0, matches };
}

function readStdinJSON() {
  let raw;
  try {
    raw = fs.readFileSync(0, "utf-8");
  } catch {
    raw = "";
  }
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function main() {
  const [, , sub, ...rest] = process.argv;
  const root = projectDir();
  let result;
  switch (sub) {
    case "add":
      result = cmdAdd(root, readStdinJSON());
      break;
    case "update-status":
      result = cmdUpdateStatus(root, readStdinJSON());
      break;
    case "list":
      result = cmdList(root, parseFlags(rest));
      break;
    case "check-duplicate":
      result = cmdCheckDuplicate(root, readStdinJSON());
      break;
    default:
      throw new Error(`unknown subcommand: ${sub}. Use add|update-status|list|check-duplicate`);
  }
  process.stdout.write(JSON.stringify({ ok: true, ...result }));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  }
}

module.exports = {
  projectDir,
  roadmapPath,
  readEntries,
  writeEntries,
  nextId,
  cmdAdd,
  cmdUpdateStatus,
  cmdList,
  cmdCheckDuplicate,
  normalizeWords,
  jaccard,
};
