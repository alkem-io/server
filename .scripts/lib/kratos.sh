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

  # Curl flags applied to both browser-flow steps:
  #   -sS               : silent except for errors (won't print progress, will print errors)
  #   --connect-timeout : 5s — fail fast if Kratos isn't listening
  #   --max-time        : 10s — bound the whole request including redirects
  # Notably we don't pass --fail/-f or --fail-with-body: 200/400 from
  # Kratos's self-service flow both carry a JSON body we want to read
  # (the 400 path includes ui.messages, which is how we surface auth
  # failures). We check for empty/expected fields below instead.
  local curl_args=(-sS --connect-timeout 5 --max-time 10)

  # Step 1: initialize the browser flow. Kratos sets a CSRF cookie and
  # returns the flow descriptor when we Accept JSON.
  local flow_response flow_id action_url csrf_token
  flow_response=$(curl "${curl_args[@]}" -L -b "$cookie_jar" -c "$cookie_jar" \
    -H "Accept: application/json" \
    "$KRATOS_PUBLIC_URL/self-service/login/browser") \
    || fail "Could not reach Kratos at $KRATOS_PUBLIC_URL"

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
  login_response=$(curl "${curl_args[@]}" -L -b "$cookie_jar" -c "$cookie_jar" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "$(jq -n \
      --arg id "$email" \
      --arg pw "$password" \
      --arg csrf "$csrf_token" \
      '{method:"password", identifier:$id, password:$pw, csrf_token:$csrf}')" \
    "$action_url") \
    || fail "Login request to Kratos failed"

  IDENTITY_ID=$(echo "$login_response" | jq -r '.session.identity.id // empty')
  [ -n "$IDENTITY_ID" ] \
    || fail "Login failed: $(echo "$login_response" | jq -c '.ui.messages // .error // .')"

  # Sanity check: the cookie must actually be in the jar now.
  grep -q 'ory_kratos_session' "$cookie_jar" \
    || fail "Login succeeded but cookie not persisted to $cookie_jar"
}

# Minimal URL-encoder for query params (RFC 3986 unreserved kept as-is).
_urlenc() {
  local s="$1" out="" c i
  for (( i=0; i<${#s}; i++ )); do
    c=${s:$i:1}
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      *) out+=$(printf '%%%02X' "'$c") ;;
    esac
  done
  printf '%s' "$out"
}

# base64url without padding, from stdin bytes.
_b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# ─── OIDC: Kratos session → Hydra-issued JWT (post-Oathkeeper) ────────────
#
# Since the Oathkeeper retirement (OIDC rework), the server's GraphQL
# endpoints no longer accept a raw Kratos `session_token` as a Bearer — they
# validate a Hydra-issued JWT (JWS) signed against the platform JWKS, with an
# `aud` in BEARER_AUD_ALLOW_LIST. There is no transparent session→JWT edge at
# the gateway anymore; a client must run the OAuth2 Authorization Code + PKCE
# flow itself. This helper does exactly that, reusing the browser login above
# (the oidc-service login handler reads the `ory_kratos_session` cookie to
# resolve the actor, so the cookie jar — not the API session_token — is what
# carries identity through the flow). The resulting JWT carries the actor
# identity (`alkemio_actor_id`) and is accepted on BOTH the interactive and
# non-interactive GraphQL endpoints.
#
# Endpoints/params default to the local `alkemio-web` public client and match
# server `alkemio.yml` (web_client_id, bearer_aud_allow_list). Override via env
# for other environments.
OIDC_AUTH_ENDPOINT="${OIDC_AUTH_ENDPOINT:-http://localhost:3000/oauth2/auth}"
OIDC_TOKEN_ENDPOINT="${OIDC_TOKEN_ENDPOINT:-http://localhost:3000/oauth2/token}"
OIDC_CLIENT_ID="${OIDC_CLIENT_ID:-alkemio-web}"
OIDC_REDIRECT_URI="${OIDC_REDIRECT_URI:-http://localhost:3000/api/auth/oidc/callback}"
OIDC_AUDIENCE="${OIDC_AUDIENCE:-alkemio-web}"
OIDC_SCOPE="${OIDC_SCOPE:-openid profile email offline_access alkemio}"
OIDC_BASE_URL="${OIDC_BASE_URL:-http://localhost:3000}"

# Log in and exchange for a Hydra JWT. Sets ACCESS_TOKEN (+ IDENTITY_ID).
# Usage: oidc_login_jwt <email> <password> <cookie_jar_path>
oidc_login_jwt() {
  local email="$1" password="$2" cookie_jar="$3"

  # 1. Establish a Kratos browser session (populates the cookie jar).
  kratos_login_browser "$email" "$password" "$cookie_jar"

  # 2. PKCE pair (S256). verifier: 43 url-safe chars from 32 random bytes.
  #    state/nonce are generated INDEPENDENTLY of the verifier — the verifier
  #    is a back-channel secret and must never appear in front-channel params
  #    (deriving state/nonce from it would leak it in the authorize URL and
  #    redirect, defeating PKCE). state is validated against the callback below.
  local verifier challenge state nonce
  verifier=$(openssl rand 32 | _b64url)
  challenge=$(printf '%s' "$verifier" | openssl dgst -binary -sha256 | _b64url)
  state=$(openssl rand 16 | _b64url)
  nonce=$(openssl rand 16 | _b64url)

  # 3. Drive the authorize endpoint, following redirects through the
  #    oidc-service login/consent hops until the callback redirect carries
  #    the authorization code. We deliberately do NOT follow into the
  #    callback itself — we intercept its `code` from the Location header.
  local url code returned_state loc headers hop
  url="${OIDC_AUTH_ENDPOINT}?client_id=$(_urlenc "$OIDC_CLIENT_ID")&redirect_uri=$(_urlenc "$OIDC_REDIRECT_URI")&response_type=code&scope=$(_urlenc "$OIDC_SCOPE")&audience=$(_urlenc "$OIDC_AUDIENCE")&state=$(_urlenc "$state")&nonce=$(_urlenc "$nonce")&code_challenge=$challenge&code_challenge_method=S256"

  for hop in $(seq 1 15); do
    headers=$(curl -sS --connect-timeout 5 --max-time 10 -D - -o /dev/null \
      -b "$cookie_jar" -c "$cookie_jar" "$url") \
      || fail "OAuth2 authorize request failed"
    loc=$(printf '%s' "$headers" | awk 'tolower($1)=="location:"{print $2; exit}' | tr -d '\r')
    [ -n "$loc" ] || fail "OAuth2 flow stalled (no redirect at hop $hop)"
    case "$loc" in
      "$OIDC_REDIRECT_URI"*)
        code=$(printf '%s' "$loc" | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')
        returned_state=$(printf '%s' "$loc" | sed -n 's/.*[?&]state=\([^&]*\).*/\1/p')
        break ;;
      /*) url="${OIDC_BASE_URL}$loc" ;;
      *)  url="$loc" ;;
    esac
  done
  [ -n "${code:-}" ] || fail "Did not obtain an authorization code from the OIDC flow"
  # CSRF defense: the state echoed back must match what we sent.
  [ "${returned_state:-}" = "$state" ] || fail "OIDC state mismatch (possible CSRF) — aborting"

  # 4. Exchange the code for the access-token JWT (public client → PKCE, no secret).
  local token_response
  token_response=$(curl -sS --connect-timeout 5 --max-time 10 -X POST \
    -H "Accept: application/json" \
    --data-urlencode "grant_type=authorization_code" \
    --data-urlencode "code=$code" \
    --data-urlencode "redirect_uri=$OIDC_REDIRECT_URI" \
    --data-urlencode "client_id=$OIDC_CLIENT_ID" \
    --data-urlencode "code_verifier=$verifier" \
    "$OIDC_TOKEN_ENDPOINT") \
    || fail "Token exchange request failed"

  ACCESS_TOKEN=$(echo "$token_response" | jq -r '.access_token // empty')
  [ -n "$ACCESS_TOKEN" ] \
    || fail "Token exchange failed: $(echo "$token_response" | jq -c '.error_description // .error // .')"
}
