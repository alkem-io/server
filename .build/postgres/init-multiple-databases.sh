#!/bin/bash
set -e

function create_database() {
    local database=$1
    echo "Creating database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname="postgres" -c "CREATE DATABASE \"${database}\"" 2>/dev/null || true
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname="${database}" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"' 2>/dev/null || true
    echo "Database '$database' ready"
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_database $db
    done
    echo "Multiple databases created"
fi
