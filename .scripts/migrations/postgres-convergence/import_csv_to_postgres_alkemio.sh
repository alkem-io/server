#!/bin/bash
# import_csv_to_postgres_alkemio.sh - Import Alkemio CSV exports into PostgreSQL
# Usage: ./import_csv_to_postgres_alkemio.sh <csv_export_directory>

set -e

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables
source "$BASE_DIR/.env"

# Validate arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <csv_export_directory>"
    echo "Example: $0 csv_exports/alkemio/20250121_120000"
    exit 1
fi

EXPORT_DIR="$1"
IMPORT_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${EXPORT_DIR}/import_log_${IMPORT_TIMESTAMP}.log"
ERROR_FILE="${EXPORT_DIR}/import_errors_${IMPORT_TIMESTAMP}.log"

# PostgreSQL connection details
PG_USER="${POSTGRES_USER}"
PG_PASSWORD="${POSTGRES_PASSWORD}"
DATABASE="${POSTGRES_ALKEMIO_DATABASE}"
CONTAINER="${POSTGRES_CONTAINER}"

echo "========================================="
echo "Alkemio CSV to PostgreSQL Import"
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

# Check if manifest exists
MANIFEST_FILE="${EXPORT_DIR}/migration_manifest.json"
if [ ! -f "$MANIFEST_FILE" ]; then
    echo "Error: Manifest file not found at ${MANIFEST_FILE}"
    exit 1
fi

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "Error: PostgreSQL container '${CONTAINER}' is not running"
    echo "Please start the PostgreSQL container first"
    exit 1
fi

# Create temp directory in container for CSV files
docker exec "${CONTAINER}" bash -c "mkdir -p /tmp/csv_import"

# Get list of CSV files
CSV_FILES=$(ls "${EXPORT_DIR}"/*.csv 2>/dev/null || true)

if [ -z "$CSV_FILES" ]; then
    echo "Error: No CSV files found in ${EXPORT_DIR}"
    exit 1
fi

FILE_COUNT=$(echo "$CSV_FILES" | wc -l)
echo "Found ${FILE_COUNT} CSV files to import"
echo ""

# Copy all CSV files to container first (with encoding sanitization)
echo "Copying CSV files to container..."
SANITIZED_DIR="${EXPORT_DIR}/sanitized_${IMPORT_TIMESTAMP}"
mkdir -p "${SANITIZED_DIR}"

for CSV_FILE in $CSV_FILES; do
    FILENAME=$(basename "$CSV_FILE")

    # Sanitize encoding: convert Windows-1252 to UTF-8, replacing invalid sequences
    # This handles em-dashes (0x96), smart quotes (0x92, 0x93, 0x94), etc.
    if ! iconv -f WINDOWS-1252 -t UTF-8//TRANSLIT < "${CSV_FILE}" > "${SANITIZED_DIR}/${FILENAME}" 2>/dev/null; then
        # Fallback: use tr to remove invalid bytes if iconv fails
        tr -cd '\11\12\15\40-\176' < "${CSV_FILE}" > "${SANITIZED_DIR}/${FILENAME}"
    fi

    docker cp "${SANITIZED_DIR}/${FILENAME}" "${CONTAINER}:/tmp/csv_import/${FILENAME}"
done
echo "Done copying files"
echo ""

# Build list of tables and their existence status
echo "Checking which tables exist in PostgreSQL..."
declare -A TABLE_EXISTS_MAP
TABLES_TO_TRUNCATE=""
TABLES_TO_IMPORT=""

for CSV_FILE in $CSV_FILES; do
    FILENAME=$(basename "$CSV_FILE")
    TABLE_NAME="${FILENAME%.csv}"

    # Check if table exists
    TABLE_EXISTS=$(docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" -t -c \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${TABLE_NAME}');" 2>/dev/null | tr -d ' ')

    if [ "$TABLE_EXISTS" = "t" ]; then
        TABLE_EXISTS_MAP["$TABLE_NAME"]="true"
        if [ -z "$TABLES_TO_TRUNCATE" ]; then
            TABLES_TO_TRUNCATE="\"${TABLE_NAME}\""
        else
            TABLES_TO_TRUNCATE="${TABLES_TO_TRUNCATE}, \"${TABLE_NAME}\""
        fi
        if [ -z "$TABLES_TO_IMPORT" ]; then
            TABLES_TO_IMPORT="${TABLE_NAME}"
        else
            TABLES_TO_IMPORT="${TABLES_TO_IMPORT} ${TABLE_NAME}"
        fi
    else
        echo "  Skipping ${TABLE_NAME} - table does not exist in PostgreSQL"
        TABLE_EXISTS_MAP["$TABLE_NAME"]="false"
    fi
done

echo ""
echo "Building import SQL script..."

# Generate a single SQL script that runs in one session
SQL_SCRIPT="${EXPORT_DIR}/import_script_${IMPORT_TIMESTAMP}.sql"

cat > "${SQL_SCRIPT}" << 'EOSQL_HEADER'
-- Auto-generated import script
-- This runs entirely in one session so session_replication_role persists

\set ON_ERROR_STOP on

-- Disable foreign key constraint checking for this session
SET session_replication_role = 'replica';

EOSQL_HEADER

# Add TRUNCATE command
if [ -n "$TABLES_TO_TRUNCATE" ]; then
    echo "TRUNCATE TABLE ${TABLES_TO_TRUNCATE} CASCADE;" >> "${SQL_SCRIPT}"
    echo "" >> "${SQL_SCRIPT}"
fi

# Add COPY commands for each table
for TABLE_NAME in $TABLES_TO_IMPORT; do
    CSV_FILE="${EXPORT_DIR}/${TABLE_NAME}.csv"

    # Get the header row (first line) to determine columns
    HEADER=$(head -1 "$CSV_FILE")

    # Quote each column name for PostgreSQL (preserves case sensitivity)
    # Convert "col1,col2,col3" to "\"col1\",\"col2\",\"col3\""
    QUOTED_HEADER=$(echo "$HEADER" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')

    echo "\\echo 'Importing ${TABLE_NAME}...'" >> "${SQL_SCRIPT}"
    echo "COPY \"${TABLE_NAME}\" (${QUOTED_HEADER}) FROM '/tmp/csv_import/${TABLE_NAME}.csv' WITH (FORMAT csv, HEADER true, NULL '');" >> "${SQL_SCRIPT}"
    echo "" >> "${SQL_SCRIPT}"
done

# Add sequence update and session restore
cat >> "${SQL_SCRIPT}" << 'EOSQL_FOOTER'

\echo 'Updating sequences...'

-- Update sequences for all tables with serial/identity columns
DO $$
DECLARE
    r RECORD;
    max_val BIGINT;
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
    )
    LOOP
        IF r.seq_name IS NOT NULL THEN
            EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', r.column_name, r.table_name) INTO max_val;
            IF max_val > 0 THEN
                EXECUTE format('SELECT setval(%L, %s)', r.seq_name, max_val);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Re-enable foreign key constraints
SET session_replication_role = 'origin';

\echo 'Import complete!'
EOSQL_FOOTER

echo "SQL script generated: ${SQL_SCRIPT}"
echo ""

# Copy the SQL script to the container
docker cp "${SQL_SCRIPT}" "${CONTAINER}:/tmp/csv_import/import_script.sql"

# Run the entire import in a single psql session
echo "Running import (this may take a while)..."
echo ""

IMPORT_OUTPUT=$(docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" -f /tmp/csv_import/import_script.sql 2>&1)

echo "$IMPORT_OUTPUT" >> "${LOG_FILE}"

# Parse output for success/failure counts
IMPORTED_COUNT=$(echo "$IMPORT_OUTPUT" | grep -c "^COPY " || echo "0")
FAILED_COUNT=0
TOTAL_ROWS=0

# Extract row counts from COPY output
while IFS= read -r line; do
    if [[ "$line" =~ ^COPY\ ([0-9]+) ]]; then
        ROW_COUNT="${BASH_REMATCH[1]}"
        TOTAL_ROWS=$((TOTAL_ROWS + ROW_COUNT))
    fi
done <<< "$IMPORT_OUTPUT"

# Check for errors
if echo "$IMPORT_OUTPUT" | grep -qi "error"; then
    echo "ERRORS DETECTED during import!"
    echo "$IMPORT_OUTPUT" | grep -i "error" >> "${ERROR_FILE}"
    FAILED_COUNT=1
fi

# Print table-by-table results
echo "Import results:"
echo "$IMPORT_OUTPUT" | grep -E "^(Importing|COPY )" | while read -r line; do
    echo "  $line"
done

# Clean up container temp directory
docker exec "${CONTAINER}" bash -c "rm -rf /tmp/csv_import" 2>/dev/null || true

# Summary
echo ""
echo "========================================="
echo "Import Complete!"
echo "========================================="
echo "Tables imported: ${IMPORTED_COUNT}"
echo "Tables failed: ${FAILED_COUNT}"
echo "Total rows: ${TOTAL_ROWS}"
echo "Log file: ${LOG_FILE}"

if [ "$FAILED_COUNT" -gt 0 ]; then
    echo ""
    echo "WARNING: ${FAILED_COUNT} tables failed to import"
    echo "Check error log: ${ERROR_FILE}"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Verify row counts match source"
echo "2. Run functional verification tests"
echo "3. Check foreign key integrity"
