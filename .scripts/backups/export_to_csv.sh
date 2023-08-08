#!/bin/bash

# Source environment variables from .env file
source .env

# Set database connection details
user=root
password=${MYSQL_ROOT_PASSWORD}
database=${MYSQL_DATABASE}
host=localhost # or your MySQL server IP
container=alkemio_dev_mariadb

# Get a list of all tables in the database
tables=$(docker exec -i alkemio_dev_mariadb mysql -u $user -p$password -e "SHOW TABLES FROM $database")

# Export each table to a separate CSV file
for table in $tables; do
    filename="${table}.csv"
    echo "Exporting ${table} to ${filename}"
    docker exec -i $container mysql -u $user -p$password -e \
    "SELECT * INTO OUTFILE '/tmp/CSVs/${filename}' FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n' FROM ${table};" $database
done

echo "All tables exported successfully!"
