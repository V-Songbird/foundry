'use strict';
// Build the T3.1 arm: the SAME style text, delivered by a hook instead of
// sitting resident in the plugin's output-styles/ slot.
//
//   node mkdeliverarm.js
//
// What it builds, at X:/Temp/hush-arms/t31deliver:
//   - a full copy of hush, plugin name `t31deliver` so it cannot collide with
//     an installed hush (a colliding name silently fails to resolve a style);
//   - output-styles/hush.md DELETED, so nothing is resident;
//   - silence-nudge.js patched so the FIRST UserPromptSubmit of a session
//     emits the whole style body as additionalContext, and every later turn
//     emits the ordinary reminder. One hook, one emission per turn, so the
//     arm differs from stock in the DELIVERY CHANNEL only.
//   - settings-t31deliver.json pinning no output style at all.
//
// Stock hush is the control: identical text, resident, forced. Anything that
// moves between the two arms is the channel, not the words.
const fs = require('node:fs');
const path = require('node:path');

const SRC = 'D:/Projects/Personal/SoftwareDevelopment/claude-plugins/hush';
const OUT_ROOT = 'X:/Temp/hush-arms';
const ARM = 't31deliver';
const dest = path.join(OUT_ROOT, ARM);

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(SRC, dest, { recursive: true });

// Unique plugin name.
const manPath = path.join(dest, '.claude-plugin/plugin.json');
const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
man.name = ARM;
fs.writeFileSync(manPath, JSON.stringify(man, null, 2) + '\n');

// Take the style body (frontmatter stripped — a hook injects prose, not a
// style file) and remove the resident copy.
const stylePath = path.join(dest, 'output-styles/hush.md');
const styleRaw = fs.readFileSync(stylePath, 'utf8');
const body = styleRaw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
fs.rmSync(stylePath);
fs.rmdirSync(path.join(dest, 'output-styles'));

// Patch the nudge hook: first UserPromptSubmit of a session carries the body.
const nudgePath = path.join(dest, 'hooks/silence-nudge.js');
let nudge = fs.readFileSync(nudgePath, 'utf8');

const anchor = 'function main() {';
if (nudge.split(anchor).length - 1 !== 1) throw new Error('main() anchor is not unique');

const injected = `const STYLE_BODY = ${JSON.stringify(body)};

// T3.1 arm only. The style body rides the first UserPromptSubmit of a session
// instead of sitting resident. The sentinel makes it once-per-session: a body
// re-sent every turn would be measuring repetition, not delivery.
function claimStyleOnce(sessionId) {
  const os = require("node:os");
  const fsx = require("node:fs");
  const safe = String(sessionId || "unknown").replace(/[^a-zA-Z0-9-]/g, "_");
  const file = require("node:path").join(os.tmpdir(), \`t31deliver-\${safe}\`);
  try {
    fsx.writeFileSync(file, "", { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}

${anchor}`;
nudge = nudge.replace(anchor, injected);

// Prepend the body to whatever the hook was already going to say on the first
// prompt of the session. `text` is the variable main() emits.
const emitAnchor = `          additionalContext: text,`;
if (nudge.split(emitAnchor).length - 1 !== 1) throw new Error('emit anchor is not unique');
nudge = nudge.replace(
  emitAnchor,
  `          additionalContext:
            event === "UserPromptSubmit" && claimStyleOnce(input.session_id)
              ? \`\${STYLE_BODY}\\n\\n\${text}\`
              : text,`
);
fs.writeFileSync(nudgePath, nudge);

// No output style pinned: the hook is the only delivery channel.
const settings = path.join(OUT_ROOT, `settings-${ARM}.json`);
fs.writeFileSync(settings, JSON.stringify({}, null, 2) + '\n');

// Sanity: the patched hook must still parse and still answer a plain turn.
const { spawnSync } = require('node:child_process');
const probe = spawnSync(
  process.execPath,
  [nudgePath],
  {
    input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'mkarm-selftest' }),
    encoding: 'utf8',
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('HUSH_'))),
  }
);
if (probe.status !== 0) throw new Error(`patched hook exited ${probe.status}: ${probe.stderr}`);
const out = JSON.parse(probe.stdout).hookSpecificOutput.additionalContext;
if (!out.includes(body.slice(0, 60))) throw new Error('first turn did not carry the style body');

const probe2 = spawnSync(process.execPath, [nudgePath], {
  input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'mkarm-selftest' }),
  encoding: 'utf8',
  env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('HUSH_'))),
});
const out2 = JSON.parse(probe2.stdout).hookSpecificOutput.additionalContext;
if (out2.includes(body.slice(0, 60))) throw new Error('second turn re-sent the style body');

console.log(`${ARM}  ->  ${dest}`);
console.log(`  style body ${body.length} bytes, delivered on turn 1 only`);
console.log(`  settings   ${settings} (no outputStyle pinned)`);
console.log(`  self-test  first turn carries the body, second turn does not`);
