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
# get_latest_backup(database, env)
#   - Downloads the latest S3 backup for the specified database & environment
#   - database: alkemio | kratos | synapse
#   - Returns the path to the local backup file
#==============================================================================
get_latest_backup() {
    local database=$1
    local env=$2

    # Decide bucket/path based on env
    # Database-specific backup paths (e.g., storage/postgres/backups/alkemio/)
    if [[ "$env" == "prod" ]]; then
        S3_BUCKET="alkemio-s3-backups-prod-paris"
        S3_PATH="s3://${S3_BUCKET}/storage/postgres/backups/${database}/"
    else
        S3_BUCKET="alkemio-s3-backups-dev"
        S3_PATH="s3://${S3_BUCKET}/storage/postgres/backups/${env}/${database}/"
    fi

    echo "Fetching latest backup for $database in $env from $S3_PATH..."

    # Find the latest file for the specified database
    local latest_file
    latest_file=$(aws s3 ls "$S3_PATH" --recursive | grep "${database}" | sort | tail -n 1 | awk '{print $4}')

    if [[ -z "$latest_file" ]]; then
        echo "No backup files found for database '$database' in $S3_PATH."
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
# restore_database(database, local_backup_file)
#   - Restores the specified database from the backup file
#   - database: alkemio | kratos | synapse
#==============================================================================
restore_database() {
    local database=$1
    local backup_file=$2

    read_env_file

    # Map database name to environment variable
    local db_name
    case "$database" in
        alkemio)
            db_name="${POSTGRES_ALKEMIO_DB}"
            ;;
        kratos)
            db_name="${POSTGRES_KRATOS_DB}"
            ;;
        synapse)
            db_name="${POSTGRES_SYNAPSE_DB}"
            ;;
        *)
            echo "Unsupported database: $database. Must be alkemio, kratos, or synapse."
            exit 1
            ;;
    esac

    echo "Restoring PostgreSQL database '$db_name' from $backup_file..."

    # Terminate connections
    docker exec -i alkemio_dev_postgres \
        psql -U "${POSTGRES_USER}" -d postgres \
        -c "SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '${db_name}'
            AND pid <> pg_backend_pid();"

    # Drop the database
    docker exec -i alkemio_dev_postgres \
        psql -U "${POSTGRES_USER}" -d postgres \
        -c "DROP DATABASE IF EXISTS ${db_name};"

    # Create the database with appropriate settings
    # Synapse requires LC_COLLATE=C and LC_CTYPE=C for proper Unicode handling
    if [[ "$database" == "synapse" ]]; then
        docker exec -i alkemio_dev_postgres \
            psql -U "${POSTGRES_USER}" -d postgres \
            -c "CREATE DATABASE ${db_name} ENCODING 'UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0;"
    else
        docker exec -i alkemio_dev_postgres \
            psql -U "${POSTGRES_USER}" -d postgres \
            -c "CREATE DATABASE ${db_name};"
    fi

    # Import the backup
    # Copy the backup file to the container and restore
    # Use sed to remove OWNER TO statements and GRANT/REVOKE statements to avoid permission issues
    docker cp "${backup_file}" alkemio_dev_postgres:/tmp/backup.sql
    docker exec -i alkemio_dev_postgres bash -c "sed -e 's/OWNER TO [^;]*;/OWNER TO ${POSTGRES_USER};/g' -e '/^GRANT /d' -e '/^REVOKE /d' /tmp/backup.sql | psql -U ${POSTGRES_USER} -d ${db_name} --set ON_ERROR_STOP=off"
    docker exec -i alkemio_dev_postgres rm /tmp/backup.sql

    echo "PostgreSQL database '$db_name' restored successfully."
}

#==============================================================================
# recreate_empty_database(database)
#   - Recreates an empty database
#   - database: alkemio | kratos | synapse | all
#==============================================================================
recreate_empty_database() {
    local database=$1

    read_env_file

    recreate_single_db() {
        local db_name=$1
        local db_type=$2
        echo "Recreating empty PostgreSQL database: $db_name..."

        docker exec -i alkemio_dev_postgres \
            psql -U "${POSTGRES_USER}" -d postgres \
            -c "SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '${db_name}'
                AND pid <> pg_backend_pid();"

        docker exec -i alkemio_dev_postgres \
            psql -U "${POSTGRES_USER}" -d postgres \
            -c "DROP DATABASE IF EXISTS ${db_name};"

        # Synapse requires LC_COLLATE=C and LC_CTYPE=C for proper Unicode handling
        if [[ "$db_type" == "synapse" ]]; then
            docker exec -i alkemio_dev_postgres \
                psql -U "${POSTGRES_USER}" -d postgres \
                -c "CREATE DATABASE ${db_name} ENCODING 'UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0;"
        else
            docker exec -i alkemio_dev_postgres \
                psql -U "${POSTGRES_USER}" -d postgres \
                -c "CREATE DATABASE ${db_name};"
        fi

        echo "Empty PostgreSQL database recreated: $db_name."
    }

    case "$database" in
        alkemio)
            recreate_single_db "${POSTGRES_ALKEMIO_DB}" "alkemio"
            ;;
        kratos)
            recreate_single_db "${POSTGRES_KRATOS_DB}" "kratos"
            ;;
        synapse)
            recreate_single_db "${POSTGRES_SYNAPSE_DB}" "synapse"
            ;;
        all)
            recreate_single_db "${POSTGRES_ALKEMIO_DB}" "alkemio"
            recreate_single_db "${POSTGRES_KRATOS_DB}" "kratos"
            recreate_single_db "${POSTGRES_SYNAPSE_DB}" "synapse"
            ;;
        *)
            echo "Unsupported database: $database. Must be alkemio, kratos, synapse, or all."
            exit 1
            ;;
    esac
}
