#!/usr/bin/env bash
#
# Data-level verification for the 034-messaging-notifications settings backfill
# (contract C-5 — AddConversationMessageNotificationSettings1785336300000).
#
# Why this exists rather than `pnpm run migration:validate`: that harness needs
# an operator-supplied `.scripts/migrations/.env` + `db/reference_schema.sql` +
# `reference_CSVs/` side-car fixtures that are not committed to the repo (see
# `.scripts/migrations/README.md`), and neither it nor `compare_sql_tables.sh`
# sets `set -e` or ever exits non-zero — so it reports success unconditionally
# even when the fixtures are entirely absent. A gate that cannot fail is not a
# gate. Modelled directly on `verify_021_backfill.sh` (story/6138), which
# established this pattern for the same reason.
#
# This script builds a scratch database, seeds the exact `user_settings.notification`
# row shapes the migration guards on, runs the migration's UP/DOWN statements
# against them (kept in sync with
# src/migrations/1785336300000-AddConversationMessageNotificationSettings.ts),
# and ASSERTS on the resulting rows. It exits non-zero on any failed assertion.
#
# Usage: ./.scripts/migrations/verify_034_conversation_message_settings.sh
# Requires: the dev postgres container running (pnpm run start:services).

set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-alkemio_dev_postgres}"
PGUSER="${POSTGRES_USER:-synapse}"
DB="alkemio_034_verify"

psql_db() { docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 "$@"; }

failures=0
assert_eq() { # <description> <actual> <expected>
  if [ "$2" = "$3" ]; then
    echo "  PASS  $1 (= $3)"
  else
    echo "  FAIL  $1 — expected '$3', got '$2'"
    failures=$((failures + 1))
  fi
}

echo "==> Creating scratch database $DB"
docker exec -i "$CONTAINER" psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS $DB;" -c "CREATE DATABASE $DB;" >/dev/null

echo "==> Seeding user_settings rows (minimal schema — only what the migration touches)"
psql_db >/dev/null <<'SQL'
CREATE TABLE user_settings ("id" uuid PRIMARY KEY, "notification" jsonb NOT NULL);

-- u1: legacy row, predates this feature entirely — neither key present (US3-AS2)
INSERT INTO user_settings VALUES (
  '00000000-0000-0000-0000-00000000a001',
  '{"user":{"mentioned":{"push":true,"email":true,"inApp":true},"commentReply":{"push":true,"email":false,"inApp":true},"messageReceived":{"push":true,"email":true,"inApp":true},"membership":{"spaceCommunityJoined":{"push":true,"email":true,"inApp":true},"spaceCommunityInvitationReceived":{"push":true,"email":true,"inApp":true}}}}'
);

-- u2: already has conversationMessageDirect (e.g. an earlier partial/manual run) with a
-- NON-default value — the migration's guard must leave it untouched, only add the Group key
INSERT INTO user_settings VALUES (
  '00000000-0000-0000-0000-00000000a002',
  '{"user":{"mentioned":{"push":true,"email":true,"inApp":true},"commentReply":{"push":true,"email":false,"inApp":true},"messageReceived":{"push":true,"email":true,"inApp":true},"membership":{"spaceCommunityJoined":{"push":true,"email":true,"inApp":true},"spaceCommunityInvitationReceived":{"push":true,"email":true,"inApp":true}},"conversationMessageDirect":{"push":false,"email":true,"inApp":true}}}'
);

-- u3: already has BOTH keys at custom values (post-migration user edit) — a re-run must be a no-op
INSERT INTO user_settings VALUES (
  '00000000-0000-0000-0000-00000000a003',
  '{"user":{"mentioned":{"push":true,"email":true,"inApp":true},"commentReply":{"push":true,"email":false,"inApp":true},"messageReceived":{"push":true,"email":true,"inApp":true},"membership":{"spaceCommunityJoined":{"push":true,"email":true,"inApp":true},"spaceCommunityInvitationReceived":{"push":true,"email":true,"inApp":true}},"conversationMessageDirect":{"push":true,"email":true,"inApp":true},"conversationMessageGroup":{"push":false,"email":true,"inApp":true}}}'
);

-- u4 (corr-server-3): the `user` object itself is entirely absent from
-- `notification` — a bare (non-broadened) `jsonb_set(notification,
-- '{user,<key>}', ...)` is a silent no-op against a missing parent path, so
-- this row proves the broadened up() (which materializes `{user}` as `{}`
-- before writing the leaf key) actually heals it instead of leaving it
-- forever un-backfilled.
INSERT INTO user_settings VALUES (
  '00000000-0000-0000-0000-00000000a004',
  '{}'
);
SQL

# The migration's UP/DOWN statements, kept in sync with
# src/migrations/1785336300000-AddConversationMessageNotificationSettings.ts
DEFAULT_VALUE='{"push":true,"email":false,"inApp":false}'

run_migration_up() {
psql_db -v default_value="$DEFAULT_VALUE" >/dev/null <<'SQL'
UPDATE user_settings
SET notification = jsonb_set(
  jsonb_set(notification, '{user}'::text[], COALESCE(notification -> 'user', '{}'::jsonb), true),
  '{user,conversationMessageDirect}'::text[], :'default_value'::jsonb, true
)
WHERE notification -> 'user' -> 'conversationMessageDirect' IS NULL;

UPDATE user_settings
SET notification = jsonb_set(
  jsonb_set(notification, '{user}'::text[], COALESCE(notification -> 'user', '{}'::jsonb), true),
  '{user,conversationMessageGroup}'::text[], :'default_value'::jsonb, true
)
WHERE notification -> 'user' -> 'conversationMessageGroup' IS NULL;
SQL
}

run_migration_down() {
psql_db >/dev/null <<'SQL'
UPDATE user_settings
SET notification = notification #- '{user,conversationMessageDirect}'::text[]
WHERE notification -> 'user' -> 'conversationMessageDirect' IS NOT NULL;

UPDATE user_settings
SET notification = notification #- '{user,conversationMessageGroup}'::text[]
WHERE notification -> 'user' -> 'conversationMessageGroup' IS NOT NULL;
SQL
}

get() { psql_db -tAc "SELECT notification->'user'->'$2' FROM user_settings WHERE id='$1';" | tr -d '[:space:]'; }

echo
echo "==> BEFORE (u1 carries neither key; u2 carries Direct only; u3 carries both, custom values)"
psql_db -c "SELECT id, notification->'user'->'conversationMessageDirect' AS direct, notification->'user'->'conversationMessageGroup' AS grp FROM user_settings ORDER BY id;"

echo "==> Running migration UP (first run)"
run_migration_up

echo
echo "==> AFTER first run"
psql_db -c "SELECT id, notification->'user'->'conversationMessageDirect' AS direct, notification->'user'->'conversationMessageGroup' AS grp FROM user_settings ORDER BY id;"

echo
echo "==> Assertions (US3-AS2 / FR-002 defaults, FR-017 never clobbers an existing row)"
assert_eq "u1 conversationMessageDirect -> default (non-null)" "$(get 00000000-0000-0000-0000-00000000a001 conversationMessageDirect)" "$DEFAULT_VALUE"
assert_eq "u1 conversationMessageGroup  -> default (non-null)" "$(get 00000000-0000-0000-0000-00000000a001 conversationMessageGroup)"  "$DEFAULT_VALUE"
assert_eq "u2 conversationMessageDirect -> pre-existing value PRESERVED" "$(get 00000000-0000-0000-0000-00000000a002 conversationMessageDirect)" '{"push":false,"email":true,"inApp":true}'
assert_eq "u2 conversationMessageGroup  -> default (backfilled)"         "$(get 00000000-0000-0000-0000-00000000a002 conversationMessageGroup)"  "$DEFAULT_VALUE"
assert_eq "u3 conversationMessageDirect -> pre-existing value PRESERVED" "$(get 00000000-0000-0000-0000-00000000a003 conversationMessageDirect)" '{"push":true,"email":true,"inApp":true}'
assert_eq "u3 conversationMessageGroup  -> pre-existing value PRESERVED" "$(get 00000000-0000-0000-0000-00000000a003 conversationMessageGroup)"  '{"push":false,"email":true,"inApp":true}'
assert_eq "u4 (missing 'user' object entirely) conversationMessageDirect -> default (non-null, healed)" "$(get 00000000-0000-0000-0000-00000000a004 conversationMessageDirect)" "$DEFAULT_VALUE"
assert_eq "u4 (missing 'user' object entirely) conversationMessageGroup  -> default (non-null, healed)" "$(get 00000000-0000-0000-0000-00000000a004 conversationMessageGroup)"  "$DEFAULT_VALUE"

echo
echo "==> Idempotency: capturing state, re-running UP, diffing"
before_hash=$(psql_db -tAc "SELECT md5(string_agg(id || notification::text, '|' ORDER BY id)) FROM user_settings;")
run_migration_up
after_hash=$(psql_db -tAc "SELECT md5(string_agg(id || notification::text, '|' ORDER BY id)) FROM user_settings;")
assert_eq "second UP run changes zero rows" "$after_hash" "$before_hash"

echo
echo "==> Running migration DOWN (reversibility)"
run_migration_down
assert_eq "u1 conversationMessageDirect removed" "$(get 00000000-0000-0000-0000-00000000a001 conversationMessageDirect)" ""
assert_eq "u1 conversationMessageGroup removed"  "$(get 00000000-0000-0000-0000-00000000a001 conversationMessageGroup)"  ""
assert_eq "u2 conversationMessageDirect removed (even though it pre-dated the migration)" "$(get 00000000-0000-0000-0000-00000000a002 conversationMessageDirect)" ""

echo
echo "==> Dropping scratch database"
docker exec -i "$CONTAINER" psql -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $DB;" >/dev/null

echo
if [ "$failures" -ne 0 ]; then
  echo "RESULT: $failures assertion(s) FAILED"
  exit 1
fi
echo "RESULT: all assertions passed"
