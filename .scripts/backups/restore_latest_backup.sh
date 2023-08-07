#!/bin/bash

# Source environment variables from .env file
source .env

# Get the latest file in the S3 bucket
latest_file=$(aws s3 ls s3://alkemio-backups/storage/mariadb/backups/prod --recursive | sort | tail -n 1 | awk '{print $4}')
echo $latest_file

# Download the latest file
aws s3 cp s3://alkemio-backups/$latest_file .

echo "Downloaded $latest_file from alkemio-backups/storage/mariadb/backups/prod"

# Get the local filename
local_file=${latest_file##*/}
echo "Local filename: $local_file"

# Restore snapshot using the mariadb docker container
docker exec -i alkemio_dev_mariadb /usr/bin/mysql -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < $local_file
echo "Backup restored successfully!"