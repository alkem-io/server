#!/bin/sh

# The backup filename is the first argument passed to the script.
BACKUP_FILE=${1:-synapse_dump.psql}

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Set database connection details (use Synapse-specific vars if available, fall back to general Postgres vars)
user=${SYNAPSE_POSTGRES_USER:-$POSTGRES_USER}
database=${SYNAPSE_POSTGRES_DB:-synapse}
container=${SYNAPSE_POSTGRES_CONTAINER:-alkemio_dev_postgres}

# Create snapshot using the postgres docker container
docker exec $container pg_dump --username=$user --dbname=$database > "$BASE_DIR/$BACKUP_FILE"
