#!/bin/bash

# Check if yq is installed
if ! command -v yq &> /dev/null; then
    echo "yq is not installed. Installing now..."

    # Determine the platform (macOS vs. Linux vs. others)
    PLATFORM=$(uname | tr '[:upper:]' '[:lower:]')

    # For macOS, use brew for installation
    if [ "$PLATFORM" == "darwin" ]; then
    # For macOS, download the macOS binary for yq
      sudo wget https://github.com/mikefarah/yq/releases/download/v4.34.2/yq_darwin_amd64 -O /usr/local/bin/yq &&\
      chmod +x /usr/local/bin/yq
    # For Linux, use apt to install yq
    elif [ "$PLATFORM" == "linux" ]; then
      wget https://github.com/mikefarah/yq/releases/download/v4.34.2/yq_linux_amd64 -O /usr/bin/yq &&\
      chmod +x /usr/bin/yq
    else
        echo "Unsupported platform. Please install yq manually."
        exit 1
    fi
fi

# The environment is the first argument passed to the script.
ENV=${1:-prod}

# The path to the .env.docker file is the second argument.
ENV_FILE_PATH=../../.env.docker

# The path to the homeserver.yaml file is the third argument.
HOMESERVER_FILE_PATH=../../.build/synapse/homeserver.yaml

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
    "sandbox")
        SERVER_NAME="matrix-sandbox.alkem.io"
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
    # Ensure that a newline is added before appending the variable
    echo -e "\nSYNAPSE_HOMESERVER_NAME=$SERVER_NAME" >> $ENV_FILE_PATH
fi

if grep -q "SYNAPSE_SERVER_NAME" $ENV_FILE_PATH; then
    sed -i "s/^SYNAPSE_SERVER_NAME=.*/SYNAPSE_SERVER_NAME=$SERVER_NAME/" $ENV_FILE_PATH
else
    # Ensure that a newline is added before appending the variable
    echo -e "\nSYNAPSE_SERVER_NAME=$SERVER_NAME" >> $ENV_FILE_PATH
fi

echo $HOMESERVER_FILE_PATH
echo $SERVER_NAME
# Update the server_name in the YAML file using yq
yq e ".server_name = \"$SERVER_NAME\"" -i $HOMESERVER_FILE_PATH

# Path to your existing script
SCRIPT_PATH='restore_latest_backup.sh'

# Call the existing script for mysql
bash $SCRIPT_PATH mysql $ENV

# Call the existing script for postgres
bash $SCRIPT_PATH postgres $ENV

# Start services
npm run start:services &

# Wait for alkemio_dev_mysql container to be up
while true; do
    # Check the status of the container
    CONTAINER_STATUS=$(docker inspect --format="{{.State.Status}}" alkemio_dev_mysql)

    # If the container is running, break out of the loop
    if [ "$CONTAINER_STATUS" == "running" ]; then
        break
    else
        echo "Waiting for alkemio_dev_mysql to start..."
        sleep 500
    fi
done

# Once the container is running, start the application
npm start