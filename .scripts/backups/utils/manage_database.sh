#!/bin/bash

#==============================================================================
# Helper: read_env_file
#   - Sources the .env file if present
#==============================================================================
read_env_file() {
    if [[ -f .env ]]; then
        source .env
    else
        echo ".env file not found. Please ensure it exists."
        exit 1
    fi
}

#==============================================================================
# get_latest_backup(storage, env)
#   - Downloads the latest S3 backup for the specified storage & environment
#   - Returns the path to the local backup file
#==============================================================================
get_latest_backup() {
    local storage=$1
    local env=$2

    # Decide bucket/path based on env
    if [[ "$env" == "prod" ]]; then
        S3_BUCKET="alkemio-s3-backups-prod"
        S3_PATH="s3://${S3_BUCKET}/storage/${storage}/backups/"
    else
        S3_BUCKET="alkemio-s3-backups-dev"
        S3_PATH="s3://${S3_BUCKET}/storage/${storage}/backups/${env}/"
    fi

    echo "Fetching latest backup for $storage in $env from $S3_PATH..."

    # Find the latest file
    local latest_file
    latest_file=$(aws s3 ls "$S3_PATH" --recursive | sort | tail -n 1 | awk '{print $4}')

    if [[ -z "$latest_file" ]]; then
        echo "No backup files found in $S3_PATH."
        exit 1
    fi

    # Determine the local filename
    local local_file
    local_file=${latest_file##*/}

    # Download the file if needed
    if [[ -f "$local_file" ]]; then
        echo "Backup file $local_file already exists locally."
        read -p "Overwrite local file? (y/n): " overwrite
        if [[ "$overwrite" == "y" || "$overwrite" == "Y" ]]; then
            aws s3 cp "s3://$S3_BUCKET/$latest_file" "$local_file"
            echo "Downloaded the latest backup to $local_file."
        else
            echo "Skipping download. Using existing $local_file."
        fi
    else
        echo "Downloading $local_file from $S3_PATH..."
        aws s3 cp "s3://$S3_BUCKET/$latest_file" "$local_file"
        echo "Downloaded to $local_file."
    fi

    # Return local file name
    echo "$local_file"
}

#==============================================================================
# restore_database(storage, local_backup_file)
#   - Restores the "alkemio" database from the backup file
#   - If you want to restore "synapse" from the same file or a separate file,
#     you can adapt this function accordingly.
#==============================================================================
restore_database() {
    local storage=$1
    local backup_file=$2

    read_env_file

    case "$storage" in
        mysql)
            echo "Restoring MySQL (alkemio) from $backup_file..."

            # Drop & recreate the ALKEMIO DB
            docker exec -i alkemio_dev_mysql \
                mysql -u root -p"${MYSQL_ROOT_PASSWORD}" \
                -e "DROP DATABASE IF EXISTS ${MYSQL_ALKEMIO_DATABASE}; CREATE DATABASE ${MYSQL_ALKEMIO_DATABASE};"

            # Import the backup into the ALKEMIO DB
            docker exec -i alkemio_dev_mysql \
                mysql -u root -p"${MYSQL_ROOT_PASSWORD}" \
                "${MYSQL_ALKEMIO_DATABASE}" < "${backup_file}"

            echo "MySQL (alkemio) restored successfully."
            ;;

        postgres)
            echo "Restoring PostgreSQL (alkemio) from $backup_file..."

            # Terminate connections, drop & recreate
            docker exec -i alkemio_dev_postgres \
                psql -U "${POSTGRES_USER}" -d postgres \
                -c "SELECT pg_terminate_backend(pg_stat_activity.pid)
                    FROM pg_stat_activity
                    WHERE pg_stat_activity.datname = '${POSTGRES_ALKEMIO_DB}'
                    AND pid <> pg_backend_pid();"

            docker exec -i alkemio_dev_postgres \
                psql -U "${POSTGRES_USER}" -d postgres \
                -c "DROP DATABASE IF EXISTS ${POSTGRES_ALKEMIO_DB}; CREATE DATABASE ${POSTGRES_ALKEMIO_DB};"

            # Import the backup into the ALKEMIO DB
            docker exec -i alkemio_dev_postgres \
                psql -U "${POSTGRES_USER}" -d "${POSTGRES_ALKEMIO_DB}" < "${backup_file}"

            echo "PostgreSQL (alkemio) restored successfully."
            ;;

        *)
            echo "Unsupported storage type: $storage"
            exit 1
            ;;
    esac
}

#==============================================================================
# recreate_empty_databases(storage)
#   - Recreates empty "alkemio" and "synapse" databases
#   - This does not require an environment.
#==============================================================================
recreate_empty_databases() {
    local storage=$1

    read_env_file

    case "$storage" in
        mysql)
            echo "Recreating empty alkemio MySQL database ..."

            # Alkemio
            docker exec -i alkemio_dev_mysql /usr/bin/mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "DROP SCHEMA IF EXISTS ${MYSQL_DATABASE}; CREATE SCHEMA ${MYSQL_DATABASE};"

            echo "Empty MySQL database recreated: ${MYSQL_DATABASE}."
            ;;

        postgres)
            echo "Recreating empty synapse PostgreSQL databases..."

            docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();"
            docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
            docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "CREATE DATABASE ${POSTGRES_DB};"

            echo "Empty PostgreSQL databases recreated: ${POSTGRES_SYNAPSE_DB}."
            ;;

        *)
            echo "Unsupported storage type: $storage"
            exit 1
            ;;
    esac
}
