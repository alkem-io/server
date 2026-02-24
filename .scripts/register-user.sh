#!/usr/bin/env bash
set -euo pipefail

# Register and verify a new user via Kratos + MailSlurper, then create Alkemio profile
#
# Usage: ./register-user.sh <email> [firstName] [lastName]
#
# The password MUST be provided via a file at /tmp/.register-password
# to avoid shell escaping issues with special characters (!, \, etc.)
# when invoked through tools that process command strings.
#
# Example:
#   echo -n 'my!password' > /tmp/.register-password
#   ./register-user.sh user@example.com John Doe

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/kratos.sh"
source "$SCRIPT_DIR/lib/graphql.sh"

EMAIL="${1:?Usage: $0 <email> [firstName] [lastName]}"
FIRST_NAME="${2:-Test}"
LAST_NAME="${3:-User}"

PASSWORD_FILE="/tmp/.register-password"
if [ ! -f "$PASSWORD_FILE" ]; then
  echo "ERROR: Password file not found at $PASSWORD_FILE" >&2
  echo "Write the password to that file before running this script." >&2
  exit 1
fi
PASSWORD=$(tr -d '\n' < "$PASSWORD_FILE")
rm -f "$PASSWORD_FILE"
[ -n "$PASSWORD" ] || fail "Password file is empty"

MAILSLURPER_API="http://localhost:4437"

# ─── Health check ─────────────────────────────────────────────
kratos_health_check

# ─── Register ─────────────────────────────────────────────────
FLOW_ID=$(curl -s -X GET "$KRATOS_PUBLIC_URL/self-service/registration/api" | jq -r '.id')
[ "$FLOW_ID" != "null" ] && [ -n "$FLOW_ID" ] || fail "Could not create registration flow"

REG_RESPONSE=$(curl -s -X POST "$KRATOS_PUBLIC_URL/self-service/registration?flow=$FLOW_ID" \
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
  ERR_MSG=$(echo "$REG_RESPONSE" | jq -r '.ui.messages[]?.text // empty' 2>/dev/null)
  if echo "$ERR_MSG" | grep -qi "exists"; then
    ALREADY_EXISTS=true
    echo "Identity already exists, attempting login..."
  else
    fail "Registration failed: $(echo "$REG_RESPONSE" | jq -c '.ui.messages // .error // .')"
  fi
fi

# ─── Verify email ─────────────────────────────────────────────
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

  VERIFY_RESULT=$(curl -s -X POST "$KRATOS_PUBLIC_URL/self-service/verification?flow=$VFLOW" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -d "$(jq -n --arg code "$CODE" '{method:"code", code:$code}')")

  VERIFY_STATE=$(echo "$VERIFY_RESULT" | jq -r '.state // empty')
  [ "$VERIFY_STATE" = "passed_challenge" ] || fail "Verification failed: $(echo "$VERIFY_RESULT" | jq -c '.')"
  echo "Email verified."
fi

# ─── Login ────────────────────────────────────────────────────
kratos_login "$EMAIL" "$PASSWORD"

# Backfill identity ID if we skipped registration
if [ -z "${IDENTITY_ID:-}" ]; then
  : # IDENTITY_ID already set by kratos_login
fi

# ─── Create Alkemio user profile ──────────────────────────────
GQL_RESPONSE=$(gql_request 'mutation { createUserNewRegistration { id nameID profile { displayName } } }') \
  || fail "GraphQL mutation failed"

ALKEMIO_ID=$(echo "$GQL_RESPONSE" | jq -r '.data.createUserNewRegistration.id // empty')
ALKEMIO_NAMEID=$(echo "$GQL_RESPONSE" | jq -r '.data.createUserNewRegistration.nameID // empty')
ALKEMIO_DISPLAY=$(echo "$GQL_RESPONSE" | jq -r '.data.createUserNewRegistration.profile.displayName // empty')

[ -n "$ALKEMIO_ID" ] || fail "GraphQL mutation returned no data: $(echo "$GQL_RESPONSE" | jq -c '.errors // .')"

# ─── Summary ──────────────────────────────────────────────────
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
