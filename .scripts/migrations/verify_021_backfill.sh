#!/usr/bin/env bash
#
# Data-level verification for the 021 per-flow-state layout backfill (US4-AS1..AS4).
#
# Why this exists rather than `pnpm run migration:validate`: that harness needs an
# operator-supplied reference_schema.sql + reference_CSVs/ that are not in the repo, and
# neither it nor compare_sql_tables.sh sets `set -e` or ever exits non-zero — so it reports
# success unconditionally. A gate that cannot fail is not a gate.
#
# This script builds a scratch database, seeds the exact row shapes US4 names, runs the
# migration's UP statements against them, and ASSERTS on the resulting rows. It exits
# non-zero on any failed assertion.
#
# Usage: ./.scripts/migrations/verify_021_backfill.sh
# Requires: the dev postgres container running (pnpm run start:services).

set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-alkemio_dev_postgres}"
PGUSER="${POSTGRES_USER:-synapse}"
DB="alkemio_021_verify"

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

echo "==> Seeding the row shapes from US4 (minimal schema — only what the migration touches)"
psql_db >/dev/null <<'SQL'
CREATE TABLE collaboration ("id" uuid PRIMARY KEY, "innovationFlowId" uuid);
CREATE TABLE space ("id" uuid PRIMARY KEY, "collaborationId" uuid, "settings" jsonb);
CREATE TABLE template_content_space ("id" uuid PRIMARY KEY, "collaborationId" uuid, "settings" jsonb);
CREATE TABLE innovation_flow_state (
  "id" text PRIMARY KEY, "innovationFlowId" uuid, "displayName" text, "settings" jsonb NOT NULL
);

-- flow ids
-- f1 space=collapsed | f2 space=expanded | f3 space with no layout key
-- f4 template=collapsed | f5 orphaned (no owner) | f6 space=collapsed w/ admin value already set
-- f7 space with an out-of-enum legacy value
INSERT INTO collaboration VALUES
  ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000f2'),
  ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000f3'),
  ('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000f4'),
  ('00000000-0000-0000-0000-0000000000c6','00000000-0000-0000-0000-0000000000f6'),
  ('00000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-0000000000f7');

INSERT INTO space VALUES
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','{"layout":{"calloutDescriptionDisplayMode":"collapsed"}}'),
  ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000c2','{"layout":{"calloutDescriptionDisplayMode":"expanded"}}'),
  ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000c3','{"privacy":{"mode":"public"}}'),
  ('00000000-0000-0000-0000-0000000000a6','00000000-0000-0000-0000-0000000000c6','{"layout":{"calloutDescriptionDisplayMode":"collapsed"}}'),
  ('00000000-0000-0000-0000-0000000000a7','00000000-0000-0000-0000-0000000000c7','{"layout":{"calloutDescriptionDisplayMode":"COLLAPSED_LEGACY"}}');

-- the template content space is the M1 case: it carries its OWN collapsed layout
INSERT INTO template_content_space VALUES
  ('00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000c4','{"layout":{"calloutDescriptionDisplayMode":"collapsed"}}');

INSERT INTO innovation_flow_state VALUES
  ('s-space-collapsed','00000000-0000-0000-0000-0000000000f1','Home','{"allowNewCallouts":true,"visible":true}'),
  ('s-space-expanded' ,'00000000-0000-0000-0000-0000000000f2','Home','{"allowNewCallouts":true,"visible":true}'),
  ('s-space-nolayout' ,'00000000-0000-0000-0000-0000000000f3','Home','{"allowNewCallouts":true,"visible":true}'),
  ('s-template'       ,'00000000-0000-0000-0000-0000000000f4','Home','{"allowNewCallouts":true,"visible":true}'),
  ('s-orphan'         ,'00000000-0000-0000-0000-0000000000f5','Home','{"allowNewCallouts":true,"visible":true}'),
  -- US4-AS4: an admin already chose expanded on a collapsed space; the backfill must not touch it
  ('s-admin-preset'   ,'00000000-0000-0000-0000-0000000000f6','Home','{"allowNewCallouts":true,"visible":true,"descriptionDisplayMode":"expanded","showPublishDetails":false}'),
  ('s-legacy-value'   ,'00000000-0000-0000-0000-0000000000f7','Home','{"allowNewCallouts":true,"visible":true}');
SQL

# The migration's UP statements, kept in sync with
# src/migrations/1783600000000-BackfillInnovationFlowStateLayout.ts
run_migration() {
psql_db >/dev/null <<'SQL'
UPDATE innovation_flow_state ifs
SET settings = jsonb_set(ifs.settings, '{descriptionDisplayMode}',
  to_jsonb(CASE WHEN s.settings->'layout'->>'calloutDescriptionDisplayMode' IN ('expanded','collapsed')
                THEN s.settings->'layout'->>'calloutDescriptionDisplayMode' ELSE 'expanded' END), true)
FROM collaboration c JOIN space s ON s."collaborationId" = c.id
WHERE ifs."innovationFlowId" = c."innovationFlowId"
  AND ifs.settings -> 'descriptionDisplayMode' IS NULL;

UPDATE innovation_flow_state ifs
SET settings = jsonb_set(ifs.settings, '{descriptionDisplayMode}',
  to_jsonb(CASE WHEN tcs.settings->'layout'->>'calloutDescriptionDisplayMode' IN ('expanded','collapsed')
                THEN tcs.settings->'layout'->>'calloutDescriptionDisplayMode' ELSE 'expanded' END), true)
FROM collaboration c JOIN template_content_space tcs ON tcs."collaborationId" = c.id
WHERE ifs."innovationFlowId" = c."innovationFlowId"
  AND ifs.settings -> 'descriptionDisplayMode' IS NULL;

UPDATE innovation_flow_state
SET settings = jsonb_set(settings, '{descriptionDisplayMode}', '"expanded"'::jsonb, true)
WHERE settings -> 'descriptionDisplayMode' IS NULL;

UPDATE innovation_flow_state
SET settings = jsonb_set(settings, '{showPublishDetails}', 'true'::jsonb, true)
WHERE settings -> 'showPublishDetails' IS NULL;
SQL
}

get() { psql_db -tAc "SELECT settings->>'$2' FROM innovation_flow_state WHERE id='$1';" | tr -d '[:space:]'; }

echo
echo "==> BEFORE (no row carries the new keys)"
psql_db -c "SELECT id, settings->>'descriptionDisplayMode' AS ddm, settings->>'showPublishDetails' AS spd FROM innovation_flow_state ORDER BY id;"

echo "==> Running migration UP (first run)"
run_migration

echo
echo "==> AFTER first run"
psql_db -c "SELECT id, settings->>'descriptionDisplayMode' AS ddm, settings->>'showPublishDetails' AS spd FROM innovation_flow_state ORDER BY id;"

echo
echo "==> Assertions"
assert_eq "US4-AS1  space Collapsed  -> collapsed"            "$(get s-space-collapsed descriptionDisplayMode)" "collapsed"
assert_eq "US4-AS2  space Expanded   -> expanded"             "$(get s-space-expanded  descriptionDisplayMode)" "expanded"
assert_eq "US4-AS2  space no layout  -> expanded (default)"   "$(get s-space-nolayout  descriptionDisplayMode)" "expanded"
assert_eq "M1       template Collapsed -> collapsed (NOT reset to expanded)" \
                                                              "$(get s-template        descriptionDisplayMode)" "collapsed"
assert_eq "US4-AS3  orphaned flow    -> expanded (default)"   "$(get s-orphan          descriptionDisplayMode)" "expanded"
assert_eq "m6       out-of-enum legacy value -> expanded"     "$(get s-legacy-value    descriptionDisplayMode)" "expanded"
assert_eq "FR-002   showPublishDetails defaults to true"      "$(get s-space-collapsed showPublishDetails)"     "true"
assert_eq "US4-AS4  admin preset value survives"              "$(get s-admin-preset    descriptionDisplayMode)" "expanded"
assert_eq "US4-AS4  admin preset showPublishDetails survives" "$(get s-admin-preset    showPublishDetails)"     "false"

echo
echo "==> Idempotency: capturing state, re-running, diffing (US4-AS4)"
before_hash=$(psql_db -tAc "SELECT md5(string_agg(id || settings::text, '|' ORDER BY id)) FROM innovation_flow_state;")
run_migration
after_hash=$(psql_db -tAc "SELECT md5(string_agg(id || settings::text, '|' ORDER BY id)) FROM innovation_flow_state;")
assert_eq "second run changes zero rows" "$after_hash" "$before_hash"

echo
echo "==> Dropping scratch database"
docker exec -i "$CONTAINER" psql -U "$PGUSER" -d postgres -c "DROP DATABASE IF EXISTS $DB;" >/dev/null

echo
if [ "$failures" -ne 0 ]; then
  echo "RESULT: $failures assertion(s) FAILED"
  exit 1
fi
echo "RESULT: all assertions passed"
