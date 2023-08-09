#!/bin/bash

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Back database up
bash "$BASE_DIR/create_snapshot.sh" "backup.sql"

# Restore the reference schema
bash "$BASE_DIR/restore_snapshot.sh" "db/reference_schema.sql"

# Run the migration and wait for completion
npm run migration:run

# Check the exit status of the command
if [[ $? -eq 0 ]]; then
    echo "Migration completed successfully."
    # Export the migrated CSVs to
    bash "$BASE_DIR/export_to_csv.sh"

    # Compare the migrated CSVs to the reference CSVs
    bash "$BASE_DIR/compare_sql_tables.sh"
else
    echo "Migration failed."
fi

# Restore backup
bash "$BASE_DIR/restore_snapshot.sh" "backup.sql"

rm "$BASE_DIR/backup.sql"