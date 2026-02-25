#!/bin/bash
# GQL Validation Pipeline entry point.
# Syncs test-suites + client-web, runs AST validation against schema.graphql.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "$(date '+%Y-%m-%d %H:%M:%S') — GQL validation cycle starting"

# Sync repos (test-suites + client-web)
bash "$SCRIPT_DIR/sync-repos.sh"
echo ""

# Run validator
node "$SCRIPT_DIR/validator.mjs"
EXIT_CODE=$?

# Update cycle timestamp
date -Iseconds > "$REPO_ROOT/.claude/pipeline/.last-cycle"

echo ""
echo "$(date '+%Y-%m-%d %H:%M:%S') — GQL validation cycle complete (exit=$EXIT_CODE)"
exit $EXIT_CODE
