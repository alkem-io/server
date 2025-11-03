# Quickstart: Synapse-Kratos-Hydra OIDC Authentication

**Feature**: 010-synapse-kratos-oidc
**Date**: 2025-10-20
**Phase**: 1 - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying Synapse Matrix homeserver with OIDC authentication via Ory Kratos and Ory Hydra.

**Architecture**: Synapse (OIDC Client) → Ory Hydra (OAuth2/OIDC Server) → **alkemio-server (NestJS OIDC Controllers)** → Ory Kratos (Identity Provider)

**Deployment Target**: Docker Compose (quickstart-services.yml)

---

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Git repository access to alkemio/server repository
- 8GB+ RAM available for containers
- Ports available: 4444, 4445, 8008, 3000, 4000

**IMPORTANT**: Login and consent handling is implemented in the **alkemio-server NestJS backend** at `/api/public/rest/oidc/*` endpoints, NOT in a separate frontend application. The NestJS OIDC controllers will be created in `src/services/api/oidc/` as part of implementation tasks T017-T020.

---

## Step 1: Generate Secrets

Create environment variables for secrets. These will be used by Docker Compose services:

```bash
cd .

# Generate Hydra system secret (32-byte hex)
echo "HYDRA_SYSTEM_SECRET=$(openssl rand -hex 32)" >> .env.docker

# Generate Synapse OIDC client secret (base64)
echo "SYNAPSE_OIDC_CLIENT_SECRET=$(openssl rand -base64 32)" >> .env.docker

# Add PostgreSQL multi-database configuration
echo "POSTGRES_MULTIPLE_DATABASES=synapse,hydra" >> .env.docker

# Add Synapse OIDC client ID
echo "SYNAPSE_OIDC_CLIENT_ID=synapse-client" >> .env.docker

echo "✅ Secrets generated in .env.docker"
```

**Important Notes**:

- **`.env.docker` contains ONLY shared secrets and simple configuration values** (following NFR-004)
- **Service-specific URLs and DSNs are composed in `quickstart-services.yml`** using environment variable components (${POSTGRES_USER}, ${POSTGRES_PASSWORD}, etc.)
- **This pattern enables deployment flexibility**: Default values work for Docker Compose; K8s deployments override via ConfigMap/Secrets
- **Follows existing Kratos pattern**: See `quickstart-services.yml` line 66 for DSN composition example

**What's NOT in .env.docker** (intentionally):

- ❌ `HYDRA_DSN` - Composed in Hydra service definition from ${POSTGRES_USER}, ${POSTGRES_PASSWORD}
- ❌ `ALKEMIO_WEB_BASE_URL` - Constructed in-line in Hydra service environment
- ❌ `POSTGRES_HOST`, `POSTGRES_PORT` - Use Docker Compose defaults (`postgres`, `5432`), overridable in K8s

**Security Note**: Ensure `.env.docker` is in `.gitignore` and never committed to version control.

**Complete list of environment variables**: See [environment-variables.md](./environment-variables.md) for comprehensive documentation of all OIDC-related environment variables.

---

## Step 1b: Add OIDC Controller Configuration Variables

Add the following variables to `.env.docker` to configure the NestJS OIDC controllers:

```bash
# OIDC Controller Configuration (alkemio-server)
# These variables configure the NestJS OIDC controllers at /api/public/rest/oidc/*

# Public web base URL (Traefik entrypoint, accessible from browser)
echo "OIDC_WEB_BASE_URL=http://localhost:3000" >> .env.docker

# Public REST API base path (where OIDC controllers are mounted)
echo "OIDC_API_PUBLIC_BASE_PATH=/api/public/rest" >> .env.docker

# Kratos public API path (via Traefik routing)
echo "OIDC_KRATOS_PUBLIC_BASE_PATH=/ory/kratos/public" >> .env.docker

# Internal Docker network URLs (for redirect URL rewriting)
echo "OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL=http://hydra:4444" >> .env.docker
echo "OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL=http://kratos:4433" >> .env.docker

echo "✅ OIDC controller configuration added to .env.docker"
```

**What these variables do**:

- `OIDC_WEB_BASE_URL`: Public URL where users access the platform (used for constructing redirect URLs)
- `OIDC_API_PUBLIC_BASE_PATH`: Path where OIDC controllers are mounted (e.g., `/api/public/rest/oidc/login`)
- `OIDC_KRATOS_PUBLIC_BASE_PATH`: Path to Kratos public API through Traefik (for session validation)
- `OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL`: Internal Docker URL for Hydra (used for redirect URL rewriting)
- `OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL`: Internal Docker URL for Kratos (used for redirect URL rewriting)

**Why these are needed**: The OIDC controllers need to construct public URLs for redirects and rewrite internal Docker service URLs (like `http://hydra:4444`) to public URLs (like `http://localhost:3000`) that browsers can access.

**Note**: All hardcoded URLs have been removed from the OIDC controller implementation. All URLs are now constructed dynamically from these environment variables, ensuring the application works correctly in different deployment environments (Docker Compose, Kubernetes, production).

---

## Step 2: Configure PostgreSQL Multi-Database Support

Create the PostgreSQL initialization script:

```bash
mkdir -p .build/postgres

cat > .build/postgres/init-multiple-databases.sh << 'EOF'
#!/bin/bash
set -e

function create_database() {
    local database=$1
    echo "Creating database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE $database;
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_database $db
    done
    echo "Multiple databases created"
fi
EOF

chmod +x .build/postgres/init-multiple-databases.sh

echo "✅ PostgreSQL init script created"
```

---

## Step 3: Update Docker Compose Configuration

Add Hydra services to `quickstart-services.yml`:

**Location**: `quickstart-services.yml` in the repository root.

Set `HYDRA_PUBLIC_URL` in `.env.docker` (for example `http://localhost:3000`, without a trailing slash) so Hydra self URLs match the Traefik proxy exposed by the compose stack. The snippet below references that value for all public-facing endpoints.

```yaml
services:
  # ... existing services ...

  postgres:
    # ... existing postgres configuration ...
    environment:
      # ... existing environment variables ...
      - POSTGRES_MULTIPLE_DATABASES
    volumes:
      # ... existing volumes ...
      - ./.build/postgres/init-multiple-databases.sh:/docker-entrypoint-initdb.d/init-multiple-databases.sh:ro

  hydra-migrate:
    container_name: alkemio_dev_hydra_migrate
    image: oryd/hydra:v2.2.0
    depends_on:
      - postgres
    environment:
      - DSN=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/hydra?sslmode=disable
    command: migrate sql -e --yes
    networks:
      - alkemio_dev_net
    restart: on-failure

  hydra:
    container_name: alkemio_dev_hydra
    image: oryd/hydra:v2.2.0
    depends_on:
      - hydra-migrate
    ports:
      - '4444:4444' # Public API
      - '4445:4445' # Admin API
    environment:
      - DSN=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/hydra?sslmode=disable
      - SECRETS_SYSTEM=${HYDRA_SYSTEM_SECRET}
      - HYDRA_PUBLIC_URL=${HYDRA_PUBLIC_URL}
      - URLS_SELF_ISSUER=${HYDRA_PUBLIC_URL}/
      - URLS_LOGIN=${HYDRA_PUBLIC_URL}/api/public/rest/oidc/login
      - URLS_CONSENT=${HYDRA_PUBLIC_URL}/api/public/rest/oidc/consent
      - URLS_SELF_PUBLIC=${HYDRA_PUBLIC_URL}/
      - URLS_SELF_ADMIN=http://hydra:4445/
      - SERVE_PUBLIC_CORS_ENABLED=true
      - SERVE_ADMIN_CORS_ENABLED=true
      - OAUTH2_ALLOWED_TOP_LEVEL_CLAIMS=email,email_verified,given_name,family_name
      - LOG_LEVEL=debug
    command: serve all --dev
    networks:
      - alkemio_dev_net
    restart: unless-stopped

  synapse:
    # ... existing synapse configuration ...
    environment:
      # ... existing environment variables ...
      - SYNAPSE_OIDC_CLIENT_ID=${SYNAPSE_OIDC_CLIENT_ID}
      - SYNAPSE_OIDC_CLIENT_SECRET=${SYNAPSE_OIDC_CLIENT_SECRET}
    depends_on:
      # ... existing dependencies ...
      - hydra
```

**Key Changes Explained**:

- **DSN composition**: `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/hydra?sslmode=disable` uses component variables (NFR-004 compliant)
- **Default hostnames**: `postgres` and `localhost` work for Docker Compose; override for K8s via environment variables
- **URL construction**: URLS_SELF_ISSUER, URLS_LOGIN, URLS_CONSENT are composed in-line (not from .env.docker)

---

## Step 4: Validate Configuration

```bash
docker compose -f quickstart-services.yml config --quiet && echo "✅ YAML valid"
```

---

## Error Handling & Troubleshooting

This section documents common error scenarios, their symptoms, root causes, and resolution steps for the OIDC authentication flow.

### Scenario 1: Kratos Service Unavailable (FR-014)

**Symptoms**:

- Matrix users see error: "Authentication service temporarily unavailable. Please retry in 2-5 minutes."
- HTTP 500 Internal Server Error when accessing `/api/public/rest/oidc/login`
- Server logs show: `WARN [oidc] Kratos whoami failed - status: 502` or connection errors

**Root Causes**:

1. Kratos container stopped or crashed
2. Network connectivity issues between alkemio-server and Kratos
3. Kratos database connection failure
4. Kratos service overloaded or unresponsive

**Resolution Steps**:

```bash
# 1. Check Kratos container status
docker ps | grep kratos

# 2. If stopped, start Kratos
docker start alkemio_dev_kratos

# 3. Check Kratos logs for errors
docker logs alkemio_dev_kratos --tail 100

# 4. Verify Kratos health endpoint
curl http://localhost:4433/health/ready

# 5. Check alkemio-server logs for connection errors
tail -n 100 /tmp/alkemio-server.log | grep -i "kratos\|oidc"

# 6. Restart alkemio-server if needed
docker compose -f quickstart-services.yml restart alkemio-server
```

**Expected Behavior**:

- Users see user-friendly error message (max 300 characters per FR-014)
- Error includes retry guidance and estimated recovery time (2-5 minutes)
- Existing Matrix sessions continue working (no session termination)
- OIDC logs show ERROR level with errorCode: `HYDRA_ERROR` or `KRATOS_UNAVAILABLE`

**Recovery Time**: < 5 minutes after Kratos restart

---

### Scenario 2: Account Deletion/Disable (FR-015)

**Symptoms**:

- User's Kratos account deleted or disabled via admin action
- Active Matrix sessions for that user
- User needs to be logged out from Matrix

**Root Causes**:

1. Admin deleted Kratos identity via Kratos Admin UI
2. Account disabled due to policy violation
3. Account migration or consolidation

**Resolution Steps**:

```bash
# 1. Verify Kratos identity state
curl http://localhost:4434/admin/identities/{identity_id}

# 2. Check Matrix active sessions for user
# Find user's Matrix ID from Synapse database
psql -U $POSTGRES_USER -d synapse -c \
  "SELECT name, displayname FROM users WHERE name LIKE '@%:localhost';"

# 3. Terminate Matrix sessions via Synapse Admin API
curl -X POST 'http://localhost:8008/_synapse/admin/v1/users/@user:localhost/logout' \
  -H 'Authorization: Bearer <admin_access_token>'

# 4. Verify session termination
# User should be prompted to re-authenticate on next Matrix action
```

**Expected Behavior** (with US3 implementation):

- Matrix session terminates within 5 minutes of Kratos account deletion (FR-015)
- User prompted to re-authenticate when attempting Matrix actions
- Re-authentication fails if Kratos account deleted (shows "Account not found")
- Session cleanup logged with challengeId and userId

**Current Status**: Manual session termination required (US3 not yet implemented)

**Recovery Time**: Immediate for manual termination; < 5 minutes automatic (when US3 implemented)

---

### Scenario 3: Token Refresh Failures

**Symptoms**:

- Matrix client shows "Token expired" or "Authentication failed"
- User repeatedly prompted to log in
- Server logs show: `ERROR [oidc] Token validation failed`

**Root Causes**:

1. Hydra refresh token expired (lifetime: 300s per NFR-002)
2. Hydra service restarted, invalidating in-memory tokens
3. Clock skew between services
4. Database connection issues affecting token storage

**Resolution Steps**:

```bash
# 1. Check Hydra service status
docker ps | grep hydra
docker logs alkemio_dev_hydra --tail 50

# 2. Verify Hydra token endpoint
curl http://localhost:4444/oauth2/token

# 3. Check Synapse OIDC configuration
docker exec alkemio_dev_synapse cat /data/homeserver.yaml | grep -A20 "oidc_providers"

# 4. Verify refresh_token_lifetime setting
# Should be ≤ 300s (5 minutes) per NFR-002

# 5. Clear user's Matrix session (force re-authentication)
# Via Synapse Admin API or Element Web Settings → Security
```

**Expected Behavior**:

- Token refresh attempts logged at DEBUG level
- Failed refresh attempts return HTTP 401
- User redirected to OIDC login flow
- New tokens issued after successful re-authentication
- Refresh token lifetime: 300s maximum (NFR-002 compliance)

**Recovery Time**: Immediate upon re-authentication

---

### Scenario 4: Network Interruptions During OIDC Flow

**Symptoms**:

- OAuth2 authorization flow stalls mid-process
- User stuck on redirect loop
- Browser shows "Connection timed out" or "Bad Gateway"
- Server logs show: `ERROR [oidc] Failed to fetch login challenge - challengeId: xyz, errorCode: HYDRA_GET_LOGIN_CHALLENGE_FAILED`

**Root Causes**:

1. Traefik proxy down or misconfigured
2. DNS resolution failure for `hydra`, `kratos`, or `alkemio-server` Docker service names
3. Network partition between Docker containers
4. Firewall blocking OAuth2 callback URLs

**Resolution Steps**:

```bash
# 1. Check all OIDC services running
docker compose -f quickstart-services.yml ps | grep -E "hydra|kratos|traefik|alkemio"

# 2. Verify Docker network connectivity
docker network inspect alkemio_dev_net

# 3. Test inter-container communication
docker exec alkemio_dev_hydra ping -c 3 kratos
docker exec alkemio_dev_hydra ping -c 3 postgres

# 4. Check Traefik routing configuration
docker exec traefik cat /etc/traefik/traefik.yml
docker exec traefik cat /etc/traefik/http.yml | grep -A10 "hydra-public"

# 5. Verify Traefik can reach Hydra
curl -I http://localhost:3000/.well-known/openid-configuration

# 6. Restart all OIDC services in order
docker compose -f quickstart-services.yml restart hydra kratos alkemio-server traefik
```

**Expected Behavior**:

- Network errors logged at ERROR level with stack traces
- User sees "Authentication service temporarily unavailable" (FR-014)
- OAuth2 challenges expire after timeout (default: 10 minutes)
- Expired challenges return HTTP 404 with errorCode: `INVALID_CHALLENGE`

**Recovery Time**: < 2 minutes after network restoration

---

### Scenario 5: Hydra Service Failures

**Symptoms**:

- OAuth2 authorization endpoint returns HTTP 500
- Server logs show: `ERROR [oidc] Failed to fetch login challenge - challengeId: xyz, errorCode: HYDRA_GET_LOGIN_CHALLENGE_FAILED`
- Hydra Admin API calls fail

**Root Causes**:

1. Hydra database (PostgreSQL) connection lost
2. Hydra container out of memory
3. Invalid OAuth2 client configuration
4. Database migration not completed

**Resolution Steps**:

```bash
# 1. Check Hydra container health
docker ps -a | grep hydra
docker logs alkemio_dev_hydra --tail 100

# 2. Verify Hydra database exists
psql -U postgres -d hydra -c '\dt'

# 3. Check Hydra configuration
docker exec alkemio_dev_hydra hydra version

# 4. Verify OAuth2 client registration
curl http://localhost:4445/admin/clients/synapse-client | jq

# 5. Re-run database migration if needed
docker compose -f quickstart-services.yml up hydra-migrate

# 6. Check database connection pool settings
# DSN should include: max_conns=20&max_idle_conns=4&max_conn_lifetime=30m&max_conn_idle_time=5m

# 7. Restart Hydra with clean state
docker compose -f quickstart-services.yml restart hydra
```

**Expected Behavior**:

- Hydra errors logged at ERROR level with HTTP status codes
- alkemio-server catches Hydra API errors and returns user-friendly message
- OAuth2 client registration idempotent via `hydra-client-setup` container
- Database connection resilience via connection pool parameters

**Recovery Time**: < 5 minutes after Hydra restart

---

### Scenario 6: Database Connection Errors

**Symptoms**:

- Multiple services showing database connection failures
- Logs show: `FATAL: database "hydra" does not exist` or `connection refused`
- Services stuck in restart loops

**Root Causes**:

1. PostgreSQL container stopped or crashed
2. Database migration scripts not executed
3. Incorrect database credentials in DSN
4. Stale database connections after PostgreSQL restart

**Resolution Steps**:

```bash
# 1. Check PostgreSQL container status
docker ps | grep postgres
docker logs postgres --tail 50

# 2. Verify databases exist
docker exec -it postgres psql -U postgres -c '\l'
# Should see: synapse, hydra, kratos databases

# 3. If databases missing, check init script execution
docker logs postgres | grep "Multiple database creation"

# 4. Restart PostgreSQL with proper initialization
docker compose -f quickstart-services.yml down postgres
docker volume rm alkemio_postgres_data  # WARNING: Deletes data!
docker compose -f quickstart-services.yml up -d postgres

# 5. Wait for PostgreSQL ready
docker exec postgres pg_isready -U postgres

# 6. Re-run database migrations
docker compose -f quickstart-services.yml up hydra-migrate kratos-migrate

# 7. Restart dependent services
docker compose -f quickstart-services.yml restart hydra kratos synapse
```

**Expected Behavior**:

- Database errors logged at ERROR level with connection details
- Services automatically reconnect via connection pool retry logic
- Migration containers exit with code 0 on success
- Multi-database creation logged: "Multiple databases created"

**Recovery Time**: 5-10 minutes for full recovery with data loss; < 2 minutes for reconnection without data loss

---

## Monitoring & Logging

### Log Analysis Commands

**View all OIDC logs**:

```bash
tail -f /tmp/alkemio-server.log | grep -i "\[oidc\]"
```

**Filter by severity**:

```bash
# Errors only
grep "ERROR \[oidc\]" /tmp/alkemio-server.log | tail -20

# Successful authentications
grep "LOG \[oidc\].*accepted successfully" /tmp/alkemio-server.log | tail -20

# Debug flow details
grep "DEBUG \[oidc\]" /tmp/alkemio-server.log | tail -50
```

**Extract key metrics**:

```bash
# Count errors by type
grep "ERROR \[oidc\]" /tmp/alkemio-server.log | \
  grep -oP "errorCode: \K[A-Z_]+" | sort | uniq -c

# Authentication success rate (last 100 attempts)
grep "\[oidc\]" /tmp/alkemio-server.log | tail -100 | \
  grep -c "accepted successfully"
```

### Required Log Fields (NFR-003)

All OIDC logs include:

- **challengeId**: OAuth2 challenge identifier
- **userId/subject**: User email or identifier (where applicable)
- **timestamp**: ISO 8601 format (e.g., `2025-10-22T00:52:24.330Z`)
- **errorCode**: Error type for failures (e.g., `INVALID_CHALLENGE`, `HYDRA_ERROR`, `KRATOS_UNAVAILABLE`)

**Log Severity Levels**:

- **DEBUG**: OAuth2 flow details, session checks, Hydra API calls
- **WARN**: Non-fatal issues (Kratos failures, missing session data)
- **LOG/INFO**: Successful operations (login accepted, consent accepted)
- **ERROR**: Fatal failures with error codes and stack traces

---

## Health Check Endpoints

Monitor service health:

```bash
# Hydra public API
curl http://localhost:4444/health/ready

# Hydra admin API
curl http://localhost:4445/health/ready

# Kratos public API
curl http://localhost:4433/health/ready

# Kratos admin API
curl http://localhost:4434/health/ready

# Synapse health
curl http://localhost:8008/health

# alkemio-server (check logs for startup)
docker logs alkemio_dev_server | grep "successfully started"
```

**Expected Response**: All endpoints should return HTTP 200 with `{"status":"ok"}` or similar.

---

## Performance Targets

Based on FR-012 and NFR-002:

- **Authentication flow completion**: < 10 seconds end-to-end
- **OAuth2 challenge processing**: < 0.1 seconds (typically 0.05s)
- **Token refresh cycle**: Every 5 minutes (300s per NFR-002)
- **Session termination delay**: < 5 minutes after account deletion (FR-015)
- **Error recovery time**: 2-5 minutes for service failures (FR-014)

---

## Additional Resources

- **Hydra Documentation**: [https://www.ory.sh/docs/hydra/](https://www.ory.sh/docs/hydra/)
- **Kratos Documentation**: [https://www.ory.sh/docs/kratos/](https://www.ory.sh/docs/kratos/)
- **Synapse OIDC Configuration**: [https://matrix-org.github.io/synapse/latest/openid.html](https://matrix-org.github.io/synapse/latest/openid.html)
- **Environment Variables Reference**: [environment-variables.md](./environment-variables.md)
- **Retrospective Learnings**: [retrospective.md](./retrospective.md)
- **US4 Account Linking Guide**: [../tests/US4-account-linking-summary.md](../tests/US4-account-linking-summary.md)

---

**Last Updated**: 2025-10-22
**Status**: Error handling documentation complete (T033c)
