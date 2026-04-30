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

# Log in to Kratos using the browser self-service flow and persist the
# resulting `ory_kratos_session` cookie into the supplied cookie jar.
# Usage: kratos_login_browser <email> <password> <cookie_jar_path>
#
# Why a separate flow: the API flow (kratos_login above) returns a
# `session_token` usable as a Bearer header, but Oathkeeper's
# `/api/private/graphql` rule only authenticates via `cookie_session`.
# Cookie auth gives full Oathkeeper session→JWT exchange — needed for
# anything user-bound (WOPI editor URL, audit-logged actions, etc.).
kratos_login_browser() {
  local email="$1" password="$2" cookie_jar="$3"

  rm -f "$cookie_jar"

  # Step 1: initialize the browser flow. Kratos sets a CSRF cookie and
  # returns the flow descriptor when we Accept JSON.
  local flow_response flow_id action_url csrf_token
  flow_response=$(curl -s -L -b "$cookie_jar" -c "$cookie_jar" \
    -H "Accept: application/json" \
    "$KRATOS_PUBLIC_URL/self-service/login/browser")

  flow_id=$(echo "$flow_response" | jq -r '.id // empty')
  action_url=$(echo "$flow_response" | jq -r '.ui.action // empty')
  csrf_token=$(echo "$flow_response" \
    | jq -r '.ui.nodes[] | select(.attributes.name=="csrf_token") | .attributes.value' \
    | head -n1)

  [ -n "$flow_id" ] && [ -n "$action_url" ] && [ -n "$csrf_token" ] \
    || fail "Could not initialize browser login flow"

  # Step 2: submit credentials + CSRF token. Kratos sets the
  # `ory_kratos_session` cookie on the response.
  local login_response
  login_response=$(curl -s -L -b "$cookie_jar" -c "$cookie_jar" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "$(jq -n \
      --arg id "$email" \
      --arg pw "$password" \
      --arg csrf "$csrf_token" \
      '{method:"password", identifier:$id, password:$pw, csrf_token:$csrf}')" \
    "$action_url")

  IDENTITY_ID=$(echo "$login_response" | jq -r '.session.identity.id // empty')
  [ -n "$IDENTITY_ID" ] \
    || fail "Login failed: $(echo "$login_response" | jq -c '.ui.messages // .error // .')"

  # Sanity check: the cookie must actually be in the jar now.
  grep -q 'ory_kratos_session' "$cookie_jar" \
    || fail "Login succeeded but cookie not persisted to $cookie_jar"
}
