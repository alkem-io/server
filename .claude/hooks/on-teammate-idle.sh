#!/bin/bash
# Fires when a GQL pipeline teammate goes idle.
# Exit 2 sends feedback and keeps the teammate working.
# Exit 0 allows idle.
set -uo pipefail

INPUT=$(cat)
TEAMMATE=$(echo "$INPUT" | jq -r '.teammate_name // "unknown"')
PIPELINE_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/pipeline"

# ─── RUNNER idle ──────────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "runner"; then

  # Cooldown: avoid spinning. Require 3 min between cycles.
  LAST_RUN=$(stat -c %Y "$PIPELINE_DIR/.last-cycle" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_RUN))

  if [ "$ELAPSED" -lt 180 ]; then
    # Allow idle — it's just cooling down
    exit 0
  fi

  # If cooldown passed, there's work to do
  echo "Cooldown complete. Start a new validation cycle." >&2
  exit 2

fi

# ─── FIXER idle ───────────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "fixer"; then

  UNFIXED=$(comm -23 \
    <(find "$PIPELINE_DIR/results" -name "*.json" \
        ! -name "_summary.json" \
        -exec jq -r 'select(.status=="error") | .query_name' {} + 2>/dev/null | sort -u) \
    <(cat "$PIPELINE_DIR/fixes/.processed" 2>/dev/null | sort -u) \
    | wc -l | tr -d ' ')

  if [ "$UNFIXED" -gt 0 ]; then
    echo "$UNFIXED errors need fixing. Check .claude/pipeline/results/ for error files." >&2
    exit 2
  fi

  # Nothing to fix
  exit 0

fi

# ─── REVIEWER idle ────────────────────────────────────────────
if echo "$TEAMMATE" | grep -qi "reviewer"; then

  UNREVIEWED=$(comm -23 \
    <(find "$PIPELINE_DIR/fixes" -name "*.json" -exec jq -r '.pr_url // empty' {} + 2>/dev/null | grep -v '^$' | sort -u) \
    <(cat "$PIPELINE_DIR/reviews/.processed" 2>/dev/null | sort -u) \
    | wc -l | tr -d ' ')

  if [ "$UNREVIEWED" -gt 0 ]; then
    echo "$UNREVIEWED PRs pending review. Check .claude/pipeline/fixes/ for PR summaries." >&2
    exit 2
  fi

  exit 0

fi

exit 0
