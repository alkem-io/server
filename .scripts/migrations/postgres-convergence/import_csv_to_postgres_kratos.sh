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
ERROR_FILE="${EXPORT_DIR}/import_errors_${IMPORT_TIMESTAMP}.log"

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

# Check if Kratos database exists and has migrations applied
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

# Create temp directory in container for CSV files
docker exec "${CONTAINER}" bash -c "mkdir -p /tmp/csv_import_kratos"

# Define import order for Kratos tables (respecting foreign key constraints)
# Tables should be imported in dependency order
ORDERED_TABLES=(
    "schema_migration"
    "identities"
    "identity_credentials"
    "identity_credential_identifiers"
    "identity_verifiable_addresses"
    "identity_recovery_addresses"
    "identity_recovery_codes"
    "sessions"
    "continuity_containers"
    "courier_messages"
    "courier_message_dispatches"
    "selfservice_login_flows"
    "selfservice_registration_flows"
    "selfservice_recovery_flows"
    "selfservice_verification_flows"
    "selfservice_settings_flows"
    "selfservice_errors"
    "networks"
    "identity_verification_tokens"
    "identity_recovery_tokens"
    "session_devices"
    "session_token_exchanges"
)

# Get list of CSV files
CSV_FILES=$(ls "${EXPORT_DIR}"/*.csv 2>/dev/null || true)

if [ -z "$CSV_FILES" ]; then
    echo "Error: No CSV files found in ${EXPORT_DIR}"
    exit 1
fi

FILE_COUNT=$(echo "$CSV_FILES" | wc -l)
echo "Found ${FILE_COUNT} CSV files to import"
echo ""

# Disable foreign key checks for import
echo "Disabling triggers and foreign key constraints..."
docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" -c \
    "SET session_replication_role = 'replica';" 2>>"${ERROR_FILE}" || true

IMPORTED_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0
TOTAL_ROWS=0

# Function to import a single table
import_table() {
    local TABLE_NAME="$1"
    local CSV_FILE="${EXPORT_DIR}/${TABLE_NAME}.csv"

    if [ ! -f "$CSV_FILE" ]; then
        return 1
    fi

    echo -n "Importing ${TABLE_NAME}... "
    echo "Importing ${TABLE_NAME}" >> "${LOG_FILE}"

    # Copy CSV to container
    docker cp "${CSV_FILE}" "${CONTAINER}:/tmp/csv_import_kratos/${TABLE_NAME}.csv"

    # Get the header row (first line) to determine columns
    HEADER=$(head -1 "$CSV_FILE")

    # Quote each column name for PostgreSQL (preserves case sensitivity)
    QUOTED_HEADER=$(echo "$HEADER" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')

    # Skip schema_migration table - Kratos manages this
    if [ "$TABLE_NAME" == "schema_migration" ] || [ "$TABLE_NAME" == "_kratos_migrations" ]; then
        echo "SKIPPED (managed by Kratos)"
        echo "  Skipped: managed by Kratos migrations" >> "${LOG_FILE}"
        return 2
    fi

    # Truncate existing data in the table
    docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" -c \
        "TRUNCATE TABLE \"${TABLE_NAME}\" CASCADE;" 2>>"${ERROR_FILE}" || {
        echo "Warning: Could not truncate ${TABLE_NAME}" >> "${LOG_FILE}"
    }

    # Import CSV using COPY command
    IMPORT_RESULT=$(docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" -c \
        "\\COPY \"${TABLE_NAME}\" (${QUOTED_HEADER}) FROM '/tmp/csv_import_kratos/${TABLE_NAME}.csv' WITH (FORMAT csv, HEADER true, NULL '');" 2>&1)

    if echo "$IMPORT_RESULT" | grep -q "COPY"; then
        ROW_COUNT=$(echo "$IMPORT_RESULT" | grep -oP 'COPY \K[0-9]+' || echo "0")
        echo "${ROW_COUNT} rows"
        echo "  Success: ${ROW_COUNT} rows" >> "${LOG_FILE}"
        return 0
    else
        echo "FAILED"
        echo "  FAILED: ${IMPORT_RESULT}" >> "${LOG_FILE}"
        echo "${TABLE_NAME}: ${IMPORT_RESULT}" >> "${ERROR_FILE}"
        return 3
    fi
}

# First, import tables in the defined order
echo "Importing tables in dependency order..."
for TABLE in "${ORDERED_TABLES[@]}"; do
    import_table "$TABLE"
    RESULT=$?
    case $RESULT in
        0) IMPORTED_COUNT=$((IMPORTED_COUNT + 1)) ;;
        1) ;; # File not found, skip silently
        2) SKIPPED_COUNT=$((SKIPPED_COUNT + 1)) ;;
        3) FAILED_COUNT=$((FAILED_COUNT + 1)) ;;
    esac
done

# Then, import any remaining tables not in the ordered list
echo ""
echo "Importing remaining tables..."
for CSV_FILE in $CSV_FILES; do
    FILENAME=$(basename "$CSV_FILE")
    TABLE_NAME="${FILENAME%.csv}"

    # Skip if already processed
    ALREADY_PROCESSED=false
    for ORDERED in "${ORDERED_TABLES[@]}"; do
        if [ "$TABLE_NAME" == "$ORDERED" ]; then
            ALREADY_PROCESSED=true
            break
        fi
    done

    if [ "$ALREADY_PROCESSED" = true ]; then
        continue
    fi

    import_table "$TABLE_NAME"
    RESULT=$?
    case $RESULT in
        0) IMPORTED_COUNT=$((IMPORTED_COUNT + 1)) ;;
        2) SKIPPED_COUNT=$((SKIPPED_COUNT + 1)) ;;
        3) FAILED_COUNT=$((FAILED_COUNT + 1)) ;;
    esac
done

# Re-enable foreign key checks
echo ""
echo "Re-enabling triggers and foreign key constraints..."
docker exec -i "${CONTAINER}" psql -U "${PG_USER}" -d "${DATABASE}" -c \
    "SET session_replication_role = 'origin';" 2>>"${ERROR_FILE}" || true

# Clean up container temp directory
docker exec "${CONTAINER}" bash -c "rm -rf /tmp/csv_import_kratos" 2>/dev/null || true

# Summary
echo ""
echo "========================================="
echo "Import Complete!"
echo "========================================="
echo "Tables imported: ${IMPORTED_COUNT}"
echo "Tables skipped: ${SKIPPED_COUNT}"
echo "Tables failed: ${FAILED_COUNT}"
echo "Log file: ${LOG_FILE}"

if [ "$FAILED_COUNT" -gt 0 ]; then
    echo ""
    echo "WARNING: ${FAILED_COUNT} tables failed to import"
    echo "Check error log: ${ERROR_FILE}"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Verify Kratos health: curl http://localhost:4434/health/ready"
echo "2. Test authentication flow"
echo "3. Verify identity counts match source"
