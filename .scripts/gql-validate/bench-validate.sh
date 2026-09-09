#!/usr/bin/env bash
# GQL Performance Benchmark — runs queries and compares against baseline.
#
# Usage: bash .scripts/gql-validate/bench-validate.sh [test-suites|client-web|both] [options]
#   --save-baseline              Save current run as baseline (no comparison)
#   --threshold-multiplier <n>   Regression multiplier (default: 2.0)
#   --threshold-absolute <n>     Regression absolute delta ms (default: 500)
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
BENCH_DIR="$PIPELINE_DIR/benchmarks"

source "$PROJECT_DIR/.scripts/lib/kratos.sh"
source "$PROJECT_DIR/.scripts/lib/graphql.sh"

# ─── Argument parsing ────────────────────────────────────────────────────────
MODE="${1:-both}"
if [[ "$MODE" != "test-suites" && "$MODE" != "client-web" && "$MODE" != "both" ]]; then
  echo "Usage: $0 [test-suites|client-web|both] [--save-baseline] [--threshold-multiplier N] [--threshold-absolute N]" >&2
  exit 1
fi
shift || true

# Collect remaining args to pass through to bench-runner
EXTRA_ARGS=("$@")

# ─── Load config ─────────────────────────────────────────────────────────────
[ -f "$ENV_FILE" ] || { echo "ERROR: .env not found at $ENV_FILE" >&2; exit 1; }
source "$ENV_FILE"

# GQL_ENDPOINT is also set (to the same default) by lib/graphql.sh above;
# recompute it here now that ENV_FILE is loaded so a .env override of
# GRAPHQL_NON_INTERACTIVE_ENDPOINT takes effect for gql_request too.
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
#
# Post-Oathkeeper, the GraphQL endpoints accept only a Hydra-issued JWT, not
# a raw Kratos session_token (see .scripts/non-interactive-login.sh). So a
# cached token is validated against the real consumer — this endpoint,
# via gql_request — rather than Kratos's own /sessions/whoami (which
# understands a Kratos session, not this JWT, and would reject it every
# time). A missing/invalid/expired token is re-minted with the same
# OAuth2 Authorization Code + PKCE → Hydra exchange non-interactive-login.sh
# uses (oidc_login_jwt), not the stale self-service kratos_login() flow.
ensure_auth() {
  if [ -f "$TOKEN_FILE" ]; then
    SESSION_TOKEN=$(cat "$TOKEN_FILE")
    export SESSION_TOKEN

    if gql_request 'query { me { user { id } } }' >/dev/null 2>&1; then
      echo "Existing session token is valid."
      return 0
    fi
    echo "Session token expired or invalid, re-authenticating..."
  else
    echo "No session token found, authenticating..."
  fi

  [ -z "${PIPELINE_USER:-}" ] && { echo "ERROR: PIPELINE_USER not set in $ENV_FILE" >&2; exit 1; }
  [ -z "${PIPELINE_PASSWORD:-}" ] && { echo "ERROR: PIPELINE_PASSWORD not set in $ENV_FILE" >&2; exit 1; }

  local cookie_jar="$PIPELINE_DIR/.kratos-cookies"
  oidc_login_jwt "$PIPELINE_USER" "$PIPELINE_PASSWORD" "$cookie_jar"
  rm -f "$cookie_jar"

  SESSION_TOKEN="$ACCESS_TOKEN"
  export SESSION_TOKEN
  echo "$SESSION_TOKEN" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
  echo "Authenticated as identity: $IDENTITY_ID"
}

ensure_auth

# ─── Create benchmark directory ──────────────────────────────────────────────
mkdir -p "$BENCH_DIR"

# ─── Run bench-runner ────────────────────────────────────────────────────────
RUNNER="$SCRIPT_DIR/bench-runner.mjs"
EXIT_CODE=0

echo ""
echo "================================================================"
echo " Running performance benchmark: $MODE"
echo "================================================================"

if node "$RUNNER" --source "$MODE" --env-file "$ENV_FILE" "${EXTRA_ARGS[@]}"; then
  echo "  Benchmark: PASSED"
else
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 2 ]; then
    echo "  Benchmark: REGRESSIONS DETECTED"
  else
    echo "  Benchmark: FAILED (exit code $EXIT_CODE)"
  fi
fi

# ─── Report summary ─────────────────────────────────────────────────────────
REPORT="$BENCH_DIR/report.json"
BASELINE="$BENCH_DIR/baseline.json"

if [ -f "$REPORT" ] && command -v jq &>/dev/null; then
  echo ""
  echo "================================================================"
  echo " Benchmark Report"
  echo "================================================================"
  jq -r '
    .summary |
    "  Total: \(.total) queries",
    "  OK: \(.ok)",
    "  Regressions: \(.regressions)",
    "  No baseline: \(.no_baseline)",
    "  Errors: \(.errors)",
    "  Thresholds: \(.threshold_multiplier)x multiplier, \(.threshold_absolute_ms)ms absolute"
  ' "$REPORT" 2>/dev/null || true

  # Show regressions if any
  REGRESSION_COUNT=$(jq '.regressions | length' "$REPORT" 2>/dev/null || echo 0)
  if [ "$REGRESSION_COUNT" -gt 0 ]; then
    echo ""
    echo "  Regressions:"
    jq -r '.regressions[] | "    \(.query_name) (\(.source)): \(.baseline_ms)ms -> \(.current_ms)ms [\(.reasons | join(", "))]"' "$REPORT" 2>/dev/null || true
  fi
elif [ -f "$BASELINE" ] && command -v jq &>/dev/null; then
  echo ""
  echo "================================================================"
  echo " Baseline Saved"
  echo "================================================================"
  jq -r '
    .aggregate_stats |
    "  Queries: \(.total_queries)",
    "  Avg: \(.avg_ms)ms, P50: \(.p50_ms)ms, P90: \(.p90_ms)ms, P95: \(.p95_ms)ms"
  ' "$BASELINE" 2>/dev/null || true
fi

exit $EXIT_CODE
