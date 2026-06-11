#!/usr/bin/env bash
# init Step 8.5 writes behavioral rules.
# Verifies:
#   - Fresh Solo project: all three rule files are copied to .claude/rules/.
#   - Existing rule files: skipped untouched on re-run (idempotent).
#   - CLAUDE.md is NOT created or modified — kairoi no longer installs a
#     breadcrumb section. Rule files carry the behavioral load on their own
#     loading discipline.
#   - Team mode: kairoi-writing.md is NOT installed — its stance presumes
#     Claude is the sole developer, which is wrong for shared repos.
#
# The test mirrors the bash block specified in SKILL.md Step 8.5, pointing
# CLAUDE_SKILL_DIR at the plugin's actual init skill so the rule
# files under test are the same ones the skill will ship.

set -u
. "$KAIROI_TEST_HELPERS"

PLUGIN="$KAIROI_TEST_PLUGIN_ROOT"
SKILL_DIR="$PLUGIN/skills/init"

# Sanity: the rule files must actually ship with the skill.
[ -f "$SKILL_DIR/rules/kairoi.md" ] \
  || { echo "FAIL: plugin is missing $SKILL_DIR/rules/kairoi.md"; exit 1; }
[ -f "$SKILL_DIR/rules/kairoi-state-files.md" ] \
  || { echo "FAIL: plugin is missing $SKILL_DIR/rules/kairoi-state-files.md"; exit 1; }
[ -f "$SKILL_DIR/rules/kairoi-writing.md" ] \
  || { echo "FAIL: plugin is missing $SKILL_DIR/rules/kairoi-writing.md"; exit 1; }

# apply_step_8_5 mirrors the SKILL.md Step 8.5 bash block exactly.
# Mode is inferred from .gitignore (a whole-directory `.kairoi/` line means
# Solo); kairoi-writing.md installs only in Solo mode. Populates
# KAIROI_RULES_WRITTEN / KAIROI_RULES_SKIPPED / KAIROI_RULES_SKIPPED_TEAM.
apply_step_8_5() {
  KAIROI_RULES_WRITTEN=()
  KAIROI_RULES_SKIPPED=()
  KAIROI_RULES_SKIPPED_TEAM=()

  local RULES="kairoi.md kairoi-state-files.md"
  if grep -qE '^\s*\.kairoi/?\s*$' .gitignore 2>/dev/null; then
    RULES="$RULES kairoi-writing.md"
  else
    KAIROI_RULES_SKIPPED_TEAM+=("kairoi-writing.md")
  fi

  local RULE DST SRC
  for RULE in $RULES; do
    DST=".claude/rules/$RULE"
    SRC="${CLAUDE_SKILL_DIR}/rules/$RULE"
    if [ -e "$DST" ]; then
      KAIROI_RULES_SKIPPED+=("$RULE")
    else
      mkdir -p .claude/rules
      cp "$SRC" "$DST"
      KAIROI_RULES_WRITTEN+=("$RULE")
    fi
  done
}

export CLAUDE_SKILL_DIR="$SKILL_DIR"

# =========================================================================
# Case 1: fresh Solo project — all rule files copied, CLAUDE.md untouched
# =========================================================================
mkdir -p case1 && cd case1 || exit 1
printf '.kairoi/\n' > .gitignore

apply_step_8_5

[ -f .claude/rules/kairoi.md ] \
  || { echo "FAIL c1: .claude/rules/kairoi.md not written"; exit 1; }
[ -f .claude/rules/kairoi-state-files.md ] \
  || { echo "FAIL c1: .claude/rules/kairoi-state-files.md not written"; exit 1; }
[ -f .claude/rules/kairoi-writing.md ] \
  || { echo "FAIL c1: .claude/rules/kairoi-writing.md not written"; exit 1; }

assert_contains .claude/rules/kairoi.md "default-category: mandate" || exit 1
assert_contains .claude/rules/kairoi.md "# kairoi" || exit 1
assert_contains .claude/rules/kairoi-state-files.md 'globs: ".kairoi/**"' || exit 1
assert_contains .claude/rules/kairoi-state-files.md "# kairoi state files" || exit 1
assert_contains .claude/rules/kairoi-writing.md "default-category: mandate" || exit 1
assert_contains .claude/rules/kairoi-writing.md "# kairoi — writing stance" || exit 1

# init must NOT create CLAUDE.md.
[ ! -e CLAUDE.md ] \
  || { echo "FAIL c1: CLAUDE.md should not be created by init"; exit 1; }

# Written arrays populated as expected.
[ "${#KAIROI_RULES_WRITTEN[@]}" -eq 3 ] \
  || { echo "FAIL c1: expected 3 rules written, got ${#KAIROI_RULES_WRITTEN[@]}"; exit 1; }
[ "${#KAIROI_RULES_SKIPPED[@]}" -eq 0 ] \
  || { echo "FAIL c1: expected 0 rules skipped, got ${#KAIROI_RULES_SKIPPED[@]}"; exit 1; }

cd .. || exit 1

# =========================================================================
# Case 2: re-run on fully-initialized Solo project — everything skipped
# =========================================================================
mkdir -p case2 && cd case2 || exit 1
printf '.kairoi/\n' > .gitignore

# Pre-populate as though init already ran.
mkdir -p .claude/rules
printf 'user-customized kairoi rule\n' > .claude/rules/kairoi.md
printf 'user-customized state-files rule\n' > .claude/rules/kairoi-state-files.md
printf 'user-customized writing rule\n' > .claude/rules/kairoi-writing.md
RULE1_BEFORE="$(cat .claude/rules/kairoi.md)"
RULE2_BEFORE="$(cat .claude/rules/kairoi-state-files.md)"
RULE3_BEFORE="$(cat .claude/rules/kairoi-writing.md)"

apply_step_8_5

# All should be skipped and files untouched (byte-identical).
[ "${#KAIROI_RULES_SKIPPED[@]}" -eq 3 ] \
  || { echo "FAIL c2: expected 3 rules skipped, got ${#KAIROI_RULES_SKIPPED[@]}"; exit 1; }
[ "${#KAIROI_RULES_WRITTEN[@]}" -eq 0 ] \
  || { echo "FAIL c2: expected 0 rules written, got ${#KAIROI_RULES_WRITTEN[@]}"; exit 1; }

[ "$(cat .claude/rules/kairoi.md)" = "$RULE1_BEFORE" ] \
  || { echo "FAIL c2: kairoi.md was modified on re-run"; exit 1; }
[ "$(cat .claude/rules/kairoi-state-files.md)" = "$RULE2_BEFORE" ] \
  || { echo "FAIL c2: kairoi-state-files.md was modified on re-run"; exit 1; }
[ "$(cat .claude/rules/kairoi-writing.md)" = "$RULE3_BEFORE" ] \
  || { echo "FAIL c2: kairoi-writing.md was modified on re-run"; exit 1; }

cd .. || exit 1

# =========================================================================
# Case 3: pre-existing CLAUDE.md is left untouched on init
# =========================================================================
mkdir -p case3 && cd case3 || exit 1
printf '.kairoi/\n' > .gitignore

printf '# My project\n\nProse paragraph.\n' > CLAUDE.md
CLAUDE_MD_BEFORE="$(cat CLAUDE.md)"

apply_step_8_5

# CLAUDE.md must be byte-identical to the pre-init state — init no longer
# touches it.
[ "$(cat CLAUDE.md)" = "$CLAUDE_MD_BEFORE" ] \
  || { echo "FAIL c3: CLAUDE.md was modified by init"; diff <(printf '%s' "$CLAUDE_MD_BEFORE") CLAUDE.md; exit 1; }

# Rule files were written (this project had no prior rules).
[ "${#KAIROI_RULES_WRITTEN[@]}" -eq 3 ] \
  || { echo "FAIL c3: expected 3 rules written, got ${#KAIROI_RULES_WRITTEN[@]}"; exit 1; }

cd .. || exit 1

# =========================================================================
# Case 4: Team mode — writing-stance rule NOT installed
# =========================================================================
mkdir -p case4 && cd case4 || exit 1
printf '.kairoi/buffer.jsonl\n.kairoi/receipts.jsonl\n.kairoi/session.log\n.kairoi/.*\n' > .gitignore

apply_step_8_5

[ -f .claude/rules/kairoi.md ] \
  || { echo "FAIL c4: .claude/rules/kairoi.md not written in Team mode"; exit 1; }
[ -f .claude/rules/kairoi-state-files.md ] \
  || { echo "FAIL c4: .claude/rules/kairoi-state-files.md not written in Team mode"; exit 1; }
[ ! -e .claude/rules/kairoi-writing.md ] \
  || { echo "FAIL c4: kairoi-writing.md must NOT be installed in Team mode"; exit 1; }

[ "${#KAIROI_RULES_WRITTEN[@]}" -eq 2 ] \
  || { echo "FAIL c4: expected 2 rules written, got ${#KAIROI_RULES_WRITTEN[@]}"; exit 1; }
[ "${#KAIROI_RULES_SKIPPED_TEAM[@]}" -eq 1 ] \
  || { echo "FAIL c4: expected 1 team-skip, got ${#KAIROI_RULES_SKIPPED_TEAM[@]}"; exit 1; }

cd .. || exit 1

exit 0
