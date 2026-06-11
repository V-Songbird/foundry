#!/usr/bin/env bash
# Legibility evidence loop: reflection result files may carry a
# legibility_evidence array (cases where a Claude-legibility issue
# measurably slowed or blocked a task). sync-finalize appends each
# observation to .kairoi/legibility.jsonl — stamped with module +
# timestamp — and reports the count in the session summary. This log is
# the falsifiability mechanism for the writing-stance rules and the
# evidence source for /kairoi:lint's growth gate.

set -u
. "$KAIROI_TEST_HELPERS"

PLUGIN="$KAIROI_TEST_PLUGIN_ROOT"
SYNC_PREPARE="$PLUGIN/scripts/sync-prepare.sh"
SYNC_FINALIZE="$PLUGIN/scripts/sync-finalize.sh"

init_git_repo
setup_kairoi_state "auth" "Auth module" 0

# =========================================================================
# Case A: result file WITH evidence — appended, stamped, summarized
# =========================================================================
buffer_append_raw "task-1" "SUCCESS" "auth"
bash "$SYNC_PREPARE" >/dev/null 2>&1

jq -n '{
  module: "auth",
  first_population: false,
  guards_created: [],
  guards_removed: [],
  semantic_edges: [],
  purpose_changed: false,
  contradiction_notes: null,
  legibility_evidence: [
    { rule: "canonical-naming",
      file: "src/auth/token.ts",
      note: "task said session but code says token — grep missed call sites" }
  ]
}' > .kairoi/.reflect-result-auth.json

FIN_OUT="$(bash "$SYNC_FINALIZE" --reflected "auth" 2>/dev/null)"

assert_line_count ".kairoi/legibility.jsonl" 1 || exit 1
assert_jq ".kairoi/legibility.jsonl" '.rule' "canonical-naming" || exit 1
assert_jq ".kairoi/legibility.jsonl" '.module' "auth" || exit 1
assert_jq ".kairoi/legibility.jsonl" '.file' "src/auth/token.ts" || exit 1

TS="$(jq -r '.timestamp // empty' .kairoi/legibility.jsonl)"
if [ -z "$TS" ]; then
  echo "FAIL A: legibility entry missing timestamp stamp"
  sed 's/^/  /' .kairoi/legibility.jsonl
  exit 1
fi

if ! echo "$FIN_OUT" | grep -q "legibility evidence: +1"; then
  echo "FAIL A2: finalize summary missing legibility evidence count"
  echo "$FIN_OUT" | sed 's/^/  /'
  exit 1
fi
assert_contains ".kairoi/.session-summary.txt" "legibility evidence: +1" || exit 1

# =========================================================================
# Case B: result file WITHOUT the field — log untouched, no summary line
# =========================================================================
buffer_append_raw "task-2" "SUCCESS" "auth"
bash "$SYNC_PREPARE" >/dev/null 2>&1

jq -n '{
  module: "auth",
  first_population: false,
  guards_created: [],
  guards_removed: [],
  semantic_edges: [],
  purpose_changed: false,
  contradiction_notes: null
}' > .kairoi/.reflect-result-auth.json

bash "$SYNC_FINALIZE" --reflected "auth" >/dev/null 2>&1

assert_line_count ".kairoi/legibility.jsonl" 1 || exit 1
if grep -q "legibility evidence" .kairoi/.session-summary.txt; then
  echo "FAIL B: summary mentions legibility evidence on an evidence-free sync"
  sed 's/^/  /' .kairoi/.session-summary.txt
  exit 1
fi

exit 0
