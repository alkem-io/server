#!/usr/bin/env bash
set -euo pipefail

# Seed a LOCAL DEV stack with loggable accounts holding the platform roles
# introduced by 027-platform-role-redesign.
#
#   ./.scripts/dev-seed-roles.sh
#
# Why this exists
# ---------------
# An Alkemio login needs records in TWO systems: a Kratos identity (email +
# password) and an Alkemio `user` row carrying credentials. Bootstrap seeding
# (`users.json`) writes only the second, so a seeded account such as
# `notifications@alkem.io` can hold a role and still be unable to authenticate.
#
# On a FRESH database that leaves exactly one loggable account,
# `admin@alkem.io`. For all of Slice A it also carries legacy `global-admin`,
# so it can do everything it could before the feature — which is what keeps
# `test-suites` runnable (it acts as this user at 878 sites across 121 of 145
# spec files).
#
# What it CANNOT give you is a view of any single role in isolation, and that
# is the whole point of the decomposition. Each of the 13 roles is deliberately
# narrow — `platform-roles-admin` alone cannot reset authorization, cannot
# grant itself a role (rule `self-assignment`), and cannot grant the legacy
# `global-*` roles at all (the resolver pins that check to a hardcoded
# `[GLOBAL_ADMIN]` policy). You only ever see that by logging in as an account
# holding one role and nothing else.
#
# At Slice B, when `global-admin` is deleted, these accounts stop being a
# convenience and become the only way to administer the platform.
#
# It uses ONLY product APIs — Kratos self-service registration and
# `assignPlatformRoleToUser`. Nothing is written directly to the database, so a
# regression in the assignment rule engine makes this script FAIL rather than
# quietly bypassing it.
#
# DEV ONLY. This must never run against a shared or hosted environment: it
# creates accounts with a known password. The guard below refuses any endpoint
# that is not loopback. Do not add a flag to skip it.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SERVER_URL="${SERVER_URL:-http://localhost:3000}"
GQL_URL="$SERVER_URL/api/private/non-interactive/graphql"
LOGIN_URL="$SERVER_URL/api/auth/non-interactive-login"

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@alkem.io}"

fail() { echo "ERROR: $1" >&2; exit 1; }

# `AUTH_ADMIN_PASSWORD` lives in `.env` and is NOT exported into the shell —
# read it from the file exactly as reset-db.sh does, so this script works
# standalone. `AUTH_TEST_HARNESS_PASSWORD` (test-suites' name for the same
# secret) is accepted as an override for callers that already export it.
ADMIN_PASSWORD="${AUTH_TEST_HARNESS_PASSWORD:-}"
if [ -z "$ADMIN_PASSWORD" ] && [ -f "$PROJECT_ROOT/.env" ]; then
  ADMIN_PASSWORD=$(grep '^AUTH_ADMIN_PASSWORD=' "$PROJECT_ROOT/.env" | head -1 | cut -d= -f2- | tr -d '\r')
fi
[ -n "$ADMIN_PASSWORD" ] \
  || fail "No admin password: set AUTH_ADMIN_PASSWORD in .env, or export AUTH_TEST_HARNESS_PASSWORD."
SEED_PASSWORD="${DEV_SEED_PASSWORD:-$ADMIN_PASSWORD}"

# ─── Dev-only guard ───────────────────────────────────────────
# Loopback only. A hostname that merely *looks* local is not enough — resolve
# it and require every address to be a loopback address.
guard_local_only() {
  local host
  host=$(printf '%s' "$SERVER_URL" | sed -E 's#^[a-z]+://##; s#[:/].*$##')

  case "$host" in
    localhost | 127.0.0.1 | ::1) ;;
    *)
      local addrs
      addrs=$(getent ahostsv4 "$host" 2>/dev/null | awk '{print $1}' | sort -u || true)
      [ -n "$addrs" ] || fail "Refusing to run: cannot resolve '$host' to verify it is local."
      while read -r addr; do
        case "$addr" in
          127.*) ;;
          *) fail "Refusing to run: '$host' resolves to $addr, which is not loopback. This script creates accounts with a known password and is for local development only." ;;
        esac
      done <<<"$addrs"
      ;;
  esac

  [ "${NODE_ENV:-development}" != "production" ] \
    || fail "Refusing to run with NODE_ENV=production."
}

# ─── Accounts to create ───────────────────────────────────────
# email|first|last|ROLE_ENUM
# `platform-roles-admin` is deliberately NOT re-issued here: admin@alkem.io
# already holds it from bootstrap seeding.
ACCOUNTS=(
  "ops@alkem.io|Ops|Admin|PLATFORM_OPERATIONS_ADMIN"
  "users-admin@alkem.io|Users|Admin|PLATFORM_USERS_ADMIN"
  "support@alkem.io|Support|Admin|PLATFORM_SUPPORT"
  "content@alkem.io|Content|Admin|PLATFORM_CONTENT_FULL_ACCESS"
)

# ─── Helpers ──────────────────────────────────────────────────
login() {
  local email="$1" password="$2" body
  body=$(jq -n --arg e "$email" --arg p "$password" '{email:$e, password:$p}')
  curl -s -X POST "$LOGIN_URL" -H 'Content-Type: application/json' -d "$body" \
    | jq -r '.api_token // empty'
}

gql() {
  local token="$1" query="$2"
  curl -s -X POST "$GQL_URL" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $token" \
    -d "$(jq -n --arg q "$query" '{query:$q}')"
}

# ─── Run ──────────────────────────────────────────────────────
guard_local_only
command -v jq >/dev/null || fail "jq is required."

echo "Seeding dev role accounts against $SERVER_URL"
echo

ADMIN_TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
[ -n "$ADMIN_TOKEN" ] || fail "Could not log in as $ADMIN_EMAIL. Is the server up and the DB bootstrapped?"

failures=0

for entry in "${ACCOUNTS[@]}"; do
  IFS='|' read -r email first last role <<<"$entry"
  echo "── $email ($role)"

  # 1. Kratos identity + Alkemio user. Idempotent: register-user.sh detects an
  #    existing identity and logs in instead.
  printf '%s' "$SEED_PASSWORD" >/tmp/.register-password
  if ! "$SCRIPT_DIR/register-user.sh" "$email" "$first" "$last" >/tmp/.dev-seed-register.log 2>&1; then
    echo "   registration FAILED — see /tmp/.dev-seed-register.log"
    failures=$((failures + 1))
    continue
  fi
  rm -f /tmp/.register-password
  echo "   registered"

  # 2. The Alkemio user id. Read it from the account's OWN session: an admin
  #    holding only `platform-roles-admin` cannot read other users' emails, so
  #    a directory lookup by email does not work here.
  user_token=$(login "$email" "$SEED_PASSWORD")
  [ -n "$user_token" ] || { echo "   login FAILED"; failures=$((failures + 1)); continue; }
  user_id=$(gql "$user_token" '{ me { user { id } } }' | jq -r '.data.me.user.id // empty')
  [ -n "$user_id" ] || { echo "   could not resolve user id"; failures=$((failures + 1)); continue; }

  # 3. Grant, as admin. Goes through the rule engine — a rejection here is a
  #    real signal, not something to work around.
  result=$(gql "$ADMIN_TOKEN" \
    "mutation { assignPlatformRoleToUser(roleData: {actorID: \"$user_id\", role: $role}) { id } }")
  if [ "$(jq -r 'has("errors")' <<<"$result")" = "true" ]; then
    msg=$(jq -r '.errors[0].message' <<<"$result")
    rule=$(jq -r '.errors[0].extensions.details.ruleId // "-"' <<<"$result")
    # Already held is success, not failure.
    if grep -qi "already" <<<"$msg"; then
      echo "   already holds $role"
    else
      echo "   grant REJECTED (rule: $rule) $msg"
      failures=$((failures + 1))
      continue
    fi
  fi

  # 4. Confirm from the holder's own session.
  roles=$(gql "$user_token" '{ platform { roleSet { myRoles } } }' \
    | jq -rc '.data.platform.roleSet.myRoles // []')
  echo "   myRoles: $roles"
  grep -q "$role" <<<"$roles" || { echo "   role NOT visible after grant"; failures=$((failures + 1)); }
done

rm -f /tmp/.register-password

echo
if [ "$failures" -gt 0 ]; then
  fail "$failures account(s) did not seed cleanly."
fi

cat <<EOF
Done. All accounts share admin's password (AUTH_ADMIN_PASSWORD in .env);
override with DEV_SEED_PASSWORD.

  admin@alkem.io        platform-roles-admin        (bootstrap; assignment only)
  ops@alkem.io          platform-operations-admin   (authorization reset lives here)
  users-admin@alkem.io  platform-users-admin
  support@alkem.io      platform-support
  content@alkem.io      platform-content-full-access

Reset authorization as ops@alkem.io, NOT as admin@alkem.io:

  ./.scripts/gql-request.sh --user ops@alkem.io 'mutation { authorizationPolicyResetAll }'
EOF
