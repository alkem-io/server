#!/usr/bin/env bash
set -euo pipefail

# Register and verify a new user via Kratos + MailSlurper, then create Alkemio profile
#
# Usage: ./register-user.sh <email> <password> [firstName] [lastName]

EMAIL="${1:?Usage: $0 <email> <password> [firstName] [lastName]}"
PASSWORD="${2:?Usage: $0 <email> <password> [firstName] [lastName]}"
FIRST_NAME="${3:-Test}"
LAST_NAME="${4:-User}"

KRATOS_PUBLIC="http://localhost:3000/ory/kratos/public"
MAILSLURPER_API="http://localhost:4437"
GRAPHQL_NI="http://localhost:3000/api/private/non-interactive/graphql"

fail() { echo "ERROR: $1" >&2; exit 1; }

# Step 1 — Health check
curl -sf "$KRATOS_PUBLIC/health/alive" >/dev/null 2>&1 \
  || fail "Kratos not reachable. Run: pnpm run start:services"

# Step 2+3 — Register
FLOW_ID=$(curl -s -X GET "$KRATOS_PUBLIC/self-service/registration/api" | jq -r '.id')
[ "$FLOW_ID" != "null" ] && [ -n "$FLOW_ID" ] || fail "Could not create registration flow"

REG_RESPONSE=$(curl -s -X POST "$KRATOS_PUBLIC/self-service/registration?flow=$FLOW_ID" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "$(jq -n \
    --arg pw "$PASSWORD" \
    --arg email "$EMAIL" \
    --arg first "$FIRST_NAME" \
    --arg last "$LAST_NAME" \
    '{method:"password", password:$pw, traits:{email:$email, name:{first:$first, last:$last}, accepted_terms:true}}')")

IDENTITY_ID=$(echo "$REG_RESPONSE" | jq -r '.identity.id // empty')
ALREADY_EXISTS=false

if [ -z "$IDENTITY_ID" ]; then
  # Check if identity already exists
  ERR_MSG=$(echo "$REG_RESPONSE" | jq -r '.ui.messages[]?.text // empty' 2>/dev/null)
  if echo "$ERR_MSG" | grep -qi "exists"; then
    ALREADY_EXISTS=true
    echo "Identity already exists, attempting login..."
  else
    fail "Registration failed: $(echo "$REG_RESPONSE" | jq -c '.ui.messages // .error // .')"
  fi
fi

# Step 4+5 — Verify email (skip if already exists and can login)
if [ "$ALREADY_EXISTS" = false ]; then
  echo "Waiting for verification email..."
  sleep 3

  EMAIL_BODY=""
  for i in 1 2 3; do
    EMAIL_BODY=$(curl -s "$MAILSLURPER_API/mail" \
      | jq -r --arg email "$EMAIL" \
        '[.mailItems[] | select(.toAddresses[] | contains($email))] | sort_by(.dateSent) | last | .body // empty')
    [ -n "$EMAIL_BODY" ] && break
    echo "  Retry $i..."
    sleep 3
  done
  [ -n "$EMAIL_BODY" ] || fail "No verification email found for $EMAIL"

  CODE=$(echo "$EMAIL_BODY" | grep -oP 'code=\K[0-9]+' | head -1)
  VFLOW=$(echo "$EMAIL_BODY" | grep -oP 'flow=\K[a-f0-9-]+' | head -1)
  [ -n "$CODE" ] && [ -n "$VFLOW" ] || fail "Could not extract verification code/flow from email"

  VERIFY_RESULT=$(curl -s -X POST "$KRATOS_PUBLIC/self-service/verification?flow=$VFLOW" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -d "$(jq -n --arg code "$CODE" '{method:"code", code:$code}')")

  VERIFY_STATE=$(echo "$VERIFY_RESULT" | jq -r '.state // empty')
  [ "$VERIFY_STATE" = "passed_challenge" ] || fail "Verification failed: $(echo "$VERIFY_RESULT" | jq -c '.')"
  echo "Email verified."
fi

# Step 6 — Login
LOGIN_FLOW=$(curl -s -X GET "$KRATOS_PUBLIC/self-service/login/api" | jq -r '.id')
[ "$LOGIN_FLOW" != "null" ] && [ -n "$LOGIN_FLOW" ] || fail "Could not create login flow"

LOGIN_RESPONSE=$(curl -s -X POST "$KRATOS_PUBLIC/self-service/login?flow=$LOGIN_FLOW" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -d "$(jq -n \
    --arg id "$EMAIL" \
    --arg pw "$PASSWORD" \
    '{method:"password", identifier:$id, password:$pw}')")

SESSION_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.session_token // empty')
[ -n "$SESSION_TOKEN" ] || fail "Login failed: $(echo "$LOGIN_RESPONSE" | jq -c '.ui.messages // .error // .')"

# Backfill identity ID if we skipped registration
if [ -z "$IDENTITY_ID" ]; then
  IDENTITY_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.session.identity.id // empty')
fi

# Step 7 — Create Alkemio user profile
GQL_RESPONSE=$(curl -s -X POST "$GRAPHQL_NI" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{"query":"mutation { createUserNewRegistration { id nameID profile { displayName } } }"}')

ALKEMIO_ID=$(echo "$GQL_RESPONSE" | jq -r '.data.createUserNewRegistration.id // empty')
ALKEMIO_NAMEID=$(echo "$GQL_RESPONSE" | jq -r '.data.createUserNewRegistration.nameID // empty')
ALKEMIO_DISPLAY=$(echo "$GQL_RESPONSE" | jq -r '.data.createUserNewRegistration.profile.displayName // empty')

if [ -z "$ALKEMIO_ID" ]; then
  GQL_ERROR=$(echo "$GQL_RESPONSE" | jq -c '.errors // .')
  fail "GraphQL mutation failed: $GQL_ERROR"
fi

# Step 8 — Summary
cat <<EOF

Registration & Verification Complete
  Email:      $EMAIL
  Name:       $FIRST_NAME $LAST_NAME
  Kratos ID:  $IDENTITY_ID
  Alkemio User:
    ID:       $ALKEMIO_ID
    NameID:   $ALKEMIO_NAMEID
    Display:  $ALKEMIO_DISPLAY
EOF
