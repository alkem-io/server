#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to detect the operating system
detect_os() {
    OS_TYPE=""
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS_TYPE="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS_TYPE="macos"
    else
        echo "Unsupported OS: $OSTYPE"
        exit 1
    fi
}

# Function to install AWS CLI v2
install_aws_cli_v2() {
    echo "Installing AWS CLI v2..."
    if [[ "$OS_TYPE" == "linux" ]]; then
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf awscliv2.zip aws
    elif [[ "$OS_TYPE" == "macos" ]]; then
        curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
        sudo installer -pkg AWSCLIV2.pkg -target /
        rm AWSCLIV2.pkg
    else
        echo "Unsupported OS for AWS CLI v2 installation."
        exit 1
    fi

    # Verify AWS CLI v2 installation
    if ! aws --version 2>&1 | grep -q "aws-cli/2"; then
        echo "AWS CLI v2 installation failed."
        exit 1
    fi
    echo "AWS CLI v2 installed successfully."
}

# Function to check and install required dependencies
check_and_install_dependencies() {
    # Detect OS
    detect_os

    # Check AWS CLI installation
    if ! command -v aws &> /dev/null; then
        echo "AWS CLI not found. Installing AWS CLI v2..."
        install_aws_cli_v2
    else
        AWS_CLI_VERSION=$(aws --version 2>&1 | awk '{print $1}' | cut -d/ -f2)
        AWS_CLI_MAJOR_VERSION=$(echo "$AWS_CLI_VERSION" | cut -d. -f1)

        if [[ "$AWS_CLI_MAJOR_VERSION" -lt 2 ]]; then
            echo "AWS CLI version is lower than v2. Installing AWS CLI v2..."
            install_aws_cli_v2
        else
            echo "AWS CLI v2 is already installed."
        fi
    fi
}

# Function to handle AWS CLI configuration
configure_aws_cli() {
    AWS_CONFIG_FILE=~/.aws/config

    # Region parameter passed from caller
    local region="$1"

    if [[ -f "$AWS_CONFIG_FILE" ]]; then
        echo "Existing AWS configuration found."
        if [[ "$NON_INTERACTIVE" == "true" ]]; then
            echo "Non-interactive mode: keeping existing AWS CLI configuration."
        else
            read -p "Do you want to overwrite the current AWS configuration? (y/n) " choice
            case "$choice" in
                y|Y )
                    echo "Overwriting AWS CLI configuration..."
                    configure_aws_settings "$region"
                    ;;
                n|N )
                    echo "Keeping the existing AWS CLI configuration."
                    ;;
                * )
                    echo "Invalid choice. Exiting."
                    exit 1
                    ;;
            esac
        fi
    else
        echo "No existing AWS CLI configuration found. Configuring AWS CLI."
        configure_aws_settings "$region"
    fi
}

# Function to set AWS configuration
configure_aws_settings() {
    local region="$1"
    local service_name="scw-$region"
    local endpoint_url="https://s3.$region.scw.cloud"

    mkdir -p ~/.aws
    cat > ~/.aws/config << EOL
[default]
region = $region
output = json
services = $service_name

[services $service_name]
s3 =
  endpoint_url = $endpoint_url
  max_concurrent_requests = 100
  max_queue_size = 1000
  multipart_threshold = 50MB
  multipart_chunksize = 10MB
s3api =
  endpoint_url = $endpoint_url
EOL
    echo "AWS CLI configuration updated successfully for region: $region"
}

# Call the dependency check function
check_and_install_dependencies

# The database is the first argument passed to the script. Default to 'alkemio' if not provided.
DATABASE=${1:-alkemio}

# Validate the database
if [[ "$DATABASE" != "alkemio" && "$DATABASE" != "kratos" && "$DATABASE" != "synapse" ]]; then
    echo "Invalid database '$DATABASE'. Please specify 'alkemio', 'kratos', or 'synapse'."
    exit 1
fi

# The environment is the second argument passed to the script. Default to 'prod' if not provided.
ENV=${2:-prod}

# Validate the environment
if [[ "$ENV" != "acc" && "$ENV" != "dev" && "$ENV" != "sandbox" && "$ENV" != "prod" ]]; then
    echo "Invalid environment '$ENV'. Please specify 'acc', 'dev', 'sandbox' or 'prod'."
    exit 1
fi

# The third argument is optional: non-interactive mode (skip prompts)
NON_INTERACTIVE=${3:-false}

# Determine the region based on the environment
if [[ "$ENV" == "prod" ]]; then
    REGION="fr-par"
else
    REGION="nl-ams"
fi

# Call the AWS configuration function with the appropriate region
configure_aws_cli "$REGION"

# Determine the S3 bucket and path based on the environment
# Database-specific backup paths (e.g., storage/postgres/backups/alkemio/)
if [[ "$ENV" == "prod" ]]; then
    S3_BUCKET="alkemio-s3-backups-prod-paris"
    S3_PATH="s3://$S3_BUCKET/storage/postgres/backups/$DATABASE/"
else
    S3_BUCKET="alkemio-s3-backups-dev"
    S3_PATH="s3://$S3_BUCKET/storage/postgres/backups/$ENV/$DATABASE/"
fi

echo "Using S3 bucket: $S3_BUCKET"
echo "Using region: $REGION"
echo "Using S3 path: $S3_PATH"

# Source environment variables from .env file
if [[ -f .env ]]; then
    source .env
else
    echo ".env file not found. Please ensure it exists in the current directory."
    exit 1
fi

# Get the latest file in the S3 bucket for the specified database
# Filter by database name in the filename (e.g., alkemio_*.sql, kratos_*.sql, synapse_*.sql)
latest_file=$(aws s3 ls "$S3_PATH" --recursive | grep "${DATABASE}" | sort | tail -n 1 | awk '{print $4}')

if [[ -z "$latest_file" ]]; then
    echo "No backup files found for database '$DATABASE' in $S3_PATH."
    exit 1
fi

echo "Latest file: $latest_file"

# Get the local filename
local_file=${latest_file##*/}

# Check if the local file already exists
if [[ -f "$local_file" ]]; then
    echo "The backup file $local_file already exists."
    if [[ "$NON_INTERACTIVE" == "true" ]]; then
        echo "Non-interactive mode: downloading and overwriting the existing file."
        aws s3 cp "s3://$S3_BUCKET/$latest_file" .
    else
        read -p "Do you want to overwrite it by downloading a new copy? (y/n) " overwrite_choice
        if [[ "$overwrite_choice" != "y" && "$overwrite_choice" != "Y" ]]; then
            echo "Skipping download and using the existing file."
        else
            echo "Downloading and overwriting the existing file."
            aws s3 cp "s3://$S3_BUCKET/$latest_file" .
        fi
    fi
else
    # Download the latest file if it doesn't exist
    echo "Downloading the backup file."
    aws s3 cp "s3://$S3_BUCKET/$latest_file" .
fi

echo "Using local file: $local_file"

# Map database name to environment variable
case "$DATABASE" in
    alkemio)
        db_name="${POSTGRES_ALKEMIO_DB}"
        ;;
    kratos)
        db_name="${POSTGRES_KRATOS_DB}"
        ;;
    synapse)
        db_name="${POSTGRES_SYNAPSE_DB}"
        ;;
esac

# Restore snapshot using PostgreSQL
echo "Restoring PostgreSQL database '$db_name' from $local_file..."

# Terminate existing connections
docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${db_name}' AND pid <> pg_backend_pid();"

# Drop the existing database
docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "DROP DATABASE IF EXISTS ${db_name};"

# Create the database with appropriate settings
# Synapse requires LC_COLLATE=C and LC_CTYPE=C for proper Unicode handling
if [[ "$DATABASE" == "synapse" ]]; then
    docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "CREATE DATABASE ${db_name} ENCODING 'UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0;"
else
    docker exec -i alkemio_dev_postgres psql -U ${POSTGRES_USER} -d postgres -c "CREATE DATABASE ${db_name};"
fi

# Restore the backup
# Copy the backup file to the container and restore
# Use sed to remove OWNER TO statements and GRANT/REVOKE statements to avoid permission issues
docker cp "$local_file" alkemio_dev_postgres:/tmp/backup.sql
docker exec -i alkemio_dev_postgres bash -c "sed -e 's/OWNER TO [^;]*;/OWNER TO ${POSTGRES_USER};/g' -e '/^GRANT /d' -e '/^REVOKE /d' /tmp/backup.sql | psql -U ${POSTGRES_USER} -d ${db_name} --set ON_ERROR_STOP=off"
docker exec -i alkemio_dev_postgres rm /tmp/backup.sql
echo "PostgreSQL database '$db_name' restored successfully!"