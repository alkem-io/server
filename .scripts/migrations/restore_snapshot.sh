#!/bin/sh

# The backup filename is the first argument passed to the script.
ENV=${1:-alkemio_dump.sql}

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Restore snapshot using the mariadb docker container
docker exec -i alkemio_dev_mariadb /usr/bin/mysql -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < "$BASE_DIR/$ENV"
