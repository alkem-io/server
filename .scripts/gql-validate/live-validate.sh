#!/usr/bin/env bash
# Live GQL Validation — executes GraphQL queries against a running server.
#
# Usage: bash .scripts/gql-validate/live-validate.sh [test-suites|client-web|both]
#
# Prerequisites:
#   1. Server running at the configured endpoint
#   2. Auth token via: bash .scripts/non-interactive-login.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PIPELINE_DIR="$PROJECT_DIR/.claude/pipeline"
TOKEN_FILE="$PIPELINE_DIR/.session-token"
ENV_FILE="$PIPELINE_DIR/.env"
RESULTS_DIR="$PIPELINE_DIR/live-results"

source "$PROJECT_DIR/.scripts/lib/kratos.sh"

# ─── Argument parsing ────────────────────────────────────────────────────────
MODE="${1:-both}"
if [[ "$MODE" != "test-suites" && "$MODE" != "client-web" && "$MODE" != "both" ]]; then
  echo "Usage: $0 [test-suites|client-web|both]" >&2
  exit 1
fi

# ─── Load config ─────────────────────────────────────────────────────────────
[ -f "$ENV_FILE" ] || { echo "ERROR: .env not found at $ENV_FILE" >&2; exit 1; }
source "$ENV_FILE"

GQL_ENDPOINT="${GRAPHQL_NON_INTERACTIVE_ENDPOINT:-http://localhost:3000/api/private/non-interactive/graphql}"

# ─── Verify server is reachable ──────────────────────────────────────────────
echo "Checking server at $GQL_ENDPOINT..."
if ! curl -sf "$GQL_ENDPOINT" -X POST \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}' >/dev/null 2>&1; then
  echo "ERROR: Server not reachable at $GQL_ENDPOINT" >&2
  echo "Start it with: pnpm start:dev" >&2
  exit 1
fi
echo "Server is reachable."

# ─── Auth: check token, re-login if needed ───────────────────────────────────
ensure_auth() {
  if [ -f "$TOKEN_FILE" ]; then
    SESSION_TOKEN=$(cat "$TOKEN_FILE")
    export SESSION_TOKEN

    # Verify the token is still valid
    if kratos_verify_session 2>/dev/null; then
      echo "Existing session token is valid."
      return 0
    fi
    echo "Session token expired, re-authenticating..."
  else
    echo "No session token found, authenticating..."
  fi

  # Re-login
  [ -z "${PIPELINE_USER:-}" ] && { echo "ERROR: PIPELINE_USER not set in $ENV_FILE" >&2; exit 1; }
  [ -z "${PIPELINE_PASSWORD:-}" ] && { echo "ERROR: PIPELINE_PASSWORD not set in $ENV_FILE" >&2; exit 1; }

  kratos_login "$PIPELINE_USER" "$PIPELINE_PASSWORD"
  kratos_verify_session

  echo "$SESSION_TOKEN" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
  echo "Authenticated as identity: $IDENTITY_ID"
}

ensure_auth

# ─── Create result directories ───────────────────────────────────────────────
mkdir -p "$RESULTS_DIR/test-suites" "$RESULTS_DIR/client-web"

# ─── Run live-runner for each source ─────────────────────────────────────────
RUNNER="$SCRIPT_DIR/live-runner.mjs"
EXIT_CODE=0

run_source() {
  local src="$1"
  echo ""
  echo "================================================================"
  echo " Running live validation: $src"
  echo "================================================================"

  if node "$RUNNER" --source "$src" --env-file "$ENV_FILE"; then
    echo "  $src: PASSED"
  else
    local code=$?
    if [ $code -eq 2 ]; then
      echo "  $src: COMPLETED WITH ERRORS (see results)"
      EXIT_CODE=2
    else
      echo "  $src: FAILED (exit code $code)"
      EXIT_CODE=1
    fi
  fi
}

if [[ "$MODE" == "test-suites" || "$MODE" == "both" ]]; then
  run_source "test-suites"
fi

if [[ "$MODE" == "client-web" || "$MODE" == "both" ]]; then
  run_source "client-web"
fi

# ─── Final report ────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
echo " Live Validation Complete"
echo "================================================================"

SUMMARY="$RESULTS_DIR/_summary.json"
if [ -f "$SUMMARY" ]; then
  echo ""
  echo "Summary ($SUMMARY):"
  if command -v jq &>/dev/null; then
    jq -r '
      .sources | to_entries[] | "  \(.key): \(.value.executed)/\(.value.total) executed (\(.value.success) ok, \(.value.error) err, \(.value.skipped_mutation + .value.skipped_subscription + .value.skipped_complex_vars) skipped)"
    ' "$SUMMARY" 2>/dev/null || cat "$SUMMARY"
    echo ""
    jq -r '.aggregate | "  Aggregate: \(.executed)/\(.total) executed (\(.success) ok, \(.error) err, \(.skipped) skipped)"' "$SUMMARY" 2>/dev/null || true
  else
    cat "$SUMMARY"
  fi
fi

exit $EXIT_CODE
