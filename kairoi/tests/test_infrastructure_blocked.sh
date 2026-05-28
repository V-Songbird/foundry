#!/usr/bin/env bash
# buffer-append.sh treats infrastructure-blocked test runs differently from
# real test failures: when the harness itself couldn't run (e.g., gradle's
# :prepareTestSandbox died because an attached IDE held the test-sandbox
# jar memory-mapped), the buffer entry stays SUCCESS, test_results is
# marked with infrastructure_blocked: true, and the user-facing notice is
# the softer "test results not captured" line instead of "TESTS FAILING".
#
# This closes the user-reported gap where every commit in a session-long
# release range was marked BLOCKED with {"total":N,"passed":0,"failed":N,
# "raw_exit":1} — including metadata-only commits that cannot fail tests.

set -u
. "$KAIROI_TEST_HELPERS"

PLUGIN="$KAIROI_TEST_PLUGIN_ROOT"
BUFFER_APPEND="$PLUGIN/scripts/buffer-append.sh"

init_git_repo
setup_kairoi_state "auth" "Auth module" 0

# --- Case 1: built-in pattern — "user-mapped section open" ---------------
# Simulate the gradle FileSystemException emitted when IntelliJ has the
# plugin-test sandbox jar memory-mapped. The fake test command echoes
# gradle-shaped output that previously fooled the parser into reporting
# "172 of 172 failed" and exits 1.
GRADLE_OUTPUT='> Task :test FAILED
FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task '"'"':prepareTestSandbox'"'"'.
> java.nio.file.FileSystemException: build/idea-sandbox/plugins-test/foo-1.0.0.jar: The requested operation cannot be performed on a file with a user-mapped section open

172 tests completed, 172 failed'
jq --arg cmd "printf '%s\n' '$GRADLE_OUTPUT'; exit 1" \
   '.test = $cmd' \
   .kairoi/build-adapter.json > /tmp/ba.json && mv /tmp/ba.json .kairoi/build-adapter.json

commit_file "src/auth/token.ts" "// token" "feat(auth): add token"

OUTPUT="$(bash "$BUFFER_APPEND" \
  --task "case1-jar-lock" \
  --status "SUCCESS" \
  --summary "add token" 2>&1)"
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "case1: buffer-append exited $RC"
  echo "$OUTPUT"
  exit 1
fi

assert_jq ".kairoi/buffer.jsonl" '.status' "SUCCESS" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.infrastructure_blocked' "true" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.total' "0" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.failed' "0" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.raw_exit' "1" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.parse_note | test("user-mapped section open")' "true" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.blocked_diagnostics' "null" || exit 1

# The user-facing notice must be the soft "not captured" line, not the
# "TESTS FAILING" alarm. (Both checks together — the alarm phrase must NOT
# appear, and the soft notice phrase MUST appear.)
if echo "$OUTPUT" | grep -qF "TESTS FAILING"; then
  echo "case1: emitted TESTS FAILING alarm for infrastructure-blocked run"
  echo "$OUTPUT"
  exit 1
fi
if ! echo "$OUTPUT" | grep -qF "test results not captured"; then
  echo "case1: missing 'test results not captured' notice"
  echo "$OUTPUT"
  exit 1
fi

# --- Case 2: built-in pattern — ":prepareTestSandbox FAILED" -------------
# The task-name match is the broader fallback. Output deliberately omits
# the FileSystemException text to prove the second pattern carries the
# detection alone.
: > .kairoi/buffer.jsonl
GRADLE_OUTPUT_2='> Task :prepareTestSandbox FAILED

FAILURE: Build failed with an exception.

1 test completed, 1 failed'
jq --arg cmd "printf '%s\n' '$GRADLE_OUTPUT_2'; exit 1" \
   '.test = $cmd' \
   .kairoi/build-adapter.json > /tmp/ba.json && mv /tmp/ba.json .kairoi/build-adapter.json

commit_file "src/auth/refresh.ts" "// refresh" "feat(auth): add refresh"

bash "$BUFFER_APPEND" \
  --task "case2-task-name" \
  --status "SUCCESS" \
  --summary "add refresh" >/dev/null

assert_jq ".kairoi/buffer.jsonl" '.status' "SUCCESS" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.infrastructure_blocked' "true" || exit 1

# --- Case 3: project-specific custom pattern -----------------------------
# `test_infrastructure_blocked_patterns` lets projects extend detection to
# their own environmental failure shapes.
: > .kairoi/buffer.jsonl
CUSTOM_OUTPUT='running suite...
ERROR: docker daemon unreachable: connection refused
5 tests completed, 5 failed'
jq --arg cmd "printf '%s\n' '$CUSTOM_OUTPUT'; exit 1" \
   '.test = $cmd
    | .test_infrastructure_blocked_patterns = ["docker daemon unreachable"]' \
   .kairoi/build-adapter.json > /tmp/ba.json && mv /tmp/ba.json .kairoi/build-adapter.json

commit_file "src/auth/docker.ts" "// docker" "feat(auth): docker integration"

bash "$BUFFER_APPEND" \
  --task "case3-custom-pattern" \
  --status "SUCCESS" \
  --summary "docker integration" >/dev/null

assert_jq ".kairoi/buffer.jsonl" '.status' "SUCCESS" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.infrastructure_blocked' "true" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.parse_note | test("docker daemon unreachable")' "true" || exit 1

# --- Case 4: real test failure still promotes to BLOCKED -----------------
# Regression guard: the new infrastructure-blocked branch must not swallow
# ordinary failing-test output. A plain "3 failed" with no infrastructure
# signature must still flip status to BLOCKED.
: > .kairoi/buffer.jsonl
jq --arg cmd "echo 'Running tests... 7 passed, 3 failed, 0 skipped'; exit 1" \
   '.test = $cmd
    | del(.test_infrastructure_blocked_patterns)' \
   .kairoi/build-adapter.json > /tmp/ba.json && mv /tmp/ba.json .kairoi/build-adapter.json

commit_file "src/auth/real-fail.ts" "// fail" "feat(auth): real failure"

OUTPUT="$(bash "$BUFFER_APPEND" \
  --task "case4-real-failure" \
  --status "SUCCESS" \
  --summary "real failure" 2>&1)"

assert_jq ".kairoi/buffer.jsonl" '.status' "BLOCKED" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.failed' "3" || exit 1
assert_jq ".kairoi/buffer.jsonl" '.test_results.infrastructure_blocked' "null" || exit 1
if ! echo "$OUTPUT" | grep -qF "TESTS FAILING"; then
  echo "case4: TESTS FAILING alarm missing for real test failure"
  echo "$OUTPUT"
  exit 1
fi

exit 0
