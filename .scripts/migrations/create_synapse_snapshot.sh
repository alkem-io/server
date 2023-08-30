#!/bin/sh

# The backup filename is the first argument passed to the script.
BACKUP_FILE=${1:-synapse_dump.psql}

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Create snapshot using the postgres docker container
docker exec alkemio_dev_postgres /usr/bin/pg_dump --username=$POSTGRES_USER --dbname=$POSTGRES_DB > $BACKUP_FILE
