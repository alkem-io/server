#!/bin/sh

# Source environment variables from .env file
source .env

# Restore snapshot using the mariadb docker container
docker exec -i alkemio_dev_mariadb /usr/bin/mysql -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < alkemio_dump.sql
