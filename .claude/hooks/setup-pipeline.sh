#!/usr/bin/env bash
# Ensures pipeline directory structure exists.
# Called by hooks or manually before pipeline runs.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PIPELINE_DIR="$PROJECT_DIR/.claude/pipeline"

DIRS=(
  "$PIPELINE_DIR/results"
  "$PIPELINE_DIR/fixes"
  "$PIPELINE_DIR/reviews"
  "$PIPELINE_DIR/signals"
  "$PIPELINE_DIR/live-results/test-suites/phase-1"
  "$PIPELINE_DIR/live-results/test-suites/phase-2"
  "$PIPELINE_DIR/live-results/test-suites/skipped"
  "$PIPELINE_DIR/live-results/client-web/phase-1"
  "$PIPELINE_DIR/live-results/client-web/phase-2"
  "$PIPELINE_DIR/live-results/client-web/skipped"
)

for dir in "${DIRS[@]}"; do
  mkdir -p "$dir"
done

echo "Pipeline directories ready at $PIPELINE_DIR" >&2
