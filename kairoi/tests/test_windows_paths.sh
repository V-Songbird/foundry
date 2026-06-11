#!/usr/bin/env bash
# Windows path normalization: hook payloads on Windows routinely carry
# backslash-separated cwd and file_path values (D:\proj\src\auth\token.ts).
# Before normalization, both hooks failed OPEN on those shapes:
#   - guard-check: the ${FILE_PATH#$CWD/} strip and the source_paths glob
#     match never matched, so orientation and guards silently never fired.
#   - state-write-guard: `.kairoi\model\auth.json` sailed past the
#     `.kairoi/*` case pattern, so the hand-edit deny was bypassable.
#
# These tests simulate Windows shapes by converting the real (POSIX) test
# cwd to backslashes — after the scripts normalize them back, filesystem
# access still resolves, which is exactly the production behavior on
# git-bash (D:/proj and D:\proj both resolve).
#
# Also covers MultiEdit write-class parity: hooks.json registers MultiEdit
# for guard-check, and guard-check must classify it write-class so guards
# fire (it previously only got the state-write-guard deny, not guards).

set -u
. "$KAIROI_TEST_HELPERS"

PLUGIN="$KAIROI_TEST_PLUGIN_ROOT"
GUARD_CHECK="$PLUGIN/scripts/guard-check.sh"
STATE_GUARD="$PLUGIN/scripts/state-write-guard.sh"

init_git_repo
setup_kairoi_state "auth" "Auth module" 0
add_guard "auth" "fix-token-race" "Verify mutex lock in refreshToken" "src/auth/token.ts"

CWD="$(pwd)"
# Backslash-separated rendition of the same cwd (Windows payload shape).
CWD_BS="$(printf '%s' "$CWD" | tr '/' '\\')"

# =========================================================================
# Case A: guard-check fires on a backslash absolute file_path + cwd.
# =========================================================================
INPUT_A="$(jq -n --arg cwd "$CWD_BS" --arg fp "$CWD_BS\\src\\auth\\token.ts" '{
  cwd: $cwd,
  tool_name: "Write",
  tool_input: { file_path: $fp }
}')"

OUTPUT_A="$(echo "$INPUT_A" | bash "$GUARD_CHECK")"
if ! echo "$OUTPUT_A" | jq -r '.hookSpecificOutput.additionalContext // empty' 2>/dev/null \
    | grep -qF "Verify mutex lock"; then
  echo "FAIL A: guard did not fire on backslash absolute path"
  echo "raw output: $OUTPUT_A"
  exit 1
fi

# Orientation flag must be written for the resolved module.
[ -f ".kairoi/.seen-auth" ] || { echo "FAIL A2: .seen-auth not created"; exit 1; }

# Reset per-case scratch.
rm -f .kairoi/.seen-auth .kairoi/.guards-log

# =========================================================================
# Case B: guard-check fires on a backslash RELATIVE file_path.
# =========================================================================
INPUT_B="$(jq -n --arg cwd "$CWD_BS" '{
  cwd: $cwd,
  tool_name: "Edit",
  tool_input: { file_path: "src\\auth\\token.ts" }
}')"

OUTPUT_B="$(echo "$INPUT_B" | bash "$GUARD_CHECK")"
if ! echo "$OUTPUT_B" | jq -r '.hookSpecificOutput.additionalContext // empty' 2>/dev/null \
    | grep -qF "Verify mutex lock"; then
  echo "FAIL B: guard did not fire on backslash relative path"
  echo "raw output: $OUTPUT_B"
  exit 1
fi

rm -f .kairoi/.seen-auth .kairoi/.guards-log

# =========================================================================
# Case C: state-write-guard DENIES a backslash write to .kairoi state.
# =========================================================================
OUT_C="$(jq -n --arg cwd "$CWD_BS" --arg fp ".kairoi\\model\\auth.json" '{
  cwd: $cwd,
  tool_name: "Write",
  tool_input: { file_path: $fp }
}' | bash "$STATE_GUARD")"

DECISION_C="$(echo "$OUT_C" | jq -r '.hookSpecificOutput.permissionDecision // empty' 2>/dev/null)"
if [ "$DECISION_C" != "deny" ]; then
  echo "FAIL C: expected deny for backslash .kairoi write, got: $OUT_C"
  exit 1
fi

# =========================================================================
# Case D: state-write-guard DENIES a backslash ABSOLUTE write to .kairoi.
# =========================================================================
OUT_D="$(jq -n --arg cwd "$CWD_BS" --arg fp "$CWD_BS\\.kairoi\\buffer.jsonl" '{
  cwd: $cwd,
  tool_name: "Edit",
  tool_input: { file_path: $fp }
}' | bash "$STATE_GUARD")"

DECISION_D="$(echo "$OUT_D" | jq -r '.hookSpecificOutput.permissionDecision // empty' 2>/dev/null)"
if [ "$DECISION_D" != "deny" ]; then
  echo "FAIL D: expected deny for backslash absolute .kairoi write, got: $OUT_D"
  exit 1
fi

# =========================================================================
# Case E: the overrides.json allowlist still works through backslashes.
# =========================================================================
OUT_E="$(jq -n --arg cwd "$CWD_BS" --arg fp ".kairoi\\overrides.json" '{
  cwd: $cwd,
  tool_name: "Edit",
  tool_input: { file_path: $fp }
}' | bash "$STATE_GUARD")"

if [ -n "$OUT_E" ]; then
  echo "FAIL E: expected fall-open (empty stdout) for overrides.json, got: $OUT_E"
  exit 1
fi

# =========================================================================
# Case F: MultiEdit is write-class — guards fire on it.
# =========================================================================
INPUT_F="$(jq -n --arg cwd "$CWD" '{
  cwd: $cwd,
  tool_name: "MultiEdit",
  tool_input: { file_path: "src/auth/token.ts" }
}')"

OUTPUT_F="$(echo "$INPUT_F" | bash "$GUARD_CHECK")"
if ! echo "$OUTPUT_F" | jq -r '.hookSpecificOutput.additionalContext // empty' 2>/dev/null \
    | grep -qF "Verify mutex lock"; then
  echo "FAIL F: guard did not fire on MultiEdit"
  echo "raw output: $OUTPUT_F"
  exit 1
fi

exit 0
