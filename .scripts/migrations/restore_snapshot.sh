#!/bin/sh

# The backup filename is the first argument passed to the script.
ENV=${1:-alkemio_dump.psql}

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Set database connection details
user=${POSTGRES_USER}
database=${POSTGRES_DB}
container=${POSTGRES_CONTAINER:-alkemio_dev_postgres}

# Terminate existing connections to the database
docker exec -i $container psql -U $user -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$database' AND pid <> pg_backend_pid();"

# Drop and recreate the database
docker exec -i $container psql -U $user -d postgres -c "DROP DATABASE IF EXISTS $database;"
docker exec -i $container psql -U $user -d postgres -c "CREATE DATABASE $database;"

# Restore snapshot using the postgres docker container
docker exec -i $container psql -U $user -d $database < "$BASE_DIR/$ENV"

echo "Backup restored successfully!"
