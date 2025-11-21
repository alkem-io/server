# Quickstart: Postgres DB Convergence – Schema-First & CSV Data Path

## Prerequisites

- Running MySQL-based Alkemio + Kratos deployment (for migration scenario).
- Target Postgres instance with databases for Alkemio and Kratos.
- Access to this repository with Node 20, pnpm, and Docker installed.
- Docker Compose for orchestrating services.

## Scenario 1: Fresh Postgres-Only Deployment

For new deployments starting directly with PostgreSQL:

### 1. Start PostgreSQL and Services

```bash
# Use the default quickstart which provisions Postgres
cd /path/to/alkemio-server
pnpm run start:services
```

This starts:
- PostgreSQL 17.5 with databases: alkemio, kratos, synapse, hydra
- Ory Kratos (with auto-migrations enabled)
- Redis, RabbitMQ, and other dependencies

### 2. Apply Alkemio Migrations

```bash
# Set Postgres configuration (already default in .env.docker)
export DATABASE_TYPE=postgres
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USERNAME=alkemio
export DATABASE_PASSWORD=alkemio
export DATABASE_NAME=alkemio

# Apply migrations
pnpm run migration:run

# Verify migrations
pnpm run migration:show
```

### 3. Start Alkemio Server

```bash
pnpm start:dev
```

### 4. Verify Deployment

- GraphQL endpoint: http://localhost:3000/graphql
- GraphQL Playground: http://localhost:3000/graphiql
- Kratos Admin: http://localhost:4434/health/ready
- Run smoke tests (see docs/Running.md)

## Scenario 2: Migrate from MySQL to PostgreSQL

For existing MySQL deployments migrating to PostgreSQL:

### Step 1: Prepare Postgres Schemas

**1.1 Start Target Postgres Instance**

```bash
# Use Docker Compose to start Postgres with all required databases
docker compose -f quickstart-services.yml up postgres -d
```

Wait for Postgres to be ready:
```bash
docker exec -it alkemio-serverdev-postgres-1 pg_isready -U alkemio
```

**1.2 Apply Kratos Migrations**

Kratos migrations are applied automatically when the Kratos container starts with the `migrate sql` command:

```bash
# Start Kratos with auto-migration
docker compose -f quickstart-services.yml up kratos -d

# Verify migrations applied
docker exec alkemio-serverdev-postgres-1 \
  psql -U alkemio -d kratos \
  -c "SELECT version FROM _kratos_migrations ORDER BY applied_at DESC LIMIT 5;"
```

**1.3 Apply Alkemio Postgres Baseline Migrations**

```bash
# Set Postgres as target
export DATABASE_TYPE=postgres
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
export DATABASE_USERNAME=alkemio
export DATABASE_PASSWORD=alkemio
export DATABASE_NAME=alkemio

# Apply all migrations to establish baseline
pnpm run migration:run

# Verify all migrations applied
pnpm run migration:show
```

**1.4 Verify Schemas**

```bash
# Run schema contract tests (requires running Postgres)
pnpm run test:ci contract-tests/

# Check schema manually
psql -U alkemio -d alkemio -c "\dt"
psql -U alkemio -d kratos -c "\dt"
```

## Step 2: Export Data from MySQL

1. Run the export script to dump MySQL data into CSV files (users, spaces, memberships, content, identities, etc.).
2. Store CSV files on a mounted filesystem path accessible to the import process.

## Step 3: Import Data into Postgres

1. Run the import script against the prepared Postgres databases, pointing it to the CSV directory.
2. Monitor logs for any constraint violations; the process will fail-fast on the first error.

## Step 4: Verify and Cut Over

1. Execute the migration verification checklist (authentication, space access, content integrity, key authorization flows).
2. If all checks pass, update application configuration to point Alkemio and Kratos to the Postgres databases.
3. If critical issues are found, follow the rollback section of the runbook to return to the MySQL-backed system.
