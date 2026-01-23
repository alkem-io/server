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

# Create snapshot using the postgres docker container
docker exec $container pg_dump --username=$user --dbname=$database > "$BASE_DIR/$ENV"
