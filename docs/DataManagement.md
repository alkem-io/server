# Alkemio Server Configuration

This document provides an overview of data management within the Alkemio Server.

## Database Backend

**Alkemio now uses PostgreSQL 17.5 as the default database backend.** MySQL support is maintained for backward compatibility but is deprecated.

## Migrations

Database synchronization is switched off and migrations are applied manually (or with scripts as part of the docker images).

**NB! Migrations use TypeORM CLI. Dependencies and environment variables are not loaded using NestJS.**

### For PostgreSQL (Default):
You will need the PostgreSQL configuration in your `.env` file:
```
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=alkemio
DATABASE_PASSWORD=alkemio
DATABASE_NAME=alkemio
```

### For MySQL (Legacy):
You will need the MySQL configuration in your `.env` file:
```
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
MYSQL_ROOT_PASSWORD=toor
MYSQL_DATABASE=alkemio
```

Generate new migration with name 'migration_name' after schema change:

```bash
pnpm run migration:generate -n [migration_name]
```

To apply migrations:

```bash
pnpm run migration:run
```

To revert migrations:

```bash
pnpm run migration:revert
```

To show status of migrations and see which migrations are pending and which migrations have been applied:

```bash
pnpm run migration:show
```

**NB! Running untested migrations automatically may result in a data loss!**

## PostgreSQL Server (Default)

Alkemio uses PostgreSQL 17.5 as the primary database backend for both the Alkemio application and Ory Kratos identity service.

### Supported PostgreSQL Versions

**Target Version**: PostgreSQL 17.5

**Minimum Supported Version**: PostgreSQL 14.x

The Postgres convergence strategy is tested and officially supported on PostgreSQL 17.5. While scripts and migrations maintain compatibility with PostgreSQL 14.x and above, PostgreSQL 17.5 is the recommended and officially supported version for production deployments. This aligns with current cloud provider offerings and maintained PostgreSQL versions.

### Database Structure

The default Docker Compose setup automatically provisions PostgreSQL with the required databases:
- `alkemio` - Main application database
- `kratos` - Ory Kratos identity database
- `hydra` - Ory Hydra OAuth2 database
- `synapse` - Matrix Synapse messaging database

For PostgreSQL in docker:

```bash
docker run --name alkemio-postgres \
-p 5432:5432 \
-e POSTGRES_USER=alkemio \
-e POSTGRES_PASSWORD=alkemio \
-e POSTGRES_DB=alkemio \
-d postgres:17.5
```

### Kratos Identity Schema on PostgreSQL

Ory Kratos, the identity and user management system used by Alkemio, provides official PostgreSQL migration support.

#### Applying Kratos Migrations

**Option 1: Automatic Migration on Container Startup** (Recommended)

The easiest approach is to configure the Kratos container to automatically apply migrations on startup:

```yaml
# docker-compose.yml or similar
kratos:
  image: oryd/kratos:v1.0.0
  command:
    - serve
    - --config
    - /etc/config/kratos/kratos.yml
    - migrate
    - sql
    - -e
    - --yes
  environment:
    - DSN=postgres://alkemio:alkemio@postgres:5432/kratos?sslmode=disable
```

**Option 2: Manual Migration**

Apply migrations manually using the Kratos CLI:

```bash
# Using Docker
docker exec -it kratos kratos migrate sql -e --yes \
  --config /etc/config/kratos/kratos.yml

# Or using Kratos binary directly
kratos migrate sql -e --yes \
  --config /path/to/kratos.yml
```

#### Verifying Kratos Schema

After applying migrations, verify the Kratos database schema:

```sql
-- Check migration status
SELECT * FROM _kratos_migrations ORDER BY applied_at DESC;

-- Verify core tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('identities', 'identity_credentials', 'sessions', 
                     'identity_credential_identifiers', 'session_devices',
                     'identity_verifiable_addresses', 'identity_recovery_addresses')
ORDER BY table_name;

-- Check identity count
SELECT COUNT(*) as identity_count FROM identities;
```

#### Kratos Configuration for PostgreSQL

Ensure your Kratos configuration (`kratos.yml`) includes the correct DSN:

```yaml
dsn: postgres://username:password@host:port/database?sslmode=disable

# For production, use secure connections:
dsn: postgres://username:password@host:port/database?sslmode=require
```

#### Migration Documentation

For detailed Kratos migration documentation, see:
- Official Kratos Documentation: https://www.ory.sh/docs/kratos/manage-identities/migrations
- Kratos GitHub: https://github.com/ory/kratos

## MySQL Server (Legacy - Deprecated)

MySQL 8 support is maintained for backward compatibility but is deprecated.

**Note:** MySQL version 8 by default uses `caching_sha2_password` password validation plugin that is not supported by TypeORM. The plugin must be changed to 'mysql_native_password'. It can be done per user or default for the server.

If the server is already up and running create new user:

```sql
CREATE USER 'nativeuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
```

or alter existing one:

```sql
ALTER USER 'nativeuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
```

For MySQL in docker:

```bash
docker run --name some-mysql \
-p 3306:3306 \
-e MYSQL_ROOT_PASSWORD=my-secret-pw \
-d mysql \
--default-authentication-plugin=mysql_native_password
```

## MySQL to PostgreSQL Migration

### Overview: Schema-First + CSV Data Migration

Alkemio provides a robust migration path from MySQL to PostgreSQL using a **schema-first approach** combined with **CSV-based data migration**. This strategy ensures data integrity, repeatability, and operator control throughout the convergence process.

#### Migration Strategy

The migration follows three key principles:

1. **Schema-First Baseline**: PostgreSQL schemas are established independently using:
   - **Alkemio**: TypeORM baseline migration generating a clean Postgres-native schema
   - **Kratos**: Official Ory Kratos migrations applied directly to PostgreSQL
   
2. **CSV-Based Data Transfer**: Data moves from MySQL to PostgreSQL via CSV files:
   - Widely supported format, easy to inspect and validate
   - Technology-agnostic intermediate representation
   - Enables transformation and validation before import
   
3. **Fail-Fast Integrity**: Import process fails immediately on constraint violations:
   - Zero tolerance for data corruption or silent failures
   - Clear error reporting for debugging
   - Ensures referential integrity and data quality

#### Migration Pipeline

The complete migration follows these phases:

**Phase 1: Schema Preparation**
- Apply official Kratos migrations to Postgres Kratos database
- Apply Alkemio Postgres baseline migration to Postgres Alkemio database
- Validate schemas using contract tests and migration validation scripts

**Phase 2: Data Export**
- Export MySQL data to CSV files using provided export scripts
- Store CSV files on mounted filesystem accessible to import process
- CSV files include: users, spaces, memberships, content, identities, and all core entities

**Phase 3: Data Import**
- Import CSV files into prepared Postgres databases
- Scripts monitor for constraint violations and fail-fast on errors
- Comprehensive logging for troubleshooting

**Phase 4: Verification & Cut-Over**
- Execute migration verification checklist (see below)
- Validate authentication, authorization, and core features
- Update application configuration to point to Postgres databases
- Follow rollback procedure if critical issues are found

#### Prerequisites

Before starting the migration:
- Running MySQL-based Alkemio + Kratos deployment
- Target PostgreSQL instance (recommended: 17.5) with databases created
- Sufficient disk space for CSV exports (~1.5x your MySQL data size)
- Maintenance window scheduled (target: ≤30 minutes hard downtime)
- Backup of MySQL databases
- Tested rollback procedure

#### CSV File Format and Conventions

The migration uses CSV (Comma-Separated Values) files as the intermediate format:

**File Naming Convention:**
- Format: `<table_name>.csv`
- Example: `user.csv`, `space.csv`, `identities.csv`
- Manifest file: `migration_manifest.json` (contains export metadata)

**CSV Format Specifications:**
- **Delimiter**: Comma (`,`)
- **Quote Character**: Double quote (`"`)
- **NULL Representation**: `\N` (PostgreSQL standard)
- **Header Row**: Present in all files
- **Character Encoding**: UTF-8
- **Line Endings**: Unix-style (`\n`)

**Required Columns:**
- All columns from source table except audit fields (createdDate, updatedDate, version)
- Columns must match target Postgres schema

**Data Type Representations:**
- **Booleans**: `t` (true) or `f` (false) for Postgres; `1` or `0` in MySQL exports
- **Timestamps**: ISO 8601 format with timezone (e.g., `2024-01-15T10:30:00Z`)
- **UUIDs**: Standard 8-4-4-4-12 format (lowercase)
- **JSON**: Escaped JSON strings (double-quotes doubled: `{{""key"":""value""}}`)
- **NULL Values**: `\N` (no quotes)
- **Empty Strings**: `""` (quoted empty string)

**Migration Manifest Structure:**
```json
{
  "migrationId": "unique-run-id",
  "sourceDatabase": "mysql",
  "targetDatabase": "postgres",
  "exportTimestamp": "2025-01-21T12:00:00Z",
  "tables": [
    {"name": "user", "rowCount": 1500, "file": "user.csv"},
    {"name": "space", "rowCount": 450, "file": "space.csv"}
  ]
}
```

The manifest provides:
- Unique migration run identifier
- Export timestamp for traceability
- Row counts for validation
- Complete list of exported tables

#### Migration Scripts Location

All migration tooling is located in `.scripts/migrations/postgres-convergence/`:
- `export_alkemio_mysql_to_csv.sh` - Export Alkemio data from MySQL
- `export_kratos_mysql_to_csv.sh` - Export Kratos identity data from MySQL
- `import_csv_to_postgres_alkemio.sh` - Import Alkemio data into Postgres
- `import_csv_to_postgres_kratos.sh` - Import Kratos data into Postgres
- `log_migration_run.sh` - Capture migration metadata and outcomes
- `README.md` - Detailed script documentation

For detailed step-by-step instructions, see `specs/018-postgres-db-convergence/quickstart.md`.
For complete CSV format documentation, see `specs/018-postgres-db-convergence/data-model.md`.

### Complete Migration Runbook

This runbook provides a detailed, step-by-step procedure for migrating from MySQL to PostgreSQL in a production environment.

#### Pre-Migration Phase (1-2 weeks before)

**1. Environment Preparation**

- [ ] Schedule maintenance window (recommended: ≤30 minutes hard downtime)
- [ ] Notify stakeholders of migration schedule
- [ ] Prepare PostgreSQL target environment (development/staging/production)
- [ ] Install required tools: pnpm, Docker, PostgreSQL client
- [ ] Verify disk space: need ~1.5x current MySQL data size
- [ ] Review and update `.env` configuration for PostgreSQL

**2. Rehearsal on Staging**

- [ ] Clone production MySQL to staging environment
- [ ] Perform complete migration on staging (schemas + data)
- [ ] Run full verification checklist
- [ ] Measure actual migration time
- [ ] Document any issues encountered
- [ ] Test rollback procedure
- [ ] Get stakeholder sign-off on staging results

**3. Backup Strategy**

- [ ] Create full MySQL backup (Alkemio + Kratos)
- [ ] Test MySQL backup restoration
- [ ] Document backup location and access procedures
- [ ] Verify backup retention policy
- [ ] Create snapshot of current running environment

#### Migration Day - T-Minus Preparation

**4. Final Checks (1 hour before)**

- [ ] Verify PostgreSQL is running and healthy
- [ ] Verify MySQL backup is current and accessible
- [ ] Verify all scripts are executable and tested
- [ ] Confirm stakeholder availability for approval
- [ ] Clear any unnecessary background jobs
- [ ] Document current system metrics (performance baseline)

**5. Communication**

- [ ] Send "migration starting" notification to users
- [ ] Display maintenance mode message (if applicable)
- [ ] Prepare status update channels (Slack, email, etc.)

#### Migration Execution Phase

**6. Stop Application Services**

```bash
# Stop Alkemio server
pkill -f "node.*alkemio"

# Stop dependent services (if needed)
docker compose -f quickstart-services.yml down

# Verify no active connections to MySQL
docker exec mysql-container mysql -u root -p -e "SHOW PROCESSLIST"
```

**7. Export MySQL Data**

```bash
cd .scripts/migrations/postgres-convergence

# Log migration start (T-0)
./log_migration_run.sh started "Production migration - Target: ≤30min downtime"

# Start timer
START_TIME=$(date +%s)

# Export Alkemio (expected: 5-10 minutes depending on data size)
./export_alkemio_mysql_to_csv.sh
ALKEMIO_EXPORT_DIR=$(ls -td csv_exports/alkemio/* | head -1)
echo "Alkemio export: ${ALKEMIO_EXPORT_DIR}"

# Export Kratos (expected: 1-2 minutes)
./export_kratos_mysql_to_csv.sh
KRATOS_EXPORT_DIR=$(ls -td csv_exports/kratos/* | head -1)
echo "Kratos export: ${KRATOS_EXPORT_DIR}"

# Check elapsed time
EXPORT_END=$(date +%s)
echo "Export duration: $((EXPORT_END - START_TIME)) seconds"
```

**8. Verify Exports**

```bash
# Quick validation
cat "${ALKEMIO_EXPORT_DIR}/migration_manifest.json" | jq '.tables | length'
cat "${KRATOS_EXPORT_DIR}/migration_manifest.json" | jq '.tables | length'

# Check critical tables
ls -lh "${ALKEMIO_EXPORT_DIR}"/{user,space,organization}.csv
ls -lh "${KRATOS_EXPORT_DIR}"/identities.csv

# If exports look wrong, STOP and investigate
```

**9. Apply PostgreSQL Schemas**

```bash
# Start PostgreSQL services
docker compose -f quickstart-services.yml up postgres kratos -d

# Wait for services to be ready (max 30 seconds)
timeout 30 docker exec postgres pg_isready -U alkemio

# Apply Alkemio migrations
export DATABASE_TYPE=postgres
export DATABASE_HOST=localhost
export DATABASE_PORT=5432
pnpm run migration:run

# Verify Kratos migrations (auto-applied on container start)
docker logs kratos | grep -i "migration"

# Check elapsed time
SCHEMA_END=$(date +%s)
echo "Schema setup duration: $((SCHEMA_END - EXPORT_END)) seconds"
```

**10. Import Data into PostgreSQL**

```bash
# Import Alkemio data (expected: 10-15 minutes)
./import_csv_to_postgres_alkemio.sh "${ALKEMIO_EXPORT_DIR}"

# Check import log immediately
tail -50 "${ALKEMIO_EXPORT_DIR}/import_log_"*.log

# If import failed, STOP, review errors, and consider rollback

# Import Kratos data (expected: 2-3 minutes)
./import_csv_to_postgres_kratos.sh "${KRATOS_EXPORT_DIR}"

# Check elapsed time
IMPORT_END=$(date +%s)
echo "Import duration: $((IMPORT_END - SCHEMA_END)) seconds"
echo "Total migration time: $((IMPORT_END - START_TIME)) seconds"
```

**11. Quick Verification**

```bash
# Verify row counts (critical tables)
docker exec postgres psql -U alkemio -d alkemio -c \
  "SELECT tablename, n_live_tup FROM pg_stat_user_tables WHERE tablename IN ('user','space','organization') ORDER BY tablename;"

docker exec postgres psql -U alkemio -d kratos -c \
  "SELECT COUNT(*) as identity_count FROM identities;"

# If counts are way off, STOP and investigate
```

#### Post-Migration Verification Phase

**12. Start Services on PostgreSQL**

```bash
# Update configuration to use Postgres permanently
export DATABASE_TYPE=postgres

# Start all services
docker compose -f quickstart-services.yml up -d

# Start Alkemio server
pnpm start &

# Wait for server to be ready (max 60 seconds)
timeout 60 bash -c 'until curl -sf http://localhost:3000/graphql; do sleep 2; done'
```

**13. Run Smoke Tests**

```bash
# Health checks
curl -f http://localhost:3000/graphql || echo "GraphQL FAILED"
curl -f http://localhost:4434/health/ready || echo "Kratos FAILED"

# Basic functionality
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ platform { configuration { authentication { enabled } } } }"}' \
  | jq .

# If smoke tests fail, STOP and prepare for rollback
```

**14. Execute Verification Checklist**

- [ ] Run complete verification checklist: `specs/018-postgres-db-convergence/verification-checklist.md`
- [ ] Test authentication with 3 different user accounts
- [ ] Verify critical operations (view spaces, access content, create post)
- [ ] Check application logs for errors
- [ ] Monitor performance for 10 minutes

**15. Go/No-Go Decision**

**If all checks pass:**
- [ ] Log migration success: `./log_migration_run.sh completed "All checks passed"`
- [ ] Send "migration successful" notification to users
- [ ] Remove maintenance mode message
- [ ] Begin post-migration monitoring (see below)

**If critical issues found:**
- [ ] Execute rollback procedure (see below)
- [ ] Document issues encountered
- [ ] Schedule follow-up migration attempt

#### Post-Migration Monitoring

**First 24 Hours:**
- [ ] Check application logs every 2 hours
- [ ] Monitor error rates and response times
- [ ] Watch for user-reported issues
- [ ] Verify data consistency periodically
- [ ] Keep MySQL backup readily accessible

**First Week:**
- [ ] Daily health checks
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Document any anomalies

**First Month:**
- [ ] Weekly system checks
- [ ] Review performance trends
- [ ] Optimize queries if needed
- [ ] Consider MySQL decommissioning after 30 days

#### Rollback Procedure

**Decision Criteria for Rollback:**

Initiate rollback if any of the following occur:
- Data import fails with constraint violations
- Row count discrepancies > 1% for critical tables
- Authentication/authorization completely broken
- Data corruption detected
- Performance degradation > 50% of baseline
- Cannot meet downtime window target

**Rollback Steps:**

**1. Stop All Services Immediately**
```bash
# Log rollback decision
cd .scripts/migrations/postgres-convergence
./log_migration_run.sh rolled_back "Reason: [describe critical issue]"

# Stop Alkemio server
pkill -f "node.*alkemio"

# Stop PostgreSQL services
docker compose -f quickstart-services.yml down postgres kratos
```

**2. Restore MySQL Configuration**
```bash
# Switch back to MySQL
export DATABASE_TYPE=mysql
export DATABASE_HOST=localhost
export MYSQL_DB_PORT=3306

# Update .env if needed
# Verify configuration
env | grep DATABASE
```

**3. Start MySQL Services**
```bash
# Start MySQL and dependent services
docker compose -f quickstart-services.yml up mysql kratos -d

# Wait for MySQL to be ready
timeout 30 bash -c 'until docker exec mysql-container mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SELECT 1"; do sleep 2; done'
```

**4. Verify MySQL Data Integrity**
```bash
# Check critical tables
docker exec mysql-container mysql -u root -p${MYSQL_ROOT_PASSWORD} alkemio \
  -e "SELECT COUNT(*) as user_count FROM user;"

docker exec mysql-container mysql -u root -p${MYSQL_ROOT_PASSWORD} kratos \
  -e "SELECT COUNT(*) as identity_count FROM identities;"

# Verify backup timestamp matches expected
```

**5. Restart Application**
```bash
# Start Alkemio server with MySQL
pnpm start &

# Wait for server to be ready
timeout 60 bash -c 'until curl -sf http://localhost:3000/graphql; do sleep 2; done'

# Run quick smoke tests
curl -f http://localhost:3000/graphql
curl -f http://localhost:4433/health/ready
```

**6. Verify Functionality**
```bash
# Test authentication
# Test space access
# Test content operations
# Check logs for errors

# Monitor for 10 minutes to ensure stability
```

**7. Communication**
```bash
# Notify stakeholders of rollback
# Update status channels
# Remove maintenance mode
# Schedule post-mortem

# Document what went wrong
# Capture logs and error messages
# Plan fixes for next migration attempt
```

**8. Post-Rollback Actions**
- [ ] Document root cause of rollback
- [ ] Analyze what went wrong
- [ ] Fix identified issues
- [ ] Test fixes on staging
- [ ] Schedule new migration window (if proceeding)
- [ ] Update runbook with lessons learned

**Rollback Time Estimate:** 10-15 minutes

**Data Loss Considerations:**
- Rollback returns to MySQL state at time of export
- Any changes made during migration window are lost
- Users should be warned about potential data loss window

### Migration Verification Checklist

After migrating from MySQL to PostgreSQL, use this checklist to verify data integrity and system functionality.

#### Critical Data Verification

Run the following checks to ensure data was migrated correctly:

**1. Table Row Count Comparison**
```sql
-- MySQL
SELECT table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = 'alkemio' 
ORDER BY table_name;

-- PostgreSQL
SELECT schemaname, tablename, n_live_tup as approximate_row_count
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

**2. Critical Tables Verification**
Ensure the following critical tables exist and have data:
- [ ] `user` - User accounts
- [ ] `space` - Spaces/communities
- [ ] `organization` - Organizations
- [ ] `profile` - User profiles
- [ ] `authorization_policy` - Authorization rules
- [ ] `credential` - User credentials
- [ ] `reference` - References/links
- [ ] `tagset` - Tags and classifications
- [ ] `callout` - Callouts/content
- [ ] `post` - Posts and discussions
- [ ] `comment` - Comments
- [ ] `activity_log` - Activity logs

**3. Foreign Key Integrity**
```sql
-- Check for orphaned records (example for users)
SELECT COUNT(*) FROM "user" u 
LEFT JOIN profile p ON u."profileId" = p.id 
WHERE p.id IS NULL;
```

**4. Data Sampling**
Manually verify a sample of records from key tables to ensure:
- UUIDs are preserved
- Text content is intact
- Timestamps are correctly converted
- JSON/JSONB fields are valid

#### Functional Verification

**Authentication & Authorization:**
- [ ] Users can log in via Kratos
- [ ] Session management works correctly
- [ ] Authorization policies are enforced
- [ ] Role-based access control functions

**Core Features:**
- [ ] GraphQL API responds correctly
- [ ] Spaces are accessible
- [ ] User profiles load and display correctly
- [ ] Content creation/editing works
- [ ] File uploads/downloads function
- [ ] Search functionality operates
- [ ] Notifications are delivered

**Data Relationships:**
- [ ] User-Space memberships are intact
- [ ] Organization hierarchies are correct
- [ ] Content ownership is preserved
- [ ] Comments are linked to correct posts
- [ ] Tags and references are maintained

#### Performance Verification

**Database Performance:**
```sql
-- Check for missing indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check query performance (run sample queries)
EXPLAIN ANALYZE SELECT * FROM "user" WHERE email = 'test@example.com';
```

**Connection Pool:**
- [ ] Database connections are stable
- [ ] No connection pool exhaustion
- [ ] Query latency is acceptable

**Application Metrics:**
- [ ] API response times are within normal range
- [ ] Error rates are not elevated
- [ ] Memory usage is stable

#### Kratos Identity Verification

**Kratos Database:**
- [ ] Identity records exist
- [ ] Credentials are preserved
- [ ] Sessions can be created/validated
- [ ] Recovery flows work
- [ ] Verification flows work

```sql
-- Verify Kratos identities
SELECT COUNT(*) FROM identities;
SELECT COUNT(*) FROM identity_credentials;
```

### Migration Issues and Resolutions

**Common issues and their solutions:**

1. **Timestamp Precision**: Postgres may store timestamps with different precision than MySQL
   - **Solution**: Verify timestamp fields display correctly in the UI; adjust queries if needed

2. **Boolean Values**: MySQL's `TINYINT(1)` becomes Postgres `BOOLEAN`
   - **Solution**: Ensure application code handles boolean types correctly

3. **Character Encoding**: Ensure UTF-8 encoding is consistent
   - **Solution**: Set `client_encoding = 'UTF8'` in Postgres connection

4. **AUTO_INCREMENT vs SERIAL**: Postgres sequences may need reset after import
   - **Solution**: Run sequence update script (included in transformation script)

### Rollback Procedure

If critical issues are discovered:

1. **Stop all services:**
   ```bash
   docker compose -f quickstart-services.yml down
   ```

2. **Restore original MySQL configuration** in `.env.docker`:
   ```bash
   DATABASE_TYPE=mysql
   DATABASE_HOST=mysql
   ```

3. **Verify MySQL data is intact**

4. **Restart services with MySQL:**
   ```bash
   docker compose -f quickstart-services.yml up -d
   ```

5. **Document issues** for investigation and retry planning

### Post-Migration Monitoring

Monitor the following for 24-48 hours after migration:

- **Error Logs**: Watch for database-related errors
- **Performance Metrics**: Track query response times
- **User Reports**: Monitor for user-reported issues
- **Data Consistency**: Run periodic integrity checks

### Migration Success Criteria

The migration is considered successful when:
- [ ] All critical data verification checks pass
- [ ] All functional verification checks pass
- [ ] Performance is equal to or better than MySQL
- [ ] No critical errors in logs for 24 hours
- [ ] User-facing functionality works without issues
- [ ] Monitoring shows stable system metrics

