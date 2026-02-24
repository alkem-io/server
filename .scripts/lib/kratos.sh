#!/usr/bin/env bash
# Shared Kratos helpers for authentication scripts.
# Source this file; do NOT execute it directly.
#
# Requires: curl, jq
# Provides: fail, kratos_health_check, kratos_login, kratos_verify_session
# Expects:  KRATOS_PUBLIC_URL (defaults to http://localhost:3000/ory/kratos/public)

KRATOS_PUBLIC_URL="${KRATOS_PUBLIC_URL:-http://localhost:3000/ory/kratos/public}"

fail() { echo "ERROR: $1" >&2; exit 1; }

# Check that Kratos is reachable.
kratos_health_check() {
  curl -sf "$KRATOS_PUBLIC_URL/health/alive" >/dev/null 2>&1 \
    || fail "Kratos not reachable at $KRATOS_PUBLIC_URL. Run: pnpm run start:services"
}

# Log in to Kratos and set SESSION_TOKEN + IDENTITY_ID.
# Usage: kratos_login <email> <password>
kratos_login() {
  local email="$1" password="$2"

  local flow_response flow_id login_response

  flow_response=$(curl -s -X GET \
    -H "Accept: application/json" \
    "$KRATOS_PUBLIC_URL/self-service/login/api")

  flow_id=$(echo "$flow_response" | jq -r '.id')
  [ "$flow_id" != "null" ] && [ -n "$flow_id" ] \
    || fail "Could not create login flow"

  login_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$(jq -n \
      --arg id "$email" \
      --arg pw "$password" \
      '{method:"password", identifier:$id, password:$pw}')" \
    "$KRATOS_PUBLIC_URL/self-service/login?flow=$flow_id")

  SESSION_TOKEN=$(echo "$login_response" | jq -r '.session_token // empty')
  [ -n "$SESSION_TOKEN" ] \
    || fail "Login failed: $(echo "$login_response" | jq -c '.ui.messages // .error // .')"

  IDENTITY_ID=$(echo "$login_response" | jq -r '.session.identity.id // empty')
}

# Verify that SESSION_TOKEN is valid via the whoami endpoint.
kratos_verify_session() {
  [ -n "${SESSION_TOKEN:-}" ] || fail "SESSION_TOKEN is not set"

  local whoami
  whoami=$(curl -sf \
    -H "Accept: application/json" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    "$KRATOS_PUBLIC_URL/sessions/whoami" 2>/dev/null || echo "")

  if [ -z "$whoami" ] || echo "$whoami" | jq -e '.error' >/dev/null 2>&1; then
    fail "Session token verification failed"
  fi
}
