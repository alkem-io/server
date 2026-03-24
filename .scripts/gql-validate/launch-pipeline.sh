#!/bin/bash
# GQL Validation Pipeline — One-shot bootstrap.
# Sets up directories, syncs repos, runs initial validation, prints agent team instructions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "╔══════════════════════════════════════════════════╗"
echo "║     GQL Validation Pipeline — Bootstrap          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Setup pipeline directories
echo "Step 1: Setting up pipeline directories..."
bash "$REPO_ROOT/.claude/hooks/setup-pipeline.sh"
echo ""

# 2. Sync repos (test-suites + client-web)
echo "Step 2: Syncing repos..."
bash "$SCRIPT_DIR/sync-repos.sh"
echo ""

# 3. Run initial validation cycle
echo "Step 3: Running initial validation..."
node "$SCRIPT_DIR/validator.mjs"
EXIT_CODE=$?
date -Iseconds > "$REPO_ROOT/.claude/pipeline/.last-cycle"
echo ""

# 4. Print summary
echo "╔══════════════════════════════════════════════════╗"
echo "║     Bootstrap Complete                           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

if [ -f "$REPO_ROOT/.claude/pipeline/results/_summary.json" ]; then
  echo "Validation results (per-source):"
  echo ""

  for SOURCE in test-suites client-web; do
    TOTAL=$(jq -r ".sources[\"$SOURCE\"].total // 0" "$REPO_ROOT/.claude/pipeline/results/_summary.json")
    PASS=$(jq -r ".sources[\"$SOURCE\"].pass // 0" "$REPO_ROOT/.claude/pipeline/results/_summary.json")
    FAIL=$(jq -r ".sources[\"$SOURCE\"].fail // 0" "$REPO_ROOT/.claude/pipeline/results/_summary.json")
    DEPRECATED=$(jq -r ".sources[\"$SOURCE\"].deprecated // 0" "$REPO_ROOT/.claude/pipeline/results/_summary.json")
    echo "  $SOURCE:"
    echo "    Total:      $TOTAL operations"
    echo "    Pass:       $PASS"
    echo "    Fail:       $FAIL"
    echo "    Deprecated: $DEPRECATED"
    echo ""
  done

  AGG_TOTAL=$(jq -r '.aggregate.total' "$REPO_ROOT/.claude/pipeline/results/_summary.json")
  AGG_PASS=$(jq -r '.aggregate.pass' "$REPO_ROOT/.claude/pipeline/results/_summary.json")
  AGG_FAIL=$(jq -r '.aggregate.fail' "$REPO_ROOT/.claude/pipeline/results/_summary.json")
  AGG_DEPRECATED=$(jq -r '.aggregate.deprecated' "$REPO_ROOT/.claude/pipeline/results/_summary.json")
  echo "  Aggregate:"
  echo "    Total:      $AGG_TOTAL operations"
  echo "    Pass:       $AGG_PASS"
  echo "    Fail:       $AGG_FAIL"
  echo "    Deprecated: $AGG_DEPRECATED"
  echo ""
fi

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "All operations valid. No agent fixes needed."
else
  echo "Errors detected. Launch Agent Teams to auto-fix:"
  echo ""
  echo "  In Claude Code, run:  /gql-pipeline"
  echo ""
  echo "  Or use Shift+Tab for delegate mode and paste the prompt"
  echo "  from .claude/commands/gql-pipeline.md"
fi

echo ""
echo "Manual commands:"
echo "  Validate:   bash .scripts/gql-validate/validate-queries.sh"
echo "  Results:    cat .claude/pipeline/results/_summary.json"
echo "  Errors:     find .claude/pipeline/results/ -name '*.json' -exec grep -l '\"status\": \"error\"' {} +"
