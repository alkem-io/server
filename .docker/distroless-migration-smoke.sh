#!/usr/bin/env bash
# workspace#026-distroless-runtime-images — persisted US2 regression.
#
# Mechanically asserts the `server-migration-entrypoint` contract (US2-AS1):
# runs the compiled TypeORM CLI migration path — zero shell involvement —
# against a fresh, throwaway PostgreSQL 17.5 container, and confirms:
#   - `migration:run` exits 0
#   - `migrations_typeorm` row count == number of compiled dist/migrations/*.js
#   - a subsequent `migration:show` reports zero pending migrations
#
# Usage: .docker/distroless-migration-smoke.sh <image[:tag]>
set -euo pipefail

IMAGE="${1:?usage: distroless-migration-smoke.sh <image>}"
NET_NAME="server-migration-smoke-$$"
PG_NAME="server-migration-smoke-pg-$$"
PG_PASSWORD="smoke-$$-$(date +%s)"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "PASS: $*"
}

cleanup() {
  docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
  docker network rm "$NET_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== distroless-migration-smoke: $IMAGE =="

docker network create "$NET_NAME" >/dev/null
docker run -d --name "$PG_NAME" --network "$NET_NAME" \
  -e POSTGRES_USER=alkemio -e POSTGRES_PASSWORD="$PG_PASSWORD" -e POSTGRES_DB=alkemio \
  postgres:17.5 >/dev/null

echo "waiting for PostgreSQL 17.5 to accept connections..."
for _ in $(seq 1 60); do
  if docker exec "$PG_NAME" pg_isready -U alkemio >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$PG_NAME" pg_isready -U alkemio >/dev/null 2>&1 ||
  fail "postgres:17.5 did not become ready in time"
pass "fresh PostgreSQL 17.5 is ready"

DB_ENV=(-e DATABASE_HOST="$PG_NAME" -e DATABASE_PORT=5432 -e DATABASE_USERNAME=alkemio \
  -e DATABASE_PASSWORD="$PG_PASSWORD" -e DATABASE_NAME=alkemio)

START_TS=$(date +%s)
docker run --rm --network "$NET_NAME" "${DB_ENV[@]}" \
  --entrypoint /nodejs/bin/node "$IMAGE" \
  ./node_modules/typeorm/cli.js migration:run --dataSource dist/config/migration.config.js \
  > /tmp/migration-run.$$.log 2>&1 \
  || { cat /tmp/migration-run.$$.log; rm -f /tmp/migration-run.$$.log; fail "migration:run (compiled, no shell) exited non-zero"; }
rm -f /tmp/migration-run.$$.log
END_TS=$(date +%s)
ELAPSED=$((END_TS - START_TS))
pass "migration:run completed with zero shell involvement in ${ELAPSED}s (SC-006 budget: <300s)"
[ "$ELAPSED" -lt 300 ] || fail "migration run took ${ELAPSED}s, exceeding the 5-minute SC-006 budget"

MIGRATIONS_ROW_COUNT="$(docker exec "$PG_NAME" psql -U alkemio -d alkemio -tAc \
  'SELECT count(*) FROM migrations_typeorm;' | tr -d '[:space:]')"

DIST_MIGRATION_FILE_COUNT="$(docker run --rm --entrypoint /nodejs/bin/node "$IMAGE" \
  -e "console.log(require('fs').readdirSync('/usr/src/app/dist/migrations').filter(f=>f.endsWith('.js')).length)" | tr -d '[:space:]')"

echo "MIGRATIONS_ROW_COUNT=$MIGRATIONS_ROW_COUNT"
echo "DIST_MIGRATION_FILE_COUNT=$DIST_MIGRATION_FILE_COUNT"

[ "$MIGRATIONS_ROW_COUNT" = "$DIST_MIGRATION_FILE_COUNT" ] ||
  fail "migrations_typeorm has $MIGRATIONS_ROW_COUNT rows, expected $DIST_MIGRATION_FILE_COUNT (one per compiled migration file) — the glob may not be resolving dist/migrations"
pass "migrations_typeorm row count ($MIGRATIONS_ROW_COUNT) matches compiled migration file count"

SHOW_OUTPUT="$(docker run --rm --network "$NET_NAME" "${DB_ENV[@]}" \
  --entrypoint /nodejs/bin/node "$IMAGE" \
  ./node_modules/typeorm/cli.js migration:show --dataSource dist/config/migration.config.js)"

if echo "$SHOW_OUTPUT" | grep -q '\[ \]'; then
  echo "$SHOW_OUTPUT"
  fail "migration:show reports pending migrations after migration:run"
fi
pass "migration:show reports zero pending migrations"

echo "== distroless-migration-smoke: ALL CHECKS PASSED =="
