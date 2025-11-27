#!/bin/sh

# The backup filename is the first argument passed to the script.
ENV=${1:-alkemio_dump_documents_2.sql}

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Create snapshot using the mariadb docker container
docker exec alkemio_dev_mysql /usr/bin/mysqldump --skip-extended-insert -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} document > "$BASE_DIR/$ENV"
