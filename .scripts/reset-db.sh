#!/usr/bin/env bash
set -euo pipefail

# Full database reset: tear down services, wipe volumes, restart fresh,
# run migrations, start dev server, register admin user.
#
# Usage: .scripts/reset-db.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

COMPOSE_FILE="quickstart-services.yml"
ENV_FILE=".env.docker"
SERVER_LOG="/tmp/alkemio-dev-server.log"

fail() { echo "FAIL: $1" >&2; exit 1; }
info() { echo "==> $1"; }

# ---------- Parse AUTH_ADMIN_PASSWORD from .env (not an env var) ----------
AUTH_ADMIN_PASSWORD=$(grep '^AUTH_ADMIN_PASSWORD=' .env | head -1 | cut -d= -f2- | tr -d '\r')
[ -n "$AUTH_ADMIN_PASSWORD" ] || fail "AUTH_ADMIN_PASSWORD not found in .env"

# ---------- Step 1: Stop compose services and remove volumes ----------
info "Step 1/6: Stopping compose services and removing volumes"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v

# ---------- Step 2: Start compose services ----------
info "Step 2/6: Starting compose services"
pnpm run start:services

# ---------- Step 3: Wait for PostgreSQL + database init ----------
info "Step 3/6: Waiting for PostgreSQL and database initialization"
for i in $(seq 1 60); do
  if docker exec alkemio_dev_postgres psql -U synapse -d alkemio -c "SELECT 1" >/dev/null 2>&1; then
    echo "  PostgreSQL ready, alkemio database exists."
    break
  fi
  [ "$i" -eq 60 ] && fail "PostgreSQL/alkemio database not ready after 60s"
  sleep 1
done

# ---------- Step 4: Run migrations ----------
info "Step 4/6: Running database migrations"
pnpm run migration:run

# ---------- Step 5: Start dev server in background ----------
info "Step 5/6: Starting dev server"
: > "$SERVER_LOG"
setsid pnpm start:dev >> "$SERVER_LOG" 2>&1 &
DEV_SERVER_PID=$!
echo "  PID: $DEV_SERVER_PID | log: $SERVER_LOG"

echo "  Waiting for Kratos..."
for i in $(seq 1 90); do
  if curl -sf "http://localhost:3000/ory/kratos/public/health/alive" >/dev/null 2>&1; then
    echo "  Kratos ready."
    break
  fi
  [ "$i" -eq 90 ] && fail "Kratos not ready after 90s"
  sleep 1
done

echo "  Waiting for GraphQL endpoint..."
for i in $(seq 1 90); do
  if curl -sf "http://localhost:3000/api/private/non-interactive/graphql" \
    -H 'Content-Type: application/json' \
    -d '{"query":"{__typename}"}' >/dev/null 2>&1; then
    echo "  GraphQL ready."
    break
  fi
  if ! kill -0 "$DEV_SERVER_PID" 2>/dev/null; then
    echo "  Dev server exited. Last 20 lines:"
    tail -20 "$SERVER_LOG" || true
    fail "Dev server crashed"
  fi
  [ "$i" -eq 90 ] && fail "GraphQL endpoint not ready after 90s"
  sleep 1
done

# ---------- Step 6: Register admin user ----------
info "Step 6/6: Registering admin user"
bash .scripts/register-user.sh "admin@alkem.io" "$AUTH_ADMIN_PASSWORD" "admin" "alkemio"

# ---------- Cleanup: kill dev server and all children ----------
info "Stopping dev server (PID $DEV_SERVER_PID)"
kill -- -"$DEV_SERVER_PID" 2>/dev/null || kill "$DEV_SERVER_PID" 2>/dev/null || true
wait "$DEV_SERVER_PID" 2>/dev/null || true

cat <<'EOF'

========================================
  Database reset complete!
========================================
EOF
