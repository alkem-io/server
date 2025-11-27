# PostgreSQL Convergence Migration Scripts

This directory contains scripts for migrating Alkemio and Kratos data from MySQL to PostgreSQL using a CSV-based approach.

## Overview

The migration follows a "schema-first" approach:

1. PostgreSQL schemas are created via TypeORM/Kratos migrations
2. Data is exported from MySQL to CSV files
3. CSV files are imported into PostgreSQL

This approach ensures schema compatibility and proper handling of data types.

## Scripts

### log_migration_run.sh

Logs migration events with timestamps for audit trail.

```bash
./log_migration_run.sh <status> [message]
```

Status values:

- `started` - Beginning migration
- `in_progress` - Migration step in progress
- `completed` - Migration completed successfully
- `rolled_back` - Migration was rolled back
- `failed` - Migration failed

### export_alkemio_mysql_to_csv.sh

Exports all Alkemio tables from MySQL to CSV files.

```bash
./export_alkemio_mysql_to_csv.sh
```

Creates:

- `csv_exports/alkemio/<timestamp>/` directory
- Individual CSV files for each table
- `migration_manifest.json` with export metadata

### export_kratos_mysql_to_csv.sh

Exports all Kratos identity tables from MySQL to CSV files.

```bash
./export_kratos_mysql_to_csv.sh
```

Creates:

- `csv_exports/kratos/<timestamp>/` directory
- Individual CSV files for each table
- `migration_manifest.json` with export metadata

### import_csv_to_postgres_alkemio.sh

Imports Alkemio CSV exports into PostgreSQL.

```bash
./import_csv_to_postgres_alkemio.sh <csv_export_directory>
```

Example:

```bash
./import_csv_to_postgres_alkemio.sh csv_exports/alkemio/20250121_120000
```

### import_csv_to_postgres_kratos.sh

Imports Kratos CSV exports into PostgreSQL.

```bash
./import_csv_to_postgres_kratos.sh <csv_export_directory>
```

Example:

```bash
./import_csv_to_postgres_kratos.sh csv_exports/kratos/20250121_120000
```

## Configuration

Edit `.env` to configure:

- MySQL source connection details
- PostgreSQL target connection details
- Container names
- Export directory paths

## Migration Workflow

### Step 1: Log Migration Start

```bash
./log_migration_run.sh started "Beginning production migration"
```

### Step 2: Export from MySQL

```bash
./export_alkemio_mysql_to_csv.sh
./export_kratos_mysql_to_csv.sh
```

### Step 3: Verify Exports

```bash
# Check manifests
cat csv_exports/alkemio/*/migration_manifest.json
cat csv_exports/kratos/*/migration_manifest.json

# Verify row counts
wc -l csv_exports/alkemio/*/*.csv
wc -l csv_exports/kratos/*/*.csv
```

### Step 4: Prepare PostgreSQL

Ensure PostgreSQL schemas are ready:

```bash
# Alkemio migrations
pnpm run migration:run

# Kratos migrations (via container)
docker compose -f quickstart-services.yml up kratos-migrate
```

### Step 5: Import to PostgreSQL

```bash
./import_csv_to_postgres_alkemio.sh csv_exports/alkemio/<timestamp>
./import_csv_to_postgres_kratos.sh csv_exports/kratos/<timestamp>
```

### Step 6: Verify and Complete

```bash
# Run verification checks
# ...

./log_migration_run.sh completed "All verification checks passed"
```

## Troubleshooting

### Export Fails with "Container not running"

Ensure the MySQL container is running:

```bash
docker ps | grep mysql
```

### Import Fails with "Table does not exist"

Ensure migrations have been applied:

```bash
pnpm run migration:run
```

### Foreign Key Constraint Violations

The import scripts disable constraints during import. If issues persist:

1. Check the error log
2. Verify data integrity in source MySQL
3. Consider manual data cleanup

### CSV Encoding Issues

Ensure consistent UTF-8 encoding:

```bash
file csv_exports/alkemio/*/*.csv
```

## Files Generated

- `csv_exports/` - Directory containing all exports
- `migration_log.json` - Audit log of migration events
- `import_log_*.log` - Detailed import logs
- `import_errors_*.log` - Import error details

## Best Practices

1. **Always backup** both MySQL and PostgreSQL before migration
2. **Test on staging** before production
3. **Verify row counts** after import
4. **Run functional tests** before cutover
5. **Keep MySQL available** for rollback

## Related Documentation

- `docs/DataManagement.md` - Full migration guide
- `specs/018-postgres-db-convergence/quickstart.md` - Quick reference
