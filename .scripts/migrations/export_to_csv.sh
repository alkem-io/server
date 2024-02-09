#!/bin/bash

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Source environment variables from .env file relative to the script's location
. "$BASE_DIR/.env"

# Set database connection details
user=root
password=${MYSQL_ROOT_PASSWORD}
database=${MYSQL_DATABASE}
host=localhost # or your MySQL server IP
container=alkemio_dev_mysql

# Get a list of all tables in the database
tables=$(docker exec -i alkemio_dev_mysql mysql -u $user -p$password -e "SHOW TABLES FROM $database" | grep -v Tables_in_)

# Export each table to a separate CSV file
for table in $tables; do
    # Skip the "query-result-cache" and "migrations_typeorm" tables
    if [ "$table" == "query-result-cache" ] || [ "$table" == "migrations_typeorm" ]; then
        continue
    fi


    # Get columns of the table, omitting createdData, updatedDate, and version
    columns=$(docker exec -i alkemio_dev_mysql mysql -u $user -p$password -e "SHOW COLUMNS FROM $table" $database | awk '{print $1}' | grep -v '^Field$' | grep -Ev '^(createdDate|updatedDate|version)$' | tr '\n' ',' | sed 's/,$//')

    filename="${table}.csv"

    # Check if the file exists and remove it to ensure the new file can be created
    docker exec -i $container bash -c "[[ -f '/tmp/CSVs/${filename}' ]] && rm '/tmp/CSVs/${filename}'"

    echo "Exporting ${table} to ${filename}"
    docker exec -i $container mysql -u $user -p$password -e \
    "SELECT $columns INTO OUTFILE '/tmp/CSVs/${filename}' FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n' FROM ${table};" $database
done

echo "All tables exported successfully!"
