#!/bin/sh

docker exec -i alkemio_dev_mariadb /usr/bin/mysql -u root -p${MYSQL_ROOT_PASSWORD} alkemio < alkemio_dump.sql
