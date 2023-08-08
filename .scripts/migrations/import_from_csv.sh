#!/bin/bash

# Source environment variables from .env file
source .env

# Set database connection details
user=root
password=${MYSQL_ROOT_PASSWORD}
database=${MYSQL_DATABASE}
host=localhost # or your MySQL server IP

# Folder containing the CSV files
folder="CSVs"

# Docker container name
container="alkemio_dev_mariadb"

# Check if CSV files are present
if [ -z "$(ls -A $folder/*.csv 2>/dev/null)" ]; then
  echo "No CSV files found in $folder."
  exit 1
fi

# Disable foreign key checks
  docker exec -i $container mysql -u $user -p$password -e "SET foreign_key_checks = 0;"

# Enumerate all CSV files in the folder
for file in $folder/*.csv
do
  # Get the base name of the file (without the folder path)
  base=$(basename $file)

  # Get the file name without the extension to use as the table name
  table="${base%.*}"

  echo "Importing $file into $table..."

  # Run the mysqlimport command in the Docker container
  docker exec -i $container mysqlimport --ignore-lines=1 --fields-terminated-by=',' --local -u $user -p$password $database /tmp/$file
done

# Enable foreign key checks
  docker exec -i $container mysql -u $user -p$password -e "SET foreign_key_checks = 1;"

echo "All CSV files have been imported."
