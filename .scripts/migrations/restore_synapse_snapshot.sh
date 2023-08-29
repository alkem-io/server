#!/bin/sh

# The backup filename is the first argument passed to the script.
BACKUP_FILE=${1:-synapse_dump.psql}

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Restore snapshot using the correct docker container and command based on storage

docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity WHERE pg_stat_activity.datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"
docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"
docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < $BACKUP_FILE
echo "Backup restored successfully!"
