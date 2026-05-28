#!/bin/bash
# Browser-flow login against Ory Kratos. Persists the `ory_kratos_session`
# cookie to a jar that subsequent gql-request-interactive.sh calls reuse.
#
# Use this when the GQL flow you want to exercise needs full user
# identity downstream — e.g., the WOPI editor URL, anything hitting
# `@CurrentActor` privilege checks, or any route that goes through
# Oathkeeper's session→JWT exchange.
#
# For pure service-to-service ops where actor identity doesn't matter,
# stick with non-interactive-login.sh + gql-request.sh.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
PIPELINE_DIR="$PROJECT_DIR/.claude/pipeline"
COOKIE_JAR="$PIPELINE_DIR/.cookie-jar"

ENV_FILE="$PIPELINE_DIR/.env"
[ -f "$ENV_FILE" ] || { echo "ERROR: .env file not found at $ENV_FILE" >&2; exit 1; }
source "$ENV_FILE"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/kratos.sh"

MISSING_VARS=()
[ -z "${PIPELINE_USER:-}" ] && MISSING_VARS+=("PIPELINE_USER")
[ -z "${PIPELINE_PASSWORD:-}" ] && MISSING_VARS+=("PIPELINE_PASSWORD")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  fail "Required variables not set: ${MISSING_VARS[*]}. Add them to $ENV_FILE"
fi

mkdir -p "$PIPELINE_DIR"

echo "Authenticating with Kratos (browser flow)..." >&2

# Set restrictive umask while curl creates the cookie jar — otherwise
# the file lands at the process umask (often 0644) for the brief window
# before the chmod below, exposing the session cookie to other users on
# the box. The chmod stays as a defense-in-depth.
saved_umask=$(umask)
umask 077
kratos_login_browser "$PIPELINE_USER" "$PIPELINE_PASSWORD" "$COOKIE_JAR"
umask "$saved_umask"

echo "Authenticated as identity: $IDENTITY_ID" >&2

chmod 600 "$COOKIE_JAR"

echo "Cookie jar stored at $COOKIE_JAR" >&2
