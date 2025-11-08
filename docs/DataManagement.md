# Alkemio Server Configuration

This document provides an overview of data management within the Alkemio Server.

## Migrations

Database synchronization is switched off and migrations are applied manually (or with scripts as part of the docker images).

**NB! Migrations use TypeORM CLI. Dependencies and environment variables are not loaded using nestJs - you will need the mySQL configuration in .env file in order to run the migrations locally.**

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

### Migration Audit & Validation

For migrations that backfill or modify critical user data (e.g., `userAuthIdBackfill`), validation scripts capture audit artifacts:

1. **Run validation script**: `.scripts/migrations/run_validate_migration.sh` snapshots the database, applies the migration, exports affected records to CSV, compares against reference data, and restores the backup.
2. **Review audit table**: Check `user_authid_backfill_audit` for any unresolved identities after running the migration on staging or production.
3. **Follow-up on failures**: For users in the audit table with `resolution_status = 'failed'`, investigate Kratos identity mismatches manually using the Kratos admin API or support tooling.
4. **Cleanup audit data**: Retain the audit table for at least 90 days post-migration for investigation purposes, then archive or drop as per data retention policy.

**Example**: After deploying the `userAuthIdBackfill` migration to production, run:

```sql
SELECT user_id, email, kratos_error, resolution_status, attempted_at
FROM user_authid_backfill_audit
WHERE resolution_status != 'success'
ORDER BY attempted_at DESC;
```

Document any patterns (e.g., deleted Kratos identities, network timeouts) and escalate recurring issues to the platform team.

## MySQL Server

The server used by Alkemio is MySql.

There is specific configuration for version 8 which needs to be specified if not using the pre-supplied docker setup.

MySQL version 8 by default use `caching_sha2_password` password validation plugin that is not supported by typeORM. The plugin must be changed to 'mysql_native_password'. It can be done per user or default for the server.

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
