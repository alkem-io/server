#!/bin/sh

docker exec alkemio_dev_mariadb /usr/bin/mysqldump -u root -p${MYSQL_ROOT_PASSWORD} alkemio > alkemio_dump.sql
