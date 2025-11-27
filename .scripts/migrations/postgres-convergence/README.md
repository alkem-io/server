# PostgreSQL Convergence Migration Scripts

This directory contains scripts for migrating Alkemio and Kratos data from MySQL to PostgreSQL using a CSV-based approach.

## Overview

The migration follows a "schema-first" approach:

1. PostgreSQL schemas are created via TypeORM/Kratos migrations
2. Data is exported from MySQL to CSV files with proper type handling
3. CSV files are imported into PostgreSQL using server-side COPY

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

Exports all Alkemio tables from MySQL to PostgreSQL-compatible CSV files.

```bash
./export_alkemio_mysql_to_csv.sh
```

Creates:

- `csv_exports/alkemio/<timestamp>/` directory
- Individual CSV files for each table
- `migration_manifest.json` with export metadata and row counts

**Data Type Handling:**

The export script uses MySQL's `information_schema` to determine column types and applies appropriate handling:

| Column Type | Handling | Example |
|-------------|----------|---------|
| `char(36)` (UUIDs) | Empty strings → NULL via `NULLIF` | `IFNULL(NULLIF(CONCAT('"', val, '"'), '""'), '')` |
| `mediumblob`/`blob` | HEX format with `\x` prefix for PostgreSQL `bytea` | `IFNULL(CONCAT('"\\x', HEX(val), '"'), '')` |
| Other columns | Preserve values (empty strings remain empty) | `IFNULL(CONCAT('"', val, '"'), '')` |

This ensures:
- UUID columns receive proper NULL values (not empty strings)
- Binary data is exported in PostgreSQL-compatible hex format
- Regular varchar columns preserve empty strings correctly

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
./import_csv_to_postgres_alkemio.sh csv_exports/alkemio/20251127_160941
```

**Import Process:**

1. Copies all CSV files to the PostgreSQL container (`/tmp/csv_import/`)
2. Checks which tables exist in PostgreSQL (skips `challenge` and `opportunity` if absent)
3. Generates a single SQL import script with:
   - `session_replication_role = 'replica'` to disable FK triggers
   - `TRUNCATE CASCADE` for each table
   - `COPY ... FROM ... WITH (FORMAT csv, HEADER true, NULL '\N')` with explicit column list
   - Sequence updates after import
4. Executes the script in a single psql session

**Key Features:**

- **Server-side COPY**: Uses PostgreSQL's native `COPY` command (not `\COPY`) since files are inside the container
- **Column mapping**: Reads column names from CSV header to handle column order mismatches
- **FK constraint handling**: Disables triggers via `session_replication_role = 'replica'`
- **Atomic execution**: All imports run in a single session for consistent state

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

Default configuration:

```bash
# MySQL Source
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=toor
MYSQL_CONTAINER=alkemio_dev_mysql

# PostgreSQL Target
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=synapse
POSTGRES_PASSWORD=synapse
POSTGRES_CONTAINER=alkemio_dev_postgres

# Databases
ALKEMIO_DB=alkemio
KRATOS_DB=kratos
```

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
# Verify row counts match
docker exec alkemio_dev_mysql mysql -uroot -ptoor -N -e \
  "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='alkemio' ORDER BY table_name;"

docker exec alkemio_dev_postgres psql -U synapse -d alkemio -c \
  "SELECT tablename, n_live_tup FROM pg_stat_user_tables ORDER BY tablename;"

# Log completion
./log_migration_run.sh completed "All verification checks passed"
```

## Troubleshooting

### Export Fails with "Container not running"

Ensure the MySQL container is running:

```bash
docker ps | grep mysql
```

### Import Fails with "Table does not exist"

The import script automatically skips tables that don't exist in PostgreSQL (e.g., `challenge`, `opportunity`). If other tables are missing, ensure migrations have been applied:

```bash
pnpm run migration:run
```

### Invalid UUID Error

If you see errors like `invalid input syntax for type uuid: "some-name-id"`:

1. Check for data quality issues in MySQL where UUID columns contain non-UUID values
2. Fix the data in MySQL before re-exporting:

```sql
-- Example: Fix vc_interaction with nameID instead of UUID
UPDATE vc_interaction vi
JOIN virtual_contributor vc ON vi.virtualContributorID = vc.nameID
SET vi.virtualContributorID = vc.id
WHERE vi.virtualContributorID NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

### bytea/blob Import Errors

Binary columns (like `memo.content`) are exported in hex format with `\x` prefix. If you see encoding errors:

1. Verify the export script is using `HEX()` for blob columns
2. Check the CSV file contains values like `"\x48656C6C6F"` (not raw binary)

### Foreign Key Constraint Violations

The import scripts disable FK triggers using `session_replication_role = 'replica'`. If you still see violations:

1. Check the error log for the specific constraint
2. Verify data integrity in source MySQL
3. Ensure the parent table is imported before the child table

### Large Table Import Takes Long

The `authorization_policy` table can be 5GB+ and takes several minutes to copy to the container. This is expected:

```bash
# Monitor file copy progress
docker exec alkemio_dev_postgres ls -lh /tmp/csv_import/authorization_policy.csv
```

### CSV Encoding Issues

Ensure consistent UTF-8 encoding:

```bash
file csv_exports/alkemio/*/*.csv
```

## Files Generated

- `csv_exports/` - Directory containing all exports
  - `alkemio/<timestamp>/` - Alkemio database exports
  - `kratos/<timestamp>/` - Kratos database exports
- `migration_log.json` - Audit log of migration events
- `import_log_*.log` - Detailed import logs with COPY results
- `import_script_*.sql` - Generated SQL import script (for debugging)

## Verified Migration Results

The scripts have been successfully tested with:

| Metric | Value |
|--------|-------|
| **Alkemio tables exported** | 77 |
| **Alkemio tables imported** | 75 (2 skipped: `challenge`, `opportunity`) |
| **Total rows** | 3,497,287 |
| **Failed tables** | 0 |
| **Import time** | ~5 minutes (including 5GB authorization_policy) |

Key tables verified with exact row count matches:
- `user`: 2,073
- `authorization_policy`: 1,670,243
- `vc_interaction`: 537
- `memo` (bytea column): 99

## Best Practices

1. **Always backup** both MySQL and PostgreSQL before migration
2. **Test on staging** before production
3. **Verify row counts** after import
4. **Run functional tests** before cutover
5. **Keep MySQL available** for rollback
6. **Check for data quality issues** before migration (invalid UUIDs, orphaned records)

## Related Documentation

- `docs/DataManagement.md` - Full migration guide with runbook
- `specs/018-postgres-db-convergence/quickstart.md` - Quick reference
