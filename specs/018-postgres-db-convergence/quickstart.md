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

### Step 2: Export Data from MySQL

Navigate to the migration scripts directory:

```bash
cd .scripts/migrations/postgres-convergence
```

**2.1 Log Migration Start**

```bash
./log_migration_run.sh started "Beginning production migration run"
```

**2.2 Export Alkemio Data**

```bash
# Export all Alkemio tables to CSV
./export_alkemio_mysql_to_csv.sh

# Note the output directory (e.g., csv_exports/alkemio/20251127_160941)
# This directory will contain:
# - Individual CSV files for each table (77 tables)
# - migration_manifest.json with export metadata and row counts
```

The export script automatically:

- Queries MySQL `information_schema` for column types
- Converts UUID columns (`char(36)`) empty strings to NULL using `NULLIF`
- Exports blob/binary columns in hex format with `\x` prefix for PostgreSQL `bytea`
- Preserves empty strings for regular varchar columns

**2.3 Export Kratos Identity Data**

```bash
# Export all Kratos tables to CSV
./export_kratos_mysql_to_csv.sh

# Note the output directory (e.g., csv_exports/kratos/20250121_120000)
```

**2.4 Verify Exports**

```bash
# Check Alkemio manifest
cat csv_exports/alkemio/*/migration_manifest.json | head -30

# Check Kratos manifest
cat csv_exports/kratos/*/migration_manifest.json | head -30

# Spot-check CSV files
head -20 csv_exports/alkemio/*/user.csv
head -20 csv_exports/kratos/*/identities.csv

# Verify total row count (expect ~3.5 million for a typical deployment)
grep -o 'COPY [0-9]*' csv_exports/alkemio/*/import_log_*.log | awk -F: '{sum+=$2} END {print sum}'
```

### Step 3: Import Data into Postgres

**3.1 Import Alkemio Data**

```bash
# Import CSV files into Postgres Alkemio database
./import_csv_to_postgres_alkemio.sh csv_exports/alkemio/20251127_160941

# The import process:
# 1. Copies CSV files to PostgreSQL container (/tmp/csv_import/)
# 2. Skips tables that don't exist in PostgreSQL (challenge, opportunity)
# 3. Generates SQL script with session_replication_role='replica' to disable FK triggers
# 4. Runs TRUNCATE CASCADE + COPY for each table with column mapping
# 5. Updates sequences after import

# Monitor progress - large tables (authorization_policy ~5GB) take several minutes
tail -f csv_exports/alkemio/*/import_log_*.log
```

**3.2 Import Kratos Data**

```bash
# Import CSV files into Postgres Kratos database
./import_csv_to_postgres_kratos.sh csv_exports/kratos/20250121_120000

# Review logs for any issues
```

**3.3 Verify Import Logs**

```bash
# Check Alkemio import summary
tail -50 csv_exports/alkemio/*/import_log_*.log

# Check for COPY success messages (should see row counts)
grep "COPY [0-9]" csv_exports/alkemio/*/import_log_*.log | tail -20

# Check Kratos import log
tail -50 csv_exports/kratos/*/import_log_*.log
```

### Step 4: Verify and Cut Over

**4.1 Database Verification**

```bash
# Compare row counts between MySQL and PostgreSQL
# Alkemio database
docker exec alkemio-serverdev-postgres-1 psql -U alkemio -d alkemio \
  -c "SELECT tablename, n_live_tup as row_count FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY tablename;"

# Kratos database
docker exec alkemio-serverdev-postgres-1 psql -U alkemio -d kratos \
  -c "SELECT tablename, n_live_tup as row_count FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY tablename;"

# Verify foreign key integrity
docker exec alkemio-serverdev-postgres-1 psql -U alkemio -d alkemio \
  -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';"
```

**4.2 Functional Verification**

Follow the migration verification checklist in `docs/DataManagement.md`:

- [ ] Authentication: Users can log in via Kratos
- [ ] Authorization: Role-based access control functions
- [ ] Spaces: Can access and browse spaces
- [ ] Content: Create/edit content works
- [ ] Search: Functionality operates correctly
- [ ] Notifications: Delivered as expected

**4.3 Run Smoke Tests**

```bash
# Run smoke tests from docs/Running.md
# GraphQL endpoint
curl -f http://localhost:3000/graphql

# Kratos health
curl -f http://localhost:4434/health/ready

# Basic GraphQL query
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ platform { configuration { authentication { enabled } } } }"}'
```

**4.4 Cut Over to PostgreSQL**

If all checks pass:

```bash
# Update application configuration to use Postgres permanently
# This is already configured in .env.docker with DATABASE_TYPE=postgres

# Stop services
docker compose -f quickstart-services.yml down

# Remove MySQL container (optional - keep for rollback capability)
# docker compose -f quickstart-services.yml rm mysql

# Restart services with Postgres only
pnpm run start:services

# Start Alkemio server
pnpm start:dev
```

**4.5 Log Migration Completion**

```bash
cd .scripts/migrations/postgres-convergence
./log_migration_run.sh completed "All verification checks passed, cut-over successful"
```

**4.6 Rollback Procedure**

If critical issues are found:

```bash
# Stop all services
docker compose -f quickstart-services.yml down

# Update configuration to use MySQL
export DATABASE_TYPE=mysql

# Restart services
pnpm run start:services
pnpm start:dev

# Log rollback
cd .scripts/migrations/postgres-convergence
./log_migration_run.sh rolled_back "Issue detected: [describe issue], reverted to MySQL"
```

For detailed rollback guidance, see the "Rollback Procedure" section in `docs/DataManagement.md`.
