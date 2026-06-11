#!/usr/bin/env bash
# buffer-append entry-first ordering: the buffer entry is appended BEFORE
# the auto-run test command executes, so a hook timeout (simulated here by
# kill -9 mid-test-run) loses only the test data — never the commit.
#
# Before 1.0.7 the entry was built only after the test run; a kill at this
# point left buffer.jsonl untouched and the commit silently vanished from
# the reflection pipeline.

set -u
. "$KAIROI_TEST_HELPERS"

PLUGIN="$KAIROI_TEST_PLUGIN_ROOT"
BUFFER_APPEND="$PLUGIN/scripts/buffer-append.sh"

init_git_repo
setup_kairoi_state "auth" "Auth module" 0

# Configure a test command slow enough that we can reliably kill the script
# while it is still running. 8s bounds the orphaned child's lifetime if the
# kill ever raced.
jq '.test = "sleep 8"' .kairoi/build-adapter.json > .kairoi/build-adapter.json.tmp \
  && mv .kairoi/build-adapter.json.tmp .kairoi/build-adapter.json

commit_file "src/auth/token.ts" "// token" "feat(auth): slow suite"

# Run buffer-append in the background; it appends the entry, then blocks in
# the auto-run upgrade phase on `sleep 8`.
bash "$BUFFER_APPEND" --task "slow-task" --status SUCCESS --summary "slow suite" \
  >/dev/null 2>&1 &
BA_PID=$!

# Wait (max ~10s) for the pre-test append to land, then hard-kill the
# script mid-test-run — the same effect as the hook runner's timeout kill.
ENTRY_SEEN=false
for _ in $(seq 1 50); do
  if [ -s .kairoi/buffer.jsonl ]; then
    ENTRY_SEEN=true
    break
  fi
  sleep 0.2
done

kill -9 "$BA_PID" 2>/dev/null || true
wait "$BA_PID" 2>/dev/null || true

if [ "$ENTRY_SEEN" = false ]; then
  echo "FAIL: buffer entry never appeared before the test run finished"
  exit 1
fi

# The commit survived the kill: one entry, our task, test_results null
# (the upgrade phase never completed), status untouched.
assert_line_count ".kairoi/buffer.jsonl" 1 || exit 1
assert_jq ".kairoi/buffer.jsonl" '.task_id' "slow-task" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results' "null" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.status' "SUCCESS" || exit 1

# Control: with a fast test command, the upgrade phase rewrites the entry
# in place — same single line, now with parsed test results.
> .kairoi/buffer.jsonl
jq '.test = "echo \"3 passed\""' .kairoi/build-adapter.json > .kairoi/build-adapter.json.tmp \
  && mv .kairoi/build-adapter.json.tmp .kairoi/build-adapter.json
commit_file "src/auth/other.ts" "// other" "feat(auth): fast suite"

bash "$BUFFER_APPEND" --task "fast-task" --status SUCCESS --summary "fast suite" >/dev/null 2>&1

assert_line_count ".kairoi/buffer.jsonl" 1 || exit 1
assert_jq ".kairoi/buffer.jsonl" '.task_id' "fast-task" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.passed' "3" || exit 1

exit 0
