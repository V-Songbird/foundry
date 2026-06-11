#!/usr/bin/env bash
# Stale-trigger guard detection: a guard whose every trigger path stopped
# existing (the usual cause: a rename) can never fire again — trigger
# matching is exact-path / directory-prefix. Both doctor and sync-finalize
# must surface that state mechanically; neither removes the guard
# (re-pointing vs deletion is audit's judgment call).

set -u
. "$KAIROI_TEST_HELPERS"

PLUGIN="$KAIROI_TEST_PLUGIN_ROOT"
DOCTOR="$PLUGIN/scripts/doctor.sh"
SYNC_PREPARE="$PLUGIN/scripts/sync-prepare.sh"
SYNC_FINALIZE="$PLUGIN/scripts/sync-finalize.sh"

init_git_repo
setup_kairoi_state "auth" "Auth module" 0

mkdir -p src/auth
printf '// real file\n' > src/auth/token.ts

# Three guards: one alive (file exists), one alive via directory prefix,
# one stale (file was "renamed away").
add_guard "auth" "live-guard"  "Check the live thing"     "src/auth/token.ts"
add_guard "auth" "dir-guard"   "Check the directory"      "src/auth/"
add_guard "auth" "ghost-guard" "Check the renamed thing"  "src/auth/old-name.ts"

# =========================================================================
# Case A: doctor flags the ghost guard, and only the ghost guard
# =========================================================================
DOCTOR_OUT="$(bash "$DOCTOR" 2>/dev/null)"

if ! echo "$DOCTOR_OUT" | grep -F "ghost-guard" | grep -q "no trigger path exists"; then
  echo "FAIL A: doctor did not flag ghost-guard as stale-triggered"
  echo "$DOCTOR_OUT" | sed 's/^/  /'
  exit 1
fi
if echo "$DOCTOR_OUT" | grep -qF "live-guard"; then
  echo "FAIL A2: doctor flagged live-guard (its trigger file exists)"
  echo "$DOCTOR_OUT" | sed 's/^/  /'
  exit 1
fi
if echo "$DOCTOR_OUT" | grep -qF "dir-guard"; then
  echo "FAIL A3: doctor flagged dir-guard (its trigger directory exists)"
  echo "$DOCTOR_OUT" | sed 's/^/  /'
  exit 1
fi

# =========================================================================
# Case B: sync-finalize surfaces the ghost guard in the session summary
# =========================================================================
buffer_append_raw "task-1" "SUCCESS" "auth"
bash "$SYNC_PREPARE" >/dev/null 2>&1
FIN_OUT="$(bash "$SYNC_FINALIZE" --reflected "auth" 2>/dev/null)"

if ! echo "$FIN_OUT" | grep -q "stale-trigger guards"; then
  echo "FAIL B: finalize output missing stale-trigger section"
  echo "$FIN_OUT" | sed 's/^/  /'
  exit 1
fi
if ! echo "$FIN_OUT" | grep -qF "auth/ghost-guard"; then
  echo "FAIL B2: finalize output missing auth/ghost-guard"
  echo "$FIN_OUT" | sed 's/^/  /'
  exit 1
fi

assert_contains ".kairoi/.session-summary.txt" "stale-trigger guards" || exit 1
assert_contains ".kairoi/.session-summary.txt" "auth/ghost-guard" || exit 1

if grep -qF "live-guard" .kairoi/.session-summary.txt; then
  echo "FAIL B3: summary flagged live-guard (its trigger file exists)"
  sed 's/^/  /' .kairoi/.session-summary.txt
  exit 1
fi

exit 0
