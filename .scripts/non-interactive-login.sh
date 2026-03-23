#!/bin/bash
# Authenticates against Ory Kratos using the native/API login flow
# and stores the session token for the GQL pipeline.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
PIPELINE_DIR="$PROJECT_DIR/.claude/pipeline"
TOKEN_FILE="$PIPELINE_DIR/.session-token"

# Load config from the pipeline directory
ENV_FILE="$PIPELINE_DIR/.env"
[ -f "$ENV_FILE" ] || { echo "ERROR: .env file not found at $ENV_FILE" >&2; exit 1; }
source "$ENV_FILE"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/kratos.sh"

# Validate required env vars
MISSING_VARS=()
[ -z "${PIPELINE_USER:-}" ] && MISSING_VARS+=("PIPELINE_USER")
[ -z "${PIPELINE_PASSWORD:-}" ] && MISSING_VARS+=("PIPELINE_PASSWORD")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  fail "Required variables not set: ${MISSING_VARS[*]}. Add them to $ENV_FILE"
fi

# ─── Login & verify ──────────────────────────────────────────
echo "Authenticating with Kratos..." >&2

kratos_login "$PIPELINE_USER" "$PIPELINE_PASSWORD"
kratos_verify_session

echo "Authenticated as identity: $IDENTITY_ID" >&2

# ─── Store token ──────────────────────────────────────────────
echo "$SESSION_TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

echo "Session token stored at $TOKEN_FILE" >&2
