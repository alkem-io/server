#!/bin/bash
# Sync the test-suites and client-web repos to latest develop.
# Sources pipeline .env for TEST_SUITES_DIR and CLIENT_WEB_DIR.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source config
# shellcheck disable=SC1091
source "$REPO_ROOT/.claude/pipeline/.env"

sync_repo() {
  local name="$1"
  local dir="$2"
  local graphql_dir="$3"

  if [[ ! -d "$dir/.git" ]]; then
    echo "ERROR: $dir is not a git repository"
    exit 1
  fi

  echo "Syncing $name repo..."
  git -C "$dir" pull --ff-only origin develop 2>&1 || {
    echo "WARN: ff-only pull failed for $name, trying fetch"
    git -C "$dir" fetch origin develop
    echo "Fetched latest develop. Local branch may be behind."
  }

  # Report file counts
  local total
  total=$(find "$graphql_dir" -name '*.graphql' 2>/dev/null | wc -l)
  echo "$name sync complete: $total .graphql files"
}

sync_repo "test-suites" "$TEST_SUITES_DIR" "$TEST_SUITES_GRAPHQL_DIR"
echo ""
sync_repo "client-web" "$CLIENT_WEB_DIR" "$CLIENT_WEB_GRAPHQL_DIR"
