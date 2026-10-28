#!/usr/bin/env bash
set -euo pipefail

export PGPASSWORD="${POSTGRES_PASSWORD:-}"

# Old layout guard: the named volume used to be mounted one level up, so an un-migrated one holds
# only an empty `data/` mount point. Starting here would initdb an EMPTY cluster over your data.
pgdata="${PGDATA:-/var/lib/postgresql/data}"
if [ ! -f "$pgdata/PG_VERSION" ] && [ "$(ls -A "$pgdata" 2>/dev/null)" = "data" ]; then
  echo "[ensure] $pgdata is an un-migrated volume (old layout). Run .scripts/migrate-postgres-volume.sh" >&2
  echo "[ensure] or use 'pnpm run start:services', which runs it for you." >&2
  exit 1
fi

# Preserve original command (defaults to "postgres")
args=("$@")
if [ ${#args[@]} -eq 0 ]; then
  args=(postgres)
fi

# Start the standard entrypoint (handles first-time init if needed)
docker-entrypoint.sh "${args[@]}" &
pg_pid=$!

trap 'kill -TERM "$pg_pid" 2>/dev/null || true; wait "$pg_pid" 2>/dev/null || true' SIGINT SIGTERM

echo "[ensure] Waiting for Postgres readiness..."
until pg_isready -h localhost -U "${POSTGRES_USER}" >/dev/null 2>&1; do
  sleep 1
done
echo "[ensure] Postgres is ready"

# Build unique list of databases from POSTGRES_DB + POSTGRES_MULTIPLE_DATABASES
raw="${POSTGRES_DB:-},${POSTGRES_MULTIPLE_DATABASES:-}"
for db in $(echo "$raw" | tr ',' ' ' | xargs -n1 | sed '/^$/d' | sort -u); do
  echo "[ensure] Checking database: $db"
  exists="$(psql -h localhost -U "${POSTGRES_USER}" -tc "SELECT 1 FROM pg_database WHERE datname='${db}'" | tr -d '[:space:]')"
  if [ "$exists" != "1" ]; then
    echo "[ensure] Creating database: $db"
    psql -h localhost -U "${POSTGRES_USER}" -c "CREATE DATABASE \"$db\""
  else
    echo "[ensure] Already exists: $db"
  fi
done

echo "[ensure] Done; attaching to Postgres"
wait "$pg_pid"
