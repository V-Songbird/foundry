---
name: status
description: Probe whether a JetBrains IDE MCP server is connected to this session, which IDE prefix is live, and whether the jetbrains-router hook will enforce routing. Trigger on "jetbrains status", "is routing active", "check the IDE connection", or /jetbrains-router:status.
user-invocable: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/jb-lib.js" --probe*)
---

# jetbrains-status

Gather and report the current jetbrains-router state. Do both probes before replying.

1. **Hook probe** — invoke `Bash` with `description: "Probe jetbrains-router state"` and `command`:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/hooks/jb-lib.js" --probe
   ```
   Prints JSON: `enforcing` (will the hook redirect), `prefix` (detected/overridden IDE prefix), `disabled` (kill-switched via `JETBRAINS_ROUTER_DISABLE=1`), `forced`, `bypass` (per-tool bypass list). Exit 0 = enforce, 1 = fail open.

2. **MCP connectivity** — check whether any `mcp__<prefix>__*` tool is registered in this session (match the probe's prefix first, then any of webstorm/rider/idea/pycharm/phpstorm/goland/rubymine/clion/rustrover/datagrip/aqua). If one is, call `get_project_modules` on it (no arguments). If none is registered, note "MCP tools unavailable". If the call errors, note "MCP call failed" with the error text.

3. **Report** — under 10 lines:
   - **Status** — "connected" / "not connected (no MCP tool)" / "not connected (MCP call failed)" / "kill-switched".
   - **Active IDE + prefix** — from the probe (`JETBRAINS_MCP_PREFIX` override noted if set).
   - **Project root / modules** — from the MCP response, if available.
   - **Routing state** — cross-reference the probes:
     - MCP connected + `enforcing: true` → routing active (hook redirects Read/Grep/Glob/Edit/Write/Bash/PowerShell)
     - MCP connected + `disabled: true` → kill-switched (unset `JETBRAINS_ROUTER_DISABLE` to re-enable)
     - MCP unavailable + `enforcing: true` → routing will misfire (hook enforces but MCP tools are missing — check IDE → Settings → Tools → MCP Server)
     - MCP unavailable + `enforcing: false` → routing inactive (native tools in use)

No recommendations beyond the mismatch hints above. The user runs this to verify the plugin is live.
