const path = require('node:path');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(PLUGIN_ROOT, 'prompt-template.md');

const INJECTION = `RELAY ACTIVE.

<!-- relay:practices lastmod:2026-06-30
     sources: code.claude.com/docs/en/best-practices.md, sub-agents.md,
              Fable 5 prompting guide, Anthropic Prompting 101 2025-05-22 -->

DETECT: if mcp__ccd_session__spawn_task available in your tools -> Desktop mode.
Else -> CLI mode.

ROUTING:
  Desktop: spawn_task (background chip) | mark_chapter (session nav) | Agent/Workflow (parallel)
  CLI:     Agent + TaskCreate            | TaskCreate milestone        | Agent/Workflow (parallel)

PROACTIVE SPAWN - trigger immediately, without waiting to be asked:
- Confirmed security/bug find outside current task scope
- Dead code or stale docs found while reading unrelated code
- Real follow-up that clearly belongs in its own session

CHAPTERS (Desktop only) - mark at phase transitions, 3-8 per session:
  Exploration | Planning | Implementation | Verification | Commit
  Do not mark for the very first message.

SPAWN QUALITY - before every spawn_task call, Read: ${TEMPLATE_PATH}
Apply it fully. Never skip relevant_files. Never skip verification criteria.`;

function main() {
  try {
    process.stdout.write(Buffer.from(INJECTION, 'utf-8'));
  } catch {
    // ponytail: mirrors Python's bare except OSError: pass on write failure
  }
}

if (require.main === module) {
  try {
    main();
  } catch {
    process.exit(0);
  }
}

module.exports = { main, INJECTION, TEMPLATE_PATH };
