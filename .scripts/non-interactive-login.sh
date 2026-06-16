#!/bin/bash
# Authenticates the GQL pipeline service account and stores a Bearer token.
#
# Post-Oathkeeper (OIDC rework): the server's GraphQL endpoints reject a raw
# Kratos session_token (ERR_JWS_INVALID) and require a Hydra-issued JWT. This
# script runs the full OAuth2 Authorization Code + PKCE flow (Kratos browser
# login → oidc-service login/consent → Hydra token exchange) and stores the
# resulting access-token JWT. The token is actor-bound (carries
# `alkemio_actor_id`) and is accepted on both the interactive and
# non-interactive GraphQL endpoints. It expires (~1h); re-run to refresh.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
PIPELINE_DIR="$PROJECT_DIR/.claude/pipeline"
TOKEN_FILE="$PIPELINE_DIR/.session-token"
COOKIE_JAR="$PIPELINE_DIR/.kratos-cookies"

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

# ─── Login & exchange for a JWT ───────────────────────────────
echo "Authenticating (OAuth2 + PKCE → Hydra JWT)..." >&2

oidc_login_jwt "$PIPELINE_USER" "$PIPELINE_PASSWORD" "$COOKIE_JAR"

echo "Authenticated as identity: $IDENTITY_ID" >&2

# ─── Store token ──────────────────────────────────────────────
echo "$ACCESS_TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"
rm -f "$COOKIE_JAR"

echo "Bearer JWT stored at $TOKEN_FILE" >&2
