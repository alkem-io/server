#!/bin/bash

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Set database connection details
user=${POSTGRES_USER}
password=${POSTGRES_PASSWORD}
database=${POSTGRES_DB}
host=${POSTGRES_HOST:-localhost}
port=${POSTGRES_PORT:-5432}
container=${POSTGRES_CONTAINER:-alkemio_dev_postgres}

# Folder containing the CSV files
folder="$BASE_DIR/CSVs"

# Check if CSV files are present
if [ -z "$(ls -A $folder/*.csv 2>/dev/null)" ]; then
  echo "No CSV files found in $folder."
  exit 1
fi

# Disable foreign key checks by deferring constraints
docker exec -i $container psql -U $user -d $database -c "SET session_replication_role = 'replica';"

# Enumerate all CSV files in the folder
for file in $folder/*.csv
do
  # Get the base name of the file (without the folder path)
  base=$(basename $file)

  # Get the file name without the extension to use as the table name
  table="${base%.*}"

  echo "Importing $file into $table..."

  # Get the column names from the table (excluding auto-generated columns)
  columns=$(docker exec -i $container psql -U $user -d $database -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = '$table' AND table_schema = 'public' AND column_name NOT IN ('createdDate', 'updatedDate', 'version') ORDER BY ordinal_position" | tr -d ' ' | grep -v '^$' | paste -sd ',' -)

  # Import using COPY command
  cat "$file" | docker exec -i $container psql -U $user -d $database -c "\COPY \"$table\" ($columns) FROM STDIN WITH (FORMAT CSV, DELIMITER ',', QUOTE '\"')"
done

# Re-enable foreign key checks
docker exec -i $container psql -U $user -d $database -c "SET session_replication_role = 'origin';"

echo "All CSV files have been imported."
