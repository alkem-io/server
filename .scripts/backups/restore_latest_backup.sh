#!/bin/bash

# The storage is the first argument passed to the script. Default to 'mariadb' if not provided.
STORAGE=${1:-mysql}

# Validate the storage
if [[ "$STORAGE" != "mysql" && "$STORAGE" != "postgres" ]]; then
    echo "Invalid storage '$STORAGE'. Please specify 'mysql', or 'postgres'."
    exit 1
fi

# The environment is the second argument passed to the script. Default to 'prod' if not provided.
ENV=${2:-prod}

# Validate the environment
if [[ "$ENV" != "acc" && "$ENV" != "dev" && "$ENV" != "sandbox" && "$ENV" != "prod" ]]; then
    echo "Invalid environment '$ENV'. Please specify 'acc', 'dev', 'sandbox' or 'prod'."
    exit 1
fi

# Source environment variables from .env file
source .env

# Get the latest file in the S3 bucket
if [[ $STORAGE == "mysql" ]]; then
    latest_file=$(aws s3 ls s3://alkemio-backups/storage/$STORAGE/backups/$ENV/ --recursive | grep $MYSQL_DATABASE | sort | tail -n 1 | awk '{print $4}')
elif [[ $STORAGE == "postgres" ]]; then
    latest_file=$(aws s3 ls s3://alkemio-backups/storage/$STORAGE/backups/$ENV/ --recursive | sort | tail -n 1 | awk '{print $4}')
fi
echo $latest_file

# Download the latest file
aws s3 cp s3://alkemio-backups/$latest_file .

echo "Downloaded $latest_file from alkemio-backups/storage/$STORAGE/backups/$ENV"

# Get the local filename
local_file=${latest_file##*/}
echo "Local filename: $local_file"

# Restore snapshot using the correct docker container and command based on storage
if [[ "$STORAGE" == "mariadb" || "$STORAGE" == "mysql" ]]; then
    docker exec -i alkemio_dev_mysql /usr/bin/mysql -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} < $local_file
    echo "Backup restored successfully!"
elif [[ "$STORAGE" == "postgres" ]]; then
    docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity WHERE pg_stat_activity.datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"
    docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
    docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"
    docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < $local_file
    echo "Backup restored successfully!"
else
    echo "Storage type not supported for restore."
    exit 1
fi