#!/bin/sh

# Source environment variables from .env file
source .env

# Create snapshot using the mariadb docker container
docker exec alkemio_dev_mariadb /usr/bin/mysqldump -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} > alkemio_dump.sql
