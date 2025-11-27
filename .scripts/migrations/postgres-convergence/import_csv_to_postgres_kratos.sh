#!/bin/bash
# import_csv_to_postgres_kratos.sh - Import Kratos CSV exports into PostgreSQL
# Usage: ./import_csv_to_postgres_kratos.sh <csv_export_directory>
#
# IMPORTANT: Kratos must have already applied its migrations to the target database
# before running this script. The schema should already exist.

set -e

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables
source "$BASE_DIR/.env"

# Validate arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <csv_export_directory>"
    echo "Example: $0 csv_exports/kratos/20250121_120000"
    exit 1
fi

EXPORT_DIR="$1"
IMPORT_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${EXPORT_DIR}/import_log_${IMPORT_TIMESTAMP}.log"
SQL_FILE="${EXPORT_DIR}/import_script_${IMPORT_TIMESTAMP}.sql"

# PostgreSQL connection details
PG_USER="${POSTGRES_USER}"
PG_PASSWORD="${POSTGRES_PASSWORD}"
DATABASE="${POSTGRES_KRATOS_DATABASE}"
CONTAINER="${POSTGRES_CONTAINER}"

echo "========================================="
echo "Kratos CSV to PostgreSQL Import"
echo "========================================="
echo "Import timestamp: ${IMPORT_TIMESTAMP}"
echo "Source directory: ${EXPORT_DIR}"
echo "Target database: ${DATABASE}"
echo "Container: ${CONTAINER}"
echo "Log file: ${LOG_FILE}"
echo ""

# Initialize log
echo "Import started at $(date)" > "${LOG_FILE}"
echo "Source: ${EXPORT_DIR}" >> "${LOG_FILE}"
echo "Target: ${DATABASE}" >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

# Check if export directory exists
if [ ! -d "$EXPORT_DIR" ]; then
    echo "Error: Export directory '${EXPORT_DIR}' not found"
    exit 1
fi

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "Error: PostgreSQL container '${CONTAINER}' is not running"
    echo "Please start the PostgreSQL container first"
    exit 1
fi

# Check if Kratos database exists and has tables
echo "Checking Kratos database schema..."
TABLES_EXIST=$(docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ -z "$TABLES_EXIST" ] || [ "$TABLES_EXIST" -eq 0 ]; then
    echo "Error: Kratos database has no tables"
    echo "Please ensure Kratos migrations have been applied first:"
    echo "  docker compose -f quickstart-services.yml up kratos-migrate"
    exit 1
fi

echo "Found ${TABLES_EXIST} tables in Kratos database"

# Get list of CSV files
CSV_FILES=$(ls "${EXPORT_DIR}"/*.csv 2>/dev/null || true)

if [ -z "$CSV_FILES" ]; then
    echo "Error: No CSV files found in ${EXPORT_DIR}"
    exit 1
fi

FILE_COUNT=$(echo "$CSV_FILES" | wc -l)
echo "Found ${FILE_COUNT} CSV files to import"
echo ""

# Tables to skip (managed by Kratos migrations)
SKIP_TABLES=("schema_migration" "_kratos_migrations")

# Define import order for Kratos tables (respecting foreign key constraints)
# Parent tables must be imported before child tables
IMPORT_ORDER=(
    "networks"                      # Parent of identities
    "identity_credential_types"     # Parent of identity_credentials
    "identities"                    # Parent of many tables
    "identity_credentials"          # Depends on identities
    "identity_credential_identifiers"  # Depends on identity_credentials
    "identity_verifiable_addresses"
    "identity_verification_tokens"
    "identity_verification_codes"
    "identity_recovery_addresses"
    "identity_recovery_tokens"
    "identity_recovery_codes"
    "identity_login_codes"
    "identity_registration_codes"
    "sessions"
    "session_devices"
    "session_token_exchanges"
    "continuity_containers"
    "selfservice_login_flows"
    "selfservice_registration_flows"
    "selfservice_recovery_flows"
    "selfservice_settings_flows"
    "selfservice_verification_flows"
    "selfservice_errors"
    "courier_messages"
    "courier_message_dispatches"
)

# Get list of existing tables in Kratos database
echo "Checking which tables exist in PostgreSQL..."
EXISTING_TABLES=$(docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" -t -c \
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' | grep -v '^$')

# Create list of tables to import using defined import order
TABLES_TO_IMPORT=()
SKIPPED_TABLES=()

# First, process tables in the defined order
for TABLE_NAME in "${IMPORT_ORDER[@]}"; do
    CSV_FILE="${EXPORT_DIR}/${TABLE_NAME}.csv"
    
    # Check if CSV exists
    if [ ! -f "$CSV_FILE" ]; then
        continue
    fi
    
    # Check if table should be skipped
    SHOULD_SKIP=false
    for SKIP in "${SKIP_TABLES[@]}"; do
        if [ "$TABLE_NAME" == "$SKIP" ]; then
            SHOULD_SKIP=true
            echo "  Skipping ${TABLE_NAME} - managed by Kratos migrations"
            SKIPPED_TABLES+=("$TABLE_NAME")
            break
        fi
    done
    
    if [ "$SHOULD_SKIP" = true ]; then
        continue
    fi
    
    # Check if table exists in PostgreSQL
    if ! echo "$EXISTING_TABLES" | grep -q "^${TABLE_NAME}$"; then
        echo "  Skipping ${TABLE_NAME} - table does not exist in PostgreSQL"
        SKIPPED_TABLES+=("$TABLE_NAME")
        continue
    fi
    
    TABLES_TO_IMPORT+=("$TABLE_NAME")
done

# Then, add any remaining tables not in the defined order
for CSV_FILE in $CSV_FILES; do
    FILENAME=$(basename "$CSV_FILE")
    TABLE_NAME="${FILENAME%.csv}"
    
    # Check if already processed
    ALREADY_PROCESSED=false
    for ORDERED in "${IMPORT_ORDER[@]}"; do
        if [ "$TABLE_NAME" == "$ORDERED" ]; then
            ALREADY_PROCESSED=true
            break
        fi
    done
    for SKIP in "${SKIP_TABLES[@]}"; do
        if [ "$TABLE_NAME" == "$SKIP" ]; then
            ALREADY_PROCESSED=true
            break
        fi
    done
    
    if [ "$ALREADY_PROCESSED" = true ]; then
        continue
    fi
    
    # Check if table exists in PostgreSQL
    if ! echo "$EXISTING_TABLES" | grep -q "^${TABLE_NAME}$"; then
        echo "  Skipping ${TABLE_NAME} - table does not exist in PostgreSQL"
        SKIPPED_TABLES+=("$TABLE_NAME")
        continue
    fi
    
    TABLES_TO_IMPORT+=("$TABLE_NAME")
done

echo ""
echo "Tables to import: ${#TABLES_TO_IMPORT[@]}"
echo "Tables skipped: ${#SKIPPED_TABLES[@]}"
echo ""

if [ ${#TABLES_TO_IMPORT[@]} -eq 0 ]; then
    echo "No tables to import!"
    exit 0
fi

# Copy CSV files to container
echo "Copying CSV files to container..."
docker exec "${CONTAINER}" bash -c "rm -rf /tmp/csv_import_kratos && mkdir -p /tmp/csv_import_kratos"

for TABLE_NAME in "${TABLES_TO_IMPORT[@]}"; do
    CSV_FILE="${EXPORT_DIR}/${TABLE_NAME}.csv"
    docker cp "${CSV_FILE}" "${CONTAINER}:/tmp/csv_import_kratos/${TABLE_NAME}.csv"
done
echo "Done copying files"
echo ""

# Build the SQL import script
echo "Building import SQL script..."
cat > "${SQL_FILE}" << 'SQLHEADER'
-- Kratos CSV Import Script
-- Generated automatically - do not edit

-- Disable triggers for bulk import (must be superuser or table owner)
SET session_replication_role = 'replica';

SQLHEADER

# Add TRUNCATE and COPY commands for each table
for TABLE_NAME in "${TABLES_TO_IMPORT[@]}"; do
    CSV_FILE="${EXPORT_DIR}/${TABLE_NAME}.csv"

    # Get the header row to determine columns
    HEADER=$(head -1 "$CSV_FILE")

    # Quote each column name for PostgreSQL
    QUOTED_HEADER=$(echo "$HEADER" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')

    cat >> "${SQL_FILE}" << SQLTABLE
-- Import ${TABLE_NAME}
\\echo Importing ${TABLE_NAME}...
TRUNCATE TABLE "${TABLE_NAME}" CASCADE;
COPY "${TABLE_NAME}" (${QUOTED_HEADER}) FROM '/tmp/csv_import_kratos/${TABLE_NAME}.csv' WITH (FORMAT csv, HEADER true, NULL '');

SQLTABLE
done

# Add sequence updates and cleanup
cat >> "${SQL_FILE}" << 'SQLFOOTER'

-- Update sequences for all tables with serial/identity columns
\echo Updating sequences...
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT
            t.table_name,
            c.column_name,
            pg_get_serial_sequence(quote_ident(t.table_name), c.column_name) as seq_name
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND c.column_default LIKE 'nextval%'
    ) LOOP
        IF r.seq_name IS NOT NULL THEN
            EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))',
                          r.seq_name, r.column_name, r.table_name);
        END IF;
    END LOOP;
END $$;

-- Re-enable triggers
SET session_replication_role = 'origin';

\echo Import complete!
SQLFOOTER

echo "SQL script generated: ${SQL_FILE}"
echo ""

# Copy SQL script to container and run it
echo "Running import (this may take a while)..."
docker cp "${SQL_FILE}" "${CONTAINER}:/tmp/csv_import_kratos/import.sql"

# Run the import and capture output
docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" \
    -f /tmp/csv_import_kratos/import.sql 2>&1 | tee -a "${LOG_FILE}"

# Clean up container temp directory
docker exec "${CONTAINER}" bash -c "rm -rf /tmp/csv_import_kratos" 2>/dev/null || true

# Count imported rows from log
IMPORTED_COUNT=$(grep -c "^COPY " "${LOG_FILE}" 2>/dev/null || echo "0")
TOTAL_ROWS=$(grep "^COPY " "${LOG_FILE}" 2>/dev/null | awk '{sum += $2} END {print sum}' || echo "0")

# Summary
echo ""
echo "========================================="
echo "Import Complete!"
echo "========================================="
echo "Tables imported: ${IMPORTED_COUNT}"
echo "Tables skipped: ${#SKIPPED_TABLES[@]}"
echo "Total rows: ${TOTAL_ROWS}"
echo "Log file: ${LOG_FILE}"
echo ""
echo "Next steps:"
echo "1. Verify Kratos health: curl http://localhost:4434/health/ready"
echo "2. Test authentication flow"
echo "3. Verify identity counts match source"
