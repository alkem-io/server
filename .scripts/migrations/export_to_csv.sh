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

# Create CSVs directory if it doesn't exist
mkdir -p "$BASE_DIR/CSVs"

# Get a list of all tables in the database (public schema)
tables=$(docker exec -i $container psql -U $user -d $database -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public'" | tr -d ' ' | grep -v '^$')

# Export each table to a separate CSV file
for table in $tables; do
    # Skip the "query-result-cache" and "migrations_typeorm" tables
    if [ "$table" == "query-result-cache" ] || [ "$table" == "migrations_typeorm" ]; then
        continue
    fi

    # Get columns of the table, omitting createdDate, updatedDate, and version
    columns=$(docker exec -i $container psql -U $user -d $database -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = '$table' AND table_schema = 'public' AND column_name NOT IN ('createdDate', 'updatedDate', 'version') ORDER BY ordinal_position" | tr -d ' ' | grep -v '^$' | paste -sd ',' -)

    filename="${table}.csv"

    echo "Exporting ${table} to ${filename}"

    # Export to CSV using COPY command
    docker exec -i $container psql -U $user -d $database -c "\COPY (SELECT $columns FROM \"$table\") TO STDOUT WITH (FORMAT CSV, HEADER false, DELIMITER ',', QUOTE '\"')" > "$BASE_DIR/CSVs/${filename}"
done

echo "All tables exported successfully!"
