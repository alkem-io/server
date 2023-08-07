#!/bin/bash

# The storage is the first argument passed to the script. Default to 'mariadb' if not provided.
STORAGE=${1:-mariadb}

# Validate the storage
if [[ "$STORAGE" != "mariadb" && "$STORAGE" != "mysql" && "$STORAGE" != "postgres" ]]; then
    echo "Invalid storage '$STORAGE'. Please specify 'mariadb', 'mysql', or 'postgres'."
    exit 1
fi

# The environment is the second argument passed to the script. Default to 'prod' if not provided.
ENV=${2:-prod}

# Validate the environment
if [[ "$ENV" != "acc" && "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Invalid environment '$ENV'. Please specify 'acc', 'dev', or 'prod'."
    exit 1
fi

# Source environment variables from .env file
source .env

# Get the latest file in the S3 bucket
latest_file=$(aws s3 ls s3://alkemio-backups/storage/$STORAGE/backups/$ENV --recursive | sort | tail -n 1 | awk '{print $4}')
echo $latest_file

# Download the latest file
aws s3 cp s3://alkemio-backups/$latest_file .

echo "Downloaded $latest_file from alkemio-backups/storage/$STORAGE/backups/$ENV"

# Get the local filename
local_file=${latest_file##*/}
echo "Local filename: $local_file"

# Restore snapshot using the mariadb docker container
docker exec -i alkemio_dev_mariadb /usr/bin/mysql -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < $local_file
echo "Backup restored successfully!"