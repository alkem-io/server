#!/bin/bash
# Quality gate for GQL pipeline task completion.
# Exit 2 rejects completion and sends stderr back to the agent as feedback.
# Exit 0 allows completion.
set -uo pipefail

INPUT=$(cat)
TEAMMATE=$(echo "$INPUT" | jq -r '.teammate_name // "unknown"')
PIPELINE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/pipeline"

# ─── RUNNER completed ────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "runner"; then

  # Check that at least one result was written this cycle
  RESULT_COUNT=$(find "$PIPELINE_DIR/results" -name "*.json" \
    ! -name "_summary.json" \
    -newer "$PIPELINE_DIR/.last-cycle" 2>/dev/null | wc -l | tr -d ' ')

  if [ "$RESULT_COUNT" -eq 0 ]; then
    echo "No query results were produced this cycle. Run validate-queries.sh before completing." >&2
    exit 2
  fi

  # Count errors for downstream awareness
  ERROR_COUNT=$(find "$PIPELINE_DIR/results" -name "*.json" \
    ! -name "_summary.json" \
    -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | wc -l | tr -d ' ')

  # Mark cycle boundary
  touch "$PIPELINE_DIR/.last-cycle"

  echo "Runner cycle complete: $RESULT_COUNT results, $ERROR_COUNT errors." >&2
  exit 0

fi

# ─── FIXER completed ─────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "fixer"; then

  # Check that any error results have corresponding fix records
  UNFIXED=$(comm -23 \
    <(find "$PIPELINE_DIR/results" -name "*.json" \
        ! -name "_summary.json" \
        -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | sort -u) \
    <(cat "$PIPELINE_DIR/fixes/.processed" 2>/dev/null | sort -u) \
    | wc -l | tr -d ' ')

  if [ "$UNFIXED" -gt 0 ]; then
    # Check retry count — allow completion after 2 failed attempts per query
    RETRIES=$(find "$PIPELINE_DIR/fixes" -name "*-retry-*" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$RETRIES" -lt "$((UNFIXED * 2))" ]; then
      echo "$UNFIXED errors still unfixed (retries: $RETRIES). Continue fixing or document why they can't be fixed." >&2
      exit 2
    fi
  fi

  # Verify latest PR actually exists on GitHub
  LATEST_FIX=$(ls -t "$PIPELINE_DIR/fixes"/*.json 2>/dev/null | head -1)
  if [ -n "$LATEST_FIX" ]; then
    PR_URL=$(jq -r '.pr_url // empty' "$LATEST_FIX")
    if [ -n "$PR_URL" ]; then
      PR_STATE=$(gh pr view "$PR_URL" --json state -q '.state' 2>/dev/null || echo "UNKNOWN")
      if [ "$PR_STATE" = "UNKNOWN" ]; then
        echo "Could not verify PR $PR_URL exists. Retry creating it." >&2
        exit 2
      fi
    fi
  fi

  exit 0

fi

# ─── REVIEWER completed ──────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "reviewer"; then

  # Check for unreviewed fixes
  UNREVIEWED=$(comm -23 \
    <(find "$PIPELINE_DIR/fixes" -name "*.json" -exec jq -r '.pr_url // empty' {} + 2>/dev/null | grep -v '^$' | sort -u) \
    <(cat "$PIPELINE_DIR/reviews/.processed" 2>/dev/null | sort -u) \
    | wc -l | tr -d ' ')

  if [ "$UNREVIEWED" -gt 0 ]; then
    echo "$UNREVIEWED PRs still need review. Continue reviewing." >&2
    exit 2
  fi

  exit 0

fi

# ─── Unknown teammate — allow ────────────────────────────────
exit 0
