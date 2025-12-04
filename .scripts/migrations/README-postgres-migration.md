# MySQL to PostgreSQL Migration Scripts

This directory contains scripts and documentation for migrating Alkemio data from MySQL to PostgreSQL.

## Overview

The migration process consists of:

1. Exporting data from MySQL using `mysqldump`
2. Transforming the MySQL dump to Postgres-compatible SQL
3. Importing the transformed data into PostgreSQL
4. Verifying data integrity

## Scripts

### mysql-to-postgres-transform.sh

Transforms MySQL SQL dump files to PostgreSQL-compatible format.

**Usage:**

```bash
./mysql-to-postgres-transform.sh <input_mysql.sql> <output_postgres.sql>
```

**What it does:**

- Removes MySQL-specific syntax (ENGINE, CHARSET, etc.)
- Converts MySQL data types to PostgreSQL equivalents:
  - `TINYINT(1)` → `BOOLEAN`
  - `TINYINT` → `SMALLINT`
  - `DATETIME` → `TIMESTAMP`
  - `LONGTEXT` → `TEXT`
- Removes `ON UPDATE CURRENT_TIMESTAMP` (requires triggers in Postgres)
- Converts backticks to double quotes
- Adds Postgres-specific configuration

**Example:**

```bash
# Transform Alkemio database dump
./mysql-to-postgres-transform.sh alkemio_mysql.sql alkemio_postgres.sql

# Import into Postgres
psql -U alkemio -d alkemio < alkemio_postgres.sql
```

## Migration Workflow

### For Alkemio Database

1. **Export from MySQL:**

   ```bash
   docker exec alkemio_dev_mysql mysqldump \
     -u root -p${MYSQL_ROOT_PASSWORD} \
     --single-transaction \
     --quick \
     --lock-tables=false \
     alkemio > alkemio_mysql.sql
   ```

2. **Transform to Postgres:**

   ```bash
   ./mysql-to-postgres-transform.sh alkemio_mysql.sql alkemio_postgres.sql
   ```

3. **Import to Postgres:**
   ```bash
   docker exec -i alkemio_dev_postgres psql \
     -U alkemio -d alkemio < alkemio_postgres.sql
   ```

### For Kratos Database

1. **Export from MySQL:**

   ```bash
   docker exec alkemio_dev_mysql mysqldump \
     -u root -p${MYSQL_ROOT_PASSWORD} \
     --single-transaction \
     --quick \
     --lock-tables=false \
     kratos > kratos_mysql.sql
   ```

2. **Transform to Postgres:**

   ```bash
   ./mysql-to-postgres-transform.sh kratos_mysql.sql kratos_postgres.sql
   ```

3. **Import to Postgres:**
   ```bash
   docker exec -i alkemio_dev_postgres psql \
     -U alkemio -d kratos < kratos_postgres.sql
   ```

## Data Verification

After migration, verify data integrity:

```bash
# Check row counts match
docker exec alkemio_dev_mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} -e \
  "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='alkemio'"

docker exec alkemio_dev_postgres psql -U alkemio -d alkemio -c \
  "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY tablename"
```

## Known Limitations

1. **ON UPDATE CURRENT_TIMESTAMP**: Not directly supported in PostgreSQL. The transformation script removes these clauses. If auto-updating timestamps are critical, you'll need to implement triggers.

2. **UNSIGNED Integers**: PostgreSQL doesn't have unsigned integer types. The transformation removes the UNSIGNED keyword. Verify that data values don't exceed the signed integer range.

3. **Character Sets**: The transformation assumes UTF-8 encoding. If your MySQL database uses a different encoding, additional conversion may be needed.

4. **Stored Procedures/Functions**: MySQL stored procedures are not automatically converted. These need manual migration.

5. **Triggers**: MySQL triggers are not included in standard `mysqldump` output unless `--triggers` is specified, and they need manual conversion to PostgreSQL syntax.

## Troubleshooting

### Error: Invalid syntax near...

Check the transformed SQL file for remaining MySQL-specific syntax that wasn't caught by the transformation script.

### Error: Column does not exist

Verify that column names with special characters are properly quoted with double quotes, not backticks.

### Import hangs or is very slow

- Ensure foreign key checks are disabled during import (script handles this)
- Consider importing in smaller batches for very large databases
- Check available disk space and memory

### Data type mismatch errors

Review the data type transformations and adjust manually if needed for specific columns.

## Best Practices

1. **Test on staging first**: Always test the migration on a staging/test environment before production
2. **Backup everything**: Keep complete backups of both MySQL and Postgres databases
3. **Verify checksums**: Use checksums or row counts to verify data integrity
4. **Monitor performance**: After migration, monitor query performance and optimize indexes if needed
5. **Plan downtime**: Schedule adequate downtime based on your data size and testing results

## Support

For issues or questions about the migration:

- Review the specs/017-postgres-db-convergence/ documentation
- Check the Alkemio developer documentation
- Contact the development team
