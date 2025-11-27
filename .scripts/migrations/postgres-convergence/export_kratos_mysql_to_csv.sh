#!/bin/bash
# export_kratos_mysql_to_csv.sh - Export all Kratos identity tables from MySQL to CSV
# Creates a timestamped directory with individual CSV files and a manifest

set -e

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables
source "$BASE_DIR/.env"

# Configuration
EXPORT_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_DIR="${BASE_DIR}/${CSV_EXPORT_BASE_DIR}/kratos/${EXPORT_TIMESTAMP}"
MANIFEST_FILE="${EXPORT_DIR}/migration_manifest.json"

# MySQL connection details
MYSQL_USER="root"
MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
DATABASE="${MYSQL_KRATOS_DATABASE}"
CONTAINER="${MYSQL_CONTAINER}"

echo "========================================="
echo "Kratos MySQL to CSV Export"
echo "========================================="
echo "Timestamp: ${EXPORT_TIMESTAMP}"
echo "Database: ${DATABASE}"
echo "Container: ${CONTAINER}"
echo "Export directory: ${EXPORT_DIR}"
echo ""

# Check if MySQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "Error: MySQL container '${CONTAINER}' is not running"
    echo "Please start the MySQL container first"
    exit 1
fi

# Check if Kratos database exists
DB_EXISTS=$(docker exec -i "${CONTAINER}" mysql -u"${MYSQL_USER}" -p"${MYSQL_PWD}" -N -e \
    "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${DATABASE}';" 2>/dev/null || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo "Error: Kratos database '${DATABASE}' does not exist in MySQL"
    echo "This script is for migrating existing Kratos data from MySQL to Postgres"
    exit 1
fi

# Create export directory
mkdir -p "${EXPORT_DIR}"

# Get list of tables
echo "Fetching table list..."
TABLES=$(docker exec -i "${CONTAINER}" mysql -u"${MYSQL_USER}" -p"${MYSQL_PWD}" -N -e \
    "SELECT table_name FROM information_schema.tables
     WHERE table_schema = '${DATABASE}'
     AND table_type = 'BASE TABLE'
     ORDER BY table_name;" 2>/dev/null)

if [ -z "$TABLES" ]; then
    echo "Error: No tables found in database '${DATABASE}'"
    exit 1
fi

TABLE_COUNT=$(echo "$TABLES" | wc -l)
echo "Found ${TABLE_COUNT} tables to export"
echo ""

# Initialize manifest
echo "{" > "${MANIFEST_FILE}"
echo '  "export_info": {' >> "${MANIFEST_FILE}"
echo "    \"timestamp\": \"${EXPORT_TIMESTAMP}\"," >> "${MANIFEST_FILE}"
echo "    \"source_database\": \"${DATABASE}\"," >> "${MANIFEST_FILE}"
echo "    \"source_type\": \"mysql\"," >> "${MANIFEST_FILE}"
echo "    \"container\": \"${CONTAINER}\"," >> "${MANIFEST_FILE}"
echo "    \"kratos_version\": \"unknown\"" >> "${MANIFEST_FILE}"
echo "  }," >> "${MANIFEST_FILE}"
echo '  "tables": {' >> "${MANIFEST_FILE}"

FIRST_TABLE=true
TOTAL_ROWS=0

# Export each table
for TABLE in $TABLES; do
    echo -n "Exporting ${TABLE}... "

    # Get column names and types
    COL_INFO=$(docker exec -i "${CONTAINER}" mysql -u"${MYSQL_USER}" -p"${MYSQL_PWD}" -N -e \
        "SELECT column_name, column_type
         FROM information_schema.columns
         WHERE table_schema = '${DATABASE}'
         AND table_name = '${TABLE}'
         ORDER BY ordinal_position;" 2>/dev/null)

    # Build column list for header
    COLUMNS=$(echo "$COL_INFO" | cut -f1 | tr '\n' ',' | sed 's/,$//')

    # Skip if no columns found
    if [ -z "$COLUMNS" ] || [ "$COLUMNS" == "NULL" ]; then
        echo "SKIPPED (no columns)"
        continue
    fi

    FILENAME="${TABLE}.csv"

    # Build a SELECT that properly quotes all values for CSV output
    # Handle UUID columns (char(36)) specially - empty strings should become NULL
    COLUMN_LIST=""
    FIRST_COL=true
    while IFS=$'\t' read -r COL_NAME COL_TYPE; do
        if [ "$FIRST_COL" = true ]; then
            FIRST_COL=false
        else
            COLUMN_LIST="$COLUMN_LIST, ',', "
        fi

        # Check if this is a UUID-like column (char(36))
        if [[ "$COL_TYPE" == "char(36)" ]]; then
            # For UUID columns: empty string should become NULL (nothing between commas)
            COLUMN_LIST="${COLUMN_LIST}IFNULL(NULLIF(CONCAT('\"', REPLACE(REPLACE(REPLACE(\`${COL_NAME}\`, '\"', '\"\"'), CHAR(10), ' '), CHAR(13), ''), '\"'), '\"\"'), '')"
        elif [[ "$COL_TYPE" == *"blob"* ]] || [[ "$COL_TYPE" == *"binary"* ]]; then
            # For blob/binary columns: export as hex for PostgreSQL bytea
            COLUMN_LIST="${COLUMN_LIST}IFNULL(CONCAT('\"\\\\x', HEX(\`${COL_NAME}\`), '\"'), '')"
        else
            # For non-UUID columns: preserve empty strings as ""
            COLUMN_LIST="${COLUMN_LIST}IFNULL(CONCAT('\"', REPLACE(REPLACE(REPLACE(\`${COL_NAME}\`, '\"', '\"\"'), CHAR(10), ' '), CHAR(13), ''), '\"'), '')"
        fi
    done <<< "$COL_INFO"

    # Export with proper CSV formatting directly from MySQL
    # Using SET NAMES utf8mb4 to ensure proper character encoding
    echo "SET NAMES utf8mb4; SELECT CONCAT(${COLUMN_LIST}) FROM ${DATABASE}.\`${TABLE}\`;" | \
        docker exec -i "${CONTAINER}" mysql -u"${MYSQL_USER}" -p"${MYSQL_PWD}" -N --raw --default-character-set=utf8mb4 2>/dev/null \
        > "${EXPORT_DIR}/${FILENAME}"

    # Get row count
    ROW_COUNT=$(docker exec -i "${CONTAINER}" mysql -u"${MYSQL_USER}" -p"${MYSQL_PWD}" -N -e \
        "SELECT COUNT(*) FROM ${DATABASE}.\`${TABLE}\`;" 2>/dev/null)

    TOTAL_ROWS=$((TOTAL_ROWS + ROW_COUNT))

    # Add header row to the beginning of the file
    TEMP_FILE="${EXPORT_DIR}/${FILENAME}.tmp"
    echo "${COLUMNS}" > "${TEMP_FILE}"
    cat "${EXPORT_DIR}/${FILENAME}" >> "${TEMP_FILE}"
    mv "${TEMP_FILE}" "${EXPORT_DIR}/${FILENAME}"

    echo "${ROW_COUNT} rows"

    # Add to manifest
    if [ "$FIRST_TABLE" = true ]; then
        FIRST_TABLE=false
    else
        echo "," >> "${MANIFEST_FILE}"
    fi
    # Escape any special characters in columns for JSON
    COLUMNS_JSON=$(echo "$COLUMNS" | tr -d '\n\r' | sed 's/"/\\"/g')
    echo -n "    \"${TABLE}\": { \"rows\": ${ROW_COUNT}, \"columns\": \"${COLUMNS_JSON}\" }" >> "${MANIFEST_FILE}"
done

# Close manifest
echo "" >> "${MANIFEST_FILE}"
echo "  }," >> "${MANIFEST_FILE}"
echo "  \"summary\": {" >> "${MANIFEST_FILE}"
echo "    \"total_tables\": ${TABLE_COUNT}," >> "${MANIFEST_FILE}"
echo "    \"total_rows\": ${TOTAL_ROWS}" >> "${MANIFEST_FILE}"
echo "  }," >> "${MANIFEST_FILE}"
echo '  "notes": [' >> "${MANIFEST_FILE}"
echo '    "Kratos schema migrations are handled by Kratos itself",' >> "${MANIFEST_FILE}"
echo '    "The schema_migration table tracks applied migrations",' >> "${MANIFEST_FILE}"
echo '    "Import order should respect foreign key constraints",' >> "${MANIFEST_FILE}"
echo '    "Identities should be imported before dependent tables"' >> "${MANIFEST_FILE}"
echo "  ]" >> "${MANIFEST_FILE}"
echo "}" >> "${MANIFEST_FILE}"

echo ""
echo "========================================="
echo "Export Complete!"
echo "========================================="
echo "Tables exported: ${TABLE_COUNT}"
echo "Total rows: ${TOTAL_ROWS}"
echo "Output directory: ${EXPORT_DIR}"
echo "Manifest: ${MANIFEST_FILE}"
echo ""
echo "IMPORTANT NOTES:"
echo "1. Kratos manages its own schema migrations"
echo "2. Ensure target Postgres has Kratos migrations applied first"
echo "3. Import order matters due to foreign key constraints"
echo ""
echo "Next step: Verify exports with:"
echo "  cat ${MANIFEST_FILE}"
echo "  wc -l ${EXPORT_DIR}/*.csv"
