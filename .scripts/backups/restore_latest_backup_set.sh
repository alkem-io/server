#!/bin/bash

# The environment is the first argument passed to the script.
ENV=${1}

# Check if the environment parameter is provided
if [ -z "$ENV" ]; then
    echo "Environment parameter is required."
    exit 1
fi

# The path to the .env.docker file is the second argument.
ENV_FILE_PATH=../../.env.docker

# The path to the homeserver.yaml file is the third argument.
HOMESERVER_FILE_PATH=../../.build/synapse/homeserver.yaml

# Check if the .env.docker file path is provided
if [ -z "$ENV_FILE_PATH" ]; then
    echo ".env.docker file path parameter is required."
    exit 1
fi

# Define the server name based on the environment
case $ENV in
    "prod")
        SERVER_NAME="matrix.alkem.io"
        ;;
    "dev")
        SERVER_NAME="matrix-dev.alkem.io"
        ;;
    "acc")
        SERVER_NAME="matrix-acc.alkem.io"
        ;;
    *)
        echo "Invalid environment"
        exit 1
        ;;
esac

# Update the .env.docker file with the new server name
if grep -q "SYNAPSE_HOMESERVER_NAME" $ENV_FILE_PATH; then
    sed -i "s/^SYNAPSE_HOMESERVER_NAME=.*/SYNAPSE_HOMESERVER_NAME=$SERVER_NAME/" $ENV_FILE_PATH
else
    echo "SYNAPSE_HOMESERVER_NAME=$SERVER_NAME" >> $ENV_FILE_PATH
fi

if grep -q "SYNAPSE_SERVER_NAME" $ENV_FILE_PATH; then
    sed -i "s/^SYNAPSE_SERVER_NAME=.*/SYNAPSE_SERVER_NAME=$SERVER_NAME/" $ENV_FILE_PATH
else
    echo "SYNAPSE_SERVER_NAME=$SERVER_NAME" >> $ENV_FILE_PATH
fi

# Update the server_name in the YAML file using yq
yq e ".server_name = \"$SERVER_NAME\"" -i $HOMESERVER_FILE_PATH

# Path to your existing script
SCRIPT_PATH='restore_latest_backup.sh'

# Call the existing script for mariadb
bash $SCRIPT_PATH mariadb $ENV

# Call the existing script for postgres
bash $SCRIPT_PATH postgres $ENV
