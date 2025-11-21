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

#### Migration Scripts Location

All migration tooling is located in `.scripts/migrations/postgres-convergence/`:
- `export_alkemio_mysql_to_csv.sh` - Export Alkemio data from MySQL
- `export_kratos_mysql_to_csv.sh` - Export Kratos identity data from MySQL
- `import_csv_to_postgres_alkemio.sh` - Import Alkemio data into Postgres
- `import_csv_to_postgres_kratos.sh` - Import Kratos data into Postgres
- `log_migration_run.sh` - Capture migration metadata and outcomes

For detailed step-by-step instructions, see `specs/018-postgres-db-convergence/quickstart.md`.

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

