#!/bin/bash
source ./utils/detect_os.sh
source ./utils/install_aws.sh

# Check and install required dependencies
check_and_install_dependencies() {
    detect_os

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo "AWS CLI not found. Installing AWS CLI v2..."
        install_aws_cli_v2 "$OS_TYPE"
    else
        AWS_CLI_VERSION=$(aws --version 2>&1 | awk '{print $1}' | cut -d/ -f2 | cut -d. -f1)
        if [[ "$AWS_CLI_VERSION" -lt 2 ]]; then
            echo "AWS CLI version < 2. Installing AWS CLI v2..."
            install_aws_cli_v2 "$OS_TYPE"
        else
            echo "AWS CLI v2 is already installed."
        fi
    fi
}
