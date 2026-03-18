#!/bin/bash
# Prevents session stop while the GQL pipeline has work in flight.
# Exit 2 blocks session stop; exit 0 allows it.
set -uo pipefail

PIPELINE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/pipeline"

# If pipeline dirs don't exist, nothing to guard
if [ ! -d "$PIPELINE_DIR/results" ]; then
  exit 0
fi

ERRORS=$(find "$PIPELINE_DIR/results" -name "*.json" \
  ! -name "_summary.json" \
  -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | wc -l | tr -d ' ')

UNFIXED=$(comm -23 \
  <(find "$PIPELINE_DIR/results" -name "*.json" \
      ! -name "_summary.json" \
      -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | sort -u) \
  <(cat "$PIPELINE_DIR/fixes/.processed" 2>/dev/null | sort -u) \
  | wc -l | tr -d ' ')

UNREVIEWED=$(comm -23 \
  <(find "$PIPELINE_DIR/fixes" -name "*.json" -exec jq -r '.pr_url // empty' {} + 2>/dev/null | grep -v '^$' | sort -u) \
  <(cat "$PIPELINE_DIR/reviews/.processed" 2>/dev/null | sort -u) \
  | wc -l | tr -d ' ')

if [ "$UNFIXED" -gt 0 ] || [ "$UNREVIEWED" -gt 0 ]; then
  echo "Pipeline still active: $ERRORS total errors, $UNFIXED unfixed, $UNREVIEWED unreviewed PRs." >&2
  echo "Wait for all teammates to complete or manually stop with Ctrl+C." >&2
  exit 2
fi

exit 0
